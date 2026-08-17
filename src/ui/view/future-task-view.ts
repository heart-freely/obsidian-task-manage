// src/ui/main/future-view.ts
import { GlobalFilter } from "../../type/type";
import { BaseTaskView } from "./base-task-view";

export class FutureView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		// 修复：planned → scheduled
		filter.statuses = ["todo", "scheduled", "in-progress"];
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
		return filter;
	}
	protected renderEmpty() {
		this.container.empty();
		this.container.createDiv({ text: "🔜 暂无未来任务", cls: "task-empty-message" });
	}
}
