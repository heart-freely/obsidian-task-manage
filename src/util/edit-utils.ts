// src/util/edit-utils.ts
// 编辑卡片通用工具函数

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

// ========== 工具函数 ==========

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

export function createEditBar(
	node: TaskTreeNode,
	options: EditBarOptions,
): HTMLElement {
	const bar = document.createElement("div");
	bar.className = "task-edit-bar";
	bar.style.cssText =
		"display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:0.8em;color:var(--text-muted);margin-top:4px;line-height:normal;";

	// 同步模式：非主任务隐藏编辑栏（仅在编辑模式下）
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

		if (isExpanded || isEdited) {
			btn.style.cssText = `all:unset;padding:1px 3px;border-radius:3px;cursor:pointer;font-size:inherit;font-family:inherit;line-height:1;background:var(--interactive-accent);color:white;display:inline-flex;align-items:center;border:1px solid var(--interactive-accent);outline:none;box-sizing:border-box;`;
		} else if (isHovered) {
			btn.style.cssText = `all:unset;padding:1px 3px;border-radius:3px;cursor:pointer;font-size:inherit;font-family:inherit;line-height:1;background:var(--background-modifier-hover);color:var(--text-normal);display:inline-flex;align-items:center;border:1px solid var(--background-modifier-border);outline:none;box-sizing:border-box;`;
		} else if (hasValue) {
			btn.style.cssText = `all:unset;padding:1px 3px;border-radius:3px;cursor:pointer;font-size:inherit;font-family:inherit;line-height:1;background:transparent;color:inherit;display:inline-flex;align-items:center;border:1px solid transparent;outline:none;box-sizing:border-box;`;
		} else if (options.isEditing) {
			btn.style.cssText = `all:unset;padding:1px 3px;border-radius:3px;cursor:pointer;font-size:inherit;font-family:inherit;line-height:1;background:transparent;color:inherit;display:inline-flex;align-items:center;border:1px solid transparent;outline:none;box-sizing:border-box;`;
		} else {
			btn.style.cssText = "display:none;";
		}
	}

	updateAllButtonStyles();

	const fileName = node.path.split("/").pop()?.replace(".md", "") || "";
	if (fileName) {
		const fileNameSpan = document.createElement("span");
		fileNameSpan.textContent = `📄 ${fileName}`;
		fileNameSpan.style.cssText =
			"padding:0;border:none;font-size:inherit;line-height:normal;color:inherit;display:inline-flex;align-items:center;";
		bar.appendChild(fileNameSpan);
	}

	if (options.expandedButton) {
		const group = EDIT_BUTTONS.find(
			(g) => g.key === options.expandedButton,
		);
		if (group) {
			const subRow = createSubRow(node, group, options);
			bar.appendChild(subRow);
		}
	}

	if (!options.isEditing && !options.expandedButton) {
		const hasAnyVisible = EDIT_BUTTONS.some((g) =>
			hasMarkValue(node, g.key),
		);
		if (!hasAnyVisible) bar.style.display = "none";
	}

	return bar;
}

