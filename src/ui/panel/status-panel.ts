// src/ui/panel/status-panel.ts
import { STATUS_NAMES } from "../../core/config/config";
import { Store } from "../../core/store/store";

// 第一版兼容：暂不添加新状态，使用5种基础状态
const BASIC_STATUSES = [
	"todo",
	"scheduled",
	"in-progress",
	"completed",
	"cancelled",
];

// 面板按钮文字覆盖（仅影响面板显示，不改变全局 STATUS_NAMES）
const PANEL_STATUS_LABELS: Record<string, string> = {
	todo: "待办中",
	scheduled: "计划中",
	"in-progress": "进行中",
	completed: "已完成",
	cancelled: "已取消",
};

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
		row.createSpan({ text: "筛选状态", cls: "panel-label" });

		const selected = currentFilter.statuses || [];
		const noneSelected = selected.length === 0;

		const mainBtn = row.createEl("button", {
			text: "状态",
			cls: "panel-btn",
		});
		if (!noneSelected) mainBtn.addClass("active");

		mainBtn.onclick = () => {
			const st = this.store.getState();
			const pr = this.store.getActivePreset();
			if (!pr) return;
			const ns = noneSelected ? [...BASIC_STATUSES] : [];
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id
						? { ...p, filter: { ...pr.filter, statuses: ns } }
						: p,
				),
			});
		};

		const subPanel = row.createDiv({ cls: "panel-sub" });
		subPanel.style.cssText =
			"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";

		BASIC_STATUSES.forEach((st) => {
			const btn = subPanel.createEl("button", {
				text: PANEL_STATUS_LABELS[st] || STATUS_NAMES[st] || st,
				cls: "panel-btn sub-btn",
			});
			if (selected.includes(st)) btn.addClass("active");
			btn.onclick = () => {
				const st2 = this.store.getState();
				const p2 = this.store.getActivePreset();
				if (!p2) return;
				const ns = selected.includes(st)
					? selected.filter((s) => s !== st)
					: [...selected, st];
				this.store.update({
					presets: st2.presets.map((p) =>
						p.id === p2.id
							? { ...p, filter: { ...p2.filter, statuses: ns } }
							: p,
					),
				});
			};
		});
	}
}
