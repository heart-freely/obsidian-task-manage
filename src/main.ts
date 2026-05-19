import { Plugin, PluginSettingTab, Setting } from "obsidian";
import { CONFIG, DEFAULT_SETTINGS } from "./configs/plugin-configs";
import { NavigatorView, VIEW_TYPE_NAVIGATOR } from "./ui/panel";
import {
	CalendarTaskView,
	VIEW_TYPE_CALENDAR,
} from "./ui/views/calendar-task-view";
import {
	DependsTaskView,
	VIEW_TYPE_DEPENDS,
} from "./ui/views/depends-task-view";
import {
	FutureAllTaskView,
	VIEW_TYPE_FUTURE_ALL,
} from "./ui/views/future-task-all-view";
import {
	FutureNTaskView,
	VIEW_TYPE_FUTURE_N,
} from "./ui/views/future-task-n-view";
import { GanttTaskView, VIEW_TYPE_GANTT } from "./ui/views/gantt-task-view";
import {
	ImportantTaskView,
	VIEW_TYPE_IMPORTANT,
} from "./ui/views/important-task-view";
import { InboxTaskView, VIEW_TYPE_INBOX } from "./ui/views/inbox-task-view";
import {
	OrganizeTaskView,
	VIEW_TYPE_ORGANIZE,
} from "./ui/views/organize-task-view";
import {
	OverdueTaskView,
	VIEW_TYPE_OVERDUE,
} from "./ui/views/overdue-task-view";
import {
	PomodoroTaskView,
	VIEW_TYPE_POMODORO,
} from "./ui/views/pomodoro-task-view";
import {
	RecurringTaskView,
	VIEW_TYPE_RECURRING,
} from "./ui/views/recurring-task-view";
import { TableTaskView, VIEW_TYPE_TABLE } from "./ui/views/table-task-view";
import { TagTaskView, VIEW_TYPE_TAG } from "./ui/views/tag-task-view";
import {
	TimelineTaskView,
	VIEW_TYPE_TIMELINE,
} from "./ui/views/timeline-task-view";
import { TodayTaskView, VIEW_TYPE_TODAY } from "./ui/views/today-task-view";
import { TreeTaskView, VIEW_TYPE_TREE } from "./ui/views/tree-task-view";
import logger from "./utils/logger";

