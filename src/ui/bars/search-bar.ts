// src/ui/bars/search-bar.ts
import { Store } from "../../store/store";

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
		if (!preset) return;

		const currentFilter = preset.filter;

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
				placeholder: "输入任务描述关键词，多个用空格分隔",
				size: "40",
			},
		});
		input.style.width = "320px";
		input.value = this.currentValue || currentFilter.searchText || "";
		input.addEventListener("input", () => {
			this.currentValue = input.value;
			const val = input.value.trim();
			const state = this.store.getState();
			const preset = this.store.getActivePreset();
			if (!preset) return;
			const newFilter = {
				...preset.filter,
				searchText: val || undefined,
			};
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, filter: newFilter } : p,
			);
			this.store.update({ presets: newPresets });
		});
	}
}
