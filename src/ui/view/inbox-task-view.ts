// src/ui/main/inbox-view.ts
import { GlobalFilter } from "../../type/type";
import { BaseTaskView } from "./base-task-view";

export class InboxView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		// 修复：planned → scheduled
		filter.statuses = ["todo", "scheduled"];
		return filter;
	}
	protected renderEmpty() {
		this.container.createDiv({ text: "📭 暂无待办任务" });
	}
}
