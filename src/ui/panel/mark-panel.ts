// src/ui/panels/mark-panel.ts
// 任务标记面板

import {
	MARK_NAMES,
	PRIORITY_ORDER,
	REPEAT_ORDER,
} from "../../process/config/config";
import { Store } from "../../process/store/store";

const MARK_GROUPS: { label: string; keys: string[] }[] = [
	{ label: "优先级", keys: ["priority"] },
	{ label: "循环", keys: ["repeat"] },
	{
		label: "日期",
		keys: ["created", "scheduled", "starts", "cancel", "done", "due"],
	},
	{ label: "依赖", keys: ["id", "forbid"] },
	{ label: "标签", keys: ["tag"] },
];

const PRIORITY_ICONS = [...PRIORITY_ORDER].reverse();

export class MarkPanel {
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

		const updateFilter = (changes: Partial<typeof currentFilter>) => {
			const st = this.store.getState();
			const pr = this.store.getActivePreset();
			if (!pr) return;
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id
						? { ...p, filter: { ...pr.filter, ...changes } }
						: p,
				),
			});
		};

		MARK_GROUPS.forEach((group) => {
			const row = this.container.createDiv({ cls: "panel-row" });
			row.createSpan({ text: group.label, cls: "panel-label" });

			if (group.label === "优先级") {
				const selectedIcons = currentFilter.priorityValues || [];
				const anySelected = selectedIcons.length > 0;
				const mainBtn = row.createEl("button", {
					text: "优先级",
					cls: "panel-btn",
				});
				if (anySelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateFilter({
						priorityValues: anySelected ? [] : [...PRIORITY_ICONS],
					});
				};
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				PRIORITY_ICONS.forEach((icon) => {
					const subBtn = subPanel.createEl("button", {
						text: icon,
						cls: "panel-btn sub-btn",
					});
					if (selectedIcons.includes(icon)) subBtn.addClass("active");
					subBtn.onclick = () => {
						const ni = selectedIcons.includes(icon)
							? selectedIcons.filter((i) => i !== icon)
							: [...selectedIcons, icon];
						updateFilter({ priorityValues: ni });
					};
				});
				return;
			}

			if (group.label === "循环") {
				const selectedCycles = currentFilter.repeatCycles || [];
				const anySelected = selectedCycles.length > 0;
				const mainBtn = row.createEl("button", {
					text: "循环",
					cls: "panel-btn",
				});
				if (anySelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateFilter({
						repeatCycles: anySelected ? [] : [...REPEAT_ORDER],
					});
				};
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				REPEAT_ORDER.forEach((cycle) => {
					const subBtn = subPanel.createEl("button", {
						text: `🔁 ${cycle}`,
						cls: "panel-btn sub-btn",
					});
					if (selectedCycles.includes(cycle))
						subBtn.addClass("active");
					subBtn.onclick = () => {
						const nc = selectedCycles.includes(cycle)
							? selectedCycles.filter((c) => c !== cycle)
							: [...selectedCycles, cycle];
						updateFilter({ repeatCycles: nc });
					};
				});
				return;
			}

			group.keys.forEach((markKey) => {
				const label = MARK_NAMES[markKey] || markKey;
				const isSelected = currentFilter.includeMarks.includes(markKey);
				const btn = row.createEl("button", {
					text: label,
					cls: "panel-btn",
				});
				if (isSelected) btn.addClass("active");
				btn.onclick = () => {
					const ni = isSelected
						? currentFilter.includeMarks.filter(
								(m) => m !== markKey,
							)
						: [...currentFilter.includeMarks, markKey];
					updateFilter({ includeMarks: ni });
				};
			});
		});
	}
}
