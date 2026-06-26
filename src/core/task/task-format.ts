// src/core/task/task-format.ts
// src/core/task/task-format.ts
// 任务格式化 — HTML 内容构建，纯字符串拼接，不涉及 DOM

import { DateUtils, formatDisplayDate } from "../../util/date-utils";
import { STATUS_ICONS, STATUS_NAMES } from "../config/config";
import { removeHeadingNumber } from "../process/tree-view-process";
import { TaskTreeNode } from "./task-tree";

/** 任务类型显示标记 */
const TYPE_PREFIX: Record<string, string> = {
	file: "📄 ",
	heading: "",
	list: "● ",
};

/**
 * 构建详细模式元数据行 HTML（第二行）
 * 顺序：状态 → 优先级 → 循环 → 创建 → 计划 → 开始 → 取消 → 完成 → 截止 → id → forbid → tag → 文件名
 */

export function buildMetaRow(node: TaskTreeNode): string {
	const prioIcon = getPriorityIconStr(node);
	const zhName = getPriorityNameStr(node);
	const statusIcon = STATUS_ICONS[node.status] || "";
	const statusName = STATUS_NAMES[node.status] || "";
	const due = node.due ? formatDisplayDate(new Date(node.due)) : "";
	const scheduled = node.scheduled
		? formatDisplayDate(new Date(node.scheduled))
		: "";
	const start = node.starts ? formatDisplayDate(new Date(node.starts)) : "";
	const created = node.created
		? formatDisplayDate(new Date(node.created))
		: "";
	const done = node.done ? formatDisplayDate(new Date(node.done)) : "";
	const cancelled = node.cancelled
		? formatDisplayDate(new Date(node.cancelled))
		: "";
	const fileName = node.path.split("/").pop()?.replace(".md", "") || "";

	return [
		node.status !== "none"
			? `<span>${statusIcon} ${statusName}</span>`
			: "",
		prioIcon ? `<span>${prioIcon} ${zhName}</span>` : "",
		node.repeat ? `<span>🔁 ${node.repeat}</span>` : "",
		created ? `<span>➕ ${created}</span>` : "",
		scheduled ? `<span>⏳ ${scheduled}</span>` : "",
		start ? `<span>🛫 ${start}</span>` : "",
		cancelled ? `<span>❌ ${cancelled}</span>` : "",
		done ? `<span>✅ ${done}</span>` : "",
		due ? `<span>📅 ${due}</span>` : "",
		node.id ? `<span>🆔 ${node.id}</span>` : "",
		node.forbid ? `<span>⛔ ${node.forbid}</span>` : "",
		node.tag ? `<span>🏁 ${node.tag}</span>` : "",
		`<span>📄 ${fileName}</span>`,
	]
		.filter(Boolean)
		.join("");
}

/**
 * 构建 tooltip HTML
 * 顺序：状态 → 优先级 → 循环 → 创建 → 计划 → 开始 → 截止 → 完成 → 取消 → id → forbid → tag
 */
export function buildTooltip(node: TaskTreeNode): string {
	const parts: string[] = [];

	if (node.status !== "none") {
		parts.push(`${STATUS_ICONS[node.status]} ${STATUS_NAMES[node.status]}`);
	}

	if (node.priority !== 5) {
		const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
		const names = ["最高", "高", "中", "低", "最低"];
		const icon = icons[node.priority] || "";
		const name = names[node.priority] || "";
		parts.push(`${icon} ${name}`);
	}

	if (node.repeat) parts.push(`🔁 ${node.repeat}`);
	if (node.created)
		parts.push(`➕ ${DateUtils.formatDate(new Date(node.created))}`);
	if (node.scheduled)
		parts.push(`⏳ ${DateUtils.formatDate(new Date(node.scheduled))}`);
	if (node.starts)
		parts.push(`🛫 ${DateUtils.formatDate(new Date(node.starts))}`);
	if (node.due) parts.push(`📅 ${DateUtils.formatDate(new Date(node.due))}`);
	if (node.done)
		parts.push(`✅ ${DateUtils.formatDate(new Date(node.done))}`);
	if (node.cancelled)
		parts.push(`❌ ${DateUtils.formatDate(new Date(node.cancelled))}`);
	if (node.id) parts.push(`🆔 ${node.id}`);
	if (node.forbid) parts.push(`⛔ ${node.forbid}`);
	if (node.tag) parts.push(`🏁 ${node.tag}`);

	return parts.join("<br>");
}

/** 获取任务树节点显示文本（带类型标记） */
export function getDisplayText(node: TaskTreeNode): string {
	switch (node.type) {
		case "file":
			return "📄 " + node.text;
		case "heading":
			return "H" + (node.headingLevel || node.depth) + " " + node.text;
		case "list":
			return "● " + node.text;
		default:
			return node.text;
	}
}

/**
 * 构建描述文本
 * 标题任务去除 number headings 序号，所有模式添加类型标记
 */
export function buildDescription(
	node: TaskTreeNode,
	_compact: boolean,
): string {
	let text = node.text || node.content || "（无描述）";

	if (node.type === "heading") {
		text = removeHeadingNumber(text);
	}

	const prefix = TYPE_PREFIX[node.type] || "";
	if (prefix && !text.startsWith(prefix)) {
		text = prefix + text;
	}
	if (node.type === "heading") {
		const hPrefix = "H" + (node.headingLevel || node.depth) + " ";
		if (!text.startsWith(hPrefix)) {
			text = hPrefix + text;
		}
	}

	return text;
}

function getPriorityIconStr(node: TaskTreeNode): string {
	const icons = ["🔺", "⏫", "🔼", "🔽", "⏬", ""];
	return icons[node.priority] ?? "";
}

function getPriorityNameStr(node: TaskTreeNode): string {
	const names = ["最高", "高", "中", "低", "最低", "无"];
	return names[node.priority] ?? "无";
}
