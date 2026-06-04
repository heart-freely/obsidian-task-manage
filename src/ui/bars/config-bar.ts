// src/ui/bars/config-bar.ts
import { ALL_MARKS, PRIORITY_ORDER, REPEAT_ORDER } from "../../configs/configs";
import { Store } from "../../store/store";
import { GlobalFilter, Preset } from "../../types";
import { ToolbarManager } from "./bars";

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

const PRESET_DEFAULTS: Record<string, Partial<Preset>> = {
	inbox: {
		businessView: "inbox",
		viewStyle: "list",
		icon: "📥",
		showToolbar: false,
		toolbarEverShown: false,
		toolbarPanelsCollapsed: false,
		toolbarPanelsHeight: 300,
		toolbarOrder: [
			"excut",
			"search",
			"mark",
			"time",
			"view",
			"hide",
			"sort",
			"config",
		],
		barVisibility: {
			time: true,
			excut: true,
			search: true,
			mark: true,
			view: true,
			hide: true,
			sort: true,
			config: true,
		},
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
		toolbarOrder: [
			"excut",
			"search",
			"mark",
			"time",
			"view",
			"hide",
			"sort",
			"config",
		],
		barVisibility: {
			time: true,
			excut: true,
			search: true,
			mark: true,
			view: true,
			hide: true,
			sort: true,
			config: true,
		},
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
		toolbarOrder: [
			"excut",
			"search",
			"mark",
			"time",
			"view",
			"hide",
			"sort",
			"config",
		],
		barVisibility: {
			time: true,
			excut: true,
			search: true,
			mark: true,
			view: true,
			hide: true,
			sort: true,
			config: true,
		},
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
		toolbarOrder: [
			"excut",
			"search",
			"mark",
			"time",
			"view",
			"hide",
			"sort",
			"config",
		],
		barVisibility: {
			time: true,
			excut: true,
			search: true,
			mark: true,
			view: true,
			hide: true,
			sort: true,
			config: true,
		},
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
		toolbarOrder: [
			"excut",
			"search",
			"mark",
			"time",
			"view",
			"hide",
			"sort",
			"config",
		],
		barVisibility: {
			time: true,
			excut: true,
			search: true,
			mark: true,
			view: true,
			hide: true,
			sort: true,
			config: true,
		},
		filter: { ...DEFAULT_FILTER },
		sort: { type: "status", order: "asc" as const },
		intervalMode: "scheduled-due",
		useDynamic: false,
	},
};

export class ConfigBar {
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
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;

		const updatePreset = (changes: Partial<Preset>) => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const newPresets = st.presets.map((p) =>
				p.id === pr.id ? { ...p, ...changes } : p,
			);
			this.store.update({ presets: newPresets });
		};

		const rowName = this.container.createDiv({ cls: "bar-row" });
		rowName.createSpan({ text: "视图名称", cls: "filter-label" });
		const nameInput = rowName.createEl("input", {
			type: "text",
			cls: "filter-input",
			attr: { placeholder: "输入视图名称" },
		});
		nameInput.style.maxWidth = "150px";
		nameInput.value = preset.name || "";
		nameInput.addEventListener("change", () =>
			updatePreset({ name: nameInput.value.trim() || "未命名" }),
		);

		const row2 = this.container.createDiv({ cls: "bar-row" });
		row2.createSpan({ text: "视图图标", cls: "filter-label" });
		const iconInput = row2.createEl("input", {
			type: "text",
			cls: "filter-input filter-input-sm",
			attr: { placeholder: "Emoji" },
		});
		iconInput.style.maxWidth = "60px";
		iconInput.value = preset.icon || "";
		iconInput.addEventListener("change", () =>
			updatePreset({ icon: iconInput.value.trim() || undefined }),
		);

		const row4 = this.container.createDiv({ cls: "bar-row" });
		row4.createSpan({ text: "视图配置", cls: "filter-label" });

		const importBtn = row4.createEl("button", {
			text: "📥 导入配置",
			cls: "bar-btn",
		});
		importBtn.onclick = () => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json";
			input.onchange = async () => {
				if (!input.files?.length) return;
				try {
					updatePreset(
						JSON.parse(
							await input.files[0].text(),
						) as Partial<Preset>,
					);
				} catch (e) {
					alert("导入失败");
				}
			};
			input.click();
		};

		const exportBtn = row4.createEl("button", {
			text: "📤 导出配置",
			cls: "bar-btn",
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
			cls: "bar-btn",
		});
		resetBtn.onclick = () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const defaults = PRESET_DEFAULTS[pr.id];
			if (!defaults) return;
			updatePreset({ ...defaults, id: pr.id, name: pr.name } as any);
			ToolbarManager.getInstance().refreshTimeBar();
		};

		const delBtn = row4.createEl("button", {
			text: "🗑️ 删除视图",
			cls: "bar-btn",
		});
		delBtn.onclick = () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const newPresets = st.presets.filter((p) => p.id !== pr.id);
			const newActive = newPresets.length > 0 ? newPresets[0].id : null;
			this.store.update({
				presets: newPresets,
				activePresetId: newActive,
			});
		};
	}
}
