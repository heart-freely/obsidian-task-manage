// src/ui/view/inbox-view.ts
import { GlobalFilter } from "../../types";
import { BaseTaskView } from "./base-view";

export class InboxView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		filter.statuses = ["todo", "planned"];
		filter.hideRepeat = true;
		filter.hideCompleted = true;
		filter.hideCancelled = true;
		return filter;
	}
	protected renderEmpty() {
		this.container.createDiv({ text: "📭 暂无待办任务" });
	}
}
