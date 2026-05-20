// src/main.ts
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
				name: "收集箱",
				groupId: "basic",
				businessView: "inbox",
				viewStyle: "list",
				filter: { ...defaultFilter, statuses: ["todo", "planned"] },
				sort: { type: "status", order: "asc" as "asc" },
			},
			{
				id: "organize",
				name: "整理处",
				groupId: "basic",
				businessView: "organize",
				viewStyle: "list",
				filter: { ...defaultFilter },
				sort: { type: "status", order: "asc" as "asc" },
			},
			{
				id: "important",
				name: "重要任务",
				groupId: "basic",
				businessView: "important",
				viewStyle: "list",
				filter: {
					...defaultFilter,
					statuses: ["todo", "planned", "in-progress"],
				},
				sort: { type: "priority", order: "asc" as "asc" },
			},
			{
				id: "recurring",
				name: "循环任务",
				groupId: "basic",
				businessView: "recurring",
				viewStyle: "list",
				filter: { ...defaultFilter },
				sort: { type: "status", order: "asc" as "asc" },
			},
			{
				id: "today",
				name: "今天任务",
				groupId: "basic",
				businessView: "today",
				viewStyle: "list",
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
				filter: { ...defaultFilter },
				sort: { type: "due", order: "asc" as "asc" },
			},
			{
				id: "future",
				name: "未来15天",
				groupId: "basic",
				businessView: "future",
				viewStyle: "list",
				filter: { ...defaultFilter },
				sort: { type: "scheduled", order: "asc" as "asc" },
			},
			{
				id: "tag",
				name: "标签任务",
				groupId: "basic",
				businessView: "tag",
				viewStyle: "list",
				filter: { ...defaultFilter },
				sort: { type: "status", order: "asc" as "asc" },
			},
			{
				id: "depends",
				name: "依赖任务",
				groupId: "basic",
				businessView: "depends",
				viewStyle: "list",
				filter: { ...defaultFilter },
				sort: { type: "status", order: "asc" as "asc" },
			},
			{
				id: "all-tasks",
				name: "所有任务",
				groupId: "basic",
				businessView: "allTasks",
				viewStyle: "table",
				filter: { ...defaultFilter },
				sort: { type: "status", order: "asc" as "asc" },
			},
		];

		const initialState: AppState = {
			activePresetId: savedData.activePresetId || "all-tasks",
			presets: defaultPresets,
			presetGroups: [{ id: "basic", name: "任务视图", order: 0 }],
			sidebarCollapsed: false,
			sidebarWidth: 200,
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
