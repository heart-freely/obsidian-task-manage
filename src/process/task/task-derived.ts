// src/process/task/task-derived.ts

import { IntervalMode, TaskMarks } from "../../types";
import { STATUS_ICONS, STATUS_NAMES } from "../config/config";
import { DateUtils } from "../process";
import { TaskTreeNode } from "./task-tree";

export function getTaskMarks(node: TaskTreeNode): TaskMarks {
	return {
		priority: node.priority !== 5,
		repeat: node.repeat !== "",
		created: node.created !== null,
		scheduled: node.scheduled !== null,
		starts: node.starts !== null,
		due: node.due !== null,
		done: node.done !== null,
		cancelled: node.cancelled !== null,
		tag: node.tag !== "",
		id: node.id !== "",
		forbid: node.forbid !== "",
	};
}

export function getTaskTimeRange(
	node: TaskTreeNode,
	mode: IntervalMode = "scheduled-due",
): { start: number; end: number } | null {
	if (mode === "none") return null;

	if (mode === "any-date") {
		const dates = [
			node.created,
			node.scheduled,
			node.starts,
			node.due,
			node.done,
			node.cancelled,
		].filter((d): d is number => d !== null);
		if (dates.length === 0) return null;
		return { start: Math.min(...dates), end: Math.max(...dates) };
	}

	if (mode === "starts-done") {
		const start = node.starts;
		const end = node.done ?? node.cancelled;
		if (start === null || end === null) return null;
		return { start: Math.min(start, end), end: Math.max(start, end) };
	}

	const start = node.scheduled;
	const end = node.due;
	if (start === null || end === null) return null;
	return { start: Math.min(start, end), end: Math.max(start, end) };
}

export function buildTaskTooltip(node: TaskTreeNode): string {
	const parts: string[] = [];

	parts.push(`${STATUS_ICONS[node.status]} ${STATUS_NAMES[node.status]}`);
	if (node.priority !== 5) {
		const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
		parts.push(icons[node.priority] || "");
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
	if (node.tag) parts.push(`🏁 ${node.tag}`);
	if (node.id) parts.push(`🆔 ${node.id}`);
	if (node.forbid) parts.push(`⛔ ${node.forbid}`);

	return parts.join("<br>");
}

export function getFileName(node: TaskTreeNode): string {
	return node.path.split("/").pop()?.replace(/\.md$/, "") ?? "";
}

export function getStatusIcon(node: TaskTreeNode): string {
	return STATUS_ICONS[node.status] ?? "🔲";
}

export function getStatusName(node: TaskTreeNode): string {
	return STATUS_NAMES[node.status] ?? node.status;
}

export function getPriorityIcon(node: TaskTreeNode): string {
	const icons = ["🔺", "⏫", "🔼", "🔽", "⏬", ""];
	return icons[node.priority] ?? "";
}

export function getPriorityName(node: TaskTreeNode): string {
	const names = ["最高", "高", "中", "低", "最低", "无"];
	return names[node.priority] ?? "无";
}
