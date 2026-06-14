// src/util/edit-utils.ts
// 编辑卡片通用工具函数

import { TaskTreeNode } from "../../../core/task/task-tree";

// ========== 编辑按钮组定义 ==========

export interface EditButtonGroup {
	key: string;
	icon: string;
	label: string;
	hasSub: boolean;
	subType?: "options" | "date" | "custom";
	subOptions?: string[];
}

// 顺序与 TASK_ELEMENT_ORDER / buildMetaRow 一致
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

// ========== 编辑行 DOM ==========

export interface EditBarOptions {
	expandedButton: string | null;
	onEdit: (node: TaskTreeNode, markKey: string, value: string | null) => void;
	previewText?: string | null;
	isEditing?: boolean;
}

function hasMarkValue(node: TaskTreeNode, key: string): boolean {
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
			const symbol = match[1];
			const statusMap: Record<string, string> = {
				" ": "todo",
				"?": "scheduled",
				">": "in-progress",
				"/": "in-progress",
				"\\": "in-progress",
				x: "completed",
				X: "completed",
				"-": "cancelled",
			};
			return statusMap[symbol] || "none";
		}
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			for (const icon of icons) {
				if (line.includes(icon)) return icon;
			}
			return "";
		}
		case "repeat": {
			const match = line.match(
				/🔁\s*(every\s+.+?)(?=\s*[➕⏳🛫📅✅❌🏁🆔⛔]|$)/,
			);
			return match ? match[1].trim() : "";
		}
		case "created": {
			const match = line.match(/➕\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : "";
		}
		case "scheduled": {
			const match = line.match(/⏳\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : "";
		}
		case "starts": {
			const match = line.match(/🛫\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : "";
		}
		case "due": {
			const match = line.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : "";
		}
		case "done": {
			const match = line.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : "";
		}
		case "cancelled": {
			const match = line.match(/❌\s*(\d{4}-\d{2}-\d{2})?/);
			return match ? match[1] || "已取消" : "";
		}
		case "tag": {
			const match = line.match(/🏁\s*(\S+)/);
			return match ? match[1] : "";
		}
		case "id": {
			const match = line.match(/🆔\s*(\S+)/);
			return match ? match[1] : "";
		}
		case "forbid": {
			const match = line.match(/⛔\s*([^\s,]+(?:,\s*[^\s,]+)*)/);
			return match ? match[1].replace(/\s/g, "") : "";
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
			const symbol = match[1];
			const statusMap: Record<string, string> = {
				" ": "todo",
				"?": "scheduled",
				">": "in-progress",
				"/": "in-progress",
				"\\": "in-progress",
				x: "completed",
				X: "completed",
				"-": "cancelled",
			};
			return statusMap[symbol] || null;
		}
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			for (const icon of icons) {
				if (rawLine.includes(icon)) return icon;
			}
			return null;
		}
		case "repeat": {
			const match = rawLine.match(
				/🔁\s*(every\s+.+?)(?=\s*[➕⏳🛫📅✅❌🏁🆔⛔]|$)/,
			);
			return match ? match[1].trim() : null;
		}
		case "created": {
			const match = rawLine.match(/➕\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : null;
		}
		case "scheduled": {
			const match = rawLine.match(/⏳\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : null;
		}
		case "starts": {
			const match = rawLine.match(/🛫\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : null;
		}
		case "due": {
			const match = rawLine.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : null;
		}
		case "done": {
			const match = rawLine.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
			return match ? match[1] : null;
		}
		case "cancelled": {
			const match = rawLine.match(/❌\s*(\d{4}-\d{2}-\d{2})?/);
			return match ? match[1] || "" : null;
		}
		case "tag": {
			const match = rawLine.match(/🏁\s*(\S+)/);
			return match ? match[1] : null;
		}
		case "id": {
			const match = rawLine.match(/🆔\s*(\S+)/);
			return match ? match[1] : null;
		}
		case "forbid": {
			const match = rawLine.match(/⛔\s*([^\s,]+(?:,\s*[^\s,]+)*)/);
			return match ? match[1].replace(/\s/g, "") : null;
		}
		default:
			return null;
	}
}

function getMarkDisplayText(node: TaskTreeNode, key: string): string {
	switch (key) {
		case "status": {
			const emoji = STATUS_EMOJI_MAP[node.status] || "";
			const name = STATUS_LABEL_MAP[node.status] || "";
			return `${emoji} ${name}`;
		}
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			const names = ["最高", "高", "中", "低", "最低"];
			const icon = icons[node.priority] || "";
			const name = names[node.priority] || "";
			return `${icon} ${name}`;
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

export function createEditBar(
	node: TaskTreeNode,
	options: EditBarOptions,
): HTMLElement {
	const bar = document.createElement("div");
	bar.className = "task-edit-bar";
	bar.style.cssText =
		"display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:0.8em;color:var(--text-muted);margin-top:4px;line-height:normal;";

	let hoveredButtonKey: string | null = null;

	bar.addEventListener("mouseleave", () => {
		hoveredButtonKey = null;
		updateAllButtonStyles();
	});

	const buttons: Array<{ btn: HTMLElement; group: EditButtonGroup }> = [];

	EDIT_BUTTONS.forEach((group) => {
		const btn = document.createElement("button");
		const hasValue = hasMarkValue(node, group.key);

		btn.textContent = hasValue
			? getMarkDisplayText(node, group.key)
			: `${group.icon} ${group.label}`;

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
		buttons.forEach(({ btn, group }) => {
			updateButtonStyle(btn, group);
		});
	}

	function updateButtonStyle(btn: HTMLElement, group: EditButtonGroup) {
		const isExpanded = options.expandedButton === group.key;
		const isHovered = hoveredButtonKey === group.key;
		const isEdited = hasMarkBeenEdited(node, group.key, options);
		const hasValue = hasMarkValue(node, group.key);

		if (isExpanded || isEdited) {
			btn.style.cssText = `
				all:unset;
				padding:1px 3px;border-radius:3px;cursor:pointer;
				font-size:inherit;font-family:inherit;line-height:1;background:var(--interactive-accent);color:white;
				display:inline-flex;align-items:center;
				border:1px solid var(--interactive-accent);outline:none;
				box-sizing:border-box;
			`;
		} else if (isHovered) {
			btn.style.cssText = `
				all:unset;
				padding:1px 3px;border-radius:3px;cursor:pointer;
				font-size:inherit;font-family:inherit;line-height:1;background:var(--background-modifier-hover);color:var(--text-normal);
				display:inline-flex;align-items:center;
				border:1px solid var(--background-modifier-border);outline:none;
				box-sizing:border-box;
			`;
		} else if (hasValue) {
			btn.style.cssText = `
				all:unset;
				padding:1px 3px;border-radius:3px;cursor:pointer;
				font-size:inherit;font-family:inherit;line-height:1;background:transparent;color:inherit;
				display:inline-flex;align-items:center;
				border:1px solid transparent;outline:none;
				box-sizing:border-box;
			`;
		} else if (options.isEditing) {
			btn.style.cssText = `
				all:unset;
				padding:1px 3px;border-radius:3px;cursor:pointer;
				font-size:inherit;font-family:inherit;line-height:1;background:transparent;color:inherit;
				display:inline-flex;align-items:center;
				border:1px solid transparent;outline:none;
				box-sizing:border-box;
			`;
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

	return bar;
}

export function createSubRow(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
): HTMLElement {
	const subRow = document.createElement("div");
	subRow.className = "edit-sub-row";
	subRow.style.cssText =
		"display:flex;flex-wrap:wrap;gap:1px;align-items:center;padding:1px 0;border-top:1px solid var(--background-modifier-border);width:100%;flex-basis:100%;";

	const onEdit = options.onEdit;

	if (group.subType === "options" && group.subOptions) {
		group.subOptions.forEach((opt) => {
			const btn = document.createElement("button");
			btn.textContent = opt;
			btn.style.cssText =
				"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:var(--interactive-normal);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				if (group.key === "status") {
					onEdit(node, group.key, STATUS_KEY_MAP[opt] || opt);
				} else {
					onEdit(node, group.key, opt);
				}
			});
			subRow.appendChild(btn);
		});
	}

	if (group.subType === "date") {
		const dateInput = document.createElement("input");
		dateInput.type = "date";
		dateInput.value = getTodayStr();
		dateInput.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);font-size:10px;font-family:inherit;line-height:16px;min-height:16px;width:120px;box-sizing:border-box;background:var(--background-primary);color:var(--text-normal);";
		dateInput.addEventListener("change", () =>
			onEdit(node, group.key, dateInput.value),
		);
		dateInput.addEventListener("click", (e) => e.stopPropagation());
		subRow.appendChild(dateInput);

		const todayBtn = document.createElement("button");
		todayBtn.textContent = "今天";
		todayBtn.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:var(--interactive-normal);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
		todayBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			onEdit(node, group.key, getTodayStr());
		});
		subRow.appendChild(todayBtn);
	}

	if (group.subType === "custom") {
		if (group.key === "id") {
			const genBtn = document.createElement("button");
			genBtn.textContent = "生成";
			genBtn.style.cssText =
				"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:var(--interactive-normal);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
			genBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				onEdit(
					node,
					group.key,
					Math.random().toString(36).substring(2, 8),
				);
			});
			subRow.appendChild(genBtn);
		}

		const customInput = document.createElement("input");
		customInput.type = "text";
		customInput.placeholder = "自定义";
		customInput.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);font-size:10px;font-family:inherit;line-height:16px;min-height:16px;width:70px;box-sizing:border-box;background:var(--background-primary);color:var(--text-normal);";
		customInput.addEventListener("click", (e) => e.stopPropagation());
		subRow.appendChild(customInput);

		const applyBtn = document.createElement("button");
		applyBtn.textContent = "应用";
		applyBtn.style.cssText =
			"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:var(--interactive-normal);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
		applyBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			const val = customInput.value.trim();
			if (val) onEdit(node, group.key, val);
		});
		subRow.appendChild(applyBtn);
	}

	const delBtn = document.createElement("button");
	delBtn.textContent = "删除";
	delBtn.style.cssText =
		"all:unset;padding:0px 3px;border-radius:3px;border:1px solid rgba(200,80,80,0.3);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:rgba(200,80,80,0.08);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
	delBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		onEdit(node, group.key, null);
	});
	subRow.appendChild(delBtn);

	const restoreBtn = document.createElement("button");
	restoreBtn.textContent = "恢复";
	restoreBtn.style.cssText =
		"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:10px;font-family:inherit;line-height:16px;min-height:16px;background:var(--interactive-normal);color:var(--text-normal);display:inline-flex;align-items:center;box-sizing:border-box;";
	restoreBtn.title = "恢复为原始值";
	restoreBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		const originalValue = extractOriginalMarkValue(node.rawLine, group.key);
		if (originalValue !== null) {
			onEdit(node, group.key, originalValue);
		} else {
			onEdit(node, group.key, null);
		}
	});
	subRow.appendChild(restoreBtn);

	return subRow;
}

