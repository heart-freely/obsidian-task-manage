// src/ui/editor/progress/progress-render.ts
// 统一进度条渲染核心 — 编辑/阅读模式 + 插件内视图共用
// 消除 createProgressBar / createProgressDom / live-preview-widget 三处重复

import { getProgressConfig } from "../../../core/config/progress-config";
import { getStatusColors } from "../../../core/config/config";
import { formatProgressText } from "../../component/progress/format-text";
import { tooltip } from "../../component/tooltip/tooltip";
import { EditorProgressCounts } from "./range-calculator";

const STATUS_ORDER = [
	"todo",
	"scheduled",
	"in-progress",
	"cancelled",
	"completed",
];

export interface ProgressRenderOptions {
	/** 根元素 class（默认 task-editor-progress，插件内视图可传其他） */
	rootClass?: string;
	/** 进度条 class（默认 task-editor-progress-bar） */
	barClass?: string;
	/** 分段 class（默认 task-editor-progress-segment） */
	segmentClass?: string;
	/** 文本 class（默认 task-editor-progress-label） */
	labelClass?: string;
	/** 文本额外 class（追加到 labelClass 后，如插件内 task-text-smaller） */
	labelExtraClass?: string;
	/** 高度（默认 8px） */
	height?: string;
	/** 文本是否显示（默认 true） */
	showText?: boolean;
}

/**
 * 渲染统一进度条：图形段 + 文本标签 + 悬停提示。
 * 返回根元素；displayMode=none 时返回空元素。
 */
export function renderProgressDom(
	counts: EditorProgressCounts,
	options?: ProgressRenderOptions,
): HTMLElement {
	const cfg = getProgressConfig();
	const { counts: c, total } = counts;
	const rootClass = options?.rootClass || "task-editor-progress";
	const barClass = options?.barClass || "task-editor-progress-bar";
	const segmentClass =
		options?.segmentClass || "task-editor-progress-segment";
	const labelClass = options?.labelClass || "task-editor-progress-label";
	const labelExtraClass = options?.labelExtraClass || "";
	const height = options?.height || "8px";
	const showText = options?.showText ?? true;

	// 用 Obsidian 全局 createSpan 创建（返回 HTMLElement + addClass/removeClass 扩展方法，
	// 兼容插件内视图的 addClass 调用与 CodeMirror widget 的原生元素需求）
	const wrap = createSpan({ cls: rootClass });

	const wantGraphical =
		cfg.displayMode === "graphical" || cfg.displayMode === "both";
	const wantText = cfg.displayMode === "text" || cfg.displayMode === "both";
	const graphical = wantGraphical && total > 0;

	if (graphical) {
		const bar = createSpan({ cls: barClass });
		bar.style.height = height;
		const statusColors = getStatusColors();
		const st = total || 1;
		let accumulated = 0;
		STATUS_ORDER.forEach((status) => {
			const count = c[status] || 0;
			if (count > 0) {
				const pct = Math.min((count / st) * 100, 100 - accumulated);
				accumulated += pct;
				const seg = createSpan({ cls: segmentClass });
				seg.style.width = pct + "%";
				seg.style.background =
					statusColors[status] || "var(--text-muted)";
				bar.appendChild(seg);
			}
		});
		wrap.appendChild(bar);
	}

	if (wantText && showText) {
		const label = createSpan({
			cls:
				labelExtraClass && labelClass
					? labelClass + " " + labelExtraClass
					: labelClass,
		});
		label.textContent = formatProgressText(
			c,
			total,
			cfg.textFormat,
			cfg.customFormat,
		);
		wrap.appendChild(label);
	}

	if (cfg.supportHover && total > 0) {
		const tipHtml = buildProgressTooltip(c, total);
		wrap.addEventListener("mouseenter", (e) =>
			tooltip.show(tipHtml, e.clientX, e.clientY),
		);
		wrap.addEventListener("mousemove", (e) =>
			tooltip.move(e.clientX, e.clientY),
		);
		wrap.addEventListener("mouseleave", () => tooltip.hide());
	}

	return wrap;
}

/** 悬停明细 tooltip（编辑/阅读/插件内共用） */
export function buildProgressTooltip(
	counts: Record<string, number>,
	total: number,
): string {
	const st = total || 1;
	const parts: string[] = [];
	[
		{ k: "todo", i: "🔲", l: "待办中" },
		{ k: "scheduled", i: "❔", l: "计划中" },
		{ k: "in-progress", i: "⏩", l: "进行中" },
		{ k: "cancelled", i: "❎", l: "已取消" },
		{ k: "completed", i: "✅", l: "已完成" },
	].forEach(({ k, i, l }) => {
		const c = counts[k] || 0;
		parts.push(
			i +
				" " +
				l +
				" " +
				(st > 0 ? Math.round((c / st) * 100) : 0) +
				"% " +
				c,
		);
	});
	return parts.join("<br>");
}
