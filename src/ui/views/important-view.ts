// src/ui/views/important-view.ts
import { GlobalFilter } from "../../types";
import { BaseTaskView } from "./base-view";

export class ImportantView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		filter.statuses = ["todo", "planned", "in-progress"];
		filter.hideRepeat = true;
		filter.hideCompleted = true;
		filter.hideCancelled = true;
		filter.priorityValues = ["🔺", "⏫", "🔼"];
		return filter;
	}

	protected renderEmpty() {
		this.container.createDiv({ text: "⭐ 暂无重要任务" });
	}
}
