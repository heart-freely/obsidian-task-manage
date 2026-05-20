# Project Export

## Project Statistics

- Total files: 64

## Folder Structure

```
src
  commands
    index.ts
  configs
    plugin-configs.ts
  main.ts
  settings.ts
  store
    preset-manager.ts
    store.ts
  tasks
    process
      calcul-chart-process.ts
      common-process.ts
      filter-task-process.ts
      inbox-task-process.ts
      kanban-task-process.ts
      matrix-task-process.ts
      organize-task-process.ts
      recurring-task-process.ts
      task-query-process.ts
      tree-task-process.ts
    read
      read-tasks.ts
    write
      write-tasks.ts
  types.ts
  ui
    bars
      business-filter-bar.ts
      sort-bar.ts
      view-style-bar.ts
    components
      boards
        kanban.ts
        matrix.ts
      calendar
        day.ts
        month.ts
        quarter.ts
        task-calendar.ts
        week.ts
        year.ts
      cards
        task-card.ts
      charts
        chart-interact.ts
        detail.ts
        echarts.ts
        statistics.ts
      editors
        bulk-edit.ts
        single-edit.ts
      filters
        date-filter.ts
        mark-filter.ts
        status-filter.ts
      gantt
        gantt.ts
      lists
        task-list.ts
        task-tree.ts
      tables
        task-table.ts
      timeline
        task-timeline.ts
      tooltip
        tooltip.ts
    layout
      navigator-layout-impl.ts
      navigator-layout.ts
    panels
      filter-bar.ts
      side-bar.ts
      view-container.ts
    views
      all-tasks-view.ts
      base-view.ts
      depends-view.ts
      future-view.ts
      important-view.ts
      inbox-view.ts
      organize-view.ts
      overdue-view.ts
      recurring-view.ts
      table-view.ts
      tag-view.ts
      today-view.ts
  utils
    logger.ts

```

### src\commands\index.ts

```ts
import { Plugin } from "obsidian";
import { Store } from "../store/store";

export function registerAllCommands(plugin: Plugin, store: Store) {
	// 暂时无命令
}

```

### src\configs\plugin-configs.ts

```ts
// src/configs/plugin-configs.js

export const TASK_FOLDERS          = ['"pages/A 系统/A 任务系统"'];
export const FILE_NAME_PATTERN     = /任务$/;
export const ROOT_PATH             = 'pages/A 系统/A 任务系统/';
export const TASK_FOLDER_PATH      = 'pages/A 系统/A 任务系统';
export const TASK_FILENAME_REGEX_TASKS = '/.*任务\\.md$/';
export const TASK_FILENAME_REGEXP      = /.*任务\.md$/;

export const ALLOWED_STATUSES = ['todo', 'planned', 'in-progress', 'completed', 'cancelled'];
export const STATUS_NAMES = {
    todo: '未开始',
    planned: '计划中',
    'in-progress': '进行中',
    completed: '已完成',
    cancelled: '已取消'
};
export const STATUS_ICONS = {
    todo: '🔲',
    planned: '❔',
    'in-progress': '⏩',
    completed: '✅',
    cancelled: '❎'
};
export const STATUS_SORT_ORDER = ['todo', 'planned', 'in-progress', 'completed', 'cancelled'];
export const STATUS_SYMBOL_MAP = {
    ' ': 'todo',
    '?': 'planned',
    '/': 'in-progress',
    x: 'completed',
    X: 'completed',
    '-': 'cancelled'
};

export const PRIORITY_ORDER  = ['⏬', '🔽', '🔼', '⏫', '🔺'];
export const PRIORITY_COLORS = ['#98c379', '#61afef', '#d19a66', '#e06c75', '#c3393e'];
export const PRIORITY_ICONS = { "0": "🔺", "1": "⏫", "2": "🔼", "3": "🔽", "4": "⏬", "none": "" };
export const PRIORITY_LABELS = {
    '0': 'Highest|最高',
    '1': 'High|高',
    '2': 'Medium|中',
    '3': 'Low|低',
    '4': 'Lowest|最低',
    'none': 'None|无'
};
export const PRIORITY_NAME_MAP = {
    "0": "VH🔺",
    "1": "H⏫",
    "2": "M🔼",
    "3": "L🔽",
    "4": "VL⏬",
    "none": "NON"
};

export const REPEAT_ORDER  = ['every day', 'every week', 'every month', 'every year'];
export const REPEAT_COLORS = ['#a0c4ff', '#9bf6ff', '#ffd6a5', '#fdffb6'];
export const REPEAT_ICON   = '🔁';
export const REPEAT_LABELS = { day: '每天', week: '每周', month: '每月', year: '每年' };

export const DATE_MARK_ORDER = ['created', 'scheduled', 'starts', 'due', 'done', 'cancel'];
export const DATE_MARK_ICONS = {
    created: '➕',
    scheduled: '⏳',
    starts: '🛫',
    due: '📅',
    done: '✅',
    cancel: '❌'
};
export const DATE_MARK_NAMES = {
    created: '➕ 创建',
    scheduled: '⏳ 计划',
    starts: '🛫 开始',
    due: '📅 截止',
    done: '✅ 结束',
    cancel: '❌ 取消'
};
export const DATE_FIELD_SORT_ORDER = ['created', 'starts', 'scheduled', 'due', 'cancel', 'done'];

export const ID_ICON      = '🆔';
export const DEPENDS_ICON = '⛔';
export const TAG_ICON     = '🏁';
export const TASK_MARK_SEQUENCE = [
    'status', 'description', 'priority', 'repeat',
    'created', 'scheduled', 'starts', 'due', 'done', 'cancel',
    'id', 'forbid', 'tag'
];

export const MARK_NAMES = {
    priority: '优先级',
    repeat: '循环',
    created: '创建',
    scheduled: '计划',
    starts: '开始',
    due: '截止',
    done: '完成',
    cancel: '取消',
    tag: '标签',
    id: '唯一ID',
    forbid: '引用ID'
};
export const ALL_MARKS = Object.keys(MARK_NAMES);

export const CONFIG = {
    TASK_FOLDERS,
    FILE_NAME_PATTERN,
    ROOT_PATH,
    TASK_FOLDER_PATH,
    TASK_FILENAME_REGEX_TASKS,
    TASK_FILENAME_REGEXP,
    ALLOWED_STATUSES,
    STATUS_NAMES,
    STATUS_ICONS,
    STATUS_SORT_ORDER,
    STATUS_SYMBOL_MAP,
    PRIORITY_ORDER,
    PRIORITY_COLORS,
    PRIORITY_ICONS,
    PRIORITY_NAME_MAP,
    PRIORITY_LABELS,
    REPEAT_ORDER,
    REPEAT_COLORS,
    REPEAT_ICON,
    REPEAT_LABELS,
    DATE_MARK_ORDER,
    DATE_MARK_ICONS,
    DATE_MARK_NAMES,
    DATE_FIELD_SORT_ORDER,
    ID_ICON,
    DEPENDS_ICON,
    TAG_ICON,
    MARK_NAMES,
    ALL_MARKS,
    TASK_MARK_SEQUENCE,
    YEAR_LIST: [2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031],
    WORK_HOURS_PER_DAY: 12,
    SORT_TYPES: { STATUS: 'status', PRIORITY: 'priority', TIME: 'time' },
    INTERVAL_MODES: { SCHEDULED_DUE: 'scheduled-due', STARTS_DONE: 'starts-done' },
    DEFAULT_FILTER_STATE: {
        hideRepeatTasks: true,
        hideCompletedTasks: true,
        hideCancelledTasks: true,
        hideFolders: true,
        leftSort: { type: 'status', order: 'asc' },
        chartScale: 1,
        leftPanelWidth: 300
    }
};

export const DEFAULT_SETTINGS = {
    TASK_FOLDERS,
    ROOT_PATH,
    WORK_HOURS_PER_DAY: 12,
    STATUS_COLORS: {
        todo: '#2e333b',
        planned: '#4b525b',
        'in-progress': '#7fb8f0',
        completed: '#47852f',
        cancelled: '#c3393e'
    },
    PRIORITY_ORDER,
    PRIORITY_COLORS,
    REPEAT_COLORS,
    DATE_MARK_COLORS: ['#b7bdf8', '#ed8796', '#f5a97f', '#eed49f', '#a6da95', '#8bd5ca'],
    YEAR_LIST: [2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031]
};
```

### src\main.ts

```ts
import { Plugin } from "obsidian";
import { registerAllCommands } from "./commands";
import { TaskManageSettingTab } from "./settings";
import { Store } from "./store/store";
import { AppState } from "./types";
import { NavigatorView } from "./ui/layout/navigator-layout";

export default class TaskManagePlugin extends Plugin {
	store!: Store;

	async onload() {
		const savedData = (await this.loadData()) || {};
		const hasExistingPresets =
			savedData.presets && savedData.presets.length;

		// 默认只保留“所有任务”方案
		const defaultPreset = {
			id: "all-tasks",
			name: "所有任务",
			groupId: "default",
			businessView: "allTasks",
			viewStyle: "table",
			filter: {
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
			},
			sort: { type: "status", order: "asc" },
		};

		const initialState: AppState = {
			activePresetId: hasExistingPresets
				? savedData.activePresetId
				: "all-tasks",
			presets: hasExistingPresets ? savedData.presets : [defaultPreset],
			presetGroups: savedData.presetGroups || [
				{ id: "default", name: "常用" },
			],
			sidebarCollapsed: false,
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
		this.addRibbonIcon("compass", "任务导航中心", () =>
			this.activateView("navigator-view"),
		);
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

```

### src\settings.ts

```ts
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

```

### src\store\preset-manager.ts

```ts
// src/store/preset-manager.ts
import { Preset } from "../types";
import { Store } from "./store";

// 添加方案
export function addPreset(
	store: Store,
	preset: Omit<Preset, "id"> & { id?: string },
) {
	const newPreset: Preset = {
		...preset,
		id: preset.id || generateId(),
	};
	const presets = [...store.getState().presets, newPreset];
	store.update({ presets });
}

// 删除方案
export function removePreset(store: Store, presetId: string) {
	const presets = store.getState().presets.filter((p) => p.id !== presetId);
	const active =
		store.getState().activePresetId === presetId
			? null
			: store.getState().activePresetId;
	store.update({ presets, activePresetId: active });
}

// 更新方案（部分字段）
export function updatePreset(
	store: Store,
	presetId: string,
	changes: Partial<Preset>,
) {
	const presets = store
		.getState()
		.presets.map((p) => (p.id === presetId ? { ...p, ...changes } : p));
	store.update({ presets });
}

// 设置当前激活方案
export function activatePreset(store: Store, presetId: string) {
	store.update({ activePresetId: presetId });
}

// 辅助：生成唯一 ID
function generateId(): string {
	return Math.random().toString(36).substr(2, 9);
}

```

### src\store\store.ts

```ts
import { AppState, Preset } from "../types";

type Listener = (state: AppState) => void;

export class Store {
	private state: AppState;
	private listeners: Listener[] = [];
	private saveFn?: (data: any) => Promise<void>;

	constructor(initial: AppState, saveFn?: (data: any) => Promise<void>) {
		this.state = initial;
		this.saveFn = saveFn;
	}

	getState(): Readonly<AppState> {
		return this.state;
	}

	update(partial: Partial<AppState>) {
		this.state = { ...this.state, ...partial };
		this.notify();
		this.save();
	}

	subscribe(listener: Listener): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	private notify() {
		this.listeners.forEach((l) => l(this.state));
	}

	private async save() {
		if (!this.saveFn) return;
		try {
			await this.saveFn(this.state);
		} catch (e) {
			console.error("Store 持久化失败", e);
		}
	}

	setSaveFn(fn: (data: any) => Promise<void>) {
		this.saveFn = fn;
	}

	getActivePreset(): Preset | undefined {
		return this.state.presets.find(
			(p) => p.id === this.state.activePresetId,
		);
	}
}

```

### src\tasks\process\calcul-chart-process.ts

```ts
// src/tasks/process/calcul-chart-process.js
// 图表数据计算及任务计算（纯函数）

import { CONFIG } from '../../configs/plugin-configs';

// ========== 原 calcul-echarts 计算 ==========
export function computeTotalSpanDays(tasks, fieldStart, fieldEnd) {
    if (!tasks.length) return 0;
    let min = Infinity, max = -Infinity;
    tasks.forEach(t => {
        const s = t[fieldStart] ? new Date(t[fieldStart]).getTime() : null;
        const e = t[fieldEnd] ? new Date(t[fieldEnd]).getTime() : null;
        if (s && e && s <= e) { if (s < min) min = s; if (e > max) max = e; }
    });
    if (min === Infinity || max === -Infinity) return 0;
    return Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
}

export function calcPlannedDuration(tasks) {
    let total = 0;
    tasks.forEach(t => {
        if (t._scheduled && t._due) total += Math.max(0, (new Date(t._due) - new Date(t._scheduled)) / 86400000);
    });
    return Math.round(total);
}

export function calcActualDuration(tasks) {
    let total = 0;
    tasks.forEach(t => {
        if (t._starts && t._done) total += Math.max(0, (new Date(t._done) - new Date(t._starts)) / 86400000);
    });
    return Math.round(total);
}

export function calcTotalSpanHours(tasks, fieldStart, fieldEnd) {
    const days = computeTotalSpanDays(tasks, fieldStart, fieldEnd);
    return days * CONFIG.WORK_HOURS_PER_DAY;
}

export function prepareDailyStatusStack(tasks, dateRange, formatDate, setStart, setEnd) {
    const dayMap = {};
    function keyOf(d) { return formatDate(d); }
    function initDay() { return { todo: 0, planned: 0, 'in-progress': 0, completed: 0, cancelled: 0 }; }
    if (dateRange) {
        const cur = setStart(new Date(dateRange.start));
        const end = setStart(new Date(dateRange.end));
        while (cur <= end) {
            dayMap[keyOf(cur)] = initDay();
            cur.setDate(cur.getDate() + 1);
        }
    }
    tasks.forEach(t => {
        const range = t._cachedTimeRange;
        if (!range) return;
        const cur = setStart(new Date(range.start));
        const end = setStart(new Date(range.end));
        while (cur <= end) {
            const key = keyOf(cur);
            if (dateRange) {
                if (dayMap[key]) dayMap[key][t._status]++;
            } else {
                if (!dayMap[key]) dayMap[key] = initDay();
                dayMap[key][t._status]++;
            }
            cur.setDate(cur.getDate() + 1);
        }
    });
    const sorted = Object.keys(dayMap).sort().map(k => [k, dayMap[k]]);
    const dates = sorted.map(e => e[0]);
    const seriesData = {};
    CONFIG.ALLOWED_STATUSES.forEach(s => {
        seriesData[s] = sorted.map(e => e[1][s]);
    });
    return { dates, seriesData, statusOrder: CONFIG.ALLOWED_STATUSES };
}

// ========== 原 calcul-task-process 中的函数（如有）直接追加此处 ==========
// 若原文件为空，则无需添加。如果已有一些任务级别计算，请直接粘贴于此。
// 为了安全，检查是否有被其他模块引用的符号，若无则忽略。
```

