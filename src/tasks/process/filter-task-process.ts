// src/tasks/process/filter-task-process.ts
import { ALL_MARKS, PRIORITY_ORDER, REPEAT_ORDER } from "../../configs/configs";
import { GlobalFilter } from "../../types";

export function filterTasks(tasks: any[], filter: GlobalFilter): any[] {
	let result = tasks;

	// 1. 日期范围筛选
	if (
		!filter.dateRange.isAll &&
		filter.dateRange.start != null &&
		filter.dateRange.end != null
	) {
		const start = filter.dateRange.start;
		const end = filter.dateRange.end;
		result = result.filter((t: any) => {
			if (!t._cachedTimeRange) return false;
			return (
				t._cachedTimeRange.start <= end &&
				t._cachedTimeRange.end >= start
			);
		});
	}

	// 2. 状态筛选
	if (filter.statuses && filter.statuses.length > 0) {
		result = result.filter((t: any) => filter.statuses.includes(t._status));
	}

	// 3. 标记筛选（"或"逻辑）
	// 仅当未全选时过滤；全选时允许无标记任务通过
	const allMarksList = [...ALL_MARKS];
	if (
		filter.includeMarks &&
		filter.includeMarks.length > 0 &&
		filter.includeMarks.length < allMarksList.length
	) {
		result = result.filter((t: any) =>
			filter.includeMarks!.some((m: string) => t._marks?.[m]),
		);
	}

	// 4. 显示/隐藏切换
	if (filter.hideRepeat) {
		result = result.filter((t: any) => !t._repeat);
	}
	if (filter.hideCompleted) {
		result = result.filter((t: any) => t._status !== "completed");
	}
	if (filter.hideCancelled) {
		result = result.filter((t: any) => t._status !== "cancelled");
	}

	// 5. 文件夹路径过滤
	if (filter.rootPath) {
		result = result.filter((t: any) =>
			t.path?.startsWith(filter.rootPath!),
		);
	}

	// 6. 搜索文本过滤（多段关键字，空格分隔，逻辑为"且"）
	if (filter.searchText) {
		const keywords = filter.searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);

		if (keywords.length > 0) {
			result = result.filter((t: any) => {
				const desc = (t._cleanText || t.text || "").toLowerCase();
				return keywords.every((kw) => desc.includes(kw));
			});
		}
	}

	// 7. 优先级具体值过滤
	// 仅当未全选时过滤；全选时允许无优先级任务通过
	const allPriorityIcons = [...PRIORITY_ORDER];
	if (
		filter.priorityValues &&
		filter.priorityValues.length > 0 &&
		filter.priorityValues.length < allPriorityIcons.length
	) {
		result = result.filter(
			(t: any) =>
				t._priorityIcon &&
				filter.priorityValues!.includes(t._priorityIcon),
		);
	}

	// 8. 循环周期具体值过滤
	// 仅当未全选时过滤；全选时允许无循环任务通过
	const allRepeatCycles = [...REPEAT_ORDER];
	if (
		filter.repeatCycles &&
		filter.repeatCycles.length > 0 &&
		filter.repeatCycles.length < allRepeatCycles.length
	) {
		result = result.filter((t: any) => {
			if (!t._repeat) return false;
			return filter.repeatCycles!.some((cycle: string) =>
				t._repeat.toLowerCase().includes(cycle),
			);
		});
	}

	return result;
}
