// src/ui/main/all-view.ts
import { GlobalFilter } from "../../type/type";
import { BaseTaskView } from "./base-task-view";

export class AllTasksView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		return super.getDefaultFilter();
	}
}