### src\tasks\process\common-process.ts

```ts
// src/common.js
// 纯工具函数，不依赖 Obsidian 或 Dataview

/**
 * 日期工具集
 */
export const DateUtils = {
    formatDate(d) {
        const pad = n => n < 10 ? '0' + n : n;
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },

    setStart(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    },

    setEnd(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    },

    getDayRange(d) {
        return { start: DateUtils.setStart(d), end: DateUtils.setEnd(d) };
    },

    getISOWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    getWeekRangeByYearWeek(year, week) {
        const jan4 = new Date(Date.UTC(year, 0, 4));
        const jan4Day = jan4.getUTCDay() || 7;
        const firstThursday = new Date(Date.UTC(year, 0, 4 - (jan4Day - 4)));
        const weekStart = new Date(firstThursday);
        weekStart.setUTCDate(firstThursday.getUTCDate() - 3 + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        return {
            start: DateUtils.setStart(new Date(weekStart)),
            end: DateUtils.setEnd(new Date(weekEnd))
        };
    },

    getWeekRange(d) {
        return DateUtils.getWeekRangeByYearWeek(d.getFullYear(), DateUtils.getISOWeekNumber(d));
    },

    getMonthRange(d) {
        return {
            start: DateUtils.setStart(new Date(d.getFullYear(), d.getMonth(), 1)),
            end: DateUtils.setEnd(new Date(d.getFullYear(), d.getMonth() + 1, 0))
        };
    },

    getMonthRangeByYearMonth(y, m) {
        return {
            start: DateUtils.setStart(new Date(y, m - 1, 1)),
            end: DateUtils.setEnd(new Date(y, m, 0))
        };
    },

    getQuarterRangeByYearQuarter(y, q) {
        const sm = (q - 1) * 3 + 1;
        return {
            start: DateUtils.setStart(new Date(y, sm - 1, 1)),
            end: DateUtils.setEnd(new Date(y, sm + 2, 0))
        };
    },

    getYearRangeByYear(y) {
        return {
            start: DateUtils.setStart(new Date(y, 0, 1)),
            end: DateUtils.setEnd(new Date(y, 11, 31))
        };
    },

    getWeekdayRange(date, wd) {
        const d = new Date(date);
        d.setDate(d.getDate() + (wd - (d.getDay() || 7)));
        return DateUtils.getDayRange(d);
    }
};

/**
 * 帧节流
 */
export function throttleByFrame(fn) {
    let scheduled = false;
    return function (...args) {
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
                fn.apply(this, args);
                scheduled = false;
            });
        }
    };
}

/**
 * 简易 DOM 创建（不依赖 Obsidian，可被 dv.el 替代）
 * 这里只提供基础版本，若需复杂功能仍用 dv.el
 */
export function createEl(tag, textOrOpts, opts) {
    const el = document.createElement(tag);
    if (typeof textOrOpts === 'string') {
        el.textContent = textOrOpts;
    } else if (textOrOpts && typeof textOrOpts === 'object') {
        Object.assign(el, textOrOpts);
    }
    if (opts && typeof opts === 'object') {
        if (opts.cls) el.className = opts.cls;
        if (opts.style) el.style.cssText = opts.style;
        if (opts.attr) {
            for (const key in opts.attr) {
                if (Object.hasOwn(opts.attr, key)) el.setAttribute(key, opts.attr[key]);
            }
        }
    }
    return el;
}
```

### src\tasks\process\filter-task-process.ts

```ts
import { GlobalFilter } from "../../types";

export function filterTasks(tasks: any[], filter: GlobalFilter): any[] {
	let result = tasks;

	if (
		!filter.dateRange.isAll &&
		filter.dateRange.start != null &&
		filter.dateRange.end != null
	) {
		const start = filter.dateRange.start;
		const end = filter.dateRange.end;
		result = result.filter((t: any) => {
			if (!t._cachedTimeRange) return false;
			return (
				t._cachedTimeRange.start <= end &&
				t._cachedTimeRange.end >= start
			);
		});
	}

	if (filter.statuses && filter.statuses.length > 0) {
		result = result.filter((t: any) => filter.statuses.includes(t._status));
	}

	if (filter.includeMarks && filter.includeMarks.length) {
		result = result.filter((t: any) =>
			filter.includeMarks.every((m: string) => t._marks?.[m]),
		);
	}
	if (filter.excludeMarks && filter.excludeMarks.length) {
		result = result.filter(
			(t: any) => !filter.excludeMarks.some((m: string) => t._marks?.[m]),
		);
	}

	if (filter.hideRepeat) result = result.filter((t: any) => !t._repeat);
	if (filter.hideCompleted)
		result = result.filter((t: any) => t._status !== "completed");
	if (filter.hideCancelled)
		result = result.filter((t: any) => t._status !== "cancelled");
	if (filter.rootPath)
		result = result.filter((t: any) =>
			t.path?.startsWith(filter.rootPath!),
		);

	return result;
}

```

### src\tasks\process\inbox-task-process.ts

```ts
// src/tasks/process/inbox-task-process.js
import { TASK_FOLDER_PATH, TASK_FILENAME_REGEX_TASKS } from '../../configs/plugin-configs';

export async function fetchInboxTasks(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) throw new Error('Tasks 插件未安装');
    const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
    const allTasks = await tasksPlugin.getTasks(query);
    return allTasks.filter(t => t.status.symbol === ' ' || t.status.symbol === '?');
}

export function processInboxTasks(allTasks) {
    const groups = { "未开始": [], "计划中": [] };

    allTasks.forEach(t => {
        const isPlanned = t.status.symbol === '?';
        const prio = t.priority || 'none';
        const desc = t.description || '（无描述）';
        const taskItem = {
            description: desc,
            priority: prio,
            path: t.path,
            lineNumber: t.lineNumber,
            scheduled: t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null,
            start: t.startDate ? window.moment(t.startDate).format('YYYY-MM-DD') : null,
            due: t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null,
            tags: (t.tags || []).map(tag => tag.replace(/^#/, '')),
            fileName: t.path.split('/').pop().replace(/\.md$/, '')
        };

        if (isPlanned) {
            groups["计划中"].push(taskItem);
        } else {
            groups["未开始"].push(taskItem);
        }
    });

    for (const groupName in groups) {
        groups[groupName].sort((a, b) => {
            const pa = a.priority === 'none' ? 999 : parseInt(a.priority);
            const pb = b.priority === 'none' ? 999 : parseInt(b.priority);
            return pa - pb;
        });
    }

    return { groups, total: allTasks.length };
}
```

### src\tasks\process\kanban-task-process.ts

```ts
// src/tasks/process/kanban-task-process.js
import {
    TASK_FOLDER_PATH,
    TASK_FILENAME_REGEX_TASKS,
    STATUS_SYMBOL_MAP
} from '../../configs/plugin-configs';

// 看板列定义（颜色使用半透明，与矩阵视图配色风格统一）
export const KANBAN_COLUMNS = [
    { symbol: ' ', label: '未开始', color: 'rgba(180, 180, 180, 0.25)' },
    { symbol: '?', label: '计划中', color: 'rgba( 97, 175, 239, 0.25)' },
    { symbol: '/', label: '进行中', color: 'rgba(224, 108, 117, 0.25)' }
];

export async function fetchKanbanTasks(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) throw new Error('需要 Tasks 插件');
    const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
    return await tasksPlugin.getTasks(query);
}

export function processKanbanTasks(allTasks) {
    const tasksBySymbol = { ' ': [], '?': [], '/': [] };
    allTasks.forEach(task => {
        const symbol = task.status.symbol;
        if (!tasksBySymbol.hasOwnProperty(symbol)) return;

        const statusKey = STATUS_SYMBOL_MAP[symbol] || 'todo';
        const description = task.description || '（无描述）';
        const fileName = task.path.split('/').pop().replace(/\.md$/, '');

        tasksBySymbol[symbol].push({
            description,
            priority: task.priority || 'none',
            status: statusKey,          // 供 createTaskCard 自动推导
            path: task.path,
            lineNumber: task.lineNumber,
            fileName,
            rawTask: task
        });
    });

    // 每列按优先级排序（优先级数字小的在前）
    for (const symbol in tasksBySymbol) {
        tasksBySymbol[symbol].sort((a, b) => {
            const pa = a.priority === 'none' ? 999 : parseInt(a.priority);
            const pb = b.priority === 'none' ? 999 : parseInt(b.priority);
            return pa - pb;
        });
    }

    return {
        columns: KANBAN_COLUMNS,
        tasksBySymbol,
        total: Object.values(tasksBySymbol).flat().length
    };
}
```

### src\tasks\process\matrix-task-process.ts

```ts
// src/tasks/process/matrix-task-process.js
import {
    TASK_FOLDER_PATH,
    TASK_FILENAME_REGEX_TASKS,
    TASK_FILENAME_REGEXP,
    PRIORITY_ICONS
} from '../../configs/plugin-configs';

const STATUS_SYMBOLS = [" ", "?", "/"];

// 优先级 -> 四象限索引（局部常量，不再放进全局配置）
const PRIORITY_TO_QUADRANT = {
    1: 0,  // 最高优先级 → 紧急重要
    2: 1,  // 高        → 不紧急但重要
    3: 2,  // 中        → 紧急但不重要
    4: 3,  // 低        → 不紧急不重要
    // 无优先级（'none'）在逻辑中默认归入象限3
};

const dateCache = new Map();
function formatDate(date) {
    if (!date) return null;
    const key = String(date);
    if (dateCache.has(key)) return dateCache.get(key);
    const formatted = window.moment
        ? window.moment(date).format("YYYY-MM-DD")
        : new Date(date).toISOString().slice(0, 10);
    dateCache.set(key, formatted);
    return formatted;
}

export function fetchRawTasks(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) return Promise.reject('需要 Tasks 插件');
    const query = `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS}`;
    return tasksPlugin.getTasks(query);
}

export function processTasks(allTasks, hideRecurring = false) {
    const quadrantsData = [[], [], [], []];
    allTasks.forEach(t => {
        const fileName = t.path.split('/').pop();
        if (!TASK_FILENAME_REGEXP.test(fileName)) return;
        const sym = t.status.symbol;
        if (!STATUS_SYMBOLS.includes(sym)) return;
        if (hideRecurring && t.recurrence) return;

        const priorityNum = (t.priority === "none" || t.priority == null) ? 5 : parseInt(t.priority);
        const priorityIcon = PRIORITY_ICONS[t.priority] || '';
        const statusText = sym === '/' ? '进行中' : (sym === '?' ? '计划中' : '未开始');
        const tags = (t.tags || []).map(tag => tag.replace(/^#/, ''));
        const sortDate = t.scheduledDate || t.startDate || t.dueDate;
        const sortTimestamp = sortDate ? new Date(sortDate).getTime() : null;

        const taskItem = {
            desc: t.description || "（无描述）",
            priorityNum,
            priorityIcon,
            statusText,
            tags,
            created: formatDate(t.createdDate),
            scheduled: formatDate(t.scheduledDate),
            start: formatDate(t.startDate),
            due: formatDate(t.dueDate),
            done: formatDate(t.doneDate),
            cancelled: formatDate(t.cancelledDate),
            path: t.path,
            line: t.lineNumber,
            fileName: fileName.replace(/\.md$/, ''),
            isRecurring: !!t.recurrence,
            sortTimestamp,
            _status: t.status?.symbol === '/' ? 'in-progress' : (t.status?.symbol === '?' ? 'planned' : 'todo')
        };

        // 使用显式映射，无优先级默认象限3（不紧急不重要）
        const quadIndex = PRIORITY_TO_QUADRANT[priorityNum] ?? 3;
        quadrantsData[quadIndex].push(taskItem);
    });
    return quadrantsData;
}

export function sortTasks(tasks, sortConfig) {
    const { type, order } = sortConfig;
    const asc = order === 'asc';
    const copy = tasks.slice();
    copy.sort((a, b) => {
        if (type === 'status') {
            const orderA = a.statusText === '进行中' ? 0 : (a.statusText === '计划中' ? 1 : 2);
            const orderB = b.statusText === '进行中' ? 0 : (b.statusText === '计划中' ? 1 : 2);
            if (orderA !== orderB) return orderA - orderB;
            if (a.priorityNum !== b.priorityNum) return a.priorityNum - b.priorityNum;
            const tsA = a.sortTimestamp || Number.MAX_SAFE_INTEGER;
            const tsB = b.sortTimestamp || Number.MAX_SAFE_INTEGER;
            return tsA - tsB;
        }
        if (type === 'priority') return a.priorityNum - b.priorityNum;
        if (type === 'filename') {
            const cmp = a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase());
            return asc ? cmp : -cmp;
        }
        const dateField = type;
        const dateA = a[dateField] ? new Date(a[dateField] + 'T00:00:00') : null;
        const dateB = b[dateField] ? new Date(b[dateField] + 'T00:00:00') : null;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return asc ? dateA - dateB : dateB - dateA;
    });
    return copy;
}
```

### src\tasks\process\organize-task-process.ts

