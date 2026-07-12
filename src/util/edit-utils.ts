// src/util/edit-utils.ts
// 编辑卡片通用工具函数 — 使用 CSS 类 + setProperty 替代 style.*=

import { parseTaskLine } from "../core/parser/tasks-parser";
import { TaskTreeNode } from "../core/task/task-tree";
import { getEditContext } from "../ui/main/card/card";

// ========== 编辑按钮组定义 ==========

export interface EditButtonGroup {
	key: string;
	icon: string;
	label: string;
	hasSub: boolean;
	subType?: "options" | "date" | "custom";
	subOptions?: string[];
}

export const EDIT_BUTTONS: EditButtonGroup[] = [
	{
		key: "status",
		icon: "🔲",
		label: "状态",
		hasSub: true,
		subType: "options",
		subOptions: ["待办中", "计划中", "进行中", "已取消", "已完成"],
	},
	{
		key: "priority",
		icon: "🔺",
		label: "优先级",
		hasSub: true,
		subType: "options",
		subOptions: ["🔺", "⏫", "🔼", "🔽", "⏬"],
	},
	{
		key: "repeat",
		icon: "🔁",
		label: "周期",
		hasSub: true,
		subType: "custom",
		subOptions: [
			"🔁 every day",
			"🔁 every week",
			"🔁 every month",
			"🔁 every year",
		],
	},
	{
		key: "created",
		icon: "➕",
		label: "创建",
		hasSub: true,
		subType: "date",
	},
	{
		key: "scheduled",
		icon: "⏳",
		label: "计划",
		hasSub: true,
		subType: "date",
	},
	{ key: "starts", icon: "🛫", label: "开始", hasSub: true, subType: "date" },
	{
		key: "cancelled",
		icon: "❌",
		label: "取消",
		hasSub: true,
		subType: "date",
	},
	{ key: "done", icon: "✅", label: "完成", hasSub: true, subType: "date" },
	{ key: "due", icon: "📅", label: "截止", hasSub: true, subType: "date" },
	{ key: "id", icon: "🆔", label: "唯一ID", hasSub: true, subType: "custom" },
	{
		key: "forbid",
		icon: "⛔",
		label: "引用ID",
		hasSub: true,
		subType: "custom",
	},
	{
		key: "tag",
		icon: "🏁",
		label: "标签",
		hasSub: true,
		subType: "custom",
		subOptions: ["🏁 keep", "🏁 delete"],
	},
];

export const STATUS_KEY_MAP: Record<string, string> = {
	待办中: "todo",
	计划中: "scheduled",
	进行中: "in-progress",
	已取消: "cancelled",
	已完成: "completed",
};
export const STATUS_LABEL_MAP: Record<string, string> = {
	none: "无状态",
	todo: "待办中",
	scheduled: "计划中",
	"in-progress": "进行中",
	cancelled: "已取消",
	completed: "已完成",
};
const STATUS_EMOJI_MAP: Record<string, string> = {
	none: "",
	todo: "🔲",
	scheduled: "❔",
	"in-progress": "⏩",
	cancelled: "❎",
	completed: "✅",
};

// ========== 工具函数（未改动） ==========

export function getNodeMarkValue(
	node: TaskTreeNode,
	key: string,
): string | null {
	switch (key) {
		case "status":
			return STATUS_LABEL_MAP[node.status] || node.status;
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			return node.priority < 5 ? icons[node.priority] : null;
		}
		case "repeat":
			return node.repeat || null;
		case "created":
			return node.created ? formatDate(new Date(node.created)) : null;
		case "scheduled":
			return node.scheduled ? formatDate(new Date(node.scheduled)) : null;
		case "starts":
			return node.starts ? formatDate(new Date(node.starts)) : null;
		case "due":
			return node.due ? formatDate(new Date(node.due)) : null;
		case "done":
			return node.done ? formatDate(new Date(node.done)) : null;
		case "cancelled":
			return node.cancelled ? formatDate(new Date(node.cancelled)) : null;
		case "tag":
			return node.tag || null;
		case "id":
			return node.id || null;
		case "forbid":
			return node.forbid || null;
		default:
			return null;
	}
}

export function formatDate(d: Date): string {
	const pad = (n: number) => (n < 10 ? "0" + n : n);
	return (
		d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
	);
}

export function getTodayStr(): string {
	return formatDate(new Date());
}

