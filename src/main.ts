// src/main.ts
import { Plugin } from "obsidian";
import { registerAllCommands } from "./commands";
import { ALL_MARKS, PRIORITY_ORDER, REPEAT_ORDER } from "./configs/configs";
import { TaskManageSettingTab } from "./settings";
import { Store } from "./store/store";
import { AppState, GlobalFilter, Preset } from "./types";
import { NavigatorView } from "./ui/layout/navigator-layout";

export default class TaskManagePlugin extends Plugin {
	store!: Store;

	async onload() {
		const savedData = (await this.loadData()) || {};

		const defaultFilter: GlobalFilter = {
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
			hideRepeat: true,
			hideCompleted: true,
			hideCancelled: true,
			rootPath: null,
			hideFolders: true,
			priorityValues: [...PRIORITY_ORDER],
			repeatCycles: [...REPEAT_ORDER],
		};

		const defaultPresets: Preset[] = [
			{
				id: "inbox",
				name: "待办任务",
				groupId: "basic",
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
				filter: { ...defaultFilter, statuses: ["todo", "planned"] },
				sort: { type: "status", order: "asc" as "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
			},
			{
				id: "important",
				name: "重要任务",
				groupId: "basic",
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
					...defaultFilter,
					statuses: ["todo", "planned", "in-progress"],
				},
				sort: { type: "priority", order: "asc" as "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
			},
			{
				id: "today",
				name: "今天任务",
				groupId: "basic",
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
					...defaultFilter,
					statuses: ["todo", "planned", "in-progress"],
				},
				sort: { type: "status", order: "asc" as "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
			},
			{
				id: "overdue",
				name: "逾期任务",
				groupId: "basic",
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
				filter: { ...defaultFilter },
				sort: { type: "due", order: "asc" as "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
			},
			{
				id: "future",
				name: "未来15天",
				groupId: "basic",
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
				filter: { ...defaultFilter },
				sort: { type: "scheduled", order: "asc" as "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
			},
			{
				id: "all-tasks",
				name: "所有任务",
				groupId: "basic",
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
				filter: { ...defaultFilter },
				sort: { type: "status", order: "asc" as "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
			},
		];

		// 深度合并保存的预设
		const savedPresets: Preset[] = savedData.presets || [];
		const mergedPresets: Preset[] = [];

		for (const dp of defaultPresets) {
			const sp = savedPresets.find((p: Preset) => p.id === dp.id);
			if (sp) {
				const spFilter = sp.filter || ({} as GlobalFilter);
				const mergedFilter: GlobalFilter = {
					dateRange: {
						...dp.filter.dateRange,
						...(spFilter.dateRange || {}),
					},
					statuses:
						Array.isArray(spFilter.statuses) &&
						spFilter.statuses.length > 0
							? spFilter.statuses
							: dp.filter.statuses,
					includeMarks:
						spFilter.includeMarks &&
						spFilter.includeMarks.length > 0
							? spFilter.includeMarks
							: [...ALL_MARKS],
					excludeMarks:
						spFilter.excludeMarks ?? dp.filter.excludeMarks,
					hideRepeat: spFilter.hideRepeat ?? dp.filter.hideRepeat,
					hideCompleted:
						spFilter.hideCompleted ?? dp.filter.hideCompleted,
					hideCancelled:
						spFilter.hideCancelled ?? dp.filter.hideCancelled,
					rootPath: spFilter.rootPath ?? dp.filter.rootPath,
					hideFolders: spFilter.hideFolders ?? dp.filter.hideFolders,
					searchText: spFilter.searchText ?? dp.filter.searchText,
					priorityValues:
						spFilter.priorityValues &&
						spFilter.priorityValues.length > 0
							? spFilter.priorityValues
							: [...PRIORITY_ORDER],
					repeatCycles:
						spFilter.repeatCycles &&
						spFilter.repeatCycles.length > 0
							? spFilter.repeatCycles
							: [...REPEAT_ORDER],
				};
				mergedPresets.push({
					...dp,
					...sp,
					filter: mergedFilter,
					intervalMode: sp.intervalMode ?? dp.intervalMode,
					useDynamic: sp.useDynamic ?? dp.useDynamic,
				});
			} else {
				mergedPresets.push(dp);
			}
		}

		// 补充用户自定义视图
		for (const sp of savedPresets) {
			if (!mergedPresets.find((p) => p.id === sp.id)) {
				mergedPresets.push(sp);
			}
		}

		const initialState: AppState = {
			activePresetId: savedData.activePresetId || "all-tasks",
			presets: mergedPresets,
			presetGroups: [{ id: "basic", name: "任务视图", order: 0 }],
			sidebarCollapsed: savedData.sidebarCollapsed ?? false,
			sidebarWidth: savedData.sidebarWidth || 100,
			draftFilter: null,
		};

		this.store = new Store(initialState);
		this.store.setSaveFn(async (state) => {
			await this.saveData(state);
		});

		registerAllCommands(this, this.store);
		this.addSettingTab(new TaskManageSettingTab(this.app, this));

		this.registerView(
			"navigator-view",
			(leaf) => new NavigatorView(leaf, this.store),
		);

		this.addRibbonIcon("compass", "任务导航中心", () => {
			this.activateView("navigator-view");
		});

		// 自动恢复之前打开的视图
		const wasViewOpen = savedData.wasViewOpen === true;
		this.app.workspace.onLayoutReady(() => {
			const leaves = this.app.workspace.getLeavesOfType("navigator-view");
			if (leaves.length > 0) {
				this.app.workspace.revealLeaf(leaves[0]);
			} else if (wasViewOpen) {
				this.activateView("navigator-view");
			}
		});
	}

	async onunload() {
		if (this.store) {
			const state = this.store.getState();
			// 自动将未保存的草稿合并到当前预设
			let presets = state.presets;
			if (state.draftFilter && state.activePresetId) {
				presets = state.presets.map((p) =>
					p.id === state.activePresetId
						? { ...p, filter: state.draftFilter! }
						: p,
				);
			}
			const wasViewOpen =
				this.app.workspace.getLeavesOfType("navigator-view").length > 0;
			await this.saveData({
				...state,
				presets,
				draftFilter: null,
				wasViewOpen,
			});
		}
		document
			.querySelectorAll(".toolbar-buttons")
			.forEach((el) => el.remove());
		document
			.querySelectorAll(".toolbar-panels")
			.forEach((el) => el.remove());
		document
			.querySelectorAll(".panel-resize-handle")
			.forEach((el) => el.remove());
	}

	async activateView(viewType: string) {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(viewType)[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: viewType, active: true });
		}
		workspace.revealLeaf(leaf);
	}
}
