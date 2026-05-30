// src/tasks/process/filter-task-process.ts
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

	// 3. 标记筛选（选中参与过滤）
	if (filter.includeMarks && filter.includeMarks.length > 0) {
		result = result.filter((t: any) =>
			filter.includeMarks!.every((m: string) => t._marks?.[m]),
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

	// 6. 搜索文本过滤（匹配 _cleanText 或 text）
	if (filter.searchText) {
		const keyword = filter.searchText.toLowerCase();
		result = result.filter((t: any) => {
			const desc = (t._cleanText || t.text || "").toLowerCase();
			return desc.includes(keyword);
		});
	}

	// 7. 优先级具体值过滤（对应 MarkBar 子按钮）
	if (filter.priorityValues && filter.priorityValues.length > 0) {
		result = result.filter(
			(t: any) =>
				t._priorityIcon &&
				filter.priorityValues!.includes(t._priorityIcon),
		);
	}

	// 8. 循环周期具体值过滤（对应 MarkBar 子按钮）
	if (filter.repeatCycles && filter.repeatCycles.length > 0) {
		result = result.filter((t: any) => {
			if (!t._repeat) return false;
			return filter.repeatCycles!.some((cycle: string) =>
				t._repeat.toLowerCase().includes(cycle),
			);
		});
	}

	return result;
}
