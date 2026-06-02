// src/ui/views/today-view.ts
import { GlobalFilter } from "../../types";
import { BaseTaskView } from "./base-view";

export class TodayView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		filter.statuses = ["todo", "planned", "in-progress"];
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
		filter.hideRepeat = true;
		filter.hideCompleted = true;
		filter.hideCancelled = true;
		return filter;
	}

	protected renderEmpty() {
		this.container.createDiv({ text: "📅 今天没有符合条件的任务" });
	}
}
