// src/ui/bars/hide-bar.ts
import {
	DEFAULT_TABLE_COLUMNS,
	getDefaultFilter,
	TABLE_COLUMNS,
} from "../../configs/configs";
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";

export class HideBar {
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

		const currentFilter: GlobalFilter =
			state.draftFilter ?? preset.filter ?? getDefaultFilter();

		// 原有隐藏按钮：循环、已完成、已取消、文件夹
		const row = this.container.createDiv({ cls: "bar-row" });
		row.createSpan({ text: "隐藏", cls: "filter-label" }); // 去除冒号

		const repeatBtn = row.createEl("button", {
			text: currentFilter.hideRepeat ? "显示循环" : "隐藏循环",
			cls: "bar-btn",
		});
		repeatBtn.onclick = () => this.toggleFilter("hideRepeat");

		const completedBtn = row.createEl("button", {
			text: currentFilter.hideCompleted ? "显示已完成" : "隐藏已完成",
			cls: "bar-btn",
		});
		completedBtn.onclick = () => this.toggleFilter("hideCompleted");

		const cancelledBtn = row.createEl("button", {
			text: currentFilter.hideCancelled ? "显示已取消" : "隐藏已取消",
			cls: "bar-btn",
		});
		cancelledBtn.onclick = () => this.toggleFilter("hideCancelled");

		const folderBtn = row.createEl("button", {
			text: (currentFilter as any).hideFolders
				? "显示文件夹"
				: "隐藏文件夹",
			cls: "bar-btn",
		});
		folderBtn.onclick = () => this.toggleFilter("hideFolders");

		// 表格列显隐控制
		const colRow = this.container.createDiv({ cls: "bar-row" });
		colRow.createSpan({ text: "表格列", cls: "filter-label" }); // 去除冒号
		const columns = preset.tableColumns ?? DEFAULT_TABLE_COLUMNS;
		TABLE_COLUMNS.forEach((col) => {
			const isVisible = columns[col.key] !== false;
			const btn = colRow.createEl("button", {
				text: isVisible ? col.label : `隐藏${col.label}`,
				cls: "bar-btn",
			});
			if (!isVisible) btn.classList.add("active");
			btn.onclick = () => this.toggleTableColumn(col.key);
		});
	}

	private toggleFilter(key: string) {
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		if (!preset) return;
		const currentFilter: GlobalFilter =
			state.draftFilter ?? preset.filter ?? this.getDefaultFilter();
		const newFilter = {
			...currentFilter,
			[key]: !(currentFilter as any)[key],
		};
		this.store.update({ draftFilter: newFilter });
	}

	private toggleTableColumn(colKey: string) {
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;
		const columns = { ...(preset.tableColumns ?? DEFAULT_TABLE_COLUMNS) };
		columns[colKey] = !columns[colKey];
		const newPresets = state.presets.map((p) =>
			p.id === preset.id ? { ...p, tableColumns: columns } : p,
		);
		this.store.update({ presets: newPresets });
	}

	private getDefaultFilter(): GlobalFilter {
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