export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export function hasMarkValue(node: TaskTreeNode, key: string): boolean {
	switch (key) {
		case "status":
			return node.status !== "none";
		case "priority":
			return node.priority !== 5;
		case "repeat":
			return node.repeat !== "";
		case "created":
			return node.created !== null;
		case "scheduled":
			return node.scheduled !== null;
		case "starts":
			return node.starts !== null;
		case "due":
			return node.due !== null;
		case "done":
			return node.done !== null;
		case "cancelled":
			return node.cancelled !== null;
		case "tag":
			return node.tag !== "";
		case "id":
			return node.id !== "";
		case "forbid":
			return node.forbid !== "";
		default:
			return false;
	}
}

export function hasContentBeenEdited(
	originalLine: string,
	previewLine: string,
): boolean {
	const origTask = parseTaskLine(originalLine, "", 0);
	const prevTask = parseTaskLine(previewLine, "", 0);
	if (!origTask || !prevTask) return originalLine !== previewLine;
	return origTask.content !== prevTask.content;
}

// ========== 编辑行 DOM ==========

export interface EditBarOptions {
	expandedButton: string | null;
	onEdit: (node: TaskTreeNode, markKey: string, value: string | null) => void;
	previewText?: string | null;
	isEditing?: boolean;
}

// ========== 标记值提取（从文本行）— 未改动 ==========

function hasMarkBeenEdited(
	node: TaskTreeNode,
	key: string,
	options: EditBarOptions,
): boolean {
	const previewText = options.previewText;
	if (!previewText || previewText === node.rawLine) return false;
	const originalMarkInfo = extractMarkFromText(node.rawLine, key);
	const previewMarkInfo = extractMarkFromText(previewText, key);
	return originalMarkInfo !== previewMarkInfo;
}

