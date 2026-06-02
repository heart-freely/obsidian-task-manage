// src/ui/bars/hide-bar.ts
import { Store } from "../../store/store";

const EXTENDED_TABLE_COLUMNS = [
	{ key: "status", label: "状态" },
	{ key: "content", label: "描述" },
	{ key: "priority", label: "优先级" },
	{ key: "repeat", label: "循环" },
	{ key: "created", label: "创建" },
	{ key: "scheduled", label: "计划" },
	{ key: "starts", label: "开始" },
	{ key: "due", label: "截止" },
	{ key: "done", label: "完成" },
	{ key: "cancel", label: "取消" },
	{ key: "tag", label: "标签" },
	{ key: "id", label: "唯一ID" },
	{ key: "forbid", label: "引用ID" },
];

const EXTENDED_DEFAULT_TABLE_COLUMNS: Record<string, boolean> = {
	status: true,
	content: true,
	priority: true,
	repeat: false,
	created: false,
	scheduled: true,
	starts: true,
	due: true,
	done: true,
	cancel: false,
	tag: false,
	id: false,
	forbid: false,
};

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

		const currentFilter = preset.filter;

		const updateFilter = (key: string) => {
			const state = this.store.getState();
			const preset = this.store.getActivePreset();
			if (!preset) return;
			const newFilter = {
				...preset.filter,
				[key]: !(preset.filter as any)[key],
			};
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, filter: newFilter } : p,
			);
			this.store.update({ presets: newPresets });
		};

		const row = this.container.createDiv({ cls: "bar-row" });
		row.createSpan({ text: "隐藏", cls: "filter-label" });

		const hideRepeat = currentFilter.hideRepeat === true;
		const repeatBtn = row.createEl("button", {
			text: hideRepeat ? "显示循环" : "隐藏循环",
			cls: "bar-btn",
		});
		if (hideRepeat) repeatBtn.addClass("active");
		repeatBtn.onclick = () => updateFilter("hideRepeat");

		const hideCompleted = currentFilter.hideCompleted === true;
		const completedBtn = row.createEl("button", {
			text: hideCompleted ? "显示已完成" : "隐藏已完成",
			cls: "bar-btn",
		});
		if (hideCompleted) completedBtn.addClass("active");
		completedBtn.onclick = () => updateFilter("hideCompleted");

		const hideCancelled = currentFilter.hideCancelled === true;
		const cancelledBtn = row.createEl("button", {
			text: hideCancelled ? "显示已取消" : "隐藏已取消",
			cls: "bar-btn",
		});
		if (hideCancelled) cancelledBtn.addClass("active");
		cancelledBtn.onclick = () => updateFilter("hideCancelled");

		const hideFolders = (currentFilter as any).hideFolders === true;
		const folderBtn = row.createEl("button", {
			text: hideFolders ? "显示文件夹" : "隐藏文件夹",
			cls: "bar-btn",
		});
		if (hideFolders) folderBtn.addClass("active");
		folderBtn.onclick = () => updateFilter("hideFolders");

		const colRow = this.container.createDiv({ cls: "bar-row" });
		colRow.createSpan({ text: "表格列", cls: "filter-label" });
		const columns = preset.tableColumns ?? EXTENDED_DEFAULT_TABLE_COLUMNS;
		EXTENDED_TABLE_COLUMNS.forEach((col) => {
			const isHidden = columns[col.key] === false;
			const btn = colRow.createEl("button", {
				text: isHidden ? `显示${col.label}` : `隐藏${col.label}`,
				cls: "bar-btn",
			});
			if (isHidden) btn.addClass("active");
			btn.onclick = () => {
				const state = this.store.getState();
				const preset = this.store.getActivePreset();
				if (!preset) return;
				const currentColumns =
					preset.tableColumns ?? EXTENDED_DEFAULT_TABLE_COLUMNS;
				const newColumns = {
					...currentColumns,
					[col.key]: !currentColumns[col.key],
				};
				const newPresets = state.presets.map((p) =>
					p.id === preset.id ? { ...p, tableColumns: newColumns } : p,
				);
				this.store.update({ presets: newPresets });
			};
		});
	}
}
