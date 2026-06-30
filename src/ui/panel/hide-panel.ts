// src/ui/panel/hide-panel.ts
// 视图隐藏面板 — 引用 mark-panel.ts 中的共用按钮组构建函数

import { getDefaultHideConfig } from "../../core/store/preset/panel-preset";
import { Store } from "../../core/store/store";
import { HideConfig } from "../../type/type";
import { buildToggleGroup } from "./filter-panel";

const HIDE_GROUPS = [
	{ label: "隐藏状态", type: "statuses" as const },
	{ label: "隐藏描述", type: "searchText" as const },
	{ label: "隐藏优先", type: "priorityValues" as const },
	{ label: "隐藏循环", type: "repeatCycles" as const },
	{
		label: "隐藏时间",
		type: "marks" as const,
		keys: ["created", "scheduled", "starts", "cancelled", "done", "due"],
	},
	{ label: "隐藏依赖", type: "marks" as const, keys: ["id", "forbid"] },
	{ label: "隐藏标签", type: "marks" as const, keys: ["tag"] },
];

export class HidePanel {
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
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;
		const hideConfig = preset.hideConfig ?? getDefaultHideConfig();

		const updateHideConfig = (changes: Partial<HideConfig>) => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const newHideConfig = {
				...(pr.hideConfig ?? getDefaultHideConfig()),
				...changes,
			};
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id ? { ...p, hideConfig: newHideConfig } : p,
				),
			});
		};

		HIDE_GROUPS.forEach((group) => {
			const row = this.container.createDiv({ cls: "panel-row" });

			if (group.type === "statuses") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: hideConfig.hideStatuses || [],
					onChange: (ns) => updateHideConfig({ hideStatuses: ns }),
				});
				return;
			}

			if (group.type === "searchText") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: [],
					currentSearchText: hideConfig.hideSearchText || "",
					onChange: () => {},
					onSearchChange: (text) =>
						updateHideConfig({ hideSearchText: text }),
				});
				return;
			}

			if (group.type === "priorityValues") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: hideConfig.hidePriorityValues || [],
					onChange: (ns) =>
						updateHideConfig({ hidePriorityValues: ns }),
				});
				return;
			}

			if (group.type === "repeatCycles") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: hideConfig.hideRepeatCycles || [],
					onChange: (ns) =>
						updateHideConfig({ hideRepeatCycles: ns }),
				});
				return;
			}

			if (group.type === "marks" && group.keys) {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					keys: group.keys,
					selected: hideConfig.hideMarks || [],
					onChange: (ns) => updateHideConfig({ hideMarks: ns }),
				});
				return;
			}
		});
	}
}
