// src/ui/view/all-view.ts
import { GlobalFilter } from "../../types";
import { BaseTaskView } from "./base-view";

export class AllTasksView extends BaseTaskView {
	getDefaultFilter(): GlobalFilter {
		return super.getDefaultFilter();
	}
}