export default class TaskDataViewPlugin extends Plugin {
	async onload() {
		logger.info("插件加载开始");

		const userSettings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
		Object.assign(CONFIG, userSettings);

		const plugin = this;

		const storageAdapter = {
			async getItem(key) {
				const data = await plugin.loadData();
				return data ? data[key] : null;
			},
			async setItem(key, value) {
				const data = (await plugin.loadData()) || {};
				data[key] = value;
				await plugin.saveData(data);
			},
		};
		this._storageAdapter = storageAdapter;

		this.registerView(
			VIEW_TYPE_NAVIGATOR,
			(leaf) =>
				new NavigatorView(leaf, this._storageAdapter, "navigator"),
		);
		this.registerView(
			VIEW_TYPE_IMPORTANT,
			(leaf) =>
				new ImportantTaskView(leaf, this._storageAdapter, "important"),
		);
		this.registerView(
			VIEW_TYPE_RECURRING,
			(leaf) =>
				new RecurringTaskView(leaf, this._storageAdapter, "recurring"),
		);
		this.registerView(
			VIEW_TYPE_TODAY,
			(leaf) => new TodayTaskView(leaf, this._storageAdapter, "today"),
		);
		this.registerView(
			VIEW_TYPE_FUTURE_N,
			(leaf) =>
				new FutureNTaskView(leaf, this._storageAdapter, "futuren"),
		);
		this.registerView(
			VIEW_TYPE_FUTURE_ALL,
			(leaf) =>
				new FutureAllTaskView(leaf, this._storageAdapter, "futureall"),
		);
		this.registerView(
			VIEW_TYPE_OVERDUE,
			(leaf) =>
				new OverdueTaskView(leaf, this._storageAdapter, "overdue"),
		);
		this.registerView(
			VIEW_TYPE_DEPENDS,
			(leaf) =>
				new DependsTaskView(leaf, this._storageAdapter, "depends"),
		);
		this.registerView(
			VIEW_TYPE_TAG,
			(leaf) => new TagTaskView(leaf, this._storageAdapter, "tag"),
		);
		this.registerView(
			VIEW_TYPE_INBOX,
			(leaf) => new InboxTaskView(leaf, this._storageAdapter, "inbox"),
		);
		this.registerView(
			VIEW_TYPE_ORGANIZE,
			(leaf) =>
				new OrganizeTaskView(leaf, this._storageAdapter, "organize"),
		);
		this.registerView(
			VIEW_TYPE_TIMELINE,
			(leaf) =>
				new TimelineTaskView(leaf, this._storageAdapter, "timeline"),
		);
		this.registerView(
			VIEW_TYPE_TABLE,
			(leaf) => new TableTaskView(leaf, this._storageAdapter, "table"),
		);
		this.registerView(
			VIEW_TYPE_TREE,
			(leaf) => new TreeTaskView(leaf, this._storageAdapter, "tree"),
		);
		this.registerView(
			VIEW_TYPE_CALENDAR,
			(leaf) =>
				new CalendarTaskView(leaf, this._storageAdapter, "calendar"),
		);
		this.registerView(
			VIEW_TYPE_GANTT,
			(leaf) => new GanttTaskView(leaf, this._storageAdapter, "gantt"),
		);
		this.registerView(
			VIEW_TYPE_POMODORO,
			(leaf) =>
				new PomodoroTaskView(leaf, this._storageAdapter, "pomodoro"),
		);

		this.addCommand({
			id: "open-navigator",
			name: "打开任务导航中心",
			callback: () => this.activateView(VIEW_TYPE_NAVIGATOR),
		});
		this.addCommand({
			id: "open-important-tasks",
			name: "打开重要任务",
			callback: () => this.activateView(VIEW_TYPE_IMPORTANT),
		});
		this.addCommand({
			id: "open-recurring-tasks",
			name: "打开循环任务",
			callback: () => this.activateView(VIEW_TYPE_RECURRING),
		});
		this.addCommand({
			id: "open-today-tasks",
			name: "打开今天任务",
			callback: () => this.activateView(VIEW_TYPE_TODAY),
		});
		this.addCommand({
			id: "open-future-n-tasks",
			name: "打开未来 n 天任务",
			callback: () => this.activateView(VIEW_TYPE_FUTURE_N),
		});
		this.addCommand({
			id: "open-future-all-tasks",
			name: "打开未来所有任务",
			callback: () => this.activateView(VIEW_TYPE_FUTURE_ALL),
		});
		this.addCommand({
			id: "open-overdue-tasks",
			name: "打开逾期任务",
			callback: () => this.activateView(VIEW_TYPE_OVERDUE),
		});
		this.addCommand({
			id: "open-depends-tasks",
			name: "打开依赖任务",
			callback: () => this.activateView(VIEW_TYPE_DEPENDS),
		});
		this.addCommand({
			id: "open-tag-tasks",
			name: "打开标签任务",
			callback: () => this.activateView(VIEW_TYPE_TAG),
		});
		this.addCommand({
			id: "open-inbox-tasks",
			name: "打开收集箱",
			callback: () => this.activateView(VIEW_TYPE_INBOX),
		});
		this.addCommand({
			id: "open-organize-tasks",
			name: "打开整理处",
			callback: () => this.activateView(VIEW_TYPE_ORGANIZE),
		});
		this.addCommand({
			id: "open-timeline-tasks",
			name: "打开时间线视图",
			callback: () => this.activateView(VIEW_TYPE_TIMELINE),
		});
		this.addCommand({
			id: "open-table-tasks",
			name: "打开任务表",
			callback: () => this.activateView(VIEW_TYPE_TABLE),
		});
		this.addCommand({
			id: "open-calendar-tasks",
			name: "打开日历图",
			callback: () => this.activateView(VIEW_TYPE_CALENDAR),
		});
		this.addCommand({
			id: "open-gantt",
			name: "打开甘特图",
			callback: () => this.activateView(VIEW_TYPE_GANTT),
		});

		this.addRibbonIcon("compass", "任务导航中心", () =>
			this.activateView(VIEW_TYPE_NAVIGATOR),
		);

		this.addSettingTab(new TaskDataViewSettingTab(this.app, this));
		logger.info("插件加载完成");
	}

	async activateView(viewType) {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(viewType)[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: viewType, active: true });
		}
		workspace.revealLeaf(leaf);
	}

	async saveSettings(settings) {
		const currentData = (await this.loadData()) || {};
		Object.assign(currentData, settings);
		await this.saveData(currentData);
		Object.assign(CONFIG, settings);
	}

	onunload() {
		logger.info("插件卸载");
	}
}

class TaskDataViewSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("任务文件夹").addTextArea((text) =>
			text
				.setPlaceholder('"pages/A 系统/A 任务系统"')
				.setValue(CONFIG.TASK_FOLDERS.join("\n"))
				.onChange(async (value) => {
					CONFIG.TASK_FOLDERS = value
						.split("\n")
						.filter((s) => s.trim());
					await this.plugin.saveSettings(CONFIG);
				}),
		);

		new Setting(containerEl).setName("根路径").addText((text) =>
			text.setValue(CONFIG.ROOT_PATH).onChange(async (value) => {
				CONFIG.ROOT_PATH = value;
				await this.plugin.saveSettings(CONFIG);
			}),
		);

		new Setting(containerEl).setName("每日工时").addText((text) =>
			text
				.setValue(String(CONFIG.WORK_HOURS_PER_DAY))
				.onChange(async (value) => {
					const num = Number(value);
					if (!isNaN(num) && num > 0) {
						CONFIG.WORK_HOURS_PER_DAY = num;
						await this.plugin.saveSettings(CONFIG);
					}
				}),
		);
	}
}
