// src/ui/main/inbox-view.ts
import { GlobalFilter } from "../../../type/type";
import { BaseTaskView } from "./base-task-preset";

export class InboxView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		// 修复：planned → scheduled
		filter.statuses = ["todo", "scheduled"];
		filter.hideRepeat = true;
		filter.hideCompleted = true;
		filter.hideCancelled = true;
		return filter;
	}
	protected renderEmpty() {
		this.container.createDiv({ text: "📭 暂无待办任务" });
	}
}
