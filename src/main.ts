import { Plugin } from "obsidian";
import { registerAllCommands } from "./commands";
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
			includeMarks: [],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
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
				toolbarOrder: [
					"time",
					"excut",
					"search",
					"mark",
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
			},
			{
				id: "important",
				name: "重要任务",
				groupId: "basic",
				businessView: "important",
				viewStyle: "list",
				icon: "⭐",
				showToolbar: false,
				toolbarOrder: [
					"time",
					"excut",
					"search",
					"mark",
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
			},
			{
				id: "today",
				name: "今天任务",
				groupId: "basic",
				businessView: "today",
				viewStyle: "list",
				icon: "📅",
				showToolbar: false,
				toolbarOrder: [
					"time",
					"excut",
					"search",
					"mark",
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
			},
			{
				id: "overdue",
				name: "逾期任务",
				groupId: "basic",
				businessView: "overdue",
				viewStyle: "list",
				icon: "⏰",
				showToolbar: false,
				toolbarOrder: [
					"time",
					"excut",
					"search",
					"mark",
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
			},
			{
				id: "future",
				name: "未来15天",
				groupId: "basic",
				businessView: "future",
				viewStyle: "list",
				icon: "🔜",
				showToolbar: false,
				toolbarOrder: [
					"time",
					"excut",
					"search",
					"mark",
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
			},
			{
				id: "all-tasks",
				name: "所有任务",
				groupId: "basic",
				businessView: "allTasks",
				viewStyle: "table",
				icon: "📋",
				showToolbar: false,
				toolbarOrder: [
					"time",
					"excut",
					"search",
					"mark",
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
			},
		];

		// 合并保存的预设，恢复用户之前设置的状态
		const savedPresets = savedData.presets || [];
		const mergedPresets = defaultPresets.map((dp) => {
			const saved = savedPresets.find((sp: any) => sp.id === dp.id);
			return saved ? { ...dp, ...saved } : dp;
		});

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
	}

	async onunload() {
		// 清理挂载到 body 的工具栏元素，避免重载插件时残留
		document
			.querySelectorAll(".toolbar-buttons")
			.forEach((el) => el.remove());
		document
			.querySelectorAll(".toolbar-panels")
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
