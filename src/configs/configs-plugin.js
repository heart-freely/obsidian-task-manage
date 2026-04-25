// src/configs/plugin-configs.js
// 所有可配置常量集中管理

// ===== 任务读取配置 =====
export const TASK_FOLDERS = ['"pages/A 系统/A 任务系统"'];
export const FILE_NAME_PATTERN = /任务$/;
export const ROOT_PATH = 'pages/A 系统/A 任务系统/';

// ===== 状态相关 =====
export const ALLOWED_STATUSES = ['todo', 'planned', 'in-progress', 'completed', 'cancelled'];
export const STATUS_NAMES = {
    todo: '未开始',
    planned: '计划中',
    'in-progress': '进行中',
    completed: '已完成',
    cancelled: '已放弃'
};
export const STATUS_ICONS = {
    todo: '🔲',
    planned: '❔',
    'in-progress': '⏩',
    completed: '✅',
    cancelled: '❎'
};
export const STATUS_COLORS = {
    todo: '#2e333b',
    planned: '#4b525b',
    'in-progress': '#7fb8f0',
    completed: '#47852f',
    cancelled: '#c3393e'
};

// ===== 标记名称 =====
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
export const ALL_MARKS = ['priority', 'repeat', 'created', 'scheduled', 'starts', 'due', 'done', 'cancel', 'tag', 'id', 'forbid'];

// ===== 优先级 =====
export const PRIORITY_ORDER = ['⏬', '🔽', '🔼', '⏫', '🔺'];
export const PRIORITY_COLORS = ['#98c379', '#61afef', '#d19a66', '#e06c75', '#c3393e'];

// ===== 循环 =====
export const REPEAT_ORDER = ['every day', 'every week', 'every month', 'every year'];
export const REPEAT_COLORS = ['#a0c4ff', '#9bf6ff', '#ffd6a5', '#fdffb6'];
export const REPEAT_TYPES = ['every day', 'every week', 'every month', 'every year'];

// ===== 日期标记 =====
export const DATE_MARK_ORDER = ['created', 'scheduled', 'starts', 'due', 'done', 'cancel'];
export const DATE_MARK_NAMES = {
    created: '➕ 创建',
    scheduled: '⏳ 计划',
    starts: '🛫 开始',
    due: '📅 截止',
    done: '✅ 完成',
    cancel: '❌ 取消'
};
export const DATE_MARK_COLORS = ['#b7bdf8', '#ed8796', '#f5a97f', '#eed49f', '#a6da95', '#8bd5ca'];

// ===== 年份列表 =====
export const YEAR_LIST = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031];

// ===== 工时 =====
export const WORK_HOURS_PER_DAY = 12;

// ===== 筛选默认值 =====
export const DEFAULT_FILTER_STATE = {
    hideRepeatTasks: true,
    hideCompletedTasks: true,
    hideCancelledTasks: true,
    hideFolders: true,
    leftSort: { type: 'status', order: 'asc' },
    chartScale: 1,
    leftPanelWidth: 300
};