```ts
// src/tasks/process/organize-task-process.js
import { RX } from '../read/read-tasks';

const AUTOCOMPLETE_DAYS = 3;
const MAX_SNAPSHOTS = 5;
const STORAGE_KEY_SNAPSHOTS = 'organizeSnapshots';

// ---------- 辅助函数 ----------
export function isIncomplete(s) { return s === 'todo' || s === 'planned' || s === 'in-progress'; }
export function isCompleted(s) { return s === 'completed' || s === 'cancelled'; }
export function hasEssentialTags(t) { return t._priorityIcon && t._created && t._scheduled && t._starts && t._due; }

function replaceMark(line, regex, newMark) {
    if (newMark === undefined) return line.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
    if (regex.test(line)) return line.replace(regex, newMark).replace(/\s{2,}/g, ' ').trim();
    return (line + ' ' + newMark).replace(/\s{2,}/g, ' ').trim();
}

// ---------- 编辑操作库 ----------
export const Op = {
    setPriority(line, emoji) { return replaceMark(line, RX.priority, emoji); },
    delPriority(line) { return replaceMark(line, RX.priority); },
    setRepeat(line, rule) { return replaceMark(line, RX.repeat, '🔁 ' + rule.replace(/^🔁\s*/, '')); },
    delRepeat(line) { return replaceMark(line, RX.repeat); },
    setCreated(line, date) { return replaceMark(line, RX.created, '➕ ' + date); },
    delCreated(line) { return replaceMark(line, RX.created); },
    setScheduled(line, date) { return replaceMark(line, RX.scheduled, '⏳ ' + date); },
    delScheduled(line) { return replaceMark(line, RX.scheduled); },
    setStarts(line, date) { return replaceMark(line, RX.starts, '🛫 ' + date); },
    delStarts(line) { return replaceMark(line, RX.starts); },
    setDue(line, date) { return replaceMark(line, RX.due, '📅 ' + date); },
    delDue(line) { return replaceMark(line, RX.due); },
    setDone(line, date) { return replaceMark(line, RX.done, '✅ ' + date); },
    delDone(line) { return replaceMark(line, RX.done); },
    setCancel(line, date) { return replaceMark(line, RX.cancel, '❌ ' + date); },
    delCancel(line) { return replaceMark(line, RX.cancel); },
    setTag(line, keyword) { return replaceMark(line, RX.tag, '🏁 ' + keyword.replace(/^🏁\s*/, '')); },
    delTag(line) { return replaceMark(line, RX.tag); },
    delId(line) { return replaceMark(line, RX.id); },
    delForbid(line) { return replaceMark(line, RX.forbid); },
    autoComplete(line, days) {
        const doneMatch = line.match(RX.done);
        if (!doneMatch) return line;
        const n = days || AUTOCOMPLETE_DAYS;
        const doneDate = window.moment(doneMatch[1], 'YYYY-MM-DD', true);
        if (!doneDate.isValid()) return line;
        let newLine = Op.sortTags(line);
        if (!RX.due.test(newLine)) newLine += ' 📅 ' + doneDate.format('YYYY-MM-DD');
        else newLine = replaceMark(newLine, RX.due, '📅 ' + doneDate.format('YYYY-MM-DD'));
        const expectedStarts = doneDate.clone().subtract(n, 'days');
        if (!RX.starts.test(newLine)) newLine += ' 🛫 ' + expectedStarts.format('YYYY-MM-DD');
        else newLine = replaceMark(newLine, RX.starts, '🛫 ' + expectedStarts.format('YYYY-MM-DD'));
        if (!RX.scheduled.test(newLine)) newLine += ' ⏳ ' + expectedStarts.format('YYYY-MM-DD');
        else newLine = replaceMark(newLine, RX.scheduled, '⏳ ' + expectedStarts.format('YYYY-MM-DD'));
        if (!RX.created.test(newLine)) newLine += ' ➕ ' + expectedStarts.format('YYYY-MM-DD');
        else newLine = replaceMark(newLine, RX.created, '➕ ' + expectedStarts.format('YYYY-MM-DD'));
        return Op.sortTags(newLine);
    },
    sortTags(line) {
        const order = ['priority','repeat','created','scheduled','starts','due','done','cancel','tag','id','forbid'];
        const parts = [];
        for (const key of order) { const m = line.match(RX[key]); parts.push(m ? m[0] : ''); }
        let clean = line;
        parts.forEach(p => { if (p) clean = clean.replace(p, ''); });
        clean = clean.replace(/\s+/g, ' ').trim();
        return (clean + ' ' + parts.filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim();
    }
};

// ---------- 快照管理 ----------
export function loadSnapshots() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_SNAPSHOTS) || '[]'); } catch(e) { return []; }
}
export function saveSnapshots(snapshots) {
    try { localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots)); } catch(e) {}
}
export function addSnapshot(snapshots, map) {
    snapshots.unshift({ time: new Date().toLocaleString(), snapshot: map });
    if (snapshots.length > MAX_SNAPSHOTS) snapshots.pop();
    saveSnapshots(snapshots);
}

// ---------- 文件写入 ----------
export async function writeToFiles(app, tasks, taskIds, linesMap) {
    const groups = {};
    for (const id of taskIds) {
        const task = tasks.find(t => (t.path + '|' + t.line) === id);
        if (!task) continue;
        const newLine = linesMap[id];
        if (!newLine || newLine === task._fullLine) continue;
        if (!groups[task.path]) groups[task.path] = [];
        groups[task.path].push({ line: task.line, newLine });
    }
    let count = 0;
    for (const [path, items] of Object.entries(groups)) {
        const file = app.vault.getAbstractFileByPath(path);
        if (!file) continue;
        await app.vault.process(file, data => {
            const dataLines = data.split('\n');
            for (const item of items) if (item.line < dataLines.length) dataLines[item.line] = item.newLine;
            return dataLines.join('\n');
        });
        count += items.length;
    }
    return count;
}
```

### src\tasks\process\recurring-task-process.ts

```ts
// src/tasks/process/recurring-task-process.js
import {
    TASK_FOLDER_PATH,
    TASK_FILENAME_REGEX_TASKS,
    STATUS_SYMBOL_MAP,
    STATUS_ICONS,
    STATUS_NAMES
} from '../../configs/plugin-configs';

export async function fetchRecurringTasksGrouped(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) throw new Error('需要 Tasks 插件');

    const query = `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS}`;
    const allTasks = await tasksPlugin.getTasks(query);

    const recurringTasks = allTasks.filter(t => {
        if (!t.recurrence) return false;
        const sym = t.status.symbol;
        return sym !== 'x' && sym !== 'X' && sym !== '-';
    });

    const groups = {
        '每天': [],
        '每周': [],
        '每月': []
    };

    recurringTasks.forEach(t => {
        const cycleText = t.recurrence.toText().toLowerCase();
        let cycle;
        if (cycleText.includes('day')) cycle = '每天';
        else if (cycleText.includes('week')) cycle = '每周';
        else if (cycleText.includes('month')) cycle = '每月';
        else return;

        const sym = t.status.symbol;
        const statusKey = STATUS_SYMBOL_MAP[sym] || 'todo';
        const statusIcon = STATUS_ICONS[statusKey] || '🔲';
        const statusName = STATUS_NAMES[statusKey] || '未开始';

        const desc = t.description || '（无描述）';
        const prio = t.priority || 'none';
        const fileName = t.path.split('/').pop().replace(/\.md$/, '');
        const recurrenceLabel = `🔁 ${t.recurrence.toText()}`;

        groups[cycle].push({
            description: desc,
            priority: prio,
            status: statusKey,          // 供 createTaskCard 自动推导
            statusIcon,                 // 直接提供，跳过推导
            statusName,                 // 注意字段名
            recurrenceLabel,
            path: t.path,
            lineNumber: t.lineNumber,
            due: t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null,
            scheduled: t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null,
            start: t.startDate ? window.moment(t.startDate).format('YYYY-MM-DD') : null,
            tags: (t.tags || []).map(tag => tag.replace(/^#/, '')),
            fileName
        });
    });

    for (const cycle in groups) {
        groups[cycle].sort((a, b) => {
            const pa = a.priority === 'none' ? 999 : parseInt(a.priority);
            const pb = b.priority === 'none' ? 999 : parseInt(b.priority);
            if (pa !== pb) return pa - pb;
            if (!a.scheduled && !b.scheduled) return 0;
            if (!a.scheduled) return 1;
            if (!b.scheduled) return -1;
            return a.scheduled.localeCompare(b.scheduled);
        });
    }

    return groups;
}
```

### src\tasks\process\task-query-process.ts

```ts
// src/tasks/process/task-query-process.js
import { TASK_FOLDER_PATH, TASK_FILENAME_REGEX_TASKS } from '../../configs/plugin-configs';
import { RX } from '../../tasks/read/read-tasks';   // 引入统一正则以提取自定义标记

function baseQuery(extra = '') {
    return `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} ${extra}`.trim();
}

export async function fetchTasks(app, extraQuery = '') {
    const plugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!plugin) throw new Error('需要 Tasks 插件');
    return await plugin.getTasks(baseQuery(extraQuery));
}

export async function fetchImportantTasks(app) {
    const all = await fetchTasks(app, 'is not recurring');
    return all.filter(t => t.priority !== 'none' && parseInt(t.priority) <= 1);
}

export async function fetchRecurringTasks(app) {
    return await fetchTasks(app, 'is recurring');
}

export async function fetchTodayTasks(app) {
    const all = await fetchTasks(app);
    const today = window.moment().format('YYYY-MM-DD');
    return all.filter(t => {
        const due = t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null;
        const sched = t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null;
        return due === today || sched === today;
    });
}

export async function fetchFutureTasks(app, days = 15) {
    const all = await fetchTasks(app);
    const now = window.moment();
    const limit = window.moment().add(days, 'days');
    return all.filter(t => {
        const date = t.dueDate || t.scheduledDate;
        return date && window.moment(date).isBetween(now, limit, null, '[]');
    });
}

export async function fetchOverdueTasks(app) {
    const all = await fetchTasks(app);
    const now = window.moment().format('YYYY-MM-DD');
    return all.filter(t => {
        const date = t.dueDate || t.scheduledDate;
        return date && window.moment(date).isBefore(now);
    });
}

export async function fetchDependsTasks(app) {
    const all = await fetchTasks(app);
    return all.filter(t => t.dependsOn && t.dependsOn.length > 0);
}

/**
 * 获取标签任务（同时兼容原生 #标签 和 自定义 🏁 标记）
 * @param {App} app
 * @param {string} tag - 要筛选的标签（不含 #），传入空字符串则返回所有包含任意标签的任务
 */
export async function fetchTagTasks(app, tag) {
    const allTasks = await fetchTasks(app);
    const result = [];

    for (const task of allTasks) {
        // 原生 tags（Tasks 插件自动解析的 #标签）
        const nativeTags = (task.tags || []).map(t => t.replace(/^#/, ''));

        // 自定义标签：从任务文本中提取，使用与系统统一的 RX 正则
        const fullText = task.description || task.text || '';
        const match = RX.tag.exec(fullText);
        const customTag = match ? match[1] : null;

        const allTags = [...nativeTags];
        if (customTag && !allTags.includes(customTag)) {
            allTags.push(customTag);
        }

        if (!tag || tag.trim() === '') {
            if (allTags.length > 0) result.push(task);
        } else {
            if (allTags.some(t => t.toLowerCase() === tag.toLowerCase())) result.push(task);
        }
    }

    return result;
}

// ========== 今天任务（状态分组） ==========
export async function fetchTodayTasksGrouped(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) throw new Error('需要 Tasks 插件');
    const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
    const allTasks = await tasksPlugin.getTasks(query);

    const today = window.moment().format('YYYY-MM-DD');
    const isDateValid = (d) => d && window.moment(d).format('YYYY-MM-DD') === today;
    const isBetween = (start, end) => {
        if (!start || !end) return false;
        return window.moment(start).format('YYYY-MM-DD') <= today &&
               today <= window.moment(end).format('YYYY-MM-DD');
    };

    const filtered = allTasks.filter(t => {
        const sym = t.status.symbol;
        const validStatus = sym === ' ' || sym === '?' || sym === '/';
        if (!validStatus || t.recurrence) return false;

        if ([t.createdDate, t.scheduledDate, t.startDate, t.dueDate, t.doneDate, t.cancelledDate].some(isDateValid)) return true;
        if (isBetween(t.scheduledDate, t.dueDate)) return true;
        if (isBetween(t.startDate, t.doneDate)) return true;
        if (isBetween(t.startDate, t.cancelledDate)) return true;
        return false;
    });

    const groups = { "未开始": [], "计划中": [], "进行中": [] };

    filtered.forEach(t => {
        const sym = t.status.symbol;
        const groupName = sym === ' ' ? '未开始' : sym === '?' ? '计划中' : '进行中';
        const prio = t.priority || 'none';
        const desc = t.description || '（无描述）';
        const taskItem = {
            description: desc,
            priority: prio,
            statusText: groupName,
            path: t.path,
            lineNumber: t.lineNumber,
            scheduled: t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null,
            due: t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null,
            start: t.startDate ? window.moment(t.startDate).format('YYYY-MM-DD') : null,
            tags: (t.tags || []).map(tag => tag.replace(/^#/, '')),
            fileName: t.path.split('/').pop().replace(/\.md$/, ''),
            recurrenceLabel: ''
        };
        groups[groupName].push(taskItem);
    });

    for (const g in groups) {
        groups[g].sort((a, b) => {
            const pa = a.priority === 'none' ? 999 : parseInt(a.priority);
            const pb = b.priority === 'none' ? 999 : parseInt(b.priority);
            if (pa !== pb) return pa - pb;
            if (!a.scheduled && !b.scheduled) return 0;
            if (!a.scheduled) return 1;
            if (!b.scheduled) return -1;
            return a.scheduled.localeCompare(b.scheduled);
        });
    }

    const total = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);
    return { groups, total };
}

// ========== 重要任务（状态分组） ==========
export async function fetchImportantTasksByStatus(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) throw new Error('需要 Tasks 插件');
    const query = `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS}`;
    const allTasks = await tasksPlugin.getTasks(query);

    const filtered = allTasks.filter(t => {
        const sym = t.status.symbol;
        const validStatus = sym === ' ' || sym === '?' || sym === '/';
        const prioNum = (t.priority === "none" || t.priority == null) ? 5 : parseInt(t.priority);
        return validStatus && prioNum >= 1 && prioNum <= 3;
    });

    const groups = { "未开始": [], "计划中": [], "进行中": [] };

    filtered.forEach(t => {
        const sym = t.status.symbol;
        const groupName = sym === ' ' ? '未开始' : sym === '?' ? '计划中' : '进行中';
        const prio = t.priority || 'none';
        const desc = t.description || '（无描述）';
        const taskItem = {
            description: desc,
            priority: prio,
            statusText: groupName,
            path: t.path,
            lineNumber: t.lineNumber,
            due: t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null,
            scheduled: t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null,
            start: t.startDate ? window.moment(t.startDate).format('YYYY-MM-DD') : null,
            tags: (t.tags || []).map(tag => tag.replace(/^#/, '')),
            fileName: t.path.split('/').pop().replace(/\.md$/, ''),
            recurrenceLabel: t.recurrence ? `🔁 ${t.recurrence.toText()}` : ''
        };
        groups[groupName].push(taskItem);
    });

    for (const g in groups) {
        groups[g].sort((a, b) => {
            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;
            return new Date(a.due) - new Date(b.due);
        });
    }

    const total = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);
    return { groups, total };
}
```

### src\tasks\process\tree-task-process.ts

```ts

```

### src\tasks\read\read-tasks.ts

