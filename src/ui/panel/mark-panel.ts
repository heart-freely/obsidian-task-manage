// src/ui/panel/mark-panel.ts
// 任务标记面板（筛选）

import {
	MARK_NAMES,
	PRIORITY_ORDER,
	REPEAT_ORDER,
} from "../../process/config/config";
import { Store } from "../../process/store/store";

const PRIORITY_ICONS = [...PRIORITY_ORDER].reverse();

const MARK_GROUPS: { label: string; type: string; keys?: string[] }[] = [
	{ label: "筛选优先", type: "priorityValues" },
	{ label: "筛选循环", type: "repeatCycles" },
	{
		label: "筛选日期",
		type: "marks",
		keys: ["created", "scheduled", "starts", "cancel", "done", "due"],
	},
	{ label: "筛选依赖", type: "marks", keys: ["id", "forbid"] },
	{ label: "筛选标签", type: "marks", keys: ["tag"] },
];

export class MarkPanel {
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

			// 优先级组：主按钮 + 子按钮
			if (group.type === "priorityValues") {
				const selected = currentFilter.priorityValues || [];
				const allSelected = PRIORITY_ICONS.every((i) =>
					selected.includes(i),
				);
				const mainBtn = row.createEl("button", {
					text: "优先级",
					cls: "panel-btn",
				});
				if (allSelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateFilter({
						priorityValues: allSelected ? [] : [...PRIORITY_ICONS],
					});
				};
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				PRIORITY_ICONS.forEach((icon) => {
					const btn = subPanel.createEl("button", {
						text: icon,
						cls: "panel-btn sub-btn",
					});
					if (selected.includes(icon)) btn.addClass("active");
					btn.onclick = () => {
						const ni = selected.includes(icon)
							? selected.filter((i) => i !== icon)
							: [...selected, icon];
						updateFilter({ priorityValues: ni });
					};
				});
				return;
			}

			// 循环组：主按钮 + 子按钮
			if (group.type === "repeatCycles") {
				const selected = currentFilter.repeatCycles || [];
				const allSelected = REPEAT_ORDER.every((c) =>
					selected.includes(c),
				);
				const mainBtn = row.createEl("button", {
					text: "循环",
					cls: "panel-btn",
				});
				if (allSelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateFilter({
						repeatCycles: allSelected ? [] : [...REPEAT_ORDER],
					});
				};
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				REPEAT_ORDER.forEach((cycle) => {
					const btn = subPanel.createEl("button", {
						text: `🔁 ${cycle}`,
						cls: "panel-btn sub-btn",
					});
					if (selected.includes(cycle)) btn.addClass("active");
					btn.onclick = () => {
						const nc = selected.includes(cycle)
							? selected.filter((c) => c !== cycle)
							: [...selected, cycle];
						updateFilter({ repeatCycles: nc });
					};
				});
				return;
			}

			// 标记组（日期/依赖）：主按钮 + 子按钮
			if (group.type === "marks" && group.keys && group.keys.length > 1) {
				const selected = currentFilter.includeMarks || [];
				const allSelected = group.keys.every((k) =>
					selected.includes(k),
				);
				const mainBtn = row.createEl("button", {
					text: group.label.replace("筛选", ""),
					cls: "panel-btn",
				});
				if (allSelected) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					const others = selected.filter(
						(m) => !group.keys!.includes(m),
					);
					updateFilter({
						includeMarks: allSelected
							? others
							: [...others, ...group.keys!],
					});
				};
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				group.keys.forEach((markKey) => {
					const btn = subPanel.createEl("button", {
						text: MARK_NAMES[markKey] || markKey,
						cls: "panel-btn sub-btn",
					});
					if (selected.includes(markKey)) btn.addClass("active");
					btn.onclick = () => {
						const ni = selected.includes(markKey)
							? selected.filter((m) => m !== markKey)
							: [...selected, markKey];
						updateFilter({ includeMarks: ni });
					};
				});
				return;
			}

			// 单标记组（标签）：仅一个按钮，无子按钮
			if (
				group.type === "marks" &&
				group.keys &&
				group.keys.length === 1
			) {
				const markKey = group.keys[0];
				const isSelected = currentFilter.includeMarks.includes(markKey);
				const btn = row.createEl("button", {
					text: MARK_NAMES[markKey] || markKey,
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
				return;
			}
		});
	}
}
