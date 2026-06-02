// src/ui/bars/excut-bar.ts
import { ALLOWED_STATUSES } from "../../configs/configs";
import { Store } from "../../store/store";

export class ExcutBar {
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
		if (!preset) return;

		const currentFilter = preset.filter;
		const row = this.container.createDiv({ cls: "filter-row" });
		row.createSpan({ text: "执行状态", cls: "filter-label" });

		const statusLabels: Record<string, string> = {
			todo: "未开始",
			planned: "计划中",
			"in-progress": "进行中",
			completed: "已完成",
			cancelled: "已取消",
		};

		ALLOWED_STATUSES.forEach((st) => {
			const btn = row.createEl("button", {
				text: statusLabels[st] || st,
				cls: "filter-btn",
			});
			if (currentFilter.statuses.includes(st)) btn.addClass("active");
			btn.onclick = () => {
				const state = this.store.getState();
				const preset = this.store.getActivePreset();
				if (!preset) return;
				const filter = preset.filter;
				const newStatuses = filter.statuses.includes(st)
					? filter.statuses.filter((s) => s !== st)
					: [...filter.statuses, st];
				const newPresets = state.presets.map((p) =>
					p.id === preset.id
						? { ...p, filter: { ...filter, statuses: newStatuses } }
						: p,
				);
				this.store.update({ presets: newPresets });
			};
		});
	}
}