```ts
// src/tasks/read/read-tasks.js
import logger from '../../utils/logger';
import { CONFIG } from '../../configs/plugin-configs';
import { DateUtils } from '../process/common-process';

export const RX = {
    priority: /⏬|🔽|🔼|⏫|🔺/g,
    repeat: /🔁\s*(every\s+(day|week|month|year))/i,
    created: /➕\s*(\d{4}-\d{2}-\d{2})/,
    scheduled: /⏳\s*(\d{4}-\d{2}-\d{2})/,
    starts: /🛫\s*(\d{4}-\d{2}-\d{2})/,
    due: /📅\s*(\d{4}-\d{2}-\d{2})/,
    done: /✅\s*(\d{4}-\d{2}-\d{2})/,
    cancel: /❌\s*(\d{4}-\d{2}-\d{2})?/,
    tag: /🏁\s*(\S+)/,
    id: /🆔\s*(\S+)/,
    forbid: /⛔\s*([^\s,]+(?:\s*,\s*[^\s,]+)*)/
};

export function getTaskStatus(line) {
    const m = line.match(/^\s*- \[(.)\]\s*/);
    return m ? ({ x: 'completed', X: 'completed', '-': 'cancelled', '/': 'in-progress', '?': 'planned' })[m[1]] || 'todo' : 'todo';
}

export function getStatusIcon(task) {
    if (task._status === 'completed' || task.completed) return '✅';
    if (task._status === 'in-progress') return '⏩';
    if (task._status === 'planned') return '❔';
    if (task._status === 'cancelled') return '❎';
    return '🔲';
}

export function isTaskToday(task) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const check = d => d ? (new Date(d) >= today && new Date(d) < tomorrow) : false;
    return check(task._scheduled) || check(task._due) || check(task._starts) || check(task._created);
}

export function computeTaskTimeRange(task) {
    let min = Infinity, max = -Infinity;
    const add = d => {
        if (d) { const ts = new Date(d).getTime(); if (ts < min) min = ts; if (ts > max) max = ts; }
    };
    add(task._scheduled); add(task._due); add(task._starts);
    if (task._done) add(task._done);
    return min === Infinity ? null : {
        start: DateUtils.setStart(new Date(min)).getTime(),
        end: DateUtils.setEnd(new Date(max)).getTime()
    };
}

export function ensureTaskProperties(task) {
    if (!task.hasOwnProperty('_cleanText')) {
        task._cleanText = task.text
            .replace(/⏬|🔽|🔼|⏫|🔺/g, '')
            .replace(/🔁\s*every\s+(day|week|month|year)/gi, '')
            .replace(/➕\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/❌\s*\d{4}-\d{2}-\d{2}?/g, '')
            .replace(/❌/g, '')
            .replace(/🏁\s*\S+/g, '')
            .replace(/🆔\s*\S+/g, '')
            .replace(/⛔\s*[^\s,]+(?:\s*,\s*[^\s,]+)*/g, '')
            .replace(/⛔[\s\S]*?(?=\s*$|🏁|🆔|🔁|➕|⏳|🛫|📅|✅|❌|$)/g, '')
            .trim() || task.text;
    }
    if (!task.hasOwnProperty('_tooltip')) {
        const parts = [];
        parts.push(getStatusIcon(task) + ' ' + task._cleanText);
        if (task._priorityIcon) parts.push(task._priorityIcon);
        if (task._repeat) parts.push('🔁 ' + task._repeat);
        if (task._created) parts.push('➕ ' + task._created);
        if (task._scheduled) parts.push('⏳ ' + task._scheduled);
        if (task._starts) parts.push('🛫 ' + task._starts);
        if (task._due) parts.push('📅 ' + task._due);
        if (task._done) parts.push('✅ ' + task._done);
        if (task._cancel) parts.push('❌ ' + task._cancel);
        if (task._tag) parts.push('🏁 ' + task._tag);
        if (task._id) parts.push('🆔 ' + task._id);
        if (task._forbid) parts.push('⛔ ' + task._forbid);
        task._tooltip = parts.join('\n');
        task._tooltipHtml = task._tooltip.replace(/\n/g, '<br>');
    }
}

export function getAllTasks(force, dv, state) {
    if (!state) throw new Error('Global state context is required');
    if (state.cachedAllTasks && !force) return state.cachedAllTasks;

    const tasks = [];
    for (const folder of CONFIG.TASK_FOLDERS) {
        const pages = dv.pages(folder);
        if (!pages || !pages.length) continue;
        for (const page of pages) {
            if (!CONFIG.FILE_NAME_PATTERN.test(page.file.name)) continue;
            if (!page.file.tasks) continue;
            for (const task of page.file.tasks) {
                try {
                    const fullLine = (task.completed ? '- [x] ' : '- [ ] ') + task.text;
                    task._fullLine = fullLine;
                    task._status = task.status ? ({ '/': 'in-progress', '?': 'planned', '-': 'cancelled', x: 'completed', X: 'completed' })[task.status] || 'todo' : getTaskStatus(fullLine);
                    function m(rx, idx) { return fullLine.match(rx) ? fullLine.match(rx)[idx !== undefined ? idx : 1] || null : null; }
                    task._created = m(RX.created); task._scheduled = m(RX.scheduled); task._starts = m(RX.starts);
                    task._due = m(RX.due); task._done = m(RX.done); task._cancel = m(RX.cancel) || '';
                    task._tag = m(RX.tag); task._id = m(RX.id); task._forbid = m(RX.forbid) ? m(RX.forbid).replace(/\s/g, '') : '';
                    task._repeat = m(RX.repeat); task._priorityIcon = (fullLine.match(RX.priority) || [null])[0];
                    task._marks = {
                        priority: !!task._priorityIcon, repeat: !!task._repeat, created: !!task._created,
                        scheduled: !!task._scheduled, starts: !!task._starts, due: !!task._due, done: !!task._done,
                        cancel: !!task._cancel, tag: !!task._tag, id: !!task._id, forbid: !!task._forbid
                    };
                    task._cachedTimeRange = computeTaskTimeRange(task);
                    ensureTaskProperties(task);
                    tasks.push(task);
                } catch (e) {
                    logger.warn('任务解析失败，已跳过：', task, e);
                }
            }
        }
    }
    state.cachedAllTasks = tasks;
    state.taskIdMap = {};
    for (const task of tasks) {
        if (task._id) state.taskIdMap[task._id] = task;
    }
    return tasks;
}
```

### src\tasks\write\write-tasks.ts

```ts

```

### src\types.ts

```ts
// src/types.ts

/** 任务统一结构（由 read-tasks 解析生成） */
export interface TaskItem {
	_status: string; // 'todo'|'planned'|'in-progress'|'completed'|'cancelled'
	_cleanText: string; // 去除标记后的纯描述
	_fullLine: string; // 完整行文本
	_priorityIcon?: string;
	_created?: string;
	_scheduled?: string;
	_starts?: string;
	_due?: string;
	_done?: string;
	_cancel?: string;
	_tag?: string;
	_id?: string;
	_forbid?: string; // 依赖 ID（逗号分隔）
	_repeat?: string;
	_marks?: Record<string, boolean>;
	_cachedTimeRange?: { start: number; end: number };
	_tooltip?: string;
	_tooltipHtml?: string;
	path: string;
	line: number;
	[key: string]: any; // 兼容动态字段
}

/** 全局筛选条件 */
export interface GlobalFilter {
	dateRange: { start: number | null; end: number | null; isAll: boolean };
	statuses: string[];
	includeMarks: string[];
	excludeMarks: string[];
	hideRepeat: boolean;
	hideCompleted: boolean;
	hideCancelled: boolean;
	rootPath: string | null;
	hideFolders?: boolean;
}

/** 方案（Preset） */
export interface Preset {
	id: string; // 唯一标识
	name: string; // 显示名称
	groupId: string; // 所属分组 ID
	businessView: string; // 业务视图类型，如 'today', 'important', 'matrix'
	viewStyle: string; // 通用视图样式，如 'list', 'kanban', 'matrix', 'calendar'
	filter: GlobalFilter; // 该方案保存的筛选条件
	sort: { type: string; order: "asc" | "desc" };
	showHidden?: boolean; // 侧边栏是否隐藏此按钮
}

/** 方案分组 */
export interface PresetGroup {
	id: string;
	name: string;
	collapsed?: boolean; // 分组是否折叠
	order?: number;
}

/** Store 状态 */
export interface AppState {
	activePresetId: string | null;
	presets: Preset[];
	presetGroups: PresetGroup[];
	sidebarCollapsed: boolean;
	// 当前视图的临时筛选（由 filter-bar 编辑）
	draftFilter: GlobalFilter | null;
	// 其他 UI 状态...
}

```

### src\ui\bars\business-filter-bar.ts

```ts
export const placeholder = true;

```

### src\ui\bars\sort-bar.ts

```ts
import { Store } from "../../store/store";

const SORT_OPTIONS = [
	{ type: "status", label: "状态" },
	{ type: "priority", label: "优先级" },
	{ type: "scheduled", label: "计划" },
	{ type: "due", label: "截止" },
	{ type: "filename", label: "文件名" },
];

export function renderSortBar(container: HTMLElement, store: Store) {
	const row = container.createDiv({ cls: "bar-row sort-bar" });
	row.createSpan({ text: "排序：" });

	const state = store.getState();
	const preset = store.getActivePreset();
	const currentSort = preset?.sort ?? { type: "status", order: "asc" };

	SORT_OPTIONS.forEach((opt) => {
		const btn = row.createEl("button", { text: opt.label, cls: "bar-btn" });
		if (currentSort.type === opt.type) {
			btn.addClass("active");
			btn.setText(
				opt.label + (currentSort.order === "asc" ? " ↑" : " ↓"),
			);
		}
		btn.onclick = () => {
			if (!preset) return;
			const newOrder =
				currentSort.type === opt.type
					? currentSort.order === "asc"
						? "desc"
						: "asc"
					: "asc";
			const newSort = {
				type: opt.type,
				order: newOrder as "asc" | "desc",
			};
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, sort: newSort } : p,
			);
			store.update({ presets: newPresets });
		};
	});
}

```

### src\ui\bars\view-style-bar.ts

```ts
import { Store } from "../../store/store";

const STYLES = [
	{ key: "list", label: "详细列表" },
	{ key: "list-simple", label: "简洁列表" },
	{ key: "table", label: "表格" },
	{ key: "kanban", label: "看板" },
	{ key: "matrix", label: "矩阵" },
	{ key: "timeline", label: "时间轴" },
	{ key: "tree", label: "任务树" },
	{ key: "gantt", label: "甘特图" },
	{ key: "calendar", label: "日历" },
	{ key: "calendar-day", label: "日历日" },
	{ key: "calendar-week", label: "日历周" },
	{ key: "calendar-month", label: "日历月" },
	{ key: "calendar-quarter", label: "日历季" },
	{ key: "calendar-year", label: "日历年" },
	{ key: "statistics", label: "基础统计" },
	{ key: "detail", label: "详细统计" },
];

export function renderViewStyleBar(container: HTMLElement, store: Store) {
	const row = container.createDiv({ cls: "bar-row" });
	row.createSpan({ text: "视图：" });

	const state = store.getState();
	const preset = store.getActivePreset();
	const currentStyle = preset?.viewStyle ?? "table";

	STYLES.forEach(({ key, label }) => {
		const btn = row.createEl("button", { text: label, cls: "bar-btn" });
		if (key === currentStyle) btn.addClass("active");
		btn.onclick = () => {
			if (!preset) return;
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, viewStyle: key } : p,
			);
			store.update({ presets: newPresets });
		};
	});
}

```

### src\ui\components\boards\kanban.ts

```ts
import { CONFIG } from "../../../configs/plugin-configs";

export function renderKanban(container: HTMLElement, tasks: any[]) {
	const groups: Record<string, any[]> = {
		todo: [],
		planned: [],
		"in-progress": [],
	};
	tasks.forEach((t) => {
		const st = t._status;
		if (groups[st]) groups[st].push(t);
		else groups.todo.push(t);
	});

	const board = document.createElement("div");
	board.className = "kanban-board";

	const columns = [
		{ key: "todo", label: "未开始", color: "rgba(180,180,180,0.25)" },
		{ key: "planned", label: "计划中", color: "rgba(97,175,239,0.25)" },
		{
			key: "in-progress",
			label: "进行中",
			color: "rgba(224,108,117,0.25)",
		},
	];

	columns.forEach((col) => {
		const colDiv = document.createElement("div");
		colDiv.className = "view-col";
		colDiv.style.setProperty("--quad-color", col.color);

		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>${col.label}</span><span>${(groups[col.key] || []).length}</span>`;
		colDiv.appendChild(header);

		const list = document.createElement("ul");
		list.className = "task-list";
		(groups[col.key] || []).forEach((task) => {
			const li = document.createElement("li");
			li.className = "task-item";
			li.innerHTML = `
        <div class="task-desc">${CONFIG.STATUS_ICONS[task._status] || "🔲"} ${task._priorityIcon || ""} ${task._cleanText || task.text || ""}</div>
        <div class="task-meta">${task._due ? "📅 " + task._due : ""}</div>
      `;
			li.addEventListener("click", () => {
				const file = (window as any).app?.vault?.getAbstractFileByPath(
					task.path,
				);
				if (file)
					(window as any).app.workspace
						.getLeaf()
						.openFile(file, { eState: { line: task.line } });
			});
			list.appendChild(li);
		});
		colDiv.appendChild(list);
		board.appendChild(colDiv);
	});

	container.appendChild(board);
}

```

### src\ui\components\boards\matrix.ts

```ts
import { CONFIG } from "../../../configs/plugin-configs";

