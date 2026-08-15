// src/util/edit-utils.ts

import { parseTaskLine } from "../core/parser/tasks-parser";
import { TaskTreeNode } from "../core/task/task-tree";
import { getEditContext } from "../ui/main/card/card";
import { createEl } from "./dom-utils";

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
	const p = (n: number) => (n < 10 ? "0" + n : n);
	return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
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
	const pt = options.previewText;
	if (!pt || pt === node.rawLine) return false;
	return (
		extractMarkFromText(node.rawLine, key) !== extractMarkFromText(pt, key)
	);
}

function extractMarkFromText(line: string, key: string): string {
	switch (key) {
		case "status": {
			const m = line.match(/^- \[(.)\]/);
			if (!m) return "none";
			const map: Record<string, string> = {
				" ": "todo",
				"?": "scheduled",
				">": "in-progress",
				"/": "in-progress",
				"\\": "in-progress",
				x: "completed",
				X: "completed",
				"-": "cancelled",
			};
			return map[m[1]] || "none";
		}
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			for (const i of icons) if (line.includes(i)) return i;
			return "";
		}
		case "repeat": {
			const m = line.match(
				/🔁\s*(every\s+.+?)(?=\s*[➕⏳🛫📅✅❌🏁🆔⛔]|$)/u,
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
			const m = rawLine.match(/^- \[(.)\]/);
			if (!m) return null;
			const map: Record<string, string> = {
				" ": "todo",
				"?": "scheduled",
				">": "in-progress",
				"/": "in-progress",
				"\\": "in-progress",
				x: "completed",
				X: "completed",
				"-": "cancelled",
			};
			return map[m[1]] || null;
		}
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			for (const i of icons) if (rawLine.includes(i)) return i;
			return null;
		}
		case "repeat": {
			const m = rawLine.match(
				/🔁\s*(every\s+.+?)(?=\s*[➕⏳🛫📅✅❌🏁🆔⛔]|$)/u,
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
			return `${icons[node.priority] || ""} ${names[node.priority] || ""}`;
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
			return `${extracted} ${names[extracted] || ""}`;
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
	const bar = createEl("div");
	bar.className = "task-edit-bar";
	const editCtx = getEditContext();
	if (
		options.isEditing &&
		editCtx?.syncMode &&
		editCtx.primaryTaskUid !== node.uid
	) {
		bar.addClass("task-hidden");
		return bar;
	}
	let hoveredButtonKey: string | null = null;
	bar.addEventListener("mouseleave", () => {
		hoveredButtonKey = null;
		updateAllButtonStyles();
	});
	const buttons: Array<{ btn: HTMLElement; group: EditButtonGroup }> = [];
	EDIT_BUTTONS.forEach((group) => {
		const btn = createEl("button");
		btn.className = "edit-btn";
		const hasValue = hasMarkValue(node, group.key);
		const isEdited = hasMarkBeenEdited(node, group.key, options);
		btn.textContent =
			isEdited && options.previewText
				? getMarkDisplayTextFromLine(options.previewText, group.key) ||
					`${group.icon} ${group.label}`
				: hasValue
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
			window.setTimeout(() => {
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
		btn.removeClass(
			"edit-btn-active",
			"edit-btn-hover",
			"edit-btn-default",
			"edit-btn-hidden",
		);
		if (isExpanded || isEdited) btn.addClass("edit-btn-active");
		else if (isHovered) btn.addClass("edit-btn-hover");
		else if (hasValue || options.isEditing)
			btn.addClass("edit-btn-default");
		else btn.addClass("edit-btn-hidden");
	}
	updateAllButtonStyles();
	const fileName = node.path.split("/").pop()?.replace(".md", "") || "";
	if (fileName) {
		const fs = createEl("span");
		fs.textContent = `📄 ${fileName}`;
		fs.className = "edit-file-name";
		bar.appendChild(fs);
	}
	if (options.expandedButton) {
		const g = EDIT_BUTTONS.find((x) => x.key === options.expandedButton);
		if (g) bar.appendChild(createSubRow(node, g, options));
	}
	if (
		!options.isEditing &&
		!options.expandedButton &&
		!EDIT_BUTTONS.some((g) => hasMarkValue(node, g.key))
	)
		bar.addClass("task-hidden");
	return bar;
}

interface SubRowContext {
	getMainBtn: () => HTMLElement | null;
	updateMainBtnText: (text: string) => void;
	originalValue: string | null;
	hasOriginalMark: boolean;
	previewValue: string | null;
	hasChanged: boolean;
	_subRow?: HTMLElement;
}

function createSubRowContext(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
	subRow: HTMLElement,
): SubRowContext {
	return {
		getMainBtn: () =>
			(
				subRow.closest<HTMLElement>(".task-edit-bar")
			)?.querySelector(
				`[data-mark-key="${group.key}"]`,
			) as HTMLElement | null,
		updateMainBtnText: (t) => {
			const mb = (
				subRow.closest<HTMLElement>(".task-edit-bar")
			)?.querySelector(
				`[data-mark-key="${group.key}"]`,
			) as HTMLElement | null;
			if (mb && t) mb.textContent = t;
		},
		originalValue: extractOriginalMarkValue(node.rawLine, group.key),
		hasOriginalMark:
			extractOriginalMarkValue(node.rawLine, group.key) !== null &&
			extractOriginalMarkValue(node.rawLine, group.key) !== "",
		previewValue: options.previewText
			? extractMarkFromText(options.previewText, group.key)
			: null,
		hasChanged:
			extractOriginalMarkValue(node.rawLine, group.key) !==
			(options.previewText
				? extractMarkFromText(options.previewText, group.key)
				: null),
	};
}

function createOptionsSubRow(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
): void {
	if (!group.subOptions) return;
	const subRow = ctx._subRow!;
	group.subOptions.forEach((opt) => {
		const btn = createEl("button");
		btn.textContent = opt;
		btn.className = "edit-sub-btn";
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
		if (isActive) btn.addClass("edit-sub-btn-active");
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			const value =
				group.key === "status" ? STATUS_KEY_MAP[opt] || opt : opt;
			btn.parentElement
				?.querySelectorAll("button")
				.forEach((b) =>
					(b as HTMLElement).removeClass("edit-sub-btn-active"),
				);
			btn.addClass("edit-sub-btn-active");
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
			} else ctx.updateMainBtnText(opt);
			options.onEdit(node, group.key, value);
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
	const subRow = ctx._subRow!;
	let cv: string | null = null;
	if (options.previewText) {
		const ex = extractMarkFromText(options.previewText, group.key);
		if (ex) cv = ex;
	}
	if (!cv) cv = getNodeMarkValue(node, group.key);
	const di = createEl("input");
	di.type = "date";
	di.value = cv || "";
	di.className = "edit-date-input";
	di.addClass(cv ? "edit-date-input-has-value" : "edit-date-input-empty");
	di.addEventListener("change", () => {
		const v = di.value;
		di.removeClass("edit-date-input-has-value", "edit-date-input-empty");
		di.addClass(v ? "edit-date-input-has-value" : "edit-date-input-empty");
		ctx.updateMainBtnText(
			v ? `${group.icon} ${v}` : `${group.icon} ${group.label}`,
		);
		options.onEdit(node, group.key, v || null);
	});
	di.addEventListener("click", (e) => e.stopPropagation());
	subRow.appendChild(di);
}

function createCustomSubRow(
	node: TaskTreeNode,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
): void {
	const subRow = ctx._subRow!;
	const onEdit = options.onEdit;
	if (group.key === "id") {
		const ci = createEl("input");
		ci.type = "text";
		ci.placeholder = "自定义";
		ci.className = "edit-sub-btn edit-sub-btn-input";
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
		const gb = createEl("button");
		gb.textContent = "生成";
		gb.className = "edit-sub-btn";
		gb.addEventListener("click", (e) => {
			e.stopPropagation();
			const g = Math.random().toString(36).substring(2, 8);
			ctx.updateMainBtnText(`🆔 ${g}`);
			onEdit(node, group.key, g);
		});
		subRow.appendChild(gb);
	} else if (group.key === "forbid") {
		const ci = createEl("input");
		ci.type = "text";
		ci.placeholder = "输入引用ID";
		ci.className = "edit-sub-btn edit-sub-btn-input";
		ci.addClass("task-w-30");
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
		const sb = createEl("button");
		sb.textContent = "选择";
		sb.className = "edit-sub-btn";
		sb.addEventListener("click", (e) => {
			e.stopPropagation();
			const ec = getEditContext();
			if (!ec?.getIdOptions) return;
			const io = ec.getIdOptions();
			if (io.length === 0) return;
			const ex = document.querySelector(".id-select-dropdown");
			if (ex) {
				ex.remove();
				return;
			}
			const dd = createEl("div");
			dd.className = "id-select-dropdown task-id-select-dropdown";
			const br = sb.getBoundingClientRect();
			dd.setCssProps({
				"--task-dropdown-left": br.left + "px",
				"--task-dropdown-top": br.bottom + 4 + "px",
			});
			io.forEach((opt) => {
				const item = createEl("div");
				item.textContent = `${opt.id}: ${opt.desc}`;
				item.title = `${opt.id}: ${opt.desc}`;
				item.className = "task-id-select-item";
				item.addEventListener("mouseenter", () =>
					item.addClass("task-bg-hover"),
				);
				item.addEventListener("mouseleave", () =>
					item.removeClass("task-bg-hover"),
				);
				item.addEventListener("mousedown", (ev) => {
					ev.preventDefault();
					ev.stopPropagation();
					ctx.updateMainBtnText(`⛔ ${opt.id}`);
					onEdit(node, group.key, opt.id);
					dd.remove();
				});
				dd.appendChild(item);
			});
			document.body.appendChild(dd);
			const cd = (ev: MouseEvent) => {
				if (!dd.contains(ev.target as Node)) {
					dd.remove();
					document.removeEventListener("mousedown", cd);
				}
			};
			window.setTimeout(
				() => document.addEventListener("mousedown", cd),
				0,
			);
		});
		subRow.appendChild(sb);
	} else {
		const ci = createEl("input");
		ci.type = "text";
		ci.placeholder = "自定义";
		ci.className = "edit-sub-btn edit-sub-btn-input";
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
	const db = createEl("button");
	db.textContent = "删除";
	db.className = "edit-del-btn";
	if (!ctx.hasOriginalMark) db.addClass("task-hidden");
	db.addEventListener("click", (e) => {
		e.stopPropagation();
		options.onEdit(node, group.key, null);
	});
	subRow.appendChild(db);
}
function appendRestoreButton(
	node: TaskTreeNode,
	subRow: HTMLElement,
	group: EditButtonGroup,
	options: EditBarOptions,
	ctx: SubRowContext,
): void {
	const rb = createEl("button");
	rb.textContent = "原文";
	rb.className = "edit-restore-btn";
	rb.title = "恢复为原始值";
	if (!ctx.hasChanged) rb.addClass("task-hidden");
	rb.addEventListener("click", (e) => {
		e.stopPropagation();
		if (ctx.originalValue !== null)
			options.onEdit(node, group.key, ctx.originalValue);
		else options.onEdit(node, group.key, null);
	});
	subRow.appendChild(rb);
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
	const sr = createEl("div");
	sr.className = "edit-sub-row";
	const ctx = createSubRowContext(node, group, options, sr);
	ctx._subRow = sr;
	const b = subRowBuilders[group.subType || "custom"];
	if (b) b(node, group, options, ctx);
	appendDeleteButton(node, sr, group, options, ctx);
	appendRestoreButton(node, sr, group, options, ctx);
	return sr;
}

export function createPreviewRow(
	previewText: string,
	saved: boolean,
	onSave?: (() => void) | null,
	onRevert?: (() => void) | null,
	hasEdits?: boolean,
	onRestore?: (() => void) | null,
): HTMLElement {
	const row = createEl("div");
	row.className = "task-preview-row";
	row.addClass(
		saved ? "task-edit-preview-saved" : "task-edit-preview-unsaved",
	);
	const ts = createEl("span");
	ts.className = "edit-preview-text";
	if (saved) {
		ts.textContent = `📝 已保存: ${previewText}`;
		row.appendChild(ts);
		if (onRevert) {
			const rb = createEl("button");
			rb.textContent = "撤回";
			rb.className = "edit-preview-btn";
			rb.addEventListener("click", (e) => {
				e.stopPropagation();
				onRevert();
			});
			row.appendChild(rb);
		}
	} else {
		ts.textContent = `📝 预览: ${previewText}`;
		row.appendChild(ts);
		if (onSave) {
			const sb = createEl("button");
			sb.textContent = "保存";
			sb.className = "edit-preview-btn";
			if (hasEdits) sb.addClass("edit-preview-btn-save");
			sb.addEventListener("click", (e) => {
				e.stopPropagation();
				onSave();
			});
			row.appendChild(sb);
		}
		if (onRestore) {
			const rb = createEl("button");
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

export function createCheckbox(
	checked: boolean,
	onChange: (checked: boolean) => void,
): HTMLElement {
	const cb = createEl("input");
	cb.type = "checkbox";
	cb.checked = checked;
	cb.className = "edit-checkbox";
	cb.addEventListener("click", (e) => e.stopPropagation());
	cb.addEventListener("change", () => onChange(cb.checked));
	return cb;
}
