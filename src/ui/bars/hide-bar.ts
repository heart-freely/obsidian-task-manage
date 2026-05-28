// src/ui/bars/hide-bar.ts
import { getDefaultFilter } from "../../configs/configs";
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

		const row = this.container.createDiv({ cls: "bar-row" });
		row.createSpan({ text: "隐藏：", cls: "filter-label" });

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