export function renderMatrix(container: HTMLElement, tasks: any[]) {
	const quadrants: any[][] = [[], [], [], []];
	tasks.forEach((task) => {
		const icon = task._priorityIcon;
		if (icon === "🔺") quadrants[0].push(task);
		else if (icon === "⏫") quadrants[1].push(task);
		else if (icon === "🔼") quadrants[2].push(task);
		else quadrants[3].push(task);
	});

	const grid = document.createElement("div");
	grid.className = "view-grid cols-2";

	const labels = [
		"🔺 紧急与重要",
		"⏫ 不紧急但重要",
		"🔼 紧急但不重要",
		"🔽⏬ 不紧急也不重要",
	];
	const colors = [
		"rgba(255,130,130,0.25)",
		"rgba(255,180,100,0.25)",
		"rgba(200,200,200,0.15)",
		"rgba(100,180,255,0.2)",
	];

	labels.forEach((label, idx) => {
		const col = document.createElement("div");
		col.className = "view-col";
		col.style.setProperty("--quad-color", colors[idx]);

		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>${label}</span><span>${quadrants[idx].length}</span>`;
		col.appendChild(header);

		const list = document.createElement("ul");
		list.className = "task-list";
		quadrants[idx].forEach((task) => {
			const li = document.createElement("li");
			li.className = "task-item";
			li.innerHTML = `
        <div class="task-desc">${CONFIG.STATUS_ICONS[task._status] || "🔲"} ${task._priorityIcon || ""} ${task._cleanText || task.text || ""}</div>
        <div class="task-meta">${task._due ? "📅 " + task._due : ""}</div>
      `;
			li.addEventListener("click", () => {
				const file = (window as any).app?.vault?.getAbstractFileByPath(
					task.path,
				);
				if (file)
					(window as any).app.workspace
						.getLeaf()
						.openFile(file, { eState: { line: task.line } });
			});
			list.appendChild(li);
		});
		col.appendChild(list);
		grid.appendChild(col);
	});

	container.appendChild(grid);
}

```

### src\ui\components\calendar\day.ts

```ts
import { DateUtils } from "../../../tasks/process/common-process";

export function renderCalendarDay(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";

	// 按日期分组任务
	const map = new Map<string, any[]>();
	const today = new Date();
	const todayStr = DateUtils.formatDate(today);
	// 默认只显示今天，若 tasks 中包含今天有交集的任务，则显示；否则也展示今天但无任务
	// 为了支持过去/未来日期，可以扩展，但这里仅展示任务所覆盖的所有日期
	tasks.forEach((task) => {
		// 计算任务覆盖的日期列表
		const dates = getDatesForTask(task, intervalMode);
		dates.forEach((dateStr) => {
			if (!map.has(dateStr)) map.set(dateStr, []);
			map.get(dateStr)!.push(task);
		});
	});

	// 按日期排序
	const sortedDates = Array.from(map.keys()).sort();
	if (sortedDates.length === 0) {
		container.createDiv({ text: "暂无任务日期", cls: "empty-placeholder" });
		return;
	}

	sortedDates.forEach((dateStr) => {
		const groupDiv = container.createDiv({ cls: "day-group" });
		const header = groupDiv.createEl("div", {
			text: `📅 ${dateStr}`,
			cls: "day-header",
		});
		const list = groupDiv.createEl("ul", { cls: "task-list" });
		const dayTasks = map.get(dateStr)!;
		dayTasks.forEach((task) => {
			const li = list.createEl("li", { cls: "task-item" });
			li.createSpan({
				text: `${task._statusIcon || ""} ${task._cleanText || task.text}`,
			});
			li.addEventListener("click", () => {
				if (options?.onClick) options.onClick(task);
			});
		});
	});
}

function getDatesForTask(task: any, intervalMode: string): string[] {
	const dates: string[] = [];
	let startField: string, endField: string;
	if (intervalMode === "starts-done") {
		startField = "_starts";
		endField = "_done" in task && task._done ? "_done" : "_due";
	} else {
		startField = "_scheduled";
		endField = "_due";
	}
	const start = task[startField] ? new Date(task[startField]) : null;
	const end = task[endField] ? new Date(task[endField]) : null;
	if (start && end) {
		let cur = DateUtils.setStart(start);
		const finish = DateUtils.setEnd(end).getTime();
		while (cur.getTime() <= finish) {
			dates.push(DateUtils.formatDate(cur));
			cur.setDate(cur.getDate() + 1);
		}
	}
	return dates;
}

```

### src\ui\components\calendar\month.ts

```ts
import { DateUtils } from "../../../tasks/process/common-process";

export function renderCalendarMonth(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";
	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth();

	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dow = startDay.getDay() || 7;
	startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

	const grid = container.createDiv({ cls: "calendar-grid" });
	// 标题行
	["一", "二", "三", "四", "五", "六", "日"].forEach((d) => {
		const cell = grid.createDiv({ text: d, cls: "cal-cell-header" });
	});

	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		const dateStr = DateUtils.formatDate(d);
		const isToday = DateUtils.formatDate(today) === dateStr;
		const isOtherMonth = d.getMonth() !== month;

		const cell = grid.createDiv({
			cls:
				"cal-cell" +
				(isToday ? " today" : "") +
				(isOtherMonth ? " other-month" : ""),
		});
		cell.createDiv({ text: `${d.getDate()}`, cls: "cal-cell-header" });

		const dayTasks = tasks.filter((task) =>
			isTaskInDate(task, d, intervalMode),
		);
		dayTasks.forEach((task) => {
			const taskEl = cell.createDiv({ cls: "cal-task" });
			taskEl.createSpan({ text: task._cleanText || task.text });
			taskEl.addEventListener("click", () => {
				if (options?.onClick) options.onClick(task);
			});
		});
	}
}

function isTaskInDate(task: any, date: Date, intervalMode: string): boolean {
	const startField =
		intervalMode === "starts-done" ? "_starts" : "_scheduled";
	const endField =
		intervalMode === "starts-done"
			? task._done
				? "_done"
				: "_due"
			: "_due";
	const start = task[startField] ? new Date(task[startField]) : null;
	const end = task[endField] ? new Date(task[endField]) : null;
	if (!start || !end) return false;
	const dayStart = DateUtils.setStart(date).getTime();
	const dayEnd = DateUtils.setEnd(date).getTime();
	return start.getTime() <= dayEnd && end.getTime() >= dayStart;
}

```

### src\ui\components\calendar\quarter.ts

```ts
import { DateUtils } from "../../../tasks/process/common-process";

export function renderCalendarQuarter(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const today = new Date();
	const q = Math.floor(today.getMonth() / 3) + 1;
	const startMonth = (q - 1) * 3;

	for (let m = 0; m < 3; m++) {
		const monthIdx = startMonth + m;
		const monDiv = container.createDiv({ cls: "quarter-month" });
		monDiv.createEl("div", {
			text: `${today.getFullYear()}年${monthIdx + 1}月`,
			cls: "quarter-month-title",
		});
		// 复用月视图的简化版（这里直接嵌入简化网格，或调用 renderCalendarMonth 的一部分，为避免循环，我们内联一个简单网格）
		renderMiniMonth(monDiv, today.getFullYear(), monthIdx, tasks, options);
	}
}

function renderMiniMonth(
	container: HTMLElement,
	year: number,
	month: number,
	tasks: any[],
	options?: any,
) {
	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dow = startDay.getDay() || 7;
	startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

	const grid = container.createDiv({ cls: "mini-calendar-grid" });
	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		const dateStr = DateUtils.formatDate(d);
		const isOtherMonth = d.getMonth() !== month;
		const cell = grid.createDiv({
			cls: "mini-cell" + (isOtherMonth ? " other-month" : ""),
		});
		cell.textContent = d.getDate().toString();
		const dayTasks = tasks.filter((task) => {
			// 判断任务是否覆盖该日期（使用 intervalMode）
			const intervalMode = options?.intervalMode || "scheduled-due";
			return isTaskInDate(task, d, intervalMode);
		});
		if (dayTasks.length > 0) {
			cell.style.backgroundColor = "#4dabf7";
			cell.style.color = "white";
			cell.title = dayTasks.map((t) => t._cleanText).join(", ");
		}
	}
}

function isTaskInDate(task: any, date: Date, intervalMode: string): boolean {
	const startField =
		intervalMode === "starts-done" ? "_starts" : "_scheduled";
	const endField =
		intervalMode === "starts-done"
			? task._done
				? "_done"
				: "_due"
			: "_due";
	const start = task[startField] ? new Date(task[startField]) : null;
	const end = task[endField] ? new Date(task[endField]) : null;
	if (!start || !end) return false;
	const dayStart = DateUtils.setStart(date).getTime();
	const dayEnd = DateUtils.setEnd(date).getTime();
	return start.getTime() <= dayEnd && end.getTime() >= dayStart;
}

```

### src\ui\components\calendar\task-calendar.ts

```ts
import { DateUtils } from "../../../tasks/process/common-process";

export function renderCalendar(container: HTMLElement, tasks: any[]) {
	container.empty();
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth(); // 0~11

	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dayOfWeek = startDay.getDay() || 7; // 周一~日 => 1~7
	startDay.setDate(1 - (dayOfWeek === 7 ? 6 : 1 - dayOfWeek)); // 起始周一

	const grid = document.createElement("div");
	grid.className = "calendar-grid";
	grid.style.display = "grid";
	grid.style.gridTemplateColumns = "repeat(7, 1fr)";
	grid.style.gap = "4px";
	container.appendChild(grid);

	const dayHeaders = ["一", "二", "三", "四", "五", "六", "日"];
	dayHeaders.forEach((d) => {
		const cell = document.createElement("div");
		cell.style.fontWeight = "bold";
		cell.style.textAlign = "center";
		cell.textContent = d;
		grid.appendChild(cell);
	});

	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		const dateStr = DateUtils.formatDate(d);
		const cell = document.createElement("div");
		cell.style.border = "1px solid #ccc";
		cell.style.minHeight = "60px";
		cell.style.padding = "2px";
		cell.style.fontSize = "12px";

		const dayNum = document.createElement("div");
		dayNum.textContent = d.getDate().toString();
		dayNum.style.fontWeight = "bold";
		cell.appendChild(dayNum);

		const dayTasks = tasks.filter(
			(t) => t._scheduled === dateStr || t._due === dateStr,
		);
		dayTasks.forEach((task) => {
			const line = document.createElement("div");
			line.style.whiteSpace = "nowrap";
			line.style.overflow = "hidden";
			line.style.textOverflow = "ellipsis";
			line.textContent = task._cleanText || task.text;
			line.style.backgroundColor = "#e9ecef";
			line.style.marginTop = "2px";
			line.style.padding = "0 2px";
			line.style.borderRadius = "2px";
			cell.appendChild(line);
		});

		grid.appendChild(cell);
	}
}

```

### src\ui\components\calendar\week.ts

```ts
import { DateUtils } from "../../../tasks/process/common-process";

export function renderCalendarWeek(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";

	// 找到最小/最大日期，生成覆盖的周列表
	const allDates = getRelevantDates(tasks, intervalMode);
	if (allDates.length === 0) {
		container.createDiv({ text: "无任务日期", cls: "empty-placeholder" });
		return;
	}
	const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
	const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

	// 生成周列表
	let weekStart = DateUtils.setStart(minDate);
	// 确保从周一开始
	const dow = weekStart.getDay() || 7;
	weekStart.setDate(weekStart.getDate() - (dow - 1));

	const today = new Date();
	while (weekStart <= maxDate) {
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 6);

		const weekDiv = container.createDiv({ cls: "week-block" });
		weekDiv.createEl("div", {
			text: `📅 ${DateUtils.formatDate(weekStart)} ~ ${DateUtils.formatDate(weekEnd)} (第${DateUtils.getISOWeekNumber(weekStart)}周)`,
			cls: "week-title",
		});

		// 生成7列网格
		const grid = weekDiv.createDiv({ cls: "calendar-grid" });
		for (let i = 0; i < 7; i++) {
			const d = new Date(weekStart);
			d.setDate(d.getDate() + i);
			const dateStr = DateUtils.formatDate(d);
			const isToday = DateUtils.formatDate(today) === dateStr;

			const cell = grid.createDiv({
				cls: "cal-cell" + (isToday ? " today" : ""),
			});
			cell.createDiv({ text: `${d.getDate()}`, cls: "cal-cell-header" });

			// 获取当天任务
			const dayTasks = tasks.filter((task) =>
				isTaskInDate(task, d, intervalMode),
			);
			if (dayTasks.length > 0) {
				const list = cell.createEl("ul", { cls: "task-list-mini" });
				dayTasks.forEach((task) => {
					const li = list.createEl("li", {
						text: task._cleanText || task.text,
					});
					li.addEventListener("click", () => {
						if (options?.onClick) options.onClick(task);
					});
				});
			}
		}

		weekStart.setDate(weekStart.getDate() + 7);
	}
}

function isTaskInDate(task: any, date: Date, intervalMode: string): boolean {
	const startField =
		intervalMode === "starts-done" ? "_starts" : "_scheduled";
	const endField =
		intervalMode === "starts-done"
			? task._done
				? "_done"
				: "_due"
			: "_due";
	const start = task[startField] ? new Date(task[startField]) : null;
	const end = task[endField] ? new Date(task[endField]) : null;
	if (!start || !end) return false;
	const dayStart = DateUtils.setStart(date).getTime();
	const dayEnd = DateUtils.setEnd(date).getTime();
	return start.getTime() <= dayEnd && end.getTime() >= dayStart;
}

function getRelevantDates(tasks: any[], intervalMode: string): Date[] {
	const dates: Date[] = [];
	tasks.forEach((task) => {
		const startField =
			intervalMode === "starts-done" ? "_starts" : "_scheduled";
		const endField =
			intervalMode === "starts-done"
				? task._done
					? "_done"
					: "_due"
				: "_due";
		if (task[startField]) dates.push(new Date(task[startField]));
		if (task[endField]) dates.push(new Date(task[endField]));
	});
	return dates;
}

```

### src\ui\components\calendar\year.ts

```ts
import { DateUtils } from "../../../tasks/process/common-process";

export function renderCalendarYear(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const year = new Date().getFullYear();
	const monthNames = [
		"1月",
		"2月",
		"3月",
		"4月",
		"5月",
		"6月",
		"7月",
		"8月",
		"9月",
		"10月",
		"11月",
		"12月",
	];
	const grid = container.createDiv({ cls: "year-grid" });

	for (let m = 0; m < 12; m++) {
		const monthDiv = grid.createDiv({ cls: "year-month-card" });
		monthDiv.createDiv({ text: monthNames[m], cls: "year-month-title" });

		const firstDay = new Date(year, m, 1);
		const startDay = new Date(firstDay);
		const dow = startDay.getDay() || 7;
		startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

		const miniGrid = monthDiv.createDiv({ cls: "year-heat-grid" });
		for (let i = 0; i < 42; i++) {
			const d = new Date(startDay);
			d.setDate(startDay.getDate() + i);
			const isOtherMonth = d.getMonth() !== m;
			const cell = miniGrid.createDiv({
				cls: "year-heat-cell" + (isOtherMonth ? " other-month" : ""),
			});
			cell.textContent = d.getDate().toString();

			const dayTasks = tasks.filter((task) => {
				const intervalMode = options?.intervalMode || "scheduled-due";
				return isTaskInDate(task, d, intervalMode);
			});
			if (dayTasks.length > 0) {
				cell.style.backgroundColor = "#4dabf7";
				cell.style.color = "white";
			}
		}
	}
}

function isTaskInDate(task: any, date: Date, intervalMode: string): boolean {
	const startField =
		intervalMode === "starts-done" ? "_starts" : "_scheduled";
	const endField =
		intervalMode === "starts-done"
			? task._done
				? "_done"
				: "_due"
			: "_due";
	const start = task[startField] ? new Date(task[startField]) : null;
	const end = task[endField] ? new Date(task[endField]) : null;
	if (!start || !end) return false;
	const dayStart = DateUtils.setStart(date).getTime();
	const dayEnd = DateUtils.setEnd(date).getTime();
	return start.getTime() <= dayEnd && end.getTime() >= dayStart;
}

```

### src\ui\components\cards\task-card.ts

```ts
import { CONFIG } from "../../../configs/plugin-configs";

export function createTaskCard(task: any): HTMLElement {
	const li = document.createElement("li");
	li.className = "task-item";
	li.setAttribute("data-path", task.path);
	li.setAttribute("data-line", task.line);

	const statusKey = task._status || "todo";
	const statusIcon = CONFIG.STATUS_ICONS[statusKey] || "🔲";
	const prioIcon = task._priorityIcon || "";
	const desc = task._cleanText || task.text || "（无描述）";
	const tags = task._tag ? " 🏁 " + task._tag : "";
	const due = task._due ? " 📅 " + task._due : "";

	li.innerHTML = `
    <div class="task-desc">${statusIcon} ${prioIcon} ${desc}</div>
    <div class="task-meta">${due}${tags}</div>
  `;

	li.addEventListener("click", () => {
		const file = (window as any).app?.vault?.getAbstractFileByPath(
			task.path,
		);
		if (file) {
			(window as any).app.workspace
				.getLeaf()
				.openFile(file, { eState: { line: task.line } });
		}
	});
	return li;
}

```

### src\ui\components\charts\chart-interact.ts

```ts
export const placeholder = true;

```

### src\ui\components\charts\detail.ts

```ts
import { echarts } from "./echarts";
import { CONFIG } from "../../../configs/plugin-configs";
import { DateUtils } from "../../../tasks/process/common-process";

export function renderDetail(container: HTMLElement, tasks: any[]) {
	container.empty();
	const grid = document.createElement("div");
	grid.className = "chart-grid";
	container.appendChild(grid);

	const today = new Date();
	let minDate = new Date(today);
	let maxDate = new Date(today);
	tasks.forEach((task) => {
		if (task._scheduled) {
			const d = new Date(task._scheduled);
			if (d < minDate) minDate = d;
			if (d > maxDate) maxDate = d;
		}
	});

	const dates: string[] = [];
	const cur = DateUtils.setStart(minDate);
	const endTime = DateUtils.setEnd(maxDate).getTime();
	while (cur.getTime() <= endTime) {
		dates.push(DateUtils.formatDate(cur));
		cur.setDate(cur.getDate() + 1);
	}

	const seriesData: Record<string, number[]> = {};
	CONFIG.ALLOWED_STATUSES.forEach((st) => {
		seriesData[st] = new Array(dates.length).fill(0);
	});

	tasks.forEach((task) => {
		const idx = dates.indexOf(task._scheduled || "");
		if (idx >= 0) {
			const arr = seriesData[task._status];
			if (arr && idx < arr.length) {
				arr[idx]++;
			}
		}
	});

	const item = document.createElement("div");
	item.className = "chart-item wide";
	const header = document.createElement("div");
	header.className = "chart-header";
	header.textContent = "📊 每日状态堆叠";
	item.appendChild(header);
	const chartDiv = document.createElement("div");
	chartDiv.className = "chart-body";
	item.appendChild(chartDiv);
	grid.appendChild(item);

	const statusNames: any = CONFIG.STATUS_NAMES || {};
	const statusColors: any = CONFIG.STATUS_COLORS || {};
	const chart = echarts.init(chartDiv);
	chart.setOption({
		tooltip: { trigger: "axis" },
		xAxis: { type: "category", data: dates, axisLabel: { rotate: 30 } },
		yAxis: { type: "value" },
		series: CONFIG.ALLOWED_STATUSES.map((st) => ({
			name: statusNames[st] || st,
			type: "bar",
			stack: "total",
			data: seriesData[st],
			itemStyle: { color: statusColors[st] || undefined },
		})),
		grid: { left: "10%", right: "5%", top: "15%", bottom: "25%" },
	});
}

```

### src\ui\components\charts\echarts.ts

```ts
// src/echarts/echarts-utils.js
// 直接导入打包的 ECharts，无需动态加载
import * as echarts from 'echarts';

// 确保全局可用（兼容旧代码中 window.echarts 引用）
if (typeof window !== 'undefined') {
    window.echarts = echarts;
}

export { echarts };

// 保留 ensureEcharts 接口以兼容现有调用，但直接同步调用回调
export function ensureEcharts(callback) {
    // 立即调用，因为 echarts 已同步可用
    if (typeof callback === 'function') {
        callback(echarts);
    }
}
```

### src\ui\components\charts\statistics.ts

```ts
import { CONFIG } from "../../../configs/plugin-configs";
import { echarts } from "./echarts";

export function renderStatistics(container: HTMLElement, tasks: any[]) {
	container.empty();
	const grid = document.createElement("div");
	grid.className = "chart-grid";
	container.appendChild(grid);

	function makePieChart(
		title: string,
		data: { name: string; value: number; color?: string }[],
	) {
		const item = document.createElement("div");
		item.className = "chart-item";
		const header = document.createElement("div");
		header.className = "chart-header";
		header.textContent = title;
		item.appendChild(header);
		const chartDiv = document.createElement("div");
		chartDiv.className = "chart-body";
		item.appendChild(chartDiv);
		grid.appendChild(item);
		const chart = echarts.init(chartDiv);
		chart.setOption({
			tooltip: { trigger: "item" },
			series: [
				{
					type: "pie",
					radius: ["40%", "65%"],
					data: data.map((d) => ({
						name: d.name,
						value: d.value,
						itemStyle: d.color ? { color: d.color } : undefined,
					})),
					label: { show: true, fontSize: 10 },
				},
			],
		});
	}

	// 状态分布
	const statusCounts: Record<string, number> = {};
	tasks.forEach((t) => {
		const st = t._status || "todo";
		statusCounts[st] = (statusCounts[st] || 0) + 1;
	});
	const statusNames: any = CONFIG.STATUS_NAMES || {};
	const statusColors: any = CONFIG.STATUS_COLORS || {};
	const statusPieData = CONFIG.ALLOWED_STATUSES.map((st) => ({
		name: statusNames[st] || st,
		value: statusCounts[st] || 0,
		color: statusColors[st] || undefined,
	})).filter((d) => d.value > 0);
	makePieChart("执行状态", statusPieData);

	// 优先级分布
	const prioCounts: Record<string, number> = {};
	tasks.forEach((t) => {
		const icon = t._priorityIcon || "无";
		prioCounts[icon] = (prioCounts[icon] || 0) + 1;
	});
	const prioPieData = Object.entries(prioCounts).map(([icon, count]) => ({
		name: icon,
		value: count,
		color: undefined,
	}));
	makePieChart("优先级", prioPieData);
}

```

### src\ui\components\editors\bulk-edit.ts

```ts
export const placeholder = true;

```

### src\ui\components\editors\single-edit.ts

```ts
export const placeholder = true;

```

### src\ui\components\filters\date-filter.ts

```ts
export const placeholder = true;

```

### src\ui\components\filters\mark-filter.ts

```ts
export const placeholder = true;

```

### src\ui\components\filters\status-filter.ts

```ts
export const placeholder = true;

```

### src\ui\components\gantt\gantt.ts

```ts
export function renderGantt(container: HTMLElement, tasks: any[]) {
	container.empty();
	container.style.display = "flex";
	container.style.height = "100%";

	// 左侧文件列表（简化版任务树）
	const leftPanel = document.createElement("div");
	leftPanel.className = "gantt-left";
	leftPanel.style.width = "250px";
	leftPanel.style.overflowY = "auto";
	leftPanel.style.borderRight = "1px solid var(--background-modifier-border)";

	// 右侧 Canvas
	const rightPanel = document.createElement("div");
	rightPanel.style.flex = "1";
	rightPanel.style.overflow = "hidden";
	const canvas = document.createElement("canvas");
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	rightPanel.appendChild(canvas);

	container.appendChild(leftPanel);
	container.appendChild(rightPanel);

	// 生成左侧文件树（简易分组）
	const fileMap = new Map<string, any[]>();
	tasks.forEach((t) => {
		if (!fileMap.has(t.path)) fileMap.set(t.path, []);
		fileMap.get(t.path)!.push(t);
	});

	fileMap.forEach((tasks, path) => {
		const fileName = path.split("/").pop()?.replace(".md", "") || path;
		const fileDiv = document.createElement("div");
		fileDiv.className = "gantt-file";
		fileDiv.textContent = fileName;
		leftPanel.appendChild(fileDiv);
	});

	// 右侧绘制任务条
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const resizeCanvas = () => {
		canvas.width = rightPanel.clientWidth;
		canvas.height = rightPanel.clientHeight;
		draw();
	};

	const draw = () => {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const rowHeight = 28;
		const leftPad = 20;
		const tasksWithRange = tasks
			.filter((t) => t._scheduled && t._due)
			.map((t) => ({
				task: t,
				start: new Date(t._scheduled).getTime(),
				end: new Date(t._due).getTime(),
			}));

		if (tasksWithRange.length === 0) {
			ctx.font = "14px sans-serif";
			ctx.fillText("没有带计划-截止日期的任务", 20, 50);
			return;
		}

		const minTime =
			Math.min(...tasksWithRange.map((t) => t.start)) - 86400000;
		const maxTime =
			Math.max(...tasksWithRange.map((t) => t.end)) + 86400000;
		const chartWidth = canvas.width - leftPad - 20;
		const timeToX = (t: number) =>
			leftPad + ((t - minTime) / (maxTime - minTime)) * chartWidth;

		tasksWithRange.forEach((item, idx) => {
			const y = idx * rowHeight + 10;
			ctx.fillStyle = "#4dabf7";
			const x1 = timeToX(item.start);
			const x2 = timeToX(item.end);
			ctx.fillRect(x1, y, x2 - x1, rowHeight - 6);
			ctx.fillStyle = "#333";
			ctx.font = "12px sans-serif";
			ctx.fillText(item.task._cleanText || item.task.text, 10, y + 16);
		});
	};

	new ResizeObserver(() => resizeCanvas()).observe(rightPanel);
	resizeCanvas();
}

```

### src\ui\components\lists\task-list.ts

```ts
// src/ui/components/lists/task-list.ts
import { createTaskCard } from "../cards/task-card";

interface TaskListOptions {
	onClick?: (task: any) => void;
	compact?: boolean;
}

export function renderTaskList(
	container: HTMLElement,
	tasks: any[],
	options: TaskListOptions = {},
) {
	const ul = container.createEl("ul", { cls: "task-list" });
	tasks.forEach((task) => {
		const card = createTaskCard(task);
		if (options.compact) {
			// 简洁模式：只显示状态图标 + 描述，移除第二行
			card.classList.add("task-item-compact");
			const meta = card.querySelector(".task-meta");
			if (meta) meta.remove();
			// 让描述部分单行显示，不换行
			const desc = card.querySelector(".task-desc");
			if (desc) (desc as HTMLElement).style.whiteSpace = "nowrap";
		}
		if (options.onClick) {
			card.addEventListener("click", (e) => {
				e.stopPropagation();
				options.onClick!(task);
			});
		}
		ul.appendChild(card);
	});
}

```

### src\ui\components\lists\task-tree.ts

```ts
import { CONFIG } from "../../../configs/plugin-configs";

export function renderTaskTree(
	container: HTMLElement,
	tasks: any[],
	options?: { hideFolders?: boolean },
) {
	container.empty();
	const hideFolders = options?.hideFolders ?? false;

	// 简单树：按文件分组
	const fileMap = new Map<string, any[]>();
	tasks.forEach((task) => {
		const path = task.path;
		if (!fileMap.has(path)) fileMap.set(path, []);
		fileMap.get(path)!.push(task);
	});

	const tree = document.createElement("div");
	tree.className = "task-tree";

	fileMap.forEach((tasks, path) => {
		// 解析文件夹路径
		const prefix = "pages/A 系统/A 任务系统/";
		const relPath = path.startsWith(prefix)
			? path.slice(prefix.length)
			: path;
		const parts = relPath.split("/");
		const fileName = parts.pop()?.replace(".md", "") || path;

		// 如果隐藏文件夹，则跳过文件夹节点，直接显示文件
		if (hideFolders) {
			const fileNode = document.createElement("div");
			fileNode.className = "tree-file";
			fileNode.innerHTML = `<span class="tree-icon">📄</span> ${fileName} <span class="tree-count">(${tasks.length})</span>`;
			const taskList = document.createElement("div");
			taskList.className = "tree-tasks";
			tasks.forEach((task) => {
				const item = document.createElement("div");
				item.className = "tree-task";
				item.textContent = `${CONFIG.STATUS_ICONS[task._status] || "🔲"} ${task._priorityIcon || ""} ${task._cleanText || task.text || ""}`;
				item.addEventListener("click", () => {
					const file = (
						window as any
					).app?.vault?.getAbstractFileByPath(task.path);
					if (file)
						(window as any).app.workspace
							.getLeaf()
							.openFile(file, { eState: { line: task.line } });
				});
				taskList.appendChild(item);
			});
			fileNode.appendChild(taskList);
			tree.appendChild(fileNode);
		} else {
			// 显示文件夹层级（简化）
			let parent = tree;
			const fullPathParts = [...parts];
			let currentPath = prefix;
			fullPathParts.forEach((part, idx) => {
				currentPath += (idx ? "/" : "") + part;
				let folder = parent.querySelector(
					`[data-folder="${currentPath}"]`,
				) as HTMLElement;
				if (!folder) {
					folder = document.createElement("div");
					folder.className = "tree-folder";
					folder.setAttribute("data-folder", currentPath);
					folder.innerHTML = `<span class="tree-icon">📁</span> ${part}`;
					parent.appendChild(folder);
				}
				parent = folder;
			});

			const fileNode = document.createElement("div");
			fileNode.className = "tree-file";
			fileNode.style.marginLeft = parts.length * 20 + "px";
			fileNode.innerHTML = `<span class="tree-icon">📄</span> ${fileName} <span class="tree-count">(${tasks.length})</span>`;
			const taskList = document.createElement("div");
			taskList.className = "tree-tasks";
			tasks.forEach((task) => {
				const item = document.createElement("div");
				item.className = "tree-task";
				item.textContent = `${CONFIG.STATUS_ICONS[task._status] || "🔲"} ${task._priorityIcon || ""} ${task._cleanText || task.text || ""}`;
				item.addEventListener("click", () => {
					const file = (
						window as any
					).app?.vault?.getAbstractFileByPath(task.path);
					if (file)
						(window as any).app.workspace
							.getLeaf()
							.openFile(file, { eState: { line: task.line } });
				});
				taskList.appendChild(item);
			});
			fileNode.appendChild(taskList);
			parent.appendChild(fileNode);
		}
	});

	container.appendChild(tree);
}

```

### src\ui\components\tables\task-table.ts

```ts
interface TaskTableOptions {
	onClick?: (task: any) => void;
}

export function renderTaskTable(
	container: HTMLElement,
	tasks: any[],
	options: TaskTableOptions = {},
) {
	const table = document.createElement("table");
	table.className = "task-table";

	const thead = document.createElement("thead");
	thead.innerHTML = `
    <tr>
      <th>状态</th>
      <th>内容</th>
      <th>优先级</th>
      <th>计划</th>
      <th>截止</th>
      <th>文件</th>
    </tr>
  `;
	table.appendChild(thead);

	const tbody = document.createElement("tbody");
	tasks.forEach((task) => {
		const row = document.createElement("tr");
		row.className = "task-row";
		row.addEventListener("click", () => options.onClick?.(task));

		row.innerHTML = `
      <td>${task._status || ""}</td>
      <td>${task._cleanText || task.text || ""}</td>
      <td>${task._priorityIcon || ""}</td>
      <td>${task._scheduled || ""}</td>
      <td>${task._due || ""}</td>
      <td>${(task.path || "").split("/").pop() || ""}</td>
    `;
		tbody.appendChild(row);
	});
	table.appendChild(tbody);
	container.appendChild(table);
}

```

### src\ui\components\timeline\task-timeline.ts

```ts
import { CONFIG } from "../../../configs/plugin-configs";

export function renderTimeline(container: HTMLElement, tasks: any[]) {
	const groups: Record<string, any[]> = {};
	tasks.forEach((task) => {
		const due = task._due || "无截止日期";
		if (!groups[due]) groups[due] = [];
		groups[due].push(task);
	});

	const sortedDates = Object.keys(groups).sort((a, b) => {
		if (a === "无截止日期") return 1;
		if (b === "无截止日期") return -1;
		return a.localeCompare(b);
	});

	sortedDates.forEach((date) => {
		const group = document.createElement("div");
		group.className = "timeline-group";

		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>📅 ${date}</span><span>${groups[date].length} 项</span>`;
		group.appendChild(header);

		const list = document.createElement("ul");
		list.className = "task-list";
		groups[date].forEach((task) => {
			const li = document.createElement("li");
			li.className = "task-item";
			li.innerHTML = `
        <div class="task-desc">${CONFIG.STATUS_ICONS[task._status] || "🔲"} ${task._priorityIcon || ""} ${task._cleanText || task.text || ""}</div>
        <div class="task-meta">${task._due ? "📅 " + task._due : ""}</div>
      `;
			li.addEventListener("click", () => {
				const file = (window as any).app?.vault?.getAbstractFileByPath(
					task.path,
				);
				if (file)
					(window as any).app.workspace
						.getLeaf()
						.openFile(file, { eState: { line: task.line } });
			});
			list.appendChild(li);
		});
		group.appendChild(list);
		container.appendChild(group);
	});
}

