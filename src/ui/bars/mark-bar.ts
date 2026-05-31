// src/ui/bars/mark-bar.ts
import {
	getDefaultFilter,
	MARK_NAMES,
	PRIORITY_ORDER,
	REPEAT_ORDER,
} from "../../configs/configs";
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";

const MARK_GROUPS: { label: string; keys: string[] }[] = [
	{ label: "优先级", keys: ["priority"] },
	{ label: "循环", keys: ["repeat"] },
	{
		label: "日期",
		keys: ["created", "scheduled", "starts", "due", "done", "cancel"],
	},
	{ label: "标签", keys: ["tag"] },
	{ label: "依赖", keys: ["id", "forbid"] },
];

const PRIORITY_ICONS = [...PRIORITY_ORDER].reverse();

export class MarkBar {
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
		const currentFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? getDefaultFilter();

		MARK_GROUPS.forEach((group) => {
			const row = this.container.createDiv({ cls: "bar-row" });
			row.createSpan({ text: group.label, cls: "filter-label" });

			// === 优先级组 ===
			if (group.label === "优先级") {
				const selectedIcons = currentFilter.priorityValues || [];
				// 修改高亮逻辑：任意子项选中即高亮，所有子项取消才取消高亮
				const anySelected = selectedIcons.length > 0;

				const mainBtn = row.createEl("button", {
					text: "优先级",
					cls: "filter-btn",
				});
				if (anySelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					if (anySelected) {
						// 全部取消
						this.store.update({
							draftFilter: {
								...currentFilter,
								priorityValues: [],
							},
						});
					} else {
						// 全部选中
						this.store.update({
							draftFilter: {
								...currentFilter,
								priorityValues: [...PRIORITY_ICONS],
							},
						});
					}
				};

				const subPanel = row.createDiv({ cls: "sub-panel" });
				subPanel.style.display = "flex";
				subPanel.style.flexWrap = "wrap";
				subPanel.style.gap = "4px";
				subPanel.style.marginLeft = "8px";

				PRIORITY_ICONS.forEach((icon) => {
					const subBtn = subPanel.createEl("button", {
						text: icon,
						cls: "filter-btn sub-btn",
					});
					if (selectedIcons.includes(icon)) subBtn.addClass("active");
					subBtn.onclick = () => {
						const newIcons = selectedIcons.includes(icon)
							? selectedIcons.filter((i) => i !== icon)
							: [...selectedIcons, icon];
						this.store.update({
							draftFilter: {
								...currentFilter,
								priorityValues: newIcons,
							},
						});
					};
				});
				return;
			}

			// === 循环组 ===
			if (group.label === "循环") {
				const selectedCycles = currentFilter.repeatCycles || [];
				// 修改高亮逻辑：任意子项选中即高亮，所有子项取消才取消高亮
				const anySelected = selectedCycles.length > 0;

				const mainBtn = row.createEl("button", {
					text: "循环",
					cls: "filter-btn",
				});
				if (anySelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					if (anySelected) {
						// 全部取消
						this.store.update({
							draftFilter: { ...currentFilter, repeatCycles: [] },
						});
					} else {
						// 全部选中
						this.store.update({
							draftFilter: {
								...currentFilter,
								repeatCycles: [...REPEAT_ORDER],
							},
						});
					}
				};

				const subPanel = row.createDiv({ cls: "sub-panel" });
				subPanel.style.display = "flex";
				subPanel.style.flexWrap = "wrap";
				subPanel.style.gap = "4px";
				subPanel.style.marginLeft = "8px";

				REPEAT_ORDER.forEach((cycle) => {
					const subBtn = subPanel.createEl("button", {
						text: `🔁 ${cycle}`,
						cls: "filter-btn sub-btn",
					});
					if (selectedCycles.includes(cycle))
						subBtn.addClass("active");
					subBtn.onclick = () => {
						const newCycles = selectedCycles.includes(cycle)
							? selectedCycles.filter((c) => c !== cycle)
							: [...selectedCycles, cycle];
						this.store.update({
							draftFilter: {
								...currentFilter,
								repeatCycles: newCycles,
							},
						});
					};
				});
				return;
			}

			// === 日期、标签、依赖组 ===
			group.keys.forEach((markKey) => {
				const label = MARK_NAMES[markKey] || markKey;
				const isSelected = currentFilter.includeMarks.includes(markKey);
				const btn = row.createEl("button", {
					text: label,
					cls: "filter-btn",
				});
				if (isSelected) btn.addClass("active");
				btn.onclick = () => {
					const newInclude = isSelected
						? currentFilter.includeMarks.filter(
								(m) => m !== markKey,
							)
						: [...currentFilter.includeMarks, markKey];
					this.store.update({
						draftFilter: {
							...currentFilter,
							includeMarks: newInclude,
						},
					});
				};
			});
		});
	}
}
