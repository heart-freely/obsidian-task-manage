// src/ui/panel/search-panel.ts
// 任务描述面板

import { Store } from "../../core/store/store";

export class SearchPanel {
	private container: HTMLElement;
	private store: Store;
	private currentValue: string = "";
	private unsub: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.unsub = store.subscribe(() => this.render());
		this.render();
	}

	destroy() {
		if (this.unsub) {
			this.unsub();
			this.unsub = null;
		}
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
			const newValue =
				this.currentValue || currentFilter.searchText || "";
			if (existingInput.value !== newValue) {
				existingInput.value = newValue;
			}
			return;
		}

		this.container.empty();
		const row = this.container.createDiv({ cls: "panel-row" });
		row.createSpan({ text: "筛选描述", cls: "panel-label" });

		const input = row.createEl("input", {
			type: "text",
			cls: "panel-input",
			attr: {
				placeholder:
					"输入关键词匹配筛选任务，多个关键词用空格分隔，回车搜索",
			},
		});
		input.style.width = "380px";
		input.value = this.currentValue || currentFilter.searchText || "";

		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				this.currentValue = input.value;
				this.applySearch();
			}
		});

		input.addEventListener("blur", () => {
			if (this.currentValue !== input.value) {
				this.currentValue = input.value;
				this.applySearch();
			}
		});
	}

	private applySearch() {
		const val = this.currentValue.trim();
		const st = this.store.getState();
		const p = this.store.getActivePreset();
		if (!p) return;
		const nf = { ...p.filter, searchText: val || undefined };
		this.store.update({
			presets: st.presets.map((x) =>
				x.id === p.id ? { ...x, filter: nf } : x,
			),
		});
	}
}
