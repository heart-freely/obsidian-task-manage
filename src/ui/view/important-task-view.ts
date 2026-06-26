// src/ui/main/important-view.ts
import { GlobalFilter } from "../../type/type";
import { BaseTaskView } from "./base-task-view";

export class ImportantView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		// 修复：planned → scheduled
		filter.statuses = ["todo", "scheduled", "in-progress"];
		filter.priorityValues = ["🔺", "⏫", "🔼"];
		return filter;
	}
	protected renderEmpty() {
		this.container.createDiv({ text: "⭐ 暂无重要任务" });
	}
}