function extractMarkFromText(line: string, key: string): string {
	switch (key) {
		case "status": {
			const match = line.match(/^- \[(.)\]/);
			if (!match) return "none";
			const s = match[1];
			const m: Record<string, string> = {
				" ": "todo",
				"?": "scheduled",
				">": "in-progress",
				"/": "in-progress",
				"\\": "in-progress",
				x: "completed",
				X: "completed",
				"-": "cancelled",
			};
			return m[s] || "none";
		}
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			for (const i of icons) if (line.includes(i)) return i;
			return "";
		}
		case "repeat": {
			const m = line.match(
				/🔁\s*(every\s+.+?)(?=\s*[➕⏳🛫📅✅❌🏁🆔⛔]|$)/,
			);
			return m ? m[1].trim() : "";
		}
		case "created": {
			const m = line.match(/➕\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : "";
		}
		case "scheduled": {
			const m = line.match(/⏳\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : "";
		}
		case "starts": {
			const m = line.match(/🛫\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : "";
		}
		case "due": {
			const m = line.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : "";
		}
		case "done": {
			const m = line.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : "";
		}
		case "cancelled": {
			const m = line.match(/❌\s*(\d{4}-\d{2}-\d{2})?/);
			return m ? m[1] || "已取消" : "";
		}
		case "tag": {
			const m = line.match(/🏁\s*(\S+)/);
			return m ? m[1] : "";
		}
		case "id": {
			const m = line.match(/🆔\s*(\S+)/);
			return m ? m[1] : "";
		}
		case "forbid": {
			const m = line.match(/⛔\s*([^\s,]+(?:,\s*[^\s,]+)*)/);
			return m ? m[1].replace(/\s/g, "") : "";
		}
		default:
			return "";
	}
}

function extractOriginalMarkValue(rawLine: string, key: string): string | null {
	switch (key) {
		case "status": {
			const match = rawLine.match(/^- \[(.)\]/);
			if (!match) return null;
			const s = match[1];
			const m: Record<string, string> = {
				" ": "todo",
				"?": "scheduled",
				">": "in-progress",
				"/": "in-progress",
				"\\": "in-progress",
				x: "completed",
				X: "completed",
				"-": "cancelled",
			};
			return m[s] || null;
		}
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			for (const i of icons) if (rawLine.includes(i)) return i;
			return null;
		}
		case "repeat": {
			const m = rawLine.match(
				/🔁\s*(every\s+.+?)(?=\s*[➕⏳🛫📅✅❌🏁🆔⛔]|$)/,
			);
			return m ? m[1].trim() : null;
		}
		case "created": {
			const m = rawLine.match(/➕\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : null;
		}
		case "scheduled": {
			const m = rawLine.match(/⏳\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : null;
		}
		case "starts": {
			const m = rawLine.match(/🛫\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : null;
		}
		case "due": {
			const m = rawLine.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : null;
		}
		case "done": {
			const m = rawLine.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
			return m ? m[1] : null;
		}
		case "cancelled": {
			const m = rawLine.match(/❌\s*(\d{4}-\d{2}-\d{2})?/);
			return m ? m[1] || "" : null;
		}
		case "tag": {
			const m = rawLine.match(/🏁\s*(\S+)/);
			return m ? m[1] : null;
		}
		case "id": {
			const m = rawLine.match(/🆔\s*(\S+)/);
			return m ? m[1] : null;
		}
		case "forbid": {
			const m = rawLine.match(/⛔\s*([^\s,]+(?:,\s*[^\s,]+)*)/);
			return m ? m[1].replace(/\s/g, "") : null;
		}
		default:
			return null;
	}
}

function getMarkDisplayText(node: TaskTreeNode, key: string): string {
	switch (key) {
		case "status": {
			const e = STATUS_EMOJI_MAP[node.status] || "";
			const n = STATUS_LABEL_MAP[node.status] || "";
			return `${e} ${n}`;
		}
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			const names = ["最高", "高", "中", "低", "最低"];
			const i = icons[node.priority] || "";
			const n = names[node.priority] || "";
			return `${i} ${n}`;
		}
		case "repeat":
			return node.repeat ? `🔁 ${node.repeat}` : "";
		case "created":
			return node.created
				? `➕ ${formatDate(new Date(node.created))}`
				: "";
		case "scheduled":
			return node.scheduled
				? `⏳ ${formatDate(new Date(node.scheduled))}`
				: "";
		case "starts":
			return node.starts ? `🛫 ${formatDate(new Date(node.starts))}` : "";
		case "cancelled":
			return node.cancelled
				? `❌ ${formatDate(new Date(node.cancelled))}`
				: "";
		case "done":
			return node.done ? `✅ ${formatDate(new Date(node.done))}` : "";
		case "due":
			return node.due ? `📅 ${formatDate(new Date(node.due))}` : "";
		case "tag":
			return node.tag ? `🏁 ${node.tag}` : "";
		case "id":
			return node.id ? `🆔 ${node.id}` : "";
		case "forbid":
			return node.forbid ? `⛔ ${node.forbid}` : "";
		default:
			return "";
	}
}

function getMarkDisplayTextFromLine(line: string, key: string): string {
	const extracted = extractMarkFromText(line, key);
	if (!extracted) return "";
	switch (key) {
		case "status": {
			const e = STATUS_EMOJI_MAP[extracted] || "";
			const n = STATUS_LABEL_MAP[extracted] || extracted;
			return `${e} ${n}`;
		}
		case "priority": {
			const names: Record<string, string> = {
				"🔺": "最高",
				"⏫": "高",
				"🔼": "中",
				"🔽": "低",
				"⏬": "最低",
			};
			const n = names[extracted] || "";
			return `${extracted} ${n}`;
		}
		case "repeat":
			return extracted ? `🔁 ${extracted}` : "";
		case "created":
			return extracted ? `➕ ${extracted}` : "";
		case "scheduled":
			return extracted ? `⏳ ${extracted}` : "";
		case "starts":
			return extracted ? `🛫 ${extracted}` : "";
		case "cancelled":
			return extracted ? `❌ ${extracted}` : "";
		case "done":
			return extracted ? `✅ ${extracted}` : "";
		case "due":
			return extracted ? `📅 ${extracted}` : "";
		case "tag":
			return extracted ? `🏁 ${extracted}` : "";
		case "id":
			return extracted ? `🆔 ${extracted}` : "";
		case "forbid":
			return extracted ? `⛔ ${extracted}` : "";
		default:
			return "";
	}
}

// ========== 编辑栏构建（修正：保持原始类名，仅替换静态样式）==========

export function createEditBar(
	node: TaskTreeNode,
	options: EditBarOptions,
): HTMLElement {
	const bar = document.createElement("div");
	bar.className = "task-edit-bar";

	// 同步模式：非主任务隐藏编辑栏
	const editCtx = getEditContext();
	if (
		options.isEditing &&
		editCtx?.syncMode &&
		editCtx.primaryTaskUid !== node.uid
	) {
		bar.style.display = "none";
		return bar;
	}

	let hoveredButtonKey: string | null = null;

	bar.addEventListener("mouseleave", () => {
		hoveredButtonKey = null;
		updateAllButtonStyles();
	});

	const buttons: Array<{ btn: HTMLElement; group: EditButtonGroup }> = [];

	EDIT_BUTTONS.forEach((group) => {
		const btn = document.createElement("button");
		const hasValue = hasMarkValue(node, group.key);
		const isEdited = hasMarkBeenEdited(node, group.key, options);

		if (isEdited && options.previewText) {
			btn.textContent =
				getMarkDisplayTextFromLine(options.previewText, group.key) ||
				`${group.icon} ${group.label}`;
		} else {
			btn.textContent = hasValue
				? getMarkDisplayText(node, group.key)
				: `${group.icon} ${group.label}`;
		}

		btn.title = group.label;
		btn.setAttribute("data-mark-key", group.key);

		btn.addEventListener("mouseenter", () => {
			if (!options.expandedButton) {
				hoveredButtonKey = group.key;
				updateAllButtonStyles();
			}
		});
		btn.addEventListener("mouseleave", () => {
			setTimeout(() => {
				if (hoveredButtonKey === group.key) {
					hoveredButtonKey = null;
					updateAllButtonStyles();
				}
			}, 50);
		});
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			options.onEdit(node, group.key + "_toggle", null);
		});

		bar.appendChild(btn);
		buttons.push({ btn, group });
	});

	function updateAllButtonStyles() {
		buttons.forEach(({ btn, group }) => updateButtonStyle(btn, group));
	}

	function updateButtonStyle(btn: HTMLElement, group: EditButtonGroup) {
		const isExpanded = options.expandedButton === group.key;
		const isHovered = hoveredButtonKey === group.key;
		const isEdited = hasMarkBeenEdited(node, group.key, options);
		const hasValue = hasMarkValue(node, group.key);

		// 完全等价于原始代码的 style.cssText 设置
		if (isExpanded || isEdited) {
			btn.style.cssText =
				"all:unset;padding:1px 3px;border-radius:3px;cursor:pointer;font-size:inherit;font-family:inherit;line-height:1;background:var(--interactive-accent);color:white;display:inline-flex;align-items:center;border:1px solid var(--interactive-accent);outline:none;box-sizing:border-box;";
		} else if (isHovered) {
			btn.style.cssText =
				"all:unset;padding:1px 3px;border-radius:3px;cursor:pointer;font-size:inherit;font-family:inherit;line-height:1;background:var(--background-modifier-hover);color:var(--text-normal);display:inline-flex;align-items:center;border:1px solid var(--background-modifier-border);outline:none;box-sizing:border-box;";
		} else if (hasValue) {
			btn.style.cssText =
				"all:unset;padding:1px 3px;border-radius:3px;cursor:pointer;font-size:inherit;font-family:inherit;line-height:1;background:transparent;color:inherit;display:inline-flex;align-items:center;border:1px solid transparent;outline:none;box-sizing:border-box;";
		} else if (options.isEditing) {
			btn.style.cssText =
				"all:unset;padding:1px 3px;border-radius:3px;cursor:pointer;font-size:inherit;font-family:inherit;line-height:1;background:transparent;color:inherit;display:inline-flex;align-items:center;border:1px solid transparent;outline:none;box-sizing:border-box;";
		} else {
			btn.style.cssText = "display:none;";
		}
	}

	updateAllButtonStyles();

	// 文件名
	const fileName = node.path.split("/").pop()?.replace(".md", "") || "";
	if (fileName) {
		const fileNameSpan = document.createElement("span");
		fileNameSpan.textContent = `📄 ${fileName}`;
		fileNameSpan.style.cssText =
			"padding:0;border:none;font-size:inherit;line-height:normal;color:inherit;display:inline-flex;align-items:center;";
		bar.appendChild(fileNameSpan);
	}

	// 展开的子行
	if (options.expandedButton) {
		const group = EDIT_BUTTONS.find(
			(g) => g.key === options.expandedButton,
		);
		if (group) {
			const subRow = createSubRow(node, group, options);
			bar.appendChild(subRow);
		}
	}

	// 阅读模式且无任何可见按钮 → 隐藏整个编辑栏
	if (!options.isEditing && !options.expandedButton) {
		const hasAnyVisible = EDIT_BUTTONS.some((g) =>
			hasMarkValue(node, g.key),
		);
		if (!hasAnyVisible) bar.style.display = "none";
	}

	return bar;
}

// ========== 子行上下文 — 未改动 ==========

interface SubRowContext {
	getMainBtn: () => HTMLElement | null;
	updateMainBtnText: (text: string) => void;
	originalValue: string | null;
	hasOriginalMark: boolean;
	previewValue: string | null;
	hasChanged: boolean;
}

function createSubRowContext(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
	subRow: HTMLElement,
): SubRowContext {
	const getMainBtn = (): HTMLElement | null => {
		const editBar = subRow.closest(".task-edit-bar") as HTMLElement;
		if (!editBar) return null;
		return editBar.querySelector(
			`[data-mark-key="${group.key}"]`,
		) as HTMLElement;
	};
	const updateMainBtnText = (displayText: string) => {
		const mb = getMainBtn();
		if (mb && displayText) mb.textContent = displayText;
	};
	const originalValue = extractOriginalMarkValue(node.rawLine, group.key);
	const hasOriginalMark = originalValue !== null && originalValue !== "";
	let previewValue: string | null = null;
	if (options.previewText)
		previewValue = extractMarkFromText(options.previewText, group.key);
	const hasChanged = originalValue !== previewValue;
	return {
		getMainBtn,
		updateMainBtnText,
		originalValue,
		hasOriginalMark,
		previewValue,
		hasChanged,
	};
}

// ========== 选项子行 — 仅替换静态 style.cssText ==========

function createOptionsSubRow(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
): void {
	if (!group.subOptions) return;
	const subRow = (ctx as any)._subRow as HTMLElement;
	const onEdit = options.onEdit;
	group.subOptions.forEach((opt) => {
		const btn = document.createElement("button");
		btn.textContent = opt;
		let isActive = false;
		if (group.key === "status") {
			const sk = STATUS_KEY_MAP[opt];
			isActive =
				ctx.previewValue !== null
					? ctx.previewValue === sk
					: node.status === sk;
		} else if (group.key === "priority") {
			const oi = ["🔺", "⏫", "🔼", "🔽", "⏬"][node.priority] || "";
			isActive =
				ctx.previewValue !== null
					? ctx.previewValue === opt
					: oi === opt;
		} else {
			isActive =
				ctx.previewValue !== null
					? ctx.previewValue === opt.replace("🏁 ", "")
					: getNodeMarkValue(node, group.key) === opt ||
						getNodeMarkValue(node, group.key) ===
							opt.replace("🏁 ", "");
		}

		// 静态样式用 CSS 类，动态颜色用 setProperty
		btn.className = "edit-sub-btn";
		if (isActive) {
			btn.style.setProperty("background", "var(--interactive-accent)");
			btn.style.setProperty("color", "white");
		} else {
			btn.style.setProperty("background", "var(--interactive-normal)");
			btn.style.setProperty("color", "var(--text-normal)");
		}

		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			const value =
				group.key === "status" ? STATUS_KEY_MAP[opt] || opt : opt;
			const allBtns = btn.parentElement?.querySelectorAll("button");
			allBtns?.forEach((b: Element) => {
				(b as HTMLElement).style.setProperty(
					"background",
					"var(--interactive-normal)",
				);
				(b as HTMLElement).style.setProperty(
					"color",
					"var(--text-normal)",
				);
			});
			btn.style.setProperty("background", "var(--interactive-accent)");
			btn.style.setProperty("color", "white");
			if (group.key === "status") {
				const sk = STATUS_KEY_MAP[opt] || opt;
				ctx.updateMainBtnText(
					`${STATUS_EMOJI_MAP[sk] || ""} ${STATUS_LABEL_MAP[sk] || sk}`,
				);
			} else if (group.key === "priority") {
				const names: Record<string, string> = {
					"🔺": "最高",
					"⏫": "高",
					"🔼": "中",
					"🔽": "低",
					"⏬": "最低",
				};
				ctx.updateMainBtnText(`${opt} ${names[opt] || ""}`);
			} else {
				ctx.updateMainBtnText(opt);
			}
			onEdit(node, group.key, value);
		});
		subRow.appendChild(btn);
	});
}