// ========== 预览行 DOM ==========

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
			const revertBtn = document.createElement("button");
			revertBtn.textContent = "撤回";
			revertBtn.style.cssText =
				"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:9px;font-family:inherit;line-height:14px;min-height:14px;background:var(--interactive-normal);color:var(--text-muted);display:inline-flex;align-items:center;box-sizing:border-box;";
			revertBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				onRevert();
			});
			row.appendChild(revertBtn);
		}
	} else {
		row.style.background = "rgba(127,184,240,0.1)";
		row.innerHTML = `<span style="color:var(--text-muted);">📝 预览: ${escapeHtml(previewText)}</span>`;
		if (onSave) {
			const saveBtn = document.createElement("button");
			saveBtn.textContent = "保存";
			const isEdited = hasEdits !== undefined ? hasEdits : true;
			saveBtn.style.cssText =
				"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:9px;font-family:inherit;line-height:14px;min-height:14px;display:inline-flex;align-items:center;box-sizing:border-box;" +
				(isEdited
					? "background:var(--interactive-accent);color:white;"
					: "background:var(--interactive-normal);color:var(--text-muted);");
			if (!isEdited) {
				saveBtn.addEventListener("mouseenter", () => {
					saveBtn.style.background = "var(--interactive-accent)";
					saveBtn.style.color = "white";
				});
				saveBtn.addEventListener("mouseleave", () => {
					saveBtn.style.background = "var(--interactive-normal)";
					saveBtn.style.color = "var(--text-muted);";
				});
			}
			saveBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				onSave();
			});
			row.appendChild(saveBtn);
		}
		if (onRestore) {
			const restoreBtn = document.createElement("button");
			restoreBtn.textContent = "恢复";
			restoreBtn.style.cssText =
				"all:unset;padding:0px 3px;border-radius:3px;border:1px solid var(--background-modifier-border);cursor:pointer;font-size:9px;font-family:inherit;line-height:14px;min-height:14px;background:var(--interactive-normal);color:var(--text-muted);display:inline-flex;align-items:center;box-sizing:border-box;";
			restoreBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				onRestore();
			});
			row.appendChild(restoreBtn);
		}
	}

	return row;
}

// ========== 勾选框 DOM ==========

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
