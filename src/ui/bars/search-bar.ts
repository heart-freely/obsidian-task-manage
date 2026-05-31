// src/ui/bars/search-bar.ts
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";

export class SearchBar {
	private container: HTMLElement;
	private store: Store;
	private currentValue: string = "";

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.store.subscribe(() => this.render());
		this.render();
	}

	render() {
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const currentFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? this.defaultFilter();

		// 若已存在输入框，仅同步值，不重新创建
		const existingInput = this.container.querySelector(
			"input",
		) as HTMLInputElement;
		if (existingInput) {
			existingInput.value =
				this.currentValue || currentFilter.searchText || "";
			return;
		}

		this.container.empty();
		const row = this.container.createDiv({ cls: "filter-row" });
		row.createSpan({ text: "任务描述", cls: "filter-label" });
		const input = row.createEl("input", {
			type: "text",
			cls: "filter-input",
			attr: {
				placeholder: "输入任务描述关键词，多个用空格分隔，如：xxx xxx",
				size: "40",
			},
		});
		input.style.width = "320px";
		input.value = this.currentValue || currentFilter.searchText || "";
		input.addEventListener("input", () => {
			this.currentValue = input.value;
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
