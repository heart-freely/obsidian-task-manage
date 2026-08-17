// src/ui/panel/filter-panel.ts
// 筛选面板 — 状态筛选 + 描述搜索 + 标记筛选

import {
	MARK_NAMES,
	PRIORITY_ORDER,
	REPEAT_ORDER,
	STATUS_NAMES,
} from "../../core/config/config";
import { Store } from "../../core/store/store";
import { GlobalFilter } from "../../type/type";

const PRIORITY_ICONS = [...PRIORITY_ORDER].reverse();
const BASIC_STATUSES = [
	"todo",
	"scheduled",
	"in-progress",
	"cancelled",
	"completed",
];
const PANEL_STATUS_LABELS: Record<string, string> = {
	todo: "待办中",
	scheduled: "计划中",
	"in-progress": "进行中",
	completed: "已完成",
	cancelled: "已取消",
};

interface FilterGroupDef {
	label: string;
	type:
		| "statuses"
		| "searchText"
		| "priorityValues"
		| "repeatCycles"
		| "marks";
	keys?: string[];
}

const FILTER_GROUPS: FilterGroupDef[] = [
	{ label: "筛选状态", type: "statuses" },
	{ label: "筛选描述", type: "searchText" },
	{ label: "筛选优先", type: "priorityValues" },
	{ label: "筛选循环", type: "repeatCycles" },
	{
		label: "筛选时间",
		type: "marks",
		keys: ["created", "scheduled", "starts", "cancelled", "done", "due"],
	},
	{ label: "筛选依赖", type: "marks", keys: ["id", "forbid"] },
	{ label: "筛选标签", type: "marks", keys: ["tag"] },
];

export interface ToggleGroupOptions {
	row: HTMLElement;
	label: string;
	type:
		| "statuses"
		| "searchText"
		| "priorityValues"
		| "repeatCycles"
		| "marks";
	keys?: string[];
	selected: string[];
	currentSearchText?: string;
	onChange: (newSelected: string[]) => void;
	onSearchChange?: (text: string) => void;
	currentValueRef?: { value: string };
	statusLabels?: Record<string, string>;
	mainBtnTextOverrides?: Partial<Record<string, string>>;
}

