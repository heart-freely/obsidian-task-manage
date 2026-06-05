// src/ui/panel/preset-panel.ts
// 视图配置面板

import {
	ALL_MARKS,
	PRIORITY_ORDER,
	REPEAT_ORDER,
} from "../../process/config/config";
import { Store } from "../../process/store/store";
import { GlobalFilter, Preset } from "../../types";
import { Panels } from "./panel";

const DEFAULT_FILTER: GlobalFilter = {
	dateRange: { start: null, end: null, isAll: true },
	statuses: ["todo", "planned", "in-progress", "completed", "cancelled"],
	includeMarks: [...ALL_MARKS],
	excludeMarks: [],
	hideRepeat: true,
	hideCompleted: true,
	hideCancelled: true,
	rootPath: null,
	hideFolders: true,
	priorityValues: [...PRIORITY_ORDER],
	repeatCycles: [...REPEAT_ORDER],
};

const DEFAULT_BAR_VISIBILITY = {
	time: true,
	excut: true,
	search: true,
	mark: true,
	view: true,
	hide: true,
	sort: true,
	config: true,
};
const DEFAULT_TOOLBAR_ORDER = [
	"excut",
	"search",
	"mark",
	"time",
	"view",
	"hide",
	"sort",
	"config",
];

const PRESET_DEFAULTS: Record<string, Partial<Preset>> = {
	inbox: {
		businessView: "inbox",
		viewStyle: "list",
		icon: "📥",
		showToolbar: false,
		toolbarEverShown: false,
		toolbarPanelsCollapsed: false,
		toolbarPanelsHeight: 300,
		toolbarOrder: DEFAULT_TOOLBAR_ORDER,
		barVisibility: { ...DEFAULT_BAR_VISIBILITY },
		filter: { ...DEFAULT_FILTER, statuses: ["todo", "planned"] },
		sort: { type: "status", order: "asc" as const },
		intervalMode: "scheduled-due",
		useDynamic: false,
	},
	important: {
		businessView: "important",
		viewStyle: "list",
		icon: "⭐",
		showToolbar: false,
		toolbarEverShown: false,
		toolbarPanelsCollapsed: false,
		toolbarPanelsHeight: 300,
		toolbarOrder: DEFAULT_TOOLBAR_ORDER,
		barVisibility: { ...DEFAULT_BAR_VISIBILITY },
		filter: {
			...DEFAULT_FILTER,
			statuses: ["todo", "planned", "in-progress"],
			priorityValues: ["🔺", "⏫", "🔼"],
		},
		sort: { type: "priority", order: "asc" as const },
		intervalMode: "scheduled-due",
		useDynamic: false,
	},
	today: {
		businessView: "today",
		viewStyle: "list",
		icon: "📅",
		showToolbar: false,
		toolbarEverShown: false,
		toolbarPanelsCollapsed: false,
		toolbarPanelsHeight: 300,
		toolbarOrder: DEFAULT_TOOLBAR_ORDER,
		barVisibility: { ...DEFAULT_BAR_VISIBILITY },
		filter: {
			...DEFAULT_FILTER,
			statuses: ["todo", "planned", "in-progress"],
		},
		sort: { type: "status", order: "asc" as const },
		intervalMode: "scheduled-due",
		useDynamic: true,
	},
	future: {
		businessView: "future",
		viewStyle: "list",
		icon: "🔜",
		showToolbar: false,
		toolbarEverShown: false,
		toolbarPanelsCollapsed: false,
		toolbarPanelsHeight: 300,
		toolbarOrder: DEFAULT_TOOLBAR_ORDER,
		barVisibility: { ...DEFAULT_BAR_VISIBILITY },
		filter: {
			...DEFAULT_FILTER,
			statuses: ["todo", "planned", "in-progress"],
		},
		sort: { type: "scheduled", order: "asc" as const },
		intervalMode: "scheduled-due",
		useDynamic: true,
	},
	"all-tasks": {
		businessView: "allTasks",
		viewStyle: "table",
		icon: "📋",
		showToolbar: false,
		toolbarEverShown: false,
		toolbarPanelsCollapsed: false,
		toolbarPanelsHeight: 300,
		toolbarOrder: DEFAULT_TOOLBAR_ORDER,
		barVisibility: { ...DEFAULT_BAR_VISIBILITY },
		filter: { ...DEFAULT_FILTER },
		sort: { type: "status", order: "asc" as const },
		intervalMode: "scheduled-due",
		useDynamic: false,
	},
};

export class PresetPanel {
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

		const updatePreset = (changes: Partial<Preset>) => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id ? { ...p, ...changes } : p,
				),
			});
		};

		const rowName = this.container.createDiv({ cls: "panel-row" });
		rowName.createSpan({ text: "视图名称", cls: "panel-label" });
		const nameInput = rowName.createEl("input", {
			type: "text",
			attr: { placeholder: "输入视图名称" },
		});
		nameInput.style.maxWidth = "150px";
		nameInput.value = preset.name || "";
		nameInput.addEventListener("change", () =>
			updatePreset({ name: nameInput.value.trim() || "未命名" }),
		);

		const row2 = this.container.createDiv({ cls: "panel-row" });
		row2.createSpan({ text: "视图图标", cls: "panel-label" });
		const iconInput = row2.createEl("input", {
			type: "text",
			cls: "panel-input panel-input-sm",
			attr: { placeholder: "Emoji" },
		});
		iconInput.value = preset.icon || "";
		iconInput.addEventListener("change", () =>
			updatePreset({ icon: iconInput.value.trim() || undefined }),
		);

		const row4 = this.container.createDiv({ cls: "panel-row" });
		row4.createSpan({ text: "视图配置", cls: "panel-label" });

		const importBtn = row4.createEl("button", {
			text: "📥 导入配置",
			cls: "panel-btn",
		});
		importBtn.onclick = () => {
			const i = document.createElement("input");
			i.type = "file";
			i.accept = ".json";
			i.onchange = async () => {
				if (!i.files?.length) return;
				try {
					updatePreset(
						JSON.parse(await i.files[0].text()) as Partial<Preset>,
					);
				} catch {
					alert("导入失败");
				}
			};
			i.click();
		};

		const exportBtn = row4.createEl("button", {
			text: "📤 导出配置",
			cls: "panel-btn",
		});
		exportBtn.onclick = () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const blob = new Blob([JSON.stringify(pr, null, 2)], {
				type: "application/json",
			});
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = `task-view-${pr.name}.json`;
			a.click();
		};

		const resetBtn = row4.createEl("button", {
			text: "🔄 恢复默认",
			cls: "panel-btn",
		});
		resetBtn.onclick = () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const def = PRESET_DEFAULTS[pr.id];
			if (!def) return;
			updatePreset({
				...def,
				id: pr.id,
				name: pr.name,
				filter: { ...DEFAULT_FILTER, ...(def.filter || {}) },
				barVisibility: { ...DEFAULT_BAR_VISIBILITY },
				toolbarOrder: [...DEFAULT_TOOLBAR_ORDER],
			} as any);
			Panels.getInstance().refreshTimePanel();
		};

		const delBtn = row4.createEl("button", {
			text: "🗑️ 删除视图",
			cls: "panel-btn",
		});
		delBtn.onclick = () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const np = st.presets.filter((p) => p.id !== pr.id);
			const na = np.length > 0 ? np[0].id : null;
			this.store.update({ presets: np, activePresetId: na });
		};
	}
}
