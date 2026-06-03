// src/ui/bars/mark-bar.ts
import {
	MARK_NAMES,
	PRIORITY_ORDER,
	REPEAT_ORDER,
} from "../../configs/configs";
import { Store } from "../../store/store";

const MARK_GROUPS: { label: string; keys: string[] }[] = [
	{ label: "优先级", keys: ["priority"] },
	{ label: "循环", keys: ["repeat"] },
	{
		label: "日期",
		keys: ["created", "scheduled", "starts", "cancel", "done", "due"],
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
		if (!preset) return;

		const currentFilter = preset.filter;

		const updateFilter = (changes: Partial<typeof currentFilter>) => {
			const st = this.store.getState();
			const pr = this.store.getActivePreset();
			if (!pr) return;
			const newPresets = st.presets.map((p) =>
				p.id === pr.id
					? { ...p, filter: { ...pr.filter, ...changes } }
					: p,
			);
			this.store.update({ presets: newPresets });
		};

		MARK_GROUPS.forEach((group) => {
			const row = this.container.createDiv({ cls: "bar-row" });
			row.createSpan({ text: group.label, cls: "filter-label" });

			if (group.label === "优先级") {
				const selectedIcons = currentFilter.priorityValues || [];
				const anySelected = selectedIcons.length > 0;

				const mainBtn = row.createEl("button", {
					text: "优先级",
					cls: "filter-btn",
				});
				if (anySelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateFilter({
						priorityValues: anySelected ? [] : [...PRIORITY_ICONS],
					});
				};

				const subPanel = row.createDiv({ cls: "sub-panel" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";

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
						updateFilter({ priorityValues: newIcons });
					};
				});
				return;
			}

			if (group.label === "循环") {
				const selectedCycles = currentFilter.repeatCycles || [];
				const anySelected = selectedCycles.length > 0;

				const mainBtn = row.createEl("button", {
					text: "循环",
					cls: "filter-btn",
				});
				if (anySelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateFilter({
						repeatCycles: anySelected ? [] : [...REPEAT_ORDER],
					});
				};

				const subPanel = row.createDiv({ cls: "sub-panel" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";

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
						updateFilter({ repeatCycles: newCycles });
					};
				});
				return;
			}

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
					updateFilter({ includeMarks: newInclude });
				};
			});
		});
	}
}