export function buildToggleGroup(options: ToggleGroupOptions): void {
	const {
		row,
		label,
		type,
		keys,
		selected,
		onChange,
		onSearchChange,
		currentValueRef,
		statusLabels,
		mainBtnTextOverrides,
	} = options;
	row.createSpan({ text: label, cls: "task-panel-label" });

	if (type === "statuses") {
		const ns = selected.length === 0;
		const labels = statusLabels || STATUS_NAMES;
		const mb = row.createEl("button", {
			text: mainBtnTextOverrides?.statuses || "状态",
			cls: "task-panel-btn",
		});
		if (!ns) mb.addClass("active");
		mb.onclick = () => {
			onChange(ns ? [...BASIC_STATUSES] : []);
		};
		const sp = row.createDiv({ cls: "task-panel-sub" });
		sp.addClass("task-flex", "task-flex-wrap", "task-gap-1", "task-ml-2");
		BASIC_STATUSES.forEach((st) => {
			const btn = sp.createEl("button", {
				text: labels[st] || st,
				cls: "task-panel-btn sub-btn",
			});
			if (selected.includes(st)) btn.addClass("active");
			btn.onclick = () => {
				const n = selected.includes(st)
					? selected.filter((s) => s !== st)
					: [...selected, st];
				onChange(n);
			};
		});
		return;
	}

	if (type === "searchText") {
		const input = row.createEl("input", {
			type: "text",
			cls: "task-panel-input",
			attr: { placeholder: "输入关键词，多个关键词用空格分隔，回车搜索" },
		});
		input.addClass("task-w-380");
		input.value = options.currentSearchText || "";
		const apply = () => {
			const v = input.value.trim();
			onSearchChange?.(v);
		};
		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				if (currentValueRef) currentValueRef.value = input.value;
				apply();
			}
		});
		input.addEventListener("blur", () => {
			if (currentValueRef && currentValueRef.value !== input.value) {
				currentValueRef.value = input.value;
				apply();
			}
		});
		return;
	}

	if (type === "priorityValues") {
		const ns = selected.length === 0;
		const mb = row.createEl("button", {
			text: mainBtnTextOverrides?.priorityValues || "优先级",
			cls: "task-panel-btn",
		});
		if (!ns) mb.addClass("active");
		mb.onclick = () => {
			onChange(ns ? [...PRIORITY_ICONS] : []);
		};
		const sp = row.createDiv({ cls: "task-panel-sub" });
		sp.addClass("task-flex", "task-flex-wrap", "task-gap-1", "task-ml-2");
		PRIORITY_ICONS.forEach((icon) => {
			const btn = sp.createEl("button", {
				text: icon,
				cls: "task-panel-btn sub-btn",
			});
			if (selected.includes(icon)) btn.addClass("active");
			btn.onclick = () => {
				const n = selected.includes(icon)
					? selected.filter((i) => i !== icon)
					: [...selected, icon];
				onChange(n);
			};
		});
		return;
	}

	if (type === "repeatCycles") {
		const ns = selected.length === 0;
		const mb = row.createEl("button", {
			text: mainBtnTextOverrides?.repeatCycles || "循环",
			cls: "task-panel-btn",
		});
		if (!ns) mb.addClass("active");
		mb.onclick = () => {
			onChange(ns ? [...REPEAT_ORDER] : []);
		};
		const sp = row.createDiv({ cls: "task-panel-sub" });
		sp.addClass("task-flex", "task-flex-wrap", "task-gap-1", "task-ml-2");
		REPEAT_ORDER.forEach((cycle) => {
			const btn = sp.createEl("button", {
				text: `🔁 ${cycle}`,
				cls: "task-panel-btn sub-btn",
			});
			if (selected.includes(cycle)) btn.addClass("active");
			btn.onclick = () => {
				const n = selected.includes(cycle)
					? selected.filter((c) => c !== cycle)
					: [...selected, cycle];
				onChange(n);
			};
		});
		return;
	}

	if (type === "marks" && keys && keys.length > 1) {
		const ns = keys.every((k) => !selected.includes(k));
		const mb = row.createEl("button", {
			text:
				mainBtnTextOverrides?.marks ||
				label.replace(/^(筛选|隐藏)/, ""),
			cls: "task-panel-btn",
		});
		if (!ns) mb.addClass("active");
		mb.onclick = () => {
			const others = selected.filter((m) => !keys.includes(m));
			onChange(ns ? [...others, ...keys] : others);
		};
		const sp = row.createDiv({ cls: "task-panel-sub" });
		sp.addClass("task-flex", "task-flex-wrap", "task-gap-1", "task-ml-2");
		keys.forEach((mk) => {
			const btn = sp.createEl("button", {
				text: MARK_NAMES[mk] || mk,
				cls: "task-panel-btn sub-btn",
			});
			if (selected.includes(mk)) btn.addClass("active");
			btn.onclick = () => {
				const n = selected.includes(mk)
					? selected.filter((m) => m !== mk)
					: [...selected, mk];
				onChange(n);
			};
		});
		return;
	}

	if (type === "marks" && keys && keys.length === 1) {
		const mk = keys[0];
		const isSel = selected.includes(mk);
		const btn = row.createEl("button", {
			text: mainBtnTextOverrides?.marks || MARK_NAMES[mk] || mk,
			cls: "task-panel-btn",
		});
		if (isSel) btn.addClass("active");
		btn.onclick = () => {
			const n = isSel
				? selected.filter((m) => m !== mk)
				: [...selected, mk];
			onChange(n);
		};
		return;
	}
}

export class FilterPanel {
	private container: HTMLElement;
	private store: Store;
	private currentValue: string = "";
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
		const cf = preset.filter;
		const updateFilter = (changes: Partial<GlobalFilter>) => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id
						? { ...p, filter: { ...pr.filter, ...changes } }
						: p,
				),
			});
		};
		FILTER_GROUPS.forEach((group) => {
			const row = this.container.createDiv({ cls: "task-panel-row" });
			if (group.type === "statuses") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: cf.statuses || [],
					onChange: (ns) => updateFilter({ statuses: ns }),
					statusLabels: PANEL_STATUS_LABELS,
				});
			} else if (group.type === "searchText") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: [],
					currentSearchText: cf.searchText || "",
					currentValueRef: { value: this.currentValue },
					onChange: () => {},
					onSearchChange: (text) =>
						updateFilter({ searchText: text || undefined }),
				});
			} else if (group.type === "priorityValues") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: cf.priorityValues || [],
					onChange: (ns) => updateFilter({ priorityValues: ns }),
				});
			} else if (group.type === "repeatCycles") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: cf.repeatCycles || [],
					onChange: (ns) => updateFilter({ repeatCycles: ns }),
				});
			} else if (group.type === "marks" && group.keys) {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					keys: group.keys,
					selected: cf.includeMarks || [],
					onChange: (ns) => updateFilter({ includeMarks: ns }),
				});
			}
		});
	}
}
