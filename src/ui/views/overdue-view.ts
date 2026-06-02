// src/ui/views/overdue-view.ts
import { GlobalFilter } from "../../types";
import { BaseTaskView } from "./base-view";

export class OverdueView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		filter.statuses = ["todo", "planned", "in-progress"];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		filter.dateRange = {
			start: null,
			end: today.getTime() - 1,
			isAll: false,
		};
		filter.hideRepeat = true;
		filter.hideCompleted = true;
		filter.hideCancelled = true;
		return filter;
	}

	protected renderEmpty() {
		this.container.createDiv({ text: "⏰ 暂无逾期任务" });
	}
}
