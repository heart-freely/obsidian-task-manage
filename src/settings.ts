// src/settings.ts
import { App, PluginSettingTab, Setting } from "obsidian";
import {
	DEFAULT_HEADING_TASK_PATTERN,
	DEFAULT_TASK_FILE_PATTERN,
	DEFAULT_TASK_ROOT_PATH,
	updateTaskFileConfig,
} from "./process/config/config";

export interface TaskManageSettings {
	taskRootPath: string;
	taskFilePattern: string;
	headingTaskPattern: string;
	whitelistEnabled: boolean;
	whitelistUseRegex: boolean;
	whitelistPattern: string;
	blacklistEnabled: boolean;
	blacklistUseRegex: boolean;
	blacklistPattern: string;
	workHoursPerDay: number;
}

export const DEFAULT_SETTINGS: TaskManageSettings = {
	taskRootPath: DEFAULT_TASK_ROOT_PATH,
	taskFilePattern: DEFAULT_TASK_FILE_PATTERN,
	headingTaskPattern: DEFAULT_HEADING_TASK_PATTERN,
	whitelistEnabled: false,
	whitelistUseRegex: false,
	whitelistPattern: "",
	blacklistEnabled: false,
	blacklistUseRegex: false,
	blacklistPattern: "",
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

		// ========== 根路径 ==========
		new Setting(containerEl)
			.setName("任务文件根路径")
			.setDesc("任务文件所在的根路径")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_TASK_ROOT_PATH)
					.setValue(
						this.plugin.settings.taskRootPath ||
							DEFAULT_TASK_ROOT_PATH,
					)
					.onChange(async (value) => {
						this.plugin.settings.taskRootPath = value.trim();
						updateTaskFileConfig({ rootPath: value.trim() });
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		// ========== 文件名匹配 ==========
		new Setting(containerEl)
			.setName("文件名匹配正则")
			.setDesc(
				'匹配文件名的正则表达式（默认：任务\\.md$ 匹配以"任务"结尾的文件）',
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_TASK_FILE_PATTERN)
					.setValue(
						this.plugin.settings.taskFilePattern ||
							DEFAULT_TASK_FILE_PATTERN,
					)
					.onChange(async (value) => {
						this.plugin.settings.taskFilePattern = value;
						updateTaskFileConfig({ filePattern: value });
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		// ========== 标题任务匹配 ==========
		new Setting(containerEl)
			.setName("标题任务匹配正则")
			.setDesc(
				'匹配标题任务的正则表达式（默认：任务$ 匹配以"任务"结尾的标题）',
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_HEADING_TASK_PATTERN)
					.setValue(
						this.plugin.settings.headingTaskPattern ||
							DEFAULT_HEADING_TASK_PATTERN,
					)
					.onChange(async (value) => {
						this.plugin.settings.headingTaskPattern = value;
						updateTaskFileConfig({ headingPattern: value });
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		// ========== 白名单 ==========
		containerEl.createEl("h3", { text: "白名单设置" });

		new Setting(containerEl)
			.setName("启用白名单")
			.setDesc("开启后，只有匹配白名单的路径才会被识别为任务文件")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.whitelistEnabled ?? false)
					.onChange(async (value) => {
						this.plugin.settings.whitelistEnabled = value;
						updateTaskFileConfig({ whitelist: { enabled: value } });
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName("使用正则表达式")
			.setDesc(
				"开启后，白名单模式使用正则表达式匹配；关闭则使用普通字符串包含匹配",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.whitelistUseRegex ?? false)
					.onChange(async (value) => {
						this.plugin.settings.whitelistUseRegex = value;
						updateTaskFileConfig({
							whitelist: { useRegex: value },
						});
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName("白名单模式")
			.setDesc(
				"普通模式：路径包含此字符串即匹配；正则模式：路径匹配正则表达式",
			)
			.addText((text) =>
				text
					.setPlaceholder("输入匹配模式")
					.setValue(this.plugin.settings.whitelistPattern || "")
					.onChange(async (value) => {
						this.plugin.settings.whitelistPattern = value;
						updateTaskFileConfig({ whitelist: { pattern: value } });
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		// ========== 黑名单 ==========
		containerEl.createEl("h3", { text: "黑名单设置" });

		new Setting(containerEl)
			.setName("启用黑名单")
			.setDesc("开启后，匹配黑名单的路径将被排除")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.blacklistEnabled ?? false)
					.onChange(async (value) => {
						this.plugin.settings.blacklistEnabled = value;
						updateTaskFileConfig({ blacklist: { enabled: value } });
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName("使用正则表达式")
			.setDesc(
				"开启后，黑名单模式使用正则表达式匹配；关闭则使用普通字符串包含匹配",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.blacklistUseRegex ?? false)
					.onChange(async (value) => {
						this.plugin.settings.blacklistUseRegex = value;
						updateTaskFileConfig({
							blacklist: { useRegex: value },
						});
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName("黑名单模式")
			.setDesc(
				"普通模式：路径包含此字符串即排除；正则模式：路径匹配正则表达式即排除",
			)
			.addText((text) =>
				text
					.setPlaceholder("输入匹配模式")
					.setValue(this.plugin.settings.blacklistPattern || "")
					.onChange(async (value) => {
						this.plugin.settings.blacklistPattern = value;
						updateTaskFileConfig({ blacklist: { pattern: value } });
						await this.plugin.saveData(this.plugin.settings);
					}),
			);

		// ========== 每日工时 ==========
		new Setting(containerEl)
			.setName("每日工时")
			.setDesc("用于时长计算的每日工作小时数")
			.addSlider((slider) =>
				slider
					.setLimits(1, 24, 1)
					.setValue(
						this.plugin.settings.workHoursPerDay ||
							DEFAULT_SETTINGS.workHoursPerDay,
					)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.workHoursPerDay = value;
						await this.plugin.saveData(this.plugin.settings);
					}),
			);
	}
}
