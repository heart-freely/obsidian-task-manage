// src/process/task/task-filter.ts

import { GlobalFilter } from "../../types";
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
		const start = filter.dateRange.start;
		const end = filter.dateRange.end;
		const mode = intervalMode || "scheduled-due";

		result = result.filter((node) => {
			let tStart: number | null = null;
			let tEnd: number | null = null;

			if (mode === "starts-done") {
				tStart = node.starts;
				tEnd = node.done ?? node.due;
			} else {
				tStart = node.scheduled;
				tEnd = node.due ?? node.done;
			}

			if (tStart === null || tEnd === null) return false;
			return tStart <= end && tEnd >= start;
		});
	}

	if (filter.statuses && filter.statuses.length > 0) {
		result = result.filter((node) => filter.statuses.includes(node.status));
	}

	if (
		filter.includeMarks &&
		filter.includeMarks.length > 0 &&
		filter.includeMarks.length < ALL_MARKS.length
	) {
		result = result.filter((node) => {
			const marks = getTaskMarks(node);
			return filter.includeMarks!.some(
				(m) => marks[m as keyof typeof marks],
			);
		});
	}

	if (filter.hideRepeat) {
		result = result.filter((node) => !node.repeat);
	}

	if (filter.hideCompleted) {
		result = result.filter((node) => node.status !== "completed");
	}

	if (filter.hideCancelled) {
		result = result.filter((node) => node.status !== "cancelled");
	}

	if (filter.rootPath) {
		result = result.filter((node) =>
			node.path?.startsWith(filter.rootPath!),
		);
	}

	if (filter.searchText) {
		const kw = filter.searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		if (kw.length > 0) {
			result = result.filter((node) => {
				const d = (node.content || node.text || "").toLowerCase();
				return kw.every((k) => d.includes(k));
			});
		}
	}

	if (
		filter.priorityValues &&
		filter.priorityValues.length > 0 &&
		filter.priorityValues.length < PRIORITY_ORDER.length
	) {
		result = result.filter((node) => {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			const icon = icons[node.priority] || "";
			return icon && filter.priorityValues!.includes(icon);
		});
	}

	if (
		filter.repeatCycles &&
		filter.repeatCycles.length > 0 &&
		filter.repeatCycles.length < REPEAT_ORDER.length
	) {
		result = result.filter((node) => {
			if (!node.repeat) return false;
			return filter.repeatCycles!.some((c) =>
				node.repeat.toLowerCase().includes(c),
			);
		});
	}

	return result;
}