// ========== 子行构建上下文 ==========

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
		btn.style.cssText =
			`padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;display:inline-flex;align-items:center;box-sizing:border-box;` +
			(isActive
				? "background:var(--interactive-accent);color:white;"
				: "background:var(--interactive-normal);color:var(--text-normal);");
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			const value =
				group.key === "status" ? STATUS_KEY_MAP[opt] || opt : opt;
			const allBtns = btn.parentElement?.querySelectorAll("button");
			allBtns?.forEach((b: Element) => {
				(b as HTMLElement).style.background =
					"var(--interactive-normal)";
				(b as HTMLElement).style.color = "var(--text-normal)";
			});
			btn.style.background = "var(--interactive-accent)";
			btn.style.color = "white";
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
	dateInput.style.cssText =
		"padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);" +
		"font-size:10px;font-family:inherit;line-height:16px;min-height:16px;" +
		"min-width:100px;box-sizing:border-box;" +
		"background:var(--background-primary);color:" +
		(currentValue ? "var(--text-normal)" : "var(--text-muted)") +
		";cursor:pointer;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;outline:none;";

	dateInput.addEventListener("change", () => {
		const val = dateInput.value;
		dateInput.style.color = val
			? "var(--text-normal)"
			: "var(--text-muted)";
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
		ci.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);font-size:10px;font-family:inherit;line-height:16px;min-height:16px;width:70px;box-sizing:border-box;background:var(--background-primary);color:var(--text-normal);";
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
		gb.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:var(--interactive-normal);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
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
		ci.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);font-size:10px;font-family:inherit;line-height:16px;min-height:16px;width:120px;box-sizing:border-box;background:var(--background-primary);color:var(--text-normal);";
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
		sb.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:var(--interactive-normal);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
		sb.addEventListener("click", (e) => {
			e.stopPropagation();
			const editCtx = getEditContext();
			if (!editCtx?.getIdOptions) return;
			const options = editCtx.getIdOptions();
			if (options.length === 0) return;

			const existing = document.querySelector(".id-select-dropdown");
			if (existing) {
				existing.remove();
				return;
			}

			const dropdown = document.createElement("div");
			dropdown.className = "id-select-dropdown";
			const btnRect = sb.getBoundingClientRect();
			dropdown.style.cssText = `position:fixed;z-index:1000;left:${btnRect.left}px;top:${btnRect.bottom + 4}px;background:var(--background-primary);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid var(--background-modifier-border);border-radius:4px;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.3);min-width:200px;`;
			options.forEach((opt) => {
				const item = document.createElement("div");
				item.textContent = `${opt.id}: ${opt.desc}`;
				item.title = `${opt.id}: ${opt.desc}`;
				item.style.cssText =
					"padding:4px 8px;cursor:pointer;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:350px;";
				item.addEventListener(
					"mouseenter",
					() =>
						(item.style.background =
							"var(--background-modifier-hover)"),
				);
				item.addEventListener(
					"mouseleave",
					() => (item.style.background = ""),
				);
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
				b.style.cssText =
					`padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;display:inline-flex;align-items:center;box-sizing:border-box;` +
					(ia
						? "background:var(--interactive-accent);color:white;"
						: "background:var(--interactive-normal);color:var(--text-normal);");
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
		ci.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);font-size:10px;font-family:inherit;line-height:16px;min-height:16px;width:70px;box-sizing:border-box;background:var(--background-primary);color:var(--text-normal);";
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
		if (group.subOptions) {
			group.subOptions.forEach((opt) => {
				const b = document.createElement("button");
				b.textContent = opt;
				const ia =
					ctx.previewValue !== null
						? ctx.previewValue === opt.replace("🔁 ", "")
						: getNodeMarkValue(node, group.key) ===
							opt.replace("🔁 ", "");
				b.style.cssText =
					`padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;display:inline-flex;align-items:center;box-sizing:border-box;` +
					(ia
						? "background:var(--interactive-accent);color:white;"
						: "background:var(--interactive-normal);color:var(--text-normal);");
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
		ci.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);font-size:10px;font-family:inherit;line-height:16px;min-height:16px;width:70px;box-sizing:border-box;background:var(--background-primary);color:var(--text-normal);";
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
	delBtn.style.cssText =
		"all:unset;padding:0px 3px;border-radius:3px;border:1px solid rgba(200,80,80,0.3);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:rgba(200,80,80,0.08);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
	if (!ctx.hasOriginalMark) delBtn.style.display = "none";
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
	restoreBtn.style.cssText =
		"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:var(--interactive-normal);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
	restoreBtn.title = "恢复为原始值";
	if (!ctx.hasChanged) restoreBtn.style.display = "none";
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
	subRow.style.cssText =
		"display:flex;flex-wrap:wrap;gap:1px;align-items:center;padding:1px 0;border-top:1px solid var(--background-modifier-border);width:100%;flex-basis:100%;";
	const ctx = createSubRowContext(node, group, options, subRow);
	(ctx as any)._subRow = subRow;
	const builder = subRowBuilders[group.subType || "custom"];
	if (builder) builder(node, group, options, ctx);
	appendDeleteButton(node, subRow, group, options, ctx);
	appendRestoreButton(node, subRow, group, options, ctx);
	return subRow;
}

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
	row.style.cssText =
		"margin-top:4px;padding:1px 4px;border-radius:3px;font-size:0.8em;display:flex;align-items:center;gap:2px;flex-wrap:wrap;";
	if (saved) {
		row.style.background = "rgba(71,133,47,0.15)";
		row.innerHTML = `<span style="color:var(--text-muted);">📝 已保存: ${escapeHtml(previewText)}</span>`;
		if (onRevert) {
			const rb = document.createElement("button");
			rb.textContent = "撤回";
			rb.style.cssText =
				"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:9px;font-family:inherit;line-height:14px;min-height:14px;background:var(--interactive-normal);color:var(--text-muted);display:inline-flex;align-items:center;box-sizing:border-box;";
			rb.addEventListener("click", (e) => {
				e.stopPropagation();
				onRevert();
			});
			row.appendChild(rb);
		}
	} else {
		row.style.background = "rgba(127,184,240,0.1)";
		row.innerHTML = `<span style="color:var(--text-muted);">📝 预览: ${escapeHtml(previewText)}</span>`;
		if (onSave) {
			const sb = document.createElement("button");
			sb.textContent = "保存";
			const ie = hasEdits !== undefined ? hasEdits : true;
			sb.style.cssText =
				`all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:9px;font-family:inherit;line-height:14px;min-height:14px;display:inline-flex;align-items:center;box-sizing:border-box;` +
				(ie
					? "background:var(--interactive-accent);color:white;"
					: "background:var(--interactive-normal);color:var(--text-muted);");
			if (!ie) {
				sb.addEventListener("mouseenter", () => {
					sb.style.background = "var(--interactive-accent)";
					sb.style.color = "white";
				});
				sb.addEventListener("mouseleave", () => {
					sb.style.background = "var(--interactive-normal)";
					sb.style.color = "var(--text-muted);";
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
			rb.style.cssText =
				"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:9px;font-family:inherit;line-height:14px;min-height:14px;background:var(--interactive-normal);color:var(--text-muted);display:inline-flex;align-items:center;box-sizing:border-box;";
			rb.addEventListener("click", (e) => {
				e.stopPropagation();
				onRestore();
			});
			row.appendChild(rb);
		}
	}
	return row;
}

export function createCheckbox(
	checked: boolean,
	onChange: (checked: boolean) => void,
): HTMLElement {
	const cb = document.createElement("input");
	cb.type = "checkbox";
	cb.checked = checked;
	cb.style.cssText =
		"margin:0 2px 0 0;flex-shrink:0;cursor:pointer;width:12px;height:12px;";
	cb.addEventListener("click", (e) => e.stopPropagation());
	cb.addEventListener("change", () => onChange(cb.checked));
	return cb;
}
