// src/ui/bars/search-bar.ts
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";

export class SearchBar {
	private container: HTMLElement;
	private store: Store;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.store.subscribe(() => this.render());
		this.render();
	}

	render() {
		this.container.empty();
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const currentFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? this.defaultFilter();

		const row = this.container.createDiv({ cls: "filter-row" });
		row.createSpan({ text: "任务描述", cls: "filter-label" });
		const input = row.createEl("input", {
			type: "text",
			cls: "filter-input",
			attr: { placeholder: "输入任务描述关键词…" },
		});
		input.value = currentFilter.searchText || "";
		input.addEventListener("input", () => {
			const val = input.value.trim();
			const newFilter = {
				...currentFilter,
				searchText: val || undefined,
			};
			this.store.update({ draftFilter: newFilter });
		});
	}

	private defaultFilter(): GlobalFilter {
		return {
			dateRange: { start: null, end: null, isAll: true },
			statuses: [
				"todo",
				"planned",
				"in-progress",
				"completed",
				"cancelled",
			],
			includeMarks: [],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		};
	}
}
