// src/core/task/task-filter.ts

import { GlobalFilter } from "../../type/type";
import { ALL_MARKS, PRIORITY_ORDER, REPEAT_ORDER } from "../config/config";
import { getTaskMarks } from "./task-derived";
import { TaskTreeNode } from "./task-tree";

export function filterTasks(
	nodes: TaskTreeNode[],
	filter: GlobalFilter,
	intervalMode?: string,
): TaskTreeNode[] {
	let result = nodes;
	if (
		!filter.dateRange.isAll &&
		filter.dateRange.start != null &&
		filter.dateRange.end != null
	) {
		const s = filter.dateRange.start,
			e = filter.dateRange.end;
		const m = intervalMode || "scheduled-due";
		result = result.filter((node) => {
			let ts: number | null = null,
				te: number | null = null;
			if (m === "starts-done") {
				ts = node.starts;
				te = node.done ?? node.due;
			} else {
				ts = node.scheduled;
				te = node.due ?? node.done;
			}
			return ts !== null && te !== null && ts <= e && te >= s;
		});
	}
	if (filter.statuses?.length)
		result = result.filter((node) => filter.statuses.includes(node.status));
	if (
		filter.includeMarks?.length &&
		filter.includeMarks.length < ALL_MARKS.length
	)
		result = result.filter((node) => {
			const marks = getTaskMarks(node);
			return filter.includeMarks.some(
				(m) => marks[m],
			);
		});
	if (filter.rootPath)
		result = result.filter((node) =>
			node.path?.startsWith(filter.rootPath),
		);
	if (filter.searchText) {
		const kw = filter.searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		if (kw.length)
			result = result.filter((node) => {
				const d = (node.content || node.text || "").toLowerCase();
				return kw.every((k) => d.includes(k));
			});
	}
	if (
		filter.priorityValues?.length &&
		filter.priorityValues.length < PRIORITY_ORDER.length
	)
		result = result.filter((node) => {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			const icon = icons[node.priority] || "";
			return icon && filter.priorityValues.includes(icon);
		});
	if (
		filter.repeatCycles?.length &&
		filter.repeatCycles.length < REPEAT_ORDER.length
	)
		result = result.filter((node) => {
			if (!node.repeat) return false;
			return filter.repeatCycles.some((c) =>
				node.repeat.toLowerCase().includes(c),
			);
		});
	return result;
}
