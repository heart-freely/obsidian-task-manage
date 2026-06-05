// src/main.ts
import { Plugin } from "obsidian";
import { registerAllCommands } from "./command";
import {
	ALL_MARKS,
	PRIORITY_ORDER,
	REPEAT_ORDER,
	updateTaskFileConfig,
} from "./process/config/config";
import { Store } from "./process/store/store";
import { TaskManageSettingTab } from "./settings";
import { AppState, GlobalFilter, Preset } from "./types";
import { NavigatorView } from "./ui/ui";

export default class TaskManagePlugin extends Plugin {
	store!: Store;

	async onload() {
		const savedData = (await this.loadData()) || {};

		// 初始化任务文件识别配置
		updateTaskFileConfig({
			rootPath: savedData.taskRootPath || "pages/A 系统/A 任务系统",
			filePattern: savedData.taskFilePattern || "任务\\.md$",
			whitelist: {
				enabled: savedData.whitelistEnabled ?? false,
				useRegex: savedData.whitelistUseRegex ?? false,
				pattern: savedData.whitelistPattern || "",
			},
			blacklist: {
				enabled: savedData.blacklistEnabled ?? false,
				useRegex: savedData.blacklistUseRegex ?? false,
				pattern: savedData.blacklistPattern || "",
			},
		});

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
				sort: { type: "status", order: "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
				taskTreeNavCollapsed: false,
				taskTreeNavWidth: 280,
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
					priorityValues: ["🔺", "⏫", "🔼"],
				},
				sort: { type: "priority", order: "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
				taskTreeNavCollapsed: false,
				taskTreeNavWidth: 280,
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
					dateRange: {
						start: new Date(
							new Date().getFullYear(),
							new Date().getMonth(),
							new Date().getDate(),
						).getTime(),
						end: new Date(
							new Date().getFullYear(),
							new Date().getMonth(),
							new Date().getDate(),
							23,
							59,
							59,
							999,
						).getTime(),
						isAll: false,
					},
				},
				sort: { type: "status", order: "asc" },
				intervalMode: "scheduled-due",
				useDynamic: true,
				taskTreeNavCollapsed: false,
				taskTreeNavWidth: 280,
			},
			{
				id: "future",
				name: "未来任务",
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
				filter: {
					...defaultFilter,
					statuses: ["todo", "planned", "in-progress"],
					dateRange: {
						start: new Date(
							new Date().getFullYear(),
							new Date().getMonth(),
							new Date().getDate(),
						).getTime(),
						end: new Date(
							new Date().getFullYear(),
							new Date().getMonth(),
							new Date().getDate() + 15,
							23,
							59,
							59,
							999,
						).getTime(),
						isAll: false,
					},
				},
				sort: { type: "scheduled", order: "asc" },
				intervalMode: "scheduled-due",
				useDynamic: true,
				taskTreeNavCollapsed: false,
				taskTreeNavWidth: 280,
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
				sort: { type: "status", order: "asc" },
				intervalMode: "scheduled-due",
				useDynamic: false,
				taskTreeNavCollapsed: false,
				taskTreeNavWidth: 280,
			},
		];

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
					taskTreeNavCollapsed:
						sp.taskTreeNavCollapsed ?? dp.taskTreeNavCollapsed,
					taskTreeNavWidth:
						sp.taskTreeNavWidth ?? dp.taskTreeNavWidth,
				});
			} else {
				mergedPresets.push(dp);
			}
		}

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
		};

		this.store = new Store(initialState);
		this.store.setSaveFn(async (state) => {
			await this.saveData({
				...state,
				taskRootPath: savedData.taskRootPath,
				taskFilePattern: savedData.taskFilePattern,
				whitelistEnabled: savedData.whitelistEnabled,
				whitelistUseRegex: savedData.whitelistUseRegex,
				whitelistPattern: savedData.whitelistPattern,
				blacklistEnabled: savedData.blacklistEnabled,
				blacklistUseRegex: savedData.blacklistUseRegex,
				blacklistPattern: savedData.blacklistPattern,
			});
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
			const wasViewOpen =
				this.app.workspace.getLeavesOfType("navigator-view").length > 0;
			await this.saveData({ ...state, wasViewOpen });
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
