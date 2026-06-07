// src/main.ts
import { Plugin } from "obsidian";
import { registerAllCommands } from "./command";
import {
	DEFAULT_TASK_FILE_PATTERN,
	DEFAULT_TASK_ROOT_PATH,
	updateTaskFileConfig,
} from "./process/config/config";
import { getDefaultPresets } from "./process/config/panel-default-config";
import { Store } from "./process/store/store";
import { TaskManageSettingTab } from "./settings";
import { AppState, GlobalFilter, Preset } from "./types";
import { NavigatorView } from "./ui/ui";

export default class TaskManagePlugin extends Plugin {
	store!: Store;

	async onload() {
		const savedData = (await this.loadData()) || {};

		updateTaskFileConfig({
			rootPath: savedData.taskRootPath || DEFAULT_TASK_ROOT_PATH,
			filePattern: savedData.taskFilePattern || DEFAULT_TASK_FILE_PATTERN,
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

		const defaultPresets = getDefaultPresets();
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
							: dp.filter.includeMarks,
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
							: dp.filter.priorityValues,
					repeatCycles:
						spFilter.repeatCycles &&
						spFilter.repeatCycles.length > 0
							? spFilter.repeatCycles
							: dp.filter.repeatCycles,
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
					hideConfig: sp.hideConfig ?? dp.hideConfig,
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