```

### src\ui\components\tooltip\tooltip.ts

```ts
export const placeholder = true;

```

### src\ui\layout\navigator-layout-impl.ts

```ts
import { Store } from "../../store/store";
import { FilterBar } from "../panels/filter-bar";
import { SideBar } from "../panels/side-bar";
import { ViewContainer } from "../panels/view-container";

export class NavigatorLayout {
	constructor(container: HTMLElement, store: Store, app: any) {
		container.addClass("navigator-root");
		container.style.display = "flex";
		container.style.height = "100%";

		const sidebarEl = container.createDiv({ cls: "navigator-sidebar" });
		const mainEl = container.createDiv({ cls: "navigator-main" });
		const filterEl = mainEl.createDiv({ cls: "navigator-filter" });
		const viewEl = mainEl.createDiv({ cls: "navigator-view" });

		new SideBar(sidebarEl, store);
		new FilterBar(filterEl, store);
		new ViewContainer(viewEl, store, app);
	}
}

```

### src\ui\layout\navigator-layout.ts

```ts
import { ItemView } from "obsidian";
import { Store } from "../../store/store";
import { NavigatorLayout } from "./navigator-layout-impl";

export class NavigatorView extends ItemView {
	private store: Store;
	private layout?: NavigatorLayout;

	constructor(leaf: WorkspaceLeaf, store: Store) {
		super(leaf);
		this.store = store;
	}

