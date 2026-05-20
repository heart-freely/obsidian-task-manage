import { App, PluginSettingTab } from "obsidian";

export interface TaskManageSettings {
	taskFolders: string[];
	rootPath: string;
	workHoursPerDay: number;
}

export const DEFAULT_SETTINGS: TaskManageSettings = {
	taskFolders: ['"pages/A 系统/A 任务系统"'],
	rootPath: "pages/A 系统/A 任务系统/",
	workHoursPerDay: 12,
};

export class TaskManageSettingTab extends PluginSettingTab {
	plugin: any;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "任务面板设置" });
	}
}
