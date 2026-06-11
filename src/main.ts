// src/main.ts
import { Plugin } from "obsidian";
import { registerAllCommands } from "./core/command";
import { updateTaskFileConfig } from "./core/config/config";
import { getDefaultPresets } from "./core/config/panel-default-config";
import { Store } from "./core/store/store";
import {
	DEFAULT_SETTINGS,
	TaskManageSettingTab,
	TaskManageSettings,
} from "./setting/setting";
import { AppState, GlobalFilter, Preset } from "./type/type";
import { ManageView } from "./ui/ui";

export default class TaskManagePlugin extends Plugin {
	store!: Store;
	settings!: TaskManageSettings;

	saveAllSettings!: () => Promise<void>;

	async onload() {
		let savedData: any = {};

		try {
			savedData = (await this.loadData()) || {};
			this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
		} catch (e) {
			console.warn("[TaskManage] 加载设置失败:", e);
			this.settings = { ...DEFAULT_SETTINGS };
		}

		this.settings.taskRootPath = this.settings.taskRootPath || "";
		this.settings.folderFilters =
			this.settings.folderFilters || DEFAULT_SETTINGS.folderFilters;
		this.settings.fileFilters =
			this.settings.fileFilters || DEFAULT_SETTINGS.fileFilters;
		this.settings.headingFilters =
			this.settings.headingFilters || DEFAULT_SETTINGS.headingFilters;
		this.settings.taskItemFilters =
			this.settings.taskItemFilters || DEFAULT_SETTINGS.taskItemFilters;

		this.saveAllSettings = async () => {
			const existingData = (await this.loadData()) || {};
			await this.saveData({
				...existingData,
				...(this.store?.getState() || {}),
				taskRootPath: this.settings.taskRootPath,
				folderFilters: this.settings.folderFilters,
				fileFilters: this.settings.fileFilters,
				headingFilters: this.settings.headingFilters,
				taskItemFilters: this.settings.taskItemFilters,
			});
		};

		updateTaskFileConfig({
			rootPath: this.settings.taskRootPath,
			folderFilters: this.settings.folderFilters,
			fileFilters: this.settings.fileFilters,
			headingFilters: this.settings.headingFilters,
			taskItemFilters: this.settings.taskItemFilters,
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
		this.store.setSaveFn(async () => {
			await this.saveAllSettings();
		});

		registerAllCommands(this, this.store);
		this.addSettingTab(new TaskManageSettingTab(this.app, this));

		this.registerView(
			"manage-view",
			(leaf) => new ManageView(leaf, this.store),
		);

		this.addRibbonIcon("list-checks", "任务管理", () => {
			this.activateView("manage-view");
		});

		const wasViewOpen = savedData.wasViewOpen === true;
		this.app.workspace.onLayoutReady(() => {
			const leaves = this.app.workspace.getLeavesOfType("manage-view");
			if (leaves.length > 0) {
				this.app.workspace.revealLeaf(leaves[0]);
			} else if (wasViewOpen) {
				this.activateView("manage-view");
			}
		});
	}

	async onunload() {
		if (this.saveAllSettings) {
			await this.saveAllSettings();
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
