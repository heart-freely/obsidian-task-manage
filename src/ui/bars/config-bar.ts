// src/ui/bars/config-bar.ts
import { ALL_MARKS } from "../../configs/configs";
import { Store } from "../../store/store";
import { Preset } from "../../types";

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
		filter: {
			dateRange: { start: null, end: null, isAll: true },
			statuses: ["todo", "planned"],
			includeMarks: [...ALL_MARKS],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		},
		sort: { type: "status", order: "asc" as "asc" },
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
			dateRange: { start: null, end: null, isAll: true },
			statuses: ["todo", "planned", "in-progress"],
			includeMarks: [...ALL_MARKS],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		},
		sort: { type: "priority", order: "asc" as "asc" },
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
			dateRange: { start: null, end: null, isAll: true },
			statuses: ["todo", "planned", "in-progress"],
			includeMarks: [...ALL_MARKS],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		},
		sort: { type: "status", order: "asc" as "asc" },
		intervalMode: "scheduled-due",
		useDynamic: false,
	},
	overdue: {
		businessView: "overdue",
		viewStyle: "list",
		icon: "⏰",
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
			dateRange: { start: null, end: null, isAll: true },
			statuses: [
				"todo",
				"planned",
				"in-progress",
				"completed",
				"cancelled",
			],
			includeMarks: [...ALL_MARKS],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		},
		sort: { type: "due", order: "asc" as "asc" },
		intervalMode: "scheduled-due",
		useDynamic: false,
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
			dateRange: { start: null, end: null, isAll: true },
			statuses: [
				"todo",
				"planned",
				"in-progress",
				"completed",
				"cancelled",
			],
			includeMarks: [...ALL_MARKS],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		},
		sort: { type: "scheduled", order: "asc" as "asc" },
		intervalMode: "scheduled-due",
		useDynamic: false,
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
		filter: {
			dateRange: { start: null, end: null, isAll: true },
			statuses: [
				"todo",
				"planned",
				"in-progress",
				"completed",
				"cancelled",
			],
			includeMarks: [...ALL_MARKS],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		},
		sort: { type: "status", order: "asc" as "asc" },
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

		// 视图名称
		const rowName = this.container.createDiv({ cls: "bar-row" });
		rowName.createSpan({ text: "视图名称", cls: "filter-label" });
		const nameInput = rowName.createEl("input", {
			type: "text",
			cls: "filter-input",
			attr: { placeholder: "输入视图名称" },
		});
		nameInput.style.maxWidth = "150px";
		nameInput.value = preset.name || "";
		nameInput.addEventListener("change", () => {
			const newName = nameInput.value.trim() || "未命名";
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, name: newName } : p,
			);
			this.store.update({ presets: newPresets });
		});

		// 视图图标
		const row2 = this.container.createDiv({ cls: "bar-row" });
		row2.createSpan({ text: "视图图标", cls: "filter-label" });
		const iconInput = row2.createEl("input", {
			type: "text",
			cls: "filter-input filter-input-sm",
			attr: { placeholder: "Emoji" },
		});
		iconInput.style.maxWidth = "60px";
		iconInput.value = preset.icon || "";
		iconInput.addEventListener("change", () => {
			const newIcon = iconInput.value.trim();
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, icon: newIcon || undefined } : p,
			);
			this.store.update({ presets: newPresets });
		});

		// 操作按钮行
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
				const text = await input.files[0].text();
				try {
					const imported = JSON.parse(text) as Partial<Preset>;
					const newPresets = state.presets.map((p) =>
						p.id === preset.id ? { ...p, ...imported } : p,
					);
					this.store.update({ presets: newPresets });
				} catch (e) {
					alert("导入失败：无效的 JSON 文件");
				}
			};
			input.click();
		};
		const exportBtn = row4.createEl("button", {
			text: "📤 导出配置",
			cls: "bar-btn",
		});
		exportBtn.onclick = () => {
			const dataStr = JSON.stringify(preset, null, 2);
			const blob = new Blob([dataStr], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `task-view-${preset.name}.json`;
			a.click();
			URL.revokeObjectURL(url);
		};
		const resetBtn = row4.createEl("button", {
			text: "🔄 恢复默认",
			cls: "bar-btn",
		});
		resetBtn.onclick = () => {
			const defaults = PRESET_DEFAULTS[preset.id];
			if (!defaults) return;
			const newPreset: Preset = {
				...preset,
				...defaults,
				id: preset.id,
				name: preset.name,
				filter: { ...defaults.filter! } as any,
			};
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? newPreset : p,
			);
			this.store.update({ presets: newPresets, draftFilter: null });
		};
		const saveBtn = row4.createEl("button", {
			text: "💾 保存配置",
			cls: "bar-btn",
		});
		saveBtn.onclick = () => {
			const currentFilter = state.draftFilter ?? preset.filter;
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, filter: currentFilter } : p,
			);
			this.store.update({ presets: newPresets, draftFilter: null });
		};
		const delBtn = row4.createEl("button", {
			text: "🗑️ 删除视图",
			cls: "bar-btn",
		});
		delBtn.onclick = () => {
			const newPresets = state.presets.filter((p) => p.id !== preset.id);
			const newActive = newPresets.length > 0 ? newPresets[0].id : null;
			this.store.update({
				presets: newPresets,
				activePresetId: newActive,
			});
		};
	}
}
