// src/ui/editor/progress/reading-mode-processor.ts
// 阅读模式进度条 — 移植 taskgenius 就地插入 + closest 适配新版 Obsidian DOM

import {
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
} from "obsidian";
import { getProgressConfig } from "../../../core/config/progress-config";
import { SYMBOL_TO_STATUS } from "../../../core/config/config";
import { EditorProgressCounts } from "./range-calculator";
import { renderProgressDom } from "./progress-render";
import {
	cacheTaskProgress,
	getCachedTaskProgress,
} from "./progress-shared-cache";

const STATUS_ORDER = [
	"todo",
	"scheduled",
	"in-progress",
	"cancelled",
	"completed",
];


/** 进度条渲染子组件：Obsidian 管理生命周期，DOM 不会被渲染器清理 */
class ProgressRenderChild extends MarkdownRenderChild {
	constructor(
		containerEl: HTMLElement,
		private counts: EditorProgressCounts,
	) {
		super(containerEl);
	}

	onload() {
		const bar = renderProgressDom(this.counts);
		insertAfterTaskText(this.containerEl, bar);
	}
}

export function updateProgressInReadingMode(
	element: HTMLElement,
	ctx: MarkdownPostProcessorContext,
): void {
	try {
		const cfg = getProgressConfig();
		if (!cfg.enabled || cfg.displayMode === "none") return;
		const docId = ctx.docId || ctx.sourcePath || "default";
		(element as HTMLElement & { __docId?: string }).__docId = docId;

		// 处理标题块
		const firstChild = element.children[0] as HTMLElement | undefined;
		if (firstChild && /^H[1-6]$/.test(firstChild.tagName)) {
			if (cfg.addTaskProgressBarToHeading) {
				renderHeadingProgressBars(element, ctx, cfg);
			}
			return;
		}

		// 处理任务列表块
		const items = Array.from(
			element.querySelectorAll<HTMLElement>(".task-list-item"),
		);
		if (items.length === 0) return;

		// 每个子任务 li → 向上 closest 找父任务 li
		const parentChildren = new Map<HTMLElement, HTMLElement[]>();
		items.forEach((item) => {
			const parentTask = item.parentElement?.closest<HTMLElement>(
				".task-list-item",
			);
			if (parentTask && parentTask !== item) {
				if (!parentChildren.has(parentTask))
					parentChildren.set(parentTask, []);
				parentChildren.get(parentTask)!.push(item);
			}
		});

		// 记录待插入（渲染后延迟查找，避开 li 被替换的问题）
		// 用任务文本首行作为稳定标识，存入共享缓存（编辑/阅读模式统一）
		const parentTasks = Array.from(parentChildren.keys());
		parentTasks.forEach((parentTask) => {
			const children = parentChildren.get(parentTask)!;
			const counts = countFromItems(children, cfg.countSubLevel);
			if (counts.total === 0) return;
			const textEl = parentTask.querySelector(
				":scope > .tasks-list-text, :scope > .task-list-item-list-item-text",
			);
			const fullText =
				textEl?.textContent || parentTask.textContent || "";
			const label = normalizeLabel(fullText);
			cacheTaskProgress(label, counts);
			scheduleTaskBar(docId);
		});
	} catch (e) {
		console.warn("[TaskManage] 阅读模式进度条渲染失败:", e);
	}
}

/** 归一化任务文本：去掉 emoji/日期等标记，只保留核心文本（收集与插入共用） */
function normalizeLabel(text: string): string {
	return text
		.split("\n")[0]
		.replace(
			/⏫|➕|🛫|⏳|📅|✅|❌|❎|🔺|⏬|🔼|⏱|🔁|✔|✘|\d{4}-\d{2}-\d{2}/g,
			" ",
		)
		.replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 40);
}