// ========== 日期子行 — 静态样式用 CSS 类 ==========

function createDateSubRow(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
): void {
	const subRow = (ctx as any)._subRow as HTMLElement;
	const onEdit = options.onEdit;

	let currentValue: string | null = null;
	if (options.previewText) {
		const extracted = extractMarkFromText(options.previewText, group.key);
		if (extracted) currentValue = extracted;
	}
	if (!currentValue) currentValue = getNodeMarkValue(node, group.key);

	const dateInput = document.createElement("input");
	dateInput.type = "date";
	dateInput.value = currentValue || "";
	dateInput.className = "edit-date-input";
	dateInput.style.setProperty(
		"color",
		currentValue ? "var(--text-normal)" : "var(--text-muted)",
	);

	dateInput.addEventListener("change", () => {
		const val = dateInput.value;
		dateInput.style.setProperty(
			"color",
			val ? "var(--text-normal)" : "var(--text-muted)",
		);
		ctx.updateMainBtnText(
			val ? `${group.icon} ${val}` : `${group.icon} ${group.label}`,
		);
		onEdit(node, group.key, val || null);
	});

	dateInput.addEventListener("click", (e) => {
		e.stopPropagation();
	});

	subRow.appendChild(dateInput);
}

// ========== 自定义子行（未改动核心逻辑）==========

