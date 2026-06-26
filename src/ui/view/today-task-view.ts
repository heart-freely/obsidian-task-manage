// src/ui/main/today-view.ts
import { GlobalFilter } from "../../type/type";
import { BaseTaskView } from "./base-task-view";

export class TodayView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		// 修复：planned → scheduled
		filter.statuses = ["todo", "scheduled", "in-progress"];
		const today = new Date();
		filter.dateRange = {
			start: new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
			).getTime(),
			end: new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
				23,
				59,
				59,
				999,
			).getTime(),
			isAll: false,
		};
		return filter;
	}
	protected renderEmpty() {
		this.container.createDiv({ text: "📅 今天没有符合条件的任务" });
	}
}
