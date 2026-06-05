// src/ui/views/future-view.ts
import { GlobalFilter } from "../../types";
import { BaseTaskView } from "./base-view";

export class FutureView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		filter.statuses = ["todo", "planned", "in-progress"];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const futureEnd = new Date(today);
		futureEnd.setDate(futureEnd.getDate() + 15);
		futureEnd.setHours(23, 59, 59, 999);
		filter.dateRange = {
			start: today.getTime(),
			end: futureEnd.getTime(),
			isAll: false,
		};
		filter.hideRepeat = true;
		filter.hideCompleted = true;
		filter.hideCancelled = true;
		return filter;
	}

	protected renderEmpty() {
		this.container.createDiv({ text: "🔜 暂无未来任务" });
	}
}
