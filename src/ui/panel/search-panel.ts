// src/ui/panels/search-panel.ts
// 任务描述面板

import { Store } from "../../process/store/store";

export class SearchPanel {
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
		const row = this.container.createDiv({ cls: "panel-row" });
		row.createSpan({ text: "任务描述", cls: "panel-label" });
		const input = row.createEl("input", {
			type: "text",
			cls: "panel-input",
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
			const st = this.store.getState();
			const p = this.store.getActivePreset();
			if (!p) return;
			const nf = { ...p.filter, searchText: val || undefined };
			this.store.update({
				presets: st.presets.map((x) =>
					x.id === p.id ? { ...x, filter: nf } : x,
				),
			});
		});
	}
}
