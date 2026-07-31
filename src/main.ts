// src/main.ts

import { Plugin } from "obsidian";
import { registerAllCommands } from "./core/command";
import { updateTaskFileConfig } from "./core/config/config";
import { DataManager } from "./core/data/data-manager";
import { getSnapshotCache, initStorage } from "./core/edit/task-editor";
import {
	getZoomCache,
	initGanttStorage,
} from "./core/process/gantt-view-process";
import { getDefaultPresets } from "./core/store/preset/panel-preset";
import { Store } from "./core/store/store";
import {
	DEFAULT_SETTINGS,
	TaskManageSettingTab,
	TaskManageSettings,
} from "./setting/setting";
import { AppState, GlobalFilter, Preset } from "./type/type";
import { ManageView } from "./ui/ui";
import logger from "./util/logger";

export default class TaskManagePlugin extends Plugin {
	store!: Store;
	settings!: TaskManageSettings;

	saveAllSettings!: () => Promise<void>;

	onload(): void {
		void (async () => {
			let savedData: Record<string, unknown> = {};

			try {
				savedData = (await this.loadData()) || {};
			} catch (e: unknown) {
				logger.warn("[TaskManage] 加载设置失败:", e);
				savedData = {};
			}

			const snapshots: Array<{
				time: string;
				snapshot: Record<string, string>;
			}> = Array.isArray(savedData["organizeSnapshots"])
				? (savedData["organizeSnapshots"] as Array<{
						time: string;
						snapshot: Record<string, string>;
					}>)
				: [];
			initStorage(snapshots, async (newSnapshots) => {
				const data: Record<string, unknown> =
					(await this.loadData()) || {};
				data["organizeSnapshots"] = newSnapshots;
				await this.saveData(data);
			});

			const ganttZoom =
				savedData["ganttZoomState"] &&
				typeof savedData["ganttZoomState"] === "object"
					? (savedData["ganttZoomState"] as { dayWidth: number })
					: null;
			initGanttStorage(ganttZoom, async (zoomState) => {
				const data: Record<string, unknown> =
					(await this.loadData()) || {};
				data["ganttZoomState"] = zoomState;
				await this.saveData(data);
			});

			this.settings = Object.assign(
				{},
				DEFAULT_SETTINGS,
				savedData as Partial<TaskManageSettings>,
			);
			this.settings.taskRootPath = this.settings.taskRootPath || "";
			this.settings.folderFilters =
				this.settings.folderFilters || DEFAULT_SETTINGS.folderFilters;
			this.settings.fileFilters =
				this.settings.fileFilters || DEFAULT_SETTINGS.fileFilters;
			this.settings.headingFilters =
				this.settings.headingFilters || DEFAULT_SETTINGS.headingFilters;
			this.settings.taskItemFilters =
				this.settings.taskItemFilters ||
				DEFAULT_SETTINGS.taskItemFilters;

			const persistData = async () => {
				try {
					const state = this.store?.getState();
					const dataToSave: Record<string, unknown> = {
						taskRootPath: this.settings.taskRootPath,
						folderFilters: this.settings.folderFilters,
						fileFilters: this.settings.fileFilters,
						headingFilters: this.settings.headingFilters,
						taskItemFilters: this.settings.taskItemFilters,
					};
					if (state) {
						Object.assign(dataToSave, state);
					}
					dataToSave["organizeSnapshots"] = getSnapshotCache();
					dataToSave["ganttZoomState"] = getZoomCache();
					await this.saveData(dataToSave);
				} catch (e: unknown) {
					logger.error("[TaskManage] 持久化失败:", e);
				}
			};

			this.saveAllSettings = persistData;

			updateTaskFileConfig({
				rootPath: this.settings.taskRootPath,
				folderFilters: this.settings.folderFilters,
				fileFilters: this.settings.fileFilters,
				headingFilters: this.settings.headingFilters,
				taskItemFilters: this.settings.taskItemFilters,
			});

			const defaultPresets = getDefaultPresets();
			let mergedPresets: Preset[] = [];

			try {
				const savedPresets: Preset[] = Array.isArray(
					savedData["presets"],
				)
					? (savedData["presets"] as Preset[])
					: [];

				const defaultVisibility: Record<string, boolean> = {
					filter: true,
					time: true,
					view: true,
					hide: true,
					edit: true,
					sort: true,
					config: true,
				};

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
							hideFolders:
								spFilter.hideFolders ?? dp.filter.hideFolders,
							searchText:
								spFilter.searchText ?? dp.filter.searchText,
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

						const merged: Preset = {
							...dp,
							...sp,
							filter: mergedFilter,
							intervalMode: sp.intervalMode ?? dp.intervalMode,
							useDynamic: sp.useDynamic ?? dp.useDynamic,
							taskTreeNavCollapsed:
								sp.taskTreeNavCollapsed ??
								dp.taskTreeNavCollapsed,
							taskTreeNavWidth:
								sp.taskTreeNavWidth ?? dp.taskTreeNavWidth,
							hideConfig: sp.hideConfig ?? dp.hideConfig,
						};

						if (merged.barVisibility) {
							merged.barVisibility = {
								...defaultVisibility,
								...merged.barVisibility,
							};
						} else {
							merged.barVisibility = { ...defaultVisibility };
						}

						if (
							merged.toolbarOrder &&
							!merged.toolbarOrder.includes("edit")
						) {
							merged.toolbarOrder = [
								...merged.toolbarOrder,
								"edit",
							];
						}

						mergedPresets.push(merged);
					} else {
						mergedPresets.push(dp);
					}
				}

				for (const sp of savedPresets) {
					if (!mergedPresets.find((p) => p.id === sp.id)) {
						if (sp.barVisibility) {
							sp.barVisibility = {
								...defaultVisibility,
								...sp.barVisibility,
							};
						} else {
							sp.barVisibility = { ...defaultVisibility };
						}
						if (
							sp.toolbarOrder &&
							!sp.toolbarOrder.includes("edit")
						) {
							sp.toolbarOrder = [...sp.toolbarOrder, "edit"];
						}
						mergedPresets.push(sp);
					}
				}
			} catch (e: unknown) {
				logger.warn("[TaskManage] 预设合并失败，回退为默认预设:", e);
				mergedPresets = [...defaultPresets];
			}

			const activePresetId: string =
				typeof savedData["activePresetId"] === "string"
					? savedData["activePresetId"]
					: "all-tasks";
			const sidebarCollapsed: boolean =
				typeof savedData["sidebarCollapsed"] === "boolean"
					? savedData["sidebarCollapsed"]
					: false;
			const sidebarWidth: number =
				typeof savedData["sidebarWidth"] === "number"
					? savedData["sidebarWidth"]
					: 100;

			const initialState: AppState = {
				activePresetId,
				presets: mergedPresets,
				presetGroups: [{ id: "basic", name: "任务视图", order: 0 }],
				sidebarCollapsed,
				sidebarWidth,
			};

			this.store = new Store(initialState);
			this.store.setSaveFn(async () => {
				await persistData();
			});

			const dataManager = DataManager.getInstance();

			this.registerEvent(
				this.app.vault.on("modify", () => {
					const fullTree = dataManager.getFullTree();
					if (fullTree.uid === "__empty__") return;
					dataManager.invalidate();
					const leaves =
						this.app.workspace.getLeavesOfType("manage-view");
					if (leaves.length > 0) {
						const view = leaves[0].view as ManageView;
						view.refreshView?.();
					}
				}),
			);

			registerAllCommands(this, this.store);
			this.addSettingTab(new TaskManageSettingTab(this.app, this));

			this.registerView(
				"manage-view",
				(leaf) => new ManageView(leaf, this.store),
			);

			this.addRibbonIcon("list-checks", "任务管理", () => {
				void this.activateView("manage-view");
			});

			const wasViewOpen: boolean = savedData["wasViewOpen"] === true;
			this.app.workspace.onLayoutReady(() => {
				if (wasViewOpen) {
					void this.activateView("manage-view");
				}
				window.setTimeout(() => {
					persistData().catch((e: unknown) =>
						logger.error("[TaskManage] 初始持久化失败:", e),
					);
				}, 1000);
			});
		})();
	}

	async onunload() {
		if (this.saveAllSettings) {
			try {
				await this.saveAllSettings();
			} catch (e: unknown) {
				logger.error("[TaskManage] 卸载持久化失败:", e);
			}
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

	async activateView(viewType: string): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(viewType)[0];
		if (!leaf) {
			leaf = workspace.getLeaf(true);
			await leaf.setViewState({ type: viewType, active: true });
		}
		workspace.setActiveLeaf(leaf, { focus: true });
	}
}