function createCustomSubRow(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
): void {
	const subRow = (ctx as any)._subRow as HTMLElement;
	const onEdit = options.onEdit;

	if (group.key === "id") {
		const ci = document.createElement("input");
		ci.type = "text";
		ci.placeholder = "自定义";
		ci.className = "edit-sub-btn";
		ci.style.setProperty("background", "var(--background-primary)");
		ci.style.setProperty("color", "var(--text-normal)");
		ci.style.setProperty("width", "70px");
		ci.addEventListener("click", (e) => e.stopPropagation());
		ci.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				const v = ci.value.trim();
				if (v) {
					ctx.updateMainBtnText(`🆔 ${v}`);
					onEdit(node, group.key, v);
				}
			}
		});
		subRow.appendChild(ci);

		const gb = document.createElement("button");
		gb.textContent = "生成";
		gb.className = "edit-sub-btn";
		gb.style.setProperty("background", "var(--interactive-normal)");
		gb.style.setProperty("color", "var(--text-normal)");
		gb.addEventListener("click", (e) => {
			e.stopPropagation();
			const g = Math.random().toString(36).substring(2, 8);
			ctx.updateMainBtnText(`🆔 ${g}`);
			onEdit(node, group.key, g);
		});
		subRow.appendChild(gb);
	} else if (group.key === "forbid") {
		const ci = document.createElement("input");
		ci.type = "text";
		ci.placeholder = "输入引用ID";
		ci.className = "edit-sub-btn";
		ci.style.setProperty("background", "var(--background-primary)");
		ci.style.setProperty("color", "var(--text-normal)");
		ci.style.setProperty("width", "120px");
		ci.addEventListener("click", (e) => e.stopPropagation());
		ci.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				const v = ci.value.trim();
				if (v) {
					ctx.updateMainBtnText(`⛔ ${v}`);
					onEdit(node, group.key, v);
				}
			}
		});
		subRow.appendChild(ci);

		const sb = document.createElement("button");
		sb.textContent = "选择";
		sb.className = "edit-sub-btn";
		sb.style.setProperty("background", "var(--interactive-normal)");
		sb.style.setProperty("color", "var(--text-normal)");
		sb.addEventListener("click", (e) => {
			e.stopPropagation();
			const editCtx = getEditContext();
			if (!editCtx?.getIdOptions) return;
			const idOpts = editCtx.getIdOptions();
			if (idOpts.length === 0) return;

			const existing = document.querySelector(".id-select-dropdown");
			if (existing) {
				existing.remove();
				return;
			}

			const dropdown = document.createElement("div");
			dropdown.className = "id-select-dropdown";
			const btnRect = sb.getBoundingClientRect();
			dropdown.style.setProperty("position", "fixed");
			dropdown.style.setProperty("z-index", "1000");
			dropdown.style.setProperty("left", btnRect.left + "px");
			dropdown.style.setProperty("top", btnRect.bottom + 4 + "px");
			dropdown.style.setProperty(
				"background",
				"var(--background-primary)",
			);
			dropdown.style.setProperty("backdrop-filter", "blur(8px)");
			dropdown.style.setProperty("-webkit-backdrop-filter", "blur(8px)");
			dropdown.style.setProperty(
				"border",
				"1px solid var(--background-modifier-border)",
			);
			dropdown.style.setProperty("border-radius", "4px");
			dropdown.style.setProperty("max-height", "200px");
			dropdown.style.setProperty("overflow-y", "auto");
			dropdown.style.setProperty(
				"box-shadow",
				"0 4px 12px rgba(0,0,0,0.3)",
			);
			dropdown.style.setProperty("min-width", "200px");

			idOpts.forEach((opt) => {
				const item = document.createElement("div");
				item.textContent = `${opt.id}: ${opt.desc}`;
				item.title = `${opt.id}: ${opt.desc}`;
				item.style.setProperty("padding", "4px 8px");
				item.style.setProperty("cursor", "pointer");
				item.style.setProperty("font-size", "11px");
				item.style.setProperty("white-space", "nowrap");
				item.style.setProperty("overflow", "hidden");
				item.style.setProperty("text-overflow", "ellipsis");
				item.style.setProperty("max-width", "350px");
				item.addEventListener("mouseenter", () =>
					item.style.setProperty(
						"background",
						"var(--background-modifier-hover)",
					),
				);
				item.addEventListener("mouseleave", () => {
					item.style.removeProperty("background");
				});
				item.addEventListener("mousedown", (ev) => {
					ev.preventDefault();
					ev.stopPropagation();
					ctx.updateMainBtnText(`⛔ ${opt.id}`);
					onEdit(node, group.key, opt.id);
					dropdown.remove();
				});
				dropdown.appendChild(item);
			});

			document.body.appendChild(dropdown);
			const closeDropdown = (ev: MouseEvent) => {
				if (!dropdown.contains(ev.target as Node)) {
					dropdown.remove();
					document.removeEventListener("mousedown", closeDropdown);
				}
			};
			setTimeout(
				() => document.addEventListener("mousedown", closeDropdown),
				0,
			);
		});
		subRow.appendChild(sb);
	} else if (group.key === "tag") {
		if (group.subOptions) {
			group.subOptions.forEach((opt) => {
				const b = document.createElement("button");
				b.textContent = opt;
				const ov = opt.replace("🏁 ", "");
				const ia =
					ctx.previewValue !== null
						? ctx.previewValue === ov
						: node.tag === ov;
				b.className = "edit-sub-btn";
				if (ia) {
					b.style.setProperty(
						"background",
						"var(--interactive-accent)",
					);
					b.style.setProperty("color", "white");
				} else {
					b.style.setProperty(
						"background",
						"var(--interactive-normal)",
					);
					b.style.setProperty("color", "var(--text-normal)");
				}
				b.addEventListener("click", (e) => {
					e.stopPropagation();
					ctx.updateMainBtnText(opt);
					onEdit(node, group.key, ov);
				});
				subRow.appendChild(b);
			});
		}
		const ci = document.createElement("input");
		ci.type = "text";
		ci.placeholder = "自定义";
		ci.className = "edit-sub-btn";
		ci.style.setProperty("background", "var(--background-primary)");
		ci.style.setProperty("color", "var(--text-normal)");
		ci.style.setProperty("width", "70px");
		ci.addEventListener("click", (e) => e.stopPropagation());
		ci.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				const v = ci.value.trim();
				if (v) {
					ctx.updateMainBtnText(`🏁 ${v}`);
					onEdit(node, group.key, v);
				}
			}
		});
		subRow.appendChild(ci);
	} else {
		// repeat 等
		if (group.subOptions) {
			group.subOptions.forEach((opt) => {
				const b = document.createElement("button");
				b.textContent = opt;
				const ia =
					ctx.previewValue !== null
						? ctx.previewValue === opt.replace("🔁 ", "")
						: getNodeMarkValue(node, group.key) ===
							opt.replace("🔁 ", "");
				b.className = "edit-sub-btn";
				if (ia) {
					b.style.setProperty(
						"background",
						"var(--interactive-accent)",
					);
					b.style.setProperty("color", "white");
				} else {
					b.style.setProperty(
						"background",
						"var(--interactive-normal)",
					);
					b.style.setProperty("color", "var(--text-normal)");
				}
				b.addEventListener("click", (e) => {
					e.stopPropagation();
					ctx.updateMainBtnText(opt);
					onEdit(node, group.key, opt);
				});
				subRow.appendChild(b);
			});
		}
		const ci = document.createElement("input");
		ci.type = "text";
		ci.placeholder = "自定义";
		ci.className = "edit-sub-btn";
		ci.style.setProperty("background", "var(--background-primary)");
		ci.style.setProperty("color", "var(--text-normal)");
		ci.style.setProperty("width", "70px");
		ci.addEventListener("click", (e) => e.stopPropagation());
		ci.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				const v = ci.value.trim();
				if (v) {
					ctx.updateMainBtnText(`${group.icon} ${v}`);
					onEdit(node, group.key, v);
				}
			}
		});
		subRow.appendChild(ci);
	}
}