	getViewType() {
		return "navigator-view";
	}
	getDisplayText() {
		return "任务导航中心";
	}
	getIcon() {
		return "compass";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		this.layout = new NavigatorLayout(container, this.store, this.app);
	}

	async onClose() {
		this.layout = undefined;
	}
}

```

### src\ui\panels\filter-bar.ts

```ts
// src/ui/panels/filter-bar.ts
import { CONFIG } from "../../configs/plugin-configs";
import { Store } from "../../store/store";
import { DateUtils } from "../../tasks/process/common-process";
import { GlobalFilter } from "../../types";

export class FilterBar {
	constructor(container: HTMLElement, store: Store) {
		const render = () => {
			container.empty();
			const state = store.getState();
			const preset = store.getActivePreset();
			const currentFilter: GlobalFilter =
				state.draftFilter ?? preset?.filter ?? this.defaultFilter();
			const intervalMode =
				(preset as any)?.intervalMode ?? "scheduled-due";

			// ========== 快捷日期 ==========
			const quickSection = container.createDiv({ cls: "filter-section" });
			quickSection.createEl("div", {
				text: "📅 快捷日期",
				cls: "filter-label",
			});
			const quickRow = quickSection.createDiv({ cls: "filter-row" });
			const quickDates = [
				{
					label: "今天",
					range: () => DateUtils.getDayRange(new Date()),
				},
				{
					label: "昨天",
					range: () => {
						const d = new Date();
						d.setDate(d.getDate() - 1);
						return DateUtils.getDayRange(d);
					},
				},
				{
					label: "明天",
					range: () => {
						const d = new Date();
						d.setDate(d.getDate() + 1);
						return DateUtils.getDayRange(d);
					},
				},
				{
					label: "本周",
					range: () => DateUtils.getWeekRange(new Date()),
				},
				{
					label: "上周",
					range: () => {
						const d = new Date();
						d.setDate(d.getDate() - 7);
						return DateUtils.getWeekRange(d);
					},
				},
				{
					label: "下周",
					range: () => {
						const d = new Date();
						d.setDate(d.getDate() + 7);
						return DateUtils.getWeekRange(d);
					},
				},
				{
					label: "本月",
					range: () => DateUtils.getMonthRange(new Date()),
				},
				{
					label: "上月",
					range: () => {
						const d = new Date();
						d.setMonth(d.getMonth() - 1);
						return DateUtils.getMonthRange(d);
					},
				},
				{
					label: "下月",
					range: () => {
						const d = new Date();
						d.setMonth(d.getMonth() + 1);
						return DateUtils.getMonthRange(d);
					},
				},
				{ label: "所有", range: () => null },
			];
			quickDates.forEach(({ label, range }) => {
				const btn = quickRow.createEl("button", {
					text: label,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const r = range();
					const newFilter: GlobalFilter = { ...currentFilter };
					if (r) {
						newFilter.dateRange = {
							start: r.start.getTime(),
							end: r.end.getTime(),
							isAll: false,
						};
					} else {
						newFilter.dateRange = {
							start: null,
							end: null,
							isAll: true,
						};
					}
					store.update({ draftFilter: newFilter });
				};
			});

			// ========== 日期级联 ==========
			const cascadeSection = container.createDiv({
				cls: "filter-section",
			});
			cascadeSection.createEl("div", {
				text: "📆 日期级联",
				cls: "filter-label",
			});

			// 年
			const yearRow = cascadeSection.createDiv({ cls: "filter-row" });
			yearRow.createSpan({ text: "年：" });
			const years = (CONFIG as any).YEAR_LIST ?? [
				2024, 2025, 2026, 2027, 2028,
			];
			years.forEach((year: number) => {
				const btn = yearRow.createEl("button", {
					text: year.toString(),
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const range = DateUtils.getYearRangeByYear(year);
					store.update({
						draftFilter: {
							...currentFilter,
							dateRange: {
								start: range.start.getTime(),
								end: range.end.getTime(),
								isAll: false,
							},
						},
					});
				};
			});

			// 季
			const quarterRow = cascadeSection.createDiv({ cls: "filter-row" });
			quarterRow.createSpan({ text: "季：" });
			for (let q = 1; q <= 4; q++) {
				const btn = quarterRow.createEl("button", {
					text: `第${q}季`,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const year = new Date().getFullYear();
					const range = DateUtils.getQuarterRangeByYearQuarter(
						year,
						q,
					);
					store.update({
						draftFilter: {
							...currentFilter,
							dateRange: {
								start: range.start.getTime(),
								end: range.end.getTime(),
								isAll: false,
							},
						},
					});
				};
			}

			// 月
			const monthRow = cascadeSection.createDiv({ cls: "filter-row" });
			monthRow.createSpan({ text: "月：" });
			for (let m = 1; m <= 12; m++) {
				const btn = monthRow.createEl("button", {
					text: `${m}月`,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const year = new Date().getFullYear();
					const range = DateUtils.getMonthRangeByYearMonth(year, m);
					store.update({
						draftFilter: {
							...currentFilter,
							dateRange: {
								start: range.start.getTime(),
								end: range.end.getTime(),
								isAll: false,
							},
						},
					});
				};
			}

			// 周
			const weekRow = cascadeSection.createDiv({ cls: "filter-row" });
			weekRow.createSpan({ text: "周：" });
			const today = new Date();
			const year = today.getFullYear();
			const month = today.getMonth();
			const firstDayOfMonth = new Date(year, month, 1);
			const firstDayDow = firstDayOfMonth.getDay() || 7;
			const mondayOffset = firstDayDow === 1 ? 0 : 8 - firstDayDow;
			const firstMonday = new Date(firstDayOfMonth);
			firstMonday.setDate(1 + mondayOffset);
			const lastDayOfMonth = new Date(year, month + 1, 0);
			for (let w = 1; w <= 5; w++) {
				const start = new Date(firstMonday);
				start.setDate(start.getDate() + (w - 1) * 7);
				const end = new Date(start);
				end.setDate(end.getDate() + 6);
				if (start.getMonth() !== month && end > lastDayOfMonth) break;
				const btn = weekRow.createEl("button", {
					text: `第${w}周`,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const range = {
						start: DateUtils.setStart(start),
						end: DateUtils.setEnd(end),
					};
					store.update({
						draftFilter: {
							...currentFilter,
							dateRange: {
								start: range.start.getTime(),
								end: range.end.getTime(),
								isAll: false,
							},
						},
					});
				};
			}

			// 周几
			const weekdayRow = cascadeSection.createDiv({ cls: "filter-row" });
			weekdayRow.createSpan({ text: "周几：" });
			const weekdays = [
				"周一",
				"周二",
				"周三",
				"周四",
				"周五",
				"周六",
				"周日",
			];
			const todayDate = new Date();
			const todayDay = todayDate.getDay() || 7;
			const currentMonday = new Date(todayDate);
			currentMonday.setDate(todayDate.getDate() - (todayDay - 1));
			weekdays.forEach((wd, idx) => {
				const d = new Date(currentMonday);
				d.setDate(currentMonday.getDate() + idx);
				const btn = weekdayRow.createEl("button", {
					text: wd,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const range = DateUtils.getDayRange(d);
					store.update({
						draftFilter: {
							...currentFilter,
							dateRange: {
								start: range.start.getTime(),
								end: range.end.getTime(),
								isAll: false,
							},
						},
					});
				};
			});

			// ========== 计划-截止切换 ==========
			const modeSection = container.createDiv({ cls: "filter-section" });
			const modeBtn = modeSection.createEl("button", {
				text:
					intervalMode === "scheduled-due"
						? "📏 计划~截止"
						: "📏 开始~完成",
				cls: "filter-btn",
			});
			modeBtn.onclick = () => {
				if (!preset) return;
				const newMode =
					intervalMode === "scheduled-due"
						? "starts-done"
						: "scheduled-due";
				const newPresets = state.presets.map((p) =>
					p.id === preset.id ? { ...p, intervalMode: newMode } : p,
				);
				store.update({ presets: newPresets });
			};

			// ========== 执行状态 ==========
			const statusSection = container.createDiv({
				cls: "filter-section",
			});
			statusSection.createEl("div", {
				text: "📌 执行状态",
				cls: "filter-label",
			});
			const statusRow = statusSection.createDiv({ cls: "filter-row" });
			const allStatuses = CONFIG.ALLOWED_STATUSES ?? [
				"todo",
				"planned",
				"in-progress",
				"completed",
				"cancelled",
			];
			const statusLabels: Record<string, string> = {
				todo: "未开始",
				planned: "计划中",
				"in-progress": "进行中",
				completed: "已完成",
				cancelled: "已取消",
			};
			allStatuses.forEach((st) => {
				const btn = statusRow.createEl("button", {
					text: statusLabels[st] || st,
					cls: "filter-btn",
				});
				if (currentFilter.statuses.includes(st)) btn.addClass("active");
				btn.onclick = () => {
					const newStatuses = currentFilter.statuses.includes(st)
						? currentFilter.statuses.filter((s) => s !== st)
						: [...currentFilter.statuses, st];
					store.update({
						draftFilter: {
							...currentFilter,
							statuses: newStatuses,
						},
					});
				};
			});

			// ========== 标记筛选 ==========
			const markSection = container.createDiv({ cls: "filter-section" });
			markSection.createEl("div", {
				text: "🏷️ 标记筛选",
				cls: "filter-label",
			});

			const allMarks: string[] = (CONFIG as any).ALL_MARKS || [
				"priority",
				"repeat",
				"created",
				"scheduled",
				"starts",
				"due",
				"done",
				"cancel",
				"tag",
				"id",
				"forbid",
			];
			const markNames: Record<string, string> = (CONFIG as any)
				.MARK_NAMES || {
				priority: "优先级",
				repeat: "循环",
				created: "创建",
				scheduled: "计划",
				starts: "开始",
				due: "截止",
				done: "完成",
				cancel: "取消",
				tag: "标签",
				id: "唯一ID",
				forbid: "引用ID",
			};

			// 包含标记
			const incRow = markSection.createDiv({ cls: "filter-row" });
			incRow.createSpan({ text: "包含：" });
			allMarks.forEach((mark) => {
				const btn = incRow.createEl("button", {
					text: markNames[mark] || mark,
					cls: "filter-btn",
				});
				if (currentFilter.includeMarks.includes(mark))
					btn.addClass("active");
				btn.onclick = () => {
					const inc = currentFilter.includeMarks.includes(mark)
						? currentFilter.includeMarks.filter((m) => m !== mark)
						: [...currentFilter.includeMarks, mark];
					store.update({
						draftFilter: { ...currentFilter, includeMarks: inc },
					});
				};
			});

			// 排除标记
			const excRow = markSection.createDiv({ cls: "filter-row" });
			excRow.createSpan({ text: "排除：" });
			allMarks.forEach((mark) => {
				const btn = excRow.createEl("button", {
					text: markNames[mark] || mark,
					cls: "filter-btn",
				});
				if (currentFilter.excludeMarks.includes(mark))
					btn.addClass("active");
				btn.onclick = () => {
					const exc = currentFilter.excludeMarks.includes(mark)
						? currentFilter.excludeMarks.filter((m) => m !== mark)
						: [...currentFilter.excludeMarks, mark];
					store.update({
						draftFilter: { ...currentFilter, excludeMarks: exc },
					});
				};
			});

			// ========== 显示/隐藏切换 ==========
			const toggleSection = container.createDiv({
				cls: "filter-section",
			});
			const toggleRow = toggleSection.createDiv({ cls: "filter-row" });

			const repeatBtn = toggleRow.createEl("button", {
				text: currentFilter.hideRepeat ? "显示循环" : "隐藏循环",
				cls: "filter-btn",
			});
			repeatBtn.onclick = () =>
				store.update({
					draftFilter: {
						...currentFilter,
						hideRepeat: !currentFilter.hideRepeat,
					},
				});

			const completedBtn = toggleRow.createEl("button", {
				text: currentFilter.hideCompleted ? "显示已完成" : "隐藏已完成",
				cls: "filter-btn",
			});
			completedBtn.onclick = () =>
				store.update({
					draftFilter: {
						...currentFilter,
						hideCompleted: !currentFilter.hideCompleted,
					},
				});

			const cancelledBtn = toggleRow.createEl("button", {
				text: currentFilter.hideCancelled ? "显示已取消" : "隐藏已取消",
				cls: "filter-btn",
			});
			cancelledBtn.onclick = () =>
				store.update({
					draftFilter: {
						...currentFilter,
						hideCancelled: !currentFilter.hideCancelled,
					},
				});

			const folderBtn = toggleRow.createEl("button", {
				text: (currentFilter as any).hideFolders
					? "显示文件夹"
					: "隐藏文件夹",
				cls: "filter-btn",
			});
			folderBtn.onclick = () => {
				const hideFolders = !(currentFilter as any).hideFolders;
				store.update({
					draftFilter: { ...currentFilter, hideFolders },
				});
			};

			// ========== 操作按钮 ==========
			const actionRow = container.createDiv({ cls: "filter-row" });
			const applyBtn = actionRow.createEl("button", {
				text: "💾 应用到方案",
				cls: "filter-btn",
			});
			applyBtn.onclick = () => {
				if (preset) {
					const newPresets = state.presets.map((p) =>
						p.id === preset.id
							? { ...p, filter: currentFilter }
							: p,
					);
					store.update({ presets: newPresets, draftFilter: null });
				}
			};
			const resetBtn = actionRow.createEl("button", {
				text: "🔄 重置",
				cls: "filter-btn",
			});
			resetBtn.onclick = () => store.update({ draftFilter: null });
		};

		store.subscribe(render);
		render();
	}

	private defaultFilter(): GlobalFilter {
		return {
			dateRange: { start: null, end: null, isAll: true },
			statuses: CONFIG.ALLOWED_STATUSES ?? [
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
	}
}

```

### src\ui\panels\side-bar.ts

```ts
import { Store } from "../../store/store";
import { Preset } from "../../types";

export class SideBar {
	constructor(container: HTMLElement, store: Store) {
		const render = () => {
			container.empty();

			// 新建方案按钮
			const addBtn = container.createEl("button", {
				text: "➕ 新建方案",
				cls: "side-btn",
			});
			addBtn.onclick = () => {
				const now = Date.now().toString();
				const newPreset: Preset = {
					id: now,
					name: "新方案",
					groupId: "default",
					businessView: "allTasks",
					viewStyle: "table",
					filter: {
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
					},
					sort: { type: "status", order: "asc" },
				};
				store.update({
					presets: [...store.getState().presets, newPreset],
					activePresetId: newPreset.id,
				});
			};

			// 方案列表
			const list = container.createDiv({ cls: "preset-list" });
			store.getState().presets.forEach((preset) => {
				const row = list.createDiv({ cls: "preset-row" });
				const btn = row.createEl("button", {
					text: preset.name,
					cls: "preset-btn",
				});
				if (store.getState().activePresetId === preset.id)
					btn.classList.add("active");
				btn.onclick = () => store.update({ activePresetId: preset.id });

				const delBtn = row.createEl("button", {
					text: "🗑️",
					cls: "preset-del",
				});
				delBtn.onclick = (e) => {
					e.stopPropagation();
					const newPresets = store
						.getState()
						.presets.filter((p) => p.id !== preset.id);
					const newActive =
						store.getState().activePresetId === preset.id
							? (newPresets[0]?.id ?? null)
							: store.getState().activePresetId;
					store.update({
						presets: newPresets,
						activePresetId: newActive,
					});
				};
			});
		};

		store.subscribe(render);
		render();
	}
}

```

### src\ui\panels\view-container.ts

```ts
import { Store } from "../../store/store";
import { BaseTaskView } from "../views/base-view";

const VIEW_LOADERS: Record<
	string,
	() => Promise<{ new (c: HTMLElement, s: Store, a: any): BaseTaskView }>
> = {
	today: () => import("../views/today-view").then((m) => m.TodayView),
	allTasks: () =>
		import("../views/all-tasks-view").then((m) => m.AllTasksView),
};

export class ViewContainer {
	private container: HTMLElement;
	private store: Store;
	private app: any;
	private currentView: BaseTaskView | null = null;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		store.subscribe(() => this.refresh());
		this.refresh();
	}

	async refresh() {
		const preset = this.store.getActivePreset();
		if (!preset) {
			this.container.empty();
			this.container.createDiv({ text: "请从侧边栏选择一个方案" });
			return;
		}

		const loader = VIEW_LOADERS[preset.businessView];
		if (!loader) {
			this.container.empty();
			this.container.createDiv({
				text: `未知视图: ${preset.businessView}`,
			});
			return;
		}

		if (
			this.currentView &&
			(this.currentView as any)._presetId === preset.id
		) {
			return; // 同一个预设，不重建
		}

		if (this.currentView) {
			this.currentView.destroy();
			this.container.empty();
		}

		const ViewClass = await loader();
		this.currentView = new ViewClass(this.container, this.store, this.app);
		(this.currentView as any)._presetId = preset.id;
		await this.currentView.render();
	}
}

```

### src\ui\views\all-tasks-view.ts

```ts
import { filterTasks } from "../../tasks/process/filter-task-process";
import { getAllTasks } from "../../tasks/read/read-tasks";
import { GlobalFilter } from "../../types";
import { renderSortBar } from "../bars/sort-bar";
import { renderViewStyleBar } from "../bars/view-style-bar";
import { renderKanban } from "../components/boards/kanban";
import { renderMatrix } from "../components/boards/matrix";
import { renderCalendarDay } from "../components/calendar/day";
import { renderCalendarMonth } from "../components/calendar/month";
import { renderCalendarQuarter } from "../components/calendar/quarter";
import { renderCalendar } from "../components/calendar/task-calendar";
import { renderCalendarWeek } from "../components/calendar/week";
import { renderCalendarYear } from "../components/calendar/year";
import { renderDetail } from "../components/charts/detail";
import { renderStatistics } from "../components/charts/statistics";
import { renderGantt } from "../components/gantt/gantt";
import { renderTaskList } from "../components/lists/task-list";
import { renderTaskTree } from "../components/lists/task-tree";
import { renderTaskTable } from "../components/tables/task-table";
import { renderTimeline } from "../components/timeline/task-timeline";
import { BaseTaskView } from "./base-view";

export class AllTasksView extends BaseTaskView {
	async render() {
		this.container.empty();

		// 工具栏
		const toolbar = this.container.createDiv({ cls: "view-toolbar" });
		renderViewStyleBar(toolbar, this.store);
		renderSortBar(toolbar, this.store);

		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? this.getDefaultFilter();
		const currentStyle = preset?.viewStyle ?? "table";

		try {
			const dv = this.app.plugins?.plugins?.dataview?.api;
			if (!dv) {
				this.container.createDiv({
					text: "请先安装并启用 Dataview 插件",
				});
				return;
			}

			const cacheState = { cachedAllTasks: null as any };
			const allTasks = getAllTasks(false, dv, cacheState);
			let filtered = filterTasks(allTasks, activeFilter);
			const sort = preset?.sort ?? { type: "status", order: "asc" };
			filtered = this.applySort(filtered, sort);

			if (filtered.length === 0) {
				this.container.createDiv({ text: "没有符合条件的任务" });
				return;
			}

			const viewContainer = this.container.createDiv({
				cls: "view-content",
			});

			switch (currentStyle) {
				case "table":
					renderTaskTable(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "list":
					renderTaskList(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						compact: false,
					});
					break;
				case "list-simple":
					renderTaskList(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						compact: true,
					});
					break;
				case "kanban":
					renderKanban(viewContainer, filtered);
					break;
				case "matrix":
					renderMatrix(viewContainer, filtered);
					break;
				case "timeline":
					renderTimeline(viewContainer, filtered);
					break;
				case "tree":
					renderTaskTree(viewContainer, filtered, {
						hideFolders: activeFilter.hideFolders ?? false,
					});
					break;
				case "gantt":
					renderGantt(viewContainer, filtered);
					break;
				case "calendar":
					renderCalendar(viewContainer, filtered);
					break;
				case "calendar-day":
					renderCalendarDay(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						intervalMode:
							(preset as any)?.intervalMode || "scheduled-due",
					});
					break;
				case "calendar-week":
					renderCalendarWeek(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						intervalMode:
							(preset as any)?.intervalMode || "scheduled-due",
					});
					break;
				case "calendar-month":
					renderCalendarMonth(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						intervalMode:
							(preset as any)?.intervalMode || "scheduled-due",
					});
					break;
				case "calendar-quarter":
					renderCalendarQuarter(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						intervalMode:
							(preset as any)?.intervalMode || "scheduled-due",
					});
					break;
				case "calendar-year":
					renderCalendarYear(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						intervalMode:
							(preset as any)?.intervalMode || "scheduled-due",
					});
					break;
				case "statistics":
					renderStatistics(viewContainer, filtered);
					break;
				case "detail":
					renderDetail(viewContainer, filtered);
					break;
				default:
					viewContainer.createDiv({
						text: `未支持的视图样式：${currentStyle}`,
					});
			}
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
	}

	private openTask(task: any) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (file) {
			this.app.workspace
				.getLeaf()
				.openFile(file, { eState: { line: task.line } });
		}
	}

	private applySort(tasks: any[], sort: { type: string; order: string }) {
		const sorted = [...tasks];
		const order = sort.order === "asc" ? 1 : -1;
		sorted.sort((a, b) => {
			if (sort.type === "status") {
				const map: Record<string, number> = {
					todo: 0,
					planned: 1,
					"in-progress": 2,
					completed: 3,
					cancelled: 4,
				};
				return (map[a._status] ?? 5) - (map[b._status] ?? 5) * order;
			}
			if (sort.type === "priority") {
				const pa = a._priorityIcon || "",
					pb = b._priorityIcon || "";
				return pa.localeCompare(pb) * order;
			}
			if (sort.type === "scheduled") {
				return (
					((a._scheduled || "") > (b._scheduled || "") ? 1 : -1) *
					order
				);
			}
			if (sort.type === "due") {
				return ((a._due || "") > (b._due || "") ? 1 : -1) * order;
			}
			if (sort.type === "filename") {
				const nameA = (a.path || "").split("/").pop() || "";
				const nameB = (b.path || "").split("/").pop() || "";
				return nameA.localeCompare(nameB) * order;
			}
			return 0;
		});
		return sorted;
	}

	private getDefaultFilter(): GlobalFilter {
		return {
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
		};
	}
}

```

### src\ui\views\base-view.ts

```ts
import { Store } from "../../store/store";

export abstract class BaseTaskView {
	protected container: HTMLElement;
	protected store: Store;
	protected app: any;
	private unsub?: () => void;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;

