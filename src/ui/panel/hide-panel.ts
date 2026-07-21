// src/ui/panel/hide-panel.ts
// 视图隐藏面板

import { getDefaultHideConfig } from "../../core/store/preset/panel-preset";
import { Store } from "../../core/store/store";
import { HideConfig } from "../../type/type";
import { buildToggleGroup } from "./filter-panel";

interface HideGroupDef {
	label: string;
	type:
		| "statuses"
		| "searchText"
		| "priorityValues"
		| "repeatCycles"
		| "marks";
	keys?: string[];
}

const HIDE_GROUPS: HideGroupDef[] = [
	{ label: "隐藏状态", type: "statuses" },
	{ label: "隐藏描述", type: "searchText" },
	{ label: "隐藏优先", type: "priorityValues" },
	{ label: "隐藏循环", type: "repeatCycles" },
	{
		label: "隐藏时间",
		type: "marks",
		keys: ["created", "scheduled", "starts", "cancelled", "done", "due"],
	},
	{ label: "隐藏依赖", type: "marks", keys: ["id", "forbid"] },
	{ label: "隐藏标签", type: "marks", keys: ["tag"] },
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
			const nh: HideConfig = {
				...(pr.hideConfig ?? getDefaultHideConfig()),
				...changes,
			};
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id ? { ...p, hideConfig: nh } : p,
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
					onChange: (ns: string[]) =>
						updateHideConfig({ hideStatuses: ns }),
				});
			} else if (group.type === "searchText") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: [],
					currentSearchText: hideConfig.hideSearchText || "",
					onChange: () => {},
					onSearchChange: (text: string) =>
						updateHideConfig({ hideSearchText: text }),
				});
			} else if (group.type === "priorityValues") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: hideConfig.hidePriorityValues || [],
					onChange: (ns: string[]) =>
						updateHideConfig({ hidePriorityValues: ns }),
				});
			} else if (group.type === "repeatCycles") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: hideConfig.hideRepeatCycles || [],
					onChange: (ns: string[]) =>
						updateHideConfig({ hideRepeatCycles: ns }),
				});
			} else if (group.type === "marks" && group.keys) {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					keys: group.keys,
					selected: hideConfig.hideMarks || [],
					onChange: (ns: string[]) =>
						updateHideConfig({ hideMarks: ns }),
				});
			}
		});
	}
}