// ========== 辅助UI函数（新增） ==========

function appendDeleteButton(
	node: TaskTreeNode,
	subRow: HTMLElement,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
): void {
	const onEdit = options.onEdit;
	const delBtn = document.createElement("button");
	delBtn.textContent = "删除";
	delBtn.className = "edit-del-btn";
	if (!ctx.hasOriginalMark) delBtn.style.setProperty("display", "none");
	delBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		onEdit(node, group.key, null);
	});
	subRow.appendChild(delBtn);
}

function appendRestoreButton(
	node: TaskTreeNode,
	subRow: HTMLElement,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
): void {
	const onEdit = options.onEdit;
	const restoreBtn = document.createElement("button");
	restoreBtn.textContent = "原文";
	restoreBtn.className = "edit-restore-btn";
	restoreBtn.title = "恢复为原始值";
	if (!ctx.hasChanged) restoreBtn.style.setProperty("display", "none");
	restoreBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		if (ctx.originalValue !== null)
			onEdit(node, group.key, ctx.originalValue);
		else onEdit(node, group.key, null);
	});
	subRow.appendChild(restoreBtn);
}

type SubRowBuilder = (
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
) => void;
const subRowBuilders: Record<string, SubRowBuilder> = {
	options: createOptionsSubRow,
	date: createDateSubRow,
	custom: createCustomSubRow,
};

