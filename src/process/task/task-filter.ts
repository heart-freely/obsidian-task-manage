// src/process/task/task-filter.ts
// 扁平任务筛选——纯函数

import { GlobalFilter, TaskItem } from "../../types";
import { ALL_MARKS, PRIORITY_ORDER, REPEAT_ORDER } from "../config/config";

/**
 * 对扁平任务数组进行筛选
 */
export function filterTasks(
	tasks: TaskItem[],
	filter: GlobalFilter,
	intervalMode?: string,
): TaskItem[] {
	let result = tasks;

	// 日期范围筛选
	if (
		!filter.dateRange.isAll &&
		filter.dateRange.start != null &&
		filter.dateRange.end != null
	) {
		const start = filter.dateRange.start;
		const end = filter.dateRange.end;
		const mode = intervalMode || "scheduled-due";

		result = result.filter((t: TaskItem) => {
			let tStart: number | null = null;
			let tEnd: number | null = null;

			if (mode === "starts-done") {
				tStart = t._starts ? new Date(t._starts).getTime() : null;
				tEnd = t._done
					? new Date(t._done).getTime()
					: t._due
						? new Date(t._due).getTime()
						: null;
			} else {
				tStart = t._scheduled ? new Date(t._scheduled).getTime() : null;
				tEnd = t._due
					? new Date(t._due).getTime()
					: t._done
						? new Date(t._done).getTime()
						: null;
			}

			if (!tStart || !tEnd) return false;
			return tStart <= end && tEnd >= start;
		});
	}

	// 状态筛选
	if (filter.statuses && filter.statuses.length > 0) {
		result = result.filter((t: TaskItem) =>
			filter.statuses.includes(t._status),
		);
	}

	// 标记筛选
	const allMarksList = [...ALL_MARKS];
	if (
		filter.includeMarks &&
		filter.includeMarks.length > 0 &&
		filter.includeMarks.length < allMarksList.length
	) {
		result = result.filter((t: TaskItem) =>
			filter.includeMarks!.some((m: string) => t._marks?.[m]),
		);
	}

	// 隐藏循环
	if (filter.hideRepeat) {
		result = result.filter((t: TaskItem) => !t._repeat);
	}

	// 隐藏已完成
	if (filter.hideCompleted) {
		result = result.filter((t: TaskItem) => t._status !== "completed");
	}

	// 隐藏已取消
	if (filter.hideCancelled) {
		result = result.filter((t: TaskItem) => t._status !== "cancelled");
	}

	// 根路径筛选
	if (filter.rootPath) {
		result = result.filter((t: TaskItem) =>
			t.path?.startsWith(filter.rootPath!),
		);
	}

	// 搜索文本
	if (filter.searchText) {
		const kw = filter.searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		if (kw.length > 0) {
			result = result.filter((t: TaskItem) => {
				const d = (t._cleanText || t.text || "").toLowerCase();
				return kw.every((k) => d.includes(k));
			});
		}
	}

	// 优先级筛选
	const allPriorityIcons = [...PRIORITY_ORDER];
	if (
		filter.priorityValues &&
		filter.priorityValues.length > 0 &&
		filter.priorityValues.length < allPriorityIcons.length
	) {
		result = result.filter(
			(t: TaskItem) =>
				t._priorityIcon &&
				filter.priorityValues!.includes(t._priorityIcon),
		);
	}

	// 循环周期筛选
	const allRepeatCycles = [...REPEAT_ORDER];
	if (
		filter.repeatCycles &&
		filter.repeatCycles.length > 0 &&
		filter.repeatCycles.length < allRepeatCycles.length
	) {
		result = result.filter((t: TaskItem) => {
			if (!t._repeat) return false;
			return filter.repeatCycles!.some((c: string) =>
				t._repeat.toLowerCase().includes(c),
			);
		});
	}

	return result;
}
