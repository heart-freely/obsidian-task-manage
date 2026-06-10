// src/core/task/task-derived.ts

import { IntervalMode, TaskMarks } from "../../type/type";
import { STATUS_ICONS, STATUS_NAMES } from "../config/config";
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
