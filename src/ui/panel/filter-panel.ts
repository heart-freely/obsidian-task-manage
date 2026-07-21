// src/ui/panel/filter-panel.ts
// 筛选面板 — 状态筛选 + 描述搜索 + 标记筛选
// 同时导出共用的按钮组构建工具函数，供 hide-panel.ts 引用

import {
	MARK_NAMES,
	PRIORITY_ORDER,
	REPEAT_ORDER,
	STATUS_NAMES,
} from "../../core/config/config";
import { Store } from "../../core/store/store";
import { GlobalFilter } from "../../type/type";

// ========== 常量 ==========

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

// ========== 筛选组定义 ==========

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

// ========== 隐藏组定义 ==========

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

// ========== 共用按钮组构建函数 ==========

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

	row.createSpan({ text: label, cls: "panel-label" });

	// ========== 状态 ==========
	if (type === "statuses") {
		const noneSelected = selected.length === 0;
		const labels = statusLabels || STATUS_NAMES;

		const mainBtn = row.createEl("button", {
			text: mainBtnTextOverrides?.statuses || "状态",
			cls: "panel-btn",
		});
		if (!noneSelected) mainBtn.addClass("active");
		mainBtn.onclick = () => {
			onChange(noneSelected ? [...BASIC_STATUSES] : []);
		};

		const subPanel = row.createDiv({ cls: "panel-sub" });
		// 原代码：subPanel.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
		subPanel.addClass(
			"task-flex",
			"task-flex-wrap",
			"task-gap-1",
			"task-ml-2",
		);

		BASIC_STATUSES.forEach((st) => {
			const btn = subPanel.createEl("button", {
				text: labels[st] || st,
				cls: "panel-btn sub-btn",
			});
			if (selected.includes(st)) btn.addClass("active");
			btn.onclick = () => {
				const ns = selected.includes(st)
					? selected.filter((s) => s !== st)
					: [...selected, st];
				onChange(ns);
			};
		});
		return;
	}

	// ========== 搜索文本 ==========
	if (type === "searchText") {
		const input = row.createEl("input", {
			type: "text",
			cls: "panel-input",
			attr: {
				placeholder: "输入关键词，多个关键词用空格分隔，回车搜索",
			},
		});
		// 原代码：input.style.width = "380px";
		input.addClass("task-w-380");
		input.value = options.currentSearchText || "";

		const applySearch = () => {
			const val = input.value.trim();
			onSearchChange?.(val);
		};

		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				if (currentValueRef) currentValueRef.value = input.value;
				applySearch();
			}
		});

		input.addEventListener("blur", () => {
			if (currentValueRef && currentValueRef.value !== input.value) {
				currentValueRef.value = input.value;
				applySearch();
			}
		});
		return;
	}

	// ========== 优先级 ==========
	if (type === "priorityValues") {
		const noneSelected = selected.length === 0;

		const mainBtn = row.createEl("button", {
			text: mainBtnTextOverrides?.priorityValues || "优先级",
			cls: "panel-btn",
		});
		if (!noneSelected) mainBtn.addClass("active");
		mainBtn.onclick = () => {
			onChange(noneSelected ? [...PRIORITY_ICONS] : []);
		};

		const subPanel = row.createDiv({ cls: "panel-sub" });
		// 原代码：subPanel.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
		subPanel.addClass(
			"task-flex",
			"task-flex-wrap",
			"task-gap-1",
			"task-ml-2",
		);

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
				onChange(ni);
			};
		});
		return;
	}

	// ========== 循环 ==========
	if (type === "repeatCycles") {
		const noneSelected = selected.length === 0;

		const mainBtn = row.createEl("button", {
			text: mainBtnTextOverrides?.repeatCycles || "循环",
			cls: "panel-btn",
		});
		if (!noneSelected) mainBtn.addClass("active");
		mainBtn.onclick = () => {
			onChange(noneSelected ? [...REPEAT_ORDER] : []);
		};

		const subPanel = row.createDiv({ cls: "panel-sub" });
		// 原代码：subPanel.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
		subPanel.addClass(
			"task-flex",
			"task-flex-wrap",
			"task-gap-1",
			"task-ml-2",
		);

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
				onChange(nc);
			};
		});
		return;
	}

	// ========== 多标记（时间/依赖）==========
	if (type === "marks" && keys && keys.length > 1) {
		const noneSelected = keys.every((k) => !selected.includes(k));

		const mainBtn = row.createEl("button", {
			text:
				mainBtnTextOverrides?.marks ||
				label.replace(/^(筛选|隐藏)/, ""),
			cls: "panel-btn",
		});
		if (!noneSelected) mainBtn.addClass("active");
		mainBtn.onclick = () => {
			const others = selected.filter((m) => !keys!.includes(m));
			onChange(noneSelected ? [...others, ...keys!] : others);
		};

		const subPanel = row.createDiv({ cls: "panel-sub" });
		// 原代码：subPanel.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
		subPanel.addClass(
			"task-flex",
			"task-flex-wrap",
			"task-gap-1",
			"task-ml-2",
		);

		keys.forEach((markKey) => {
			const btn = subPanel.createEl("button", {
				text: MARK_NAMES[markKey] || markKey,
				cls: "panel-btn sub-btn",
			});
			if (selected.includes(markKey)) btn.addClass("active");
			btn.onclick = () => {
				const ni = selected.includes(markKey)
					? selected.filter((m) => m !== markKey)
					: [...selected, markKey];
				onChange(ni);
			};
		});
		return;
	}

	// ========== 单标记（标签）==========
	if (type === "marks" && keys && keys.length === 1) {
		const markKey = keys[0];
		const isSelected = selected.includes(markKey);
		const btn = row.createEl("button", {
			text: mainBtnTextOverrides?.marks || MARK_NAMES[markKey] || markKey,
			cls: "panel-btn",
		});
		if (isSelected) btn.addClass("active");
		btn.onclick = () => {
			const ni = isSelected
				? selected.filter((m) => m !== markKey)
				: [...selected, markKey];
			onChange(ni);
		};
		return;
	}
}

// ========== FilterPanel 类 ==========

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
		const currentFilter = preset.filter;

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
			const row = this.container.createDiv({ cls: "panel-row" });

			if (group.type === "statuses") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: currentFilter.statuses || [],
					onChange: (ns) => updateFilter({ statuses: ns }),
					statusLabels: PANEL_STATUS_LABELS,
				});
				return;
			}

			if (group.type === "searchText") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: [],
					currentSearchText: currentFilter.searchText || "",
					currentValueRef: { value: this.currentValue },
					onChange: () => {},
					onSearchChange: (text) =>
						updateFilter({ searchText: text || undefined }),
				});
				return;
			}

			if (group.type === "priorityValues") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: currentFilter.priorityValues || [],
					onChange: (ns) => updateFilter({ priorityValues: ns }),
				});
				return;
			}

			if (group.type === "repeatCycles") {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					selected: currentFilter.repeatCycles || [],
					onChange: (ns) => updateFilter({ repeatCycles: ns }),
				});
				return;
			}

			if (group.type === "marks" && group.keys) {
				buildToggleGroup({
					row,
					label: group.label,
					type: group.type,
					keys: group.keys,
					selected: currentFilter.includeMarks || [],
					onChange: (ns) => updateFilter({ includeMarks: ns }),
				});
				return;
			}
		});
	}
}
