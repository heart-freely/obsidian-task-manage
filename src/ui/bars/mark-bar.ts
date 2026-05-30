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
	{ label: "唯一ID", keys: ["id"] },
	{ label: "引用ID", keys: ["forbid"] },
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

			group.keys.forEach((markKey) => {
				const label = MARK_NAMES[markKey] || markKey;
				const btn = row.createEl("button", {
					text: label,
					cls: "filter-btn",
				});
				if (currentFilter.includeMarks.includes(markKey)) {
					btn.addClass("active");
				}
				btn.onclick = () => {
					const newInclude = currentFilter.includeMarks.includes(
						markKey,
					)
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

			if (group.label === "优先级" || group.label === "循环") {
				const subPanel = row.createDiv({ cls: "sub-panel" });
				subPanel.style.display = "flex";
				subPanel.style.flexWrap = "wrap";
				subPanel.style.gap = "4px";
				subPanel.style.marginLeft = "8px";

				if (group.label === "优先级") {
					const selectedIcons = currentFilter.priorityValues || [];
					PRIORITY_ICONS.forEach((icon) => {
						const subBtn = subPanel.createEl("button", {
							text: icon,
							cls: "filter-btn sub-btn",
						});
						if (selectedIcons.includes(icon))
							subBtn.addClass("active");
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
				} else if (group.label === "循环") {
					const selectedCycles = currentFilter.repeatCycles || [];
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
				}
			}
		});
	}
}