export function createSubRow(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
): HTMLElement {
	const subRow = document.createElement("div");
	subRow.className = "edit-sub-row";
	const ctx = createSubRowContext(node, group, options, subRow);
	(ctx as any)._subRow = subRow;
	const builder = subRowBuilders[group.subType || "custom"];
	if (builder) builder(node, group, options, ctx);
	appendDeleteButton(node, subRow, group, options, ctx);
	appendRestoreButton(node, subRow, group, options, ctx);
	return subRow;
}

// ========== 预览行（修正：保持原始类名）==========

export function createPreviewRow(
	previewText: string,
	saved: boolean,
	onSave?: (() => void) | null,
	onRevert?: (() => void) | null,
	hasEdits?: boolean,
	onRestore?: (() => void) | null,
): HTMLElement {
	const row = document.createElement("div");
	row.className = "task-preview-row";

	const textSpan = document.createElement("span");
	textSpan.style.setProperty("color", "var(--text-muted)");

	if (saved) {
		row.style.setProperty("background", "rgba(71,133,47,0.15)");
		textSpan.textContent = `📝 已保存: ${previewText}`;
		row.appendChild(textSpan);
		if (onRevert) {
			const rb = document.createElement("button");
			rb.textContent = "撤回";
			rb.className = "edit-preview-btn";
			rb.addEventListener("click", (e) => {
				e.stopPropagation();
				onRevert();
			});
			row.appendChild(rb);
		}
	} else {
		row.style.setProperty("background", "rgba(127,184,240,0.1)");
		textSpan.textContent = `📝 预览: ${previewText}`;
		row.appendChild(textSpan);
		if (onSave) {
			const sb = document.createElement("button");
			sb.textContent = "保存";
			const ie = hasEdits !== undefined ? hasEdits : true;
			if (ie) {
				sb.className = "edit-preview-btn";
				sb.style.setProperty("background", "var(--interactive-accent)");
				sb.style.setProperty("color", "white");
			} else {
				sb.className = "edit-preview-btn";
			}
			if (!ie) {
				sb.addEventListener("mouseenter", () => {
					sb.style.setProperty(
						"background",
						"var(--interactive-accent)",
					);
					sb.style.setProperty("color", "white");
				});
				sb.addEventListener("mouseleave", () => {
					sb.style.setProperty(
						"background",
						"var(--interactive-normal)",
					);
					sb.style.setProperty("color", "var(--text-muted)");
				});
			}
			sb.addEventListener("click", (e) => {
				e.stopPropagation();
				onSave();
			});
			row.appendChild(sb);
		}
		if (onRestore) {
			const rb = document.createElement("button");
			rb.textContent = "原文";
			rb.className = "edit-preview-btn";
			rb.addEventListener("click", (e) => {
				e.stopPropagation();
				onRestore();
			});
			row.appendChild(rb);
		}
	}
	return row;
}

// ========== 复选框（未改动）==========

export function createCheckbox(
	checked: boolean,
	onChange: (checked: boolean) => void,
): HTMLElement {
	const cb = document.createElement("input");
	cb.type = "checkbox";
	cb.checked = checked;
	cb.className = "edit-checkbox";
	cb.addEventListener("click", (e) => e.stopPropagation());
	cb.addEventListener("change", () => onChange(cb.checked));
	return cb;
}
