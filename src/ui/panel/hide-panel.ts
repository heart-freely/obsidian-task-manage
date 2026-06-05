// src/ui/panels/hide-panel.ts
// 视图隐藏面板

import {
	DEFAULT_TABLE_COLUMNS,
	TABLE_COLUMNS,
} from "../../process/config/config";
import { Store } from "../../process/store/store";

export class HidePanel {
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

		const updateFilter = (key: string) => {
			const st = this.store.getState();
			const pr = this.store.getActivePreset();
			if (!pr) return;
			const nf = { ...pr.filter, [key]: !(pr.filter as any)[key] };
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id ? { ...p, filter: nf } : p,
				),
			});
		};

		const row = this.container.createDiv({ cls: "panel-row" });
		row.createSpan({ text: "隐藏", cls: "panel-label" });

		const hideRepeat = currentFilter.hideRepeat === true;
		const repeatBtn = row.createEl("button", {
			text: hideRepeat ? "显示循环" : "隐藏循环",
			cls: "panel-btn",
		});
		if (hideRepeat) repeatBtn.addClass("active");
		repeatBtn.onclick = () => updateFilter("hideRepeat");

		const hideCompleted = currentFilter.hideCompleted === true;
		const completedBtn = row.createEl("button", {
			text: hideCompleted ? "显示已完成" : "隐藏已完成",
			cls: "panel-btn",
		});
		if (hideCompleted) completedBtn.addClass("active");
		completedBtn.onclick = () => updateFilter("hideCompleted");

		const hideCancelled = currentFilter.hideCancelled === true;
		const cancelledBtn = row.createEl("button", {
			text: hideCancelled ? "显示已取消" : "隐藏已取消",
			cls: "panel-btn",
		});
		if (hideCancelled) cancelledBtn.addClass("active");
		cancelledBtn.onclick = () => updateFilter("hideCancelled");

		const hideFolders = (currentFilter as any).hideFolders === true;
		const folderBtn = row.createEl("button", {
			text: hideFolders ? "显示文件夹" : "隐藏文件夹",
			cls: "panel-btn",
		});
		if (hideFolders) folderBtn.addClass("active");
		folderBtn.onclick = () => updateFilter("hideFolders");

		const colRow = this.container.createDiv({ cls: "panel-row" });
		colRow.createSpan({ text: "表格列", cls: "panel-label" });
		const columns = preset.tableColumns ?? DEFAULT_TABLE_COLUMNS;
		TABLE_COLUMNS.forEach((col) => {
			const isHidden = columns[col.key] === false;
			const btn = colRow.createEl("button", {
				text: isHidden ? `显示${col.label}` : `隐藏${col.label}`,
				cls: "panel-btn",
			});
			if (isHidden) btn.addClass("active");
			btn.onclick = () => {
				const st = this.store.getState();
				const pr = this.store.getActivePreset();
				if (!pr) return;
				const cc = pr.tableColumns ?? DEFAULT_TABLE_COLUMNS;
				const nc = { ...cc, [col.key]: !cc[col.key] };
				this.store.update({
					presets: st.presets.map((p) =>
						p.id === pr.id ? { ...p, tableColumns: nc } : p,
					),
				});
			};
		});
	}
}