/** 延迟插入任务进度条：遍历父任务 li，按 label 查共享缓存插入 */
function scheduleTaskBar(_docId: string): void {
	const timers = (window.__TASK_READ_TIMERS__ =
		window.__TASK_READ_TIMERS__ || {});
	if (timers[_docId]) window.clearTimeout(timers[_docId]);
	timers[_docId] = window.setTimeout(() => {
		delete timers[_docId];
		const view = document.querySelector(".markdown-reading-view");
		if (!view) return;
		const allItems = Array.from(
			view.querySelectorAll<HTMLElement>(".task-list-item"),
		);
		// 父任务 = 直接子列表里实际包含任务项的 li
		const parents = allItems.filter((i) => {
			const listEl = i.querySelector(":scope > ul, :scope > div.el-ul");
			return (
				listEl &&
				listEl.querySelector(":scope > li.task-list-item, :scope > .task-list-item")
			);
		});
		parents.forEach((li) => {
			if (li.querySelector(".task-editor-progress")) return;
			const textEl = li.querySelector(
				":scope > .tasks-list-text, :scope > .task-list-item-list-item-text",
			);
			const label = normalizeLabel(textEl?.textContent || li.textContent || "");
			const cached = getCachedTaskProgress(label);
			if (!cached) return;
			insertAfterTaskText(li, renderProgressDom(cached));
		});
	}, 400);
}

/** 把进度条插入到父任务文本之后（任务文本后、子任务列表前） */
function insertAfterTaskText(parent: HTMLElement, bar: HTMLElement): void {
	// 1. 任务文本之后
	const textEl = parent.querySelector(
		":scope > .tasks-list-text, :scope > .task-list-item-list-item-text",
	);
	if (textEl) {
		textEl.insertAdjacentElement("afterend", bar);
		return;
	}
	// 2. 第一个子任务列表之前（任意深度，适配 ul / div.el-ul）
	const listEl = parent.querySelector("ul, div.el-ul");
	if (listEl) {
		parent.insertBefore(bar, listEl);
		return;
	}
	// 3. checkbox 之后
	const checkbox = parent.querySelector(
		":scope > .task-list-item-checkbox, :scope > input[type='checkbox']",
	);
	if (checkbox) {
		checkbox.insertAdjacentElement("afterend", bar);
		return;
	}
	// 4. li 末尾
	parent.appendChild(bar);
}

function renderHeadingProgressBars(
	element: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	cfg: ReturnType<typeof getProgressConfig>,
): void {
	const heading = element.children[0] as HTMLElement | undefined;
	if (!heading || !/^H[1-6]$/.test(heading.tagName)) return;
	if (heading.querySelector(".task-editor-progress")) return;

	const sectionInfo = ctx.getSectionInfo(element);
	if (!sectionInfo) return;
	const lines = sectionInfo.text.split("\n");
	const headingText = lines[sectionInfo.lineStart] || "";
	const headingMatch = headingText.match(/^(#{1,6})\s/);
	if (!headingMatch) return;
	const headingLevel = headingMatch[1].length;

	const sectionLines: string[] = [];
	let inSection = false;
	for (const line of lines.slice(sectionInfo.lineStart)) {
		const hMatch = line.match(/^(#{1,6})\s/);
		if (hMatch) {
			const level = hMatch[1].length;
			if (inSection && level <= headingLevel) break;
		}
		inSection = true;
		sectionLines.push(line);
	}

	const counts: Record<string, number> = {};
	let total = 0;
	for (const line of sectionLines.slice(1)) {
		const m = line.trim().match(/^([-*+]|\d+\.)\s\[(.)\]\s/);
		if (!m) continue;
		const status = SYMBOL_TO_STATUS[m[2]] || "todo";
		counts[status] = (counts[status] || 0) + 1;
		total++;
	}
	if (total === 0) return;
	ctx.addChild(new ProgressRenderChild(heading, { counts, total }));
}

function countFromItems(
	items: HTMLElement[],
	countSubLevel: boolean,
): EditorProgressCounts {
	const counts: Record<string, number> = {};
	let total = 0;
	items.forEach((item) => {
		if (!countSubLevel) {
			const directParentIsTask =
				item.parentElement?.classList.contains("task-list-item");
			if (directParentIsTask) return;
		}
		const input = item.querySelector<HTMLInputElement>(
			'input[type="checkbox"], input.task-list-item-checkbox',
		);
		const dataTask = (item.getAttribute("data-task") || "").trim();
		let status = "todo";
		if (input?.checked) {
			status = "completed";
		} else if (dataTask === "x" || dataTask === "X") {
			status = "completed";
		} else if (dataTask === ">" || dataTask === "/" || dataTask === "\\") {
			status = "in-progress";
		} else if (dataTask === "-") {
			status = "cancelled";
		} else if (dataTask === "?") {
			status = "scheduled";
		}
		counts[status] = (counts[status] || 0) + 1;
		total++;
	});
	return { counts, total };
}
