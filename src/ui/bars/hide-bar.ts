import { getDefaultFilter } from "../../configs/configs";
import { Store } from "../../store/store";

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

		const currentFilter =
			preset?.filter ?? state.draftFilter ?? getDefaultFilter();

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
		const currentFilter = state.draftFilter ?? preset.filter;
		const newFilter = { ...currentFilter, [key]: !currentFilter[key] };
		const newPresets = state.presets.map((p) =>
			p.id === preset.id ? { ...p, filter: newFilter } : p,
		);
		this.store.update({ presets: newPresets });
	}
}