		// 订阅 Store，每当状态变化就重新渲染
		this.unsub = store.subscribe(() => {
			this.render();
		});
	}

	abstract render(): Promise<void>;

	destroy() {
		if (this.unsub) this.unsub();
	}
}

```

### src\ui\views\depends-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\future-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\important-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\inbox-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\organize-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\overdue-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\recurring-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\table-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\tag-view.ts

```ts
export const placeholder = true;

```

### src\ui\views\today-view.ts

```ts
import { filterTasks } from "../../tasks/process/filter-task-process";
import { fetchTodayTasksGrouped } from "../../tasks/process/task-query-process";
import { GlobalFilter } from "../../types";
import { renderTaskList } from "../components/lists/task-list";
import { BaseTaskView } from "./base-view";

export class TodayView extends BaseTaskView {
	async render() {
		this.container.empty();
		this.container.createEl("h4", { text: "📅 今天任务" });

		// 获取当前筛选条件：优先使用 draftFilter，否则使用当前方案的 filter
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter = state.draftFilter ??
			preset?.filter ?? {
				dateRange: { start: null, end: null, isAll: true },
				statuses: ["todo", "planned", "in-progress"],
				includeMarks: [],
				excludeMarks: [],
				hideRepeat: true,
				hideCompleted: true,
				hideCancelled: true,
				rootPath: null,
			};

		try {
			const { groups } = await fetchTodayTasksGrouped(this.app);
			let tasks = [
				...(groups["未开始"] || []),
				...(groups["计划中"] || []),
				...(groups["进行中"] || []),
			];

			// 应用当前筛选（日期、状态、标记、隐藏已完成等）
			tasks = filterTasks(tasks, activeFilter);

			if (tasks.length === 0) {
				this.container.createDiv({ text: "今天没有符合条件的任务" });
				return;
			}
			renderTaskList(this.container, tasks, {
				onClick: (task: any) => {
					const file = this.app.vault.getAbstractFileByPath(
						task.path,
					);
					if (file) {
						this.app.workspace.getLeaf().openFile(file, {
							eState: { line: task.lineNumber },
						});
					}
				},
			});
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
	}
}

```

### src\utils\logger.ts

```ts
// src/utils/logger.js
// 简易日志工具，生产模式下仅输出错误

const isProduction = (() => {
    try {
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
            return true;
        }
    } catch (e) {}
    return false;
})();

const logger = {
    info(...args) {
        if (!isProduction) console.log('[TASK-INFO]', ...args);
    },
    warn(...args) {
        console.warn('[TASK-WARN]', ...args); // 警告总是输出
    },
    error(...args) {
        console.error('[TASK-ERROR]', ...args);
    },
    debug(...args) {
        if (!isProduction) console.debug('[TASK-DEBUG]', ...args);
    }
};

export default logger;
```
