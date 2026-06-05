// src/ui/panel/status-panel.ts
// 任务状态面板

import { ALLOWED_STATUSES } from "../../process/config/config";
import { Store } from "../../process/store/store";

export class StatusPanel {
	private container: HTMLElement;
	private store: Store;
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
		this.container.empty();
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		if (!preset) return;
		const currentFilter = preset.filter;
		const row = this.container.createDiv({ cls: "panel-row" });
		row.createSpan({ text: "执行状态", cls: "panel-label" });

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
				cls: "panel-btn",
			});
			if (currentFilter.statuses.includes(st)) btn.addClass("active");
			btn.onclick = () => {
				const st2 = this.store.getState();
				const p2 = this.store.getActivePreset();
				if (!p2) return;
				const f = p2.filter;
				const ns = f.statuses.includes(st)
					? f.statuses.filter((s) => s !== st)
					: [...f.statuses, st];
				this.store.update({
					presets: st2.presets.map((p) =>
						p.id === p2.id
							? { ...p, filter: { ...f, statuses: ns } }
							: p,
					),
				});
			};
		});
	}
}
