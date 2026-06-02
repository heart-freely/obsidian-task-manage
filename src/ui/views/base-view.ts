// src/ui/views/base-view.ts
import { filterTasks } from "../../process/bars/bars-process";
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";

export abstract class BaseTaskView {
	protected container: HTMLElement;
	protected store: Store;
	protected app: any;
	protected unsub?: () => void;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.unsub = store.subscribe(() => this.render());
	}

	abstract render(): Promise<void>;

	destroy() {
		if (this.unsub) this.unsub();
	}

	protected filterTasks(
		tasks: any[],
		filter: GlobalFilter,
		intervalMode?: string,
	): any[] {
		return filterTasks(tasks, filter, intervalMode);
	}

	protected getDefaultFilter(): GlobalFilter {
		return {
			dateRange: { start: null, end: null, isAll: true },
			statuses: ["todo", "planned", "in-progress"],
			includeMarks: [],
			excludeMarks: [],
			hideRepeat: true,
			hideCompleted: true,
			hideCancelled: true,
			rootPath: null,
		};
	}
}
