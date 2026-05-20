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

	// 3. 标记筛选（选中参与过滤：任务必须包含所有选中的标记）
	if (filter.includeMarks && filter.includeMarks.length > 0) {
		result = result.filter((t: any) =>
			filter.includeMarks!.every((m: string) => t._marks?.[m]),
		);
	}
	// 排除标记逻辑已移除（根据最新需求，未选中的标记不参与过滤）

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

	return result;
}
