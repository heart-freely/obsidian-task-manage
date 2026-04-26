// src/configs/plugin-configs.js
export const CONFIG = {
    TASK_FOLDERS: ['"pages/A 系统/A 任务系统"'],
    FILE_NAME_PATTERN: /任务$/,
    ROOT_PATH: 'pages/A 系统/A 任务系统/',
    ALLOWED_STATUSES: ['todo', 'planned', 'in-progress', 'completed', 'cancelled'],
    STATUS_NAMES: { todo: '未开始', planned: '计划中', 'in-progress': '进行中', completed: '已完成', cancelled: '已放弃' },
    STATUS_ICONS: { todo: '🔲', planned: '❔', 'in-progress': '⏩', completed: '✅', cancelled: '❎' },
    STATUS_COLORS: { todo: '#2e333b', planned: '#4b525b', 'in-progress': '#7fb8f0', completed: '#47852f', cancelled: '#c3393e' },
    MARK_NAMES: { priority: '优先级', repeat: '循环', created: '创建', scheduled: '计划', starts: '开始', due: '截止', done: '完成', cancel: '取消', tag: '标签', id: '唯一ID', forbid: '引用ID' },
    ALL_MARKS: ['priority', 'repeat', 'created', 'scheduled', 'starts', 'due', 'done', 'cancel', 'tag', 'id', 'forbid'],
    PRIORITY_ORDER: ['⏬', '🔽', '🔼', '⏫', '🔺'],
    PRIORITY_COLORS: ['#98c379', '#61afef', '#d19a66', '#e06c75', '#c3393e'],
    REPEAT_ORDER: ['every day', 'every week', 'every month', 'every year'],
    REPEAT_COLORS: ['#a0c4ff', '#9bf6ff', '#ffd6a5', '#fdffb6'],
    REPEAT_TYPES: ['every day', 'every week', 'every month', 'every year'],
    DATE_MARK_ORDER: ['created', 'scheduled', 'starts', 'due', 'done', 'cancel'],
    DATE_MARK_NAMES: { created: '➕ 创建', scheduled: '⏳ 计划', starts: '🛫 开始', due: '📅 截止', done: '✅ 完成', cancel: '❌ 取消' },
    DATE_MARK_COLORS: ['#b7bdf8', '#ed8796', '#f5a97f', '#eed49f', '#a6da95', '#8bd5ca'],
    YEAR_LIST: [2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031],
    WORK_HOURS_PER_DAY: 12,
    SORT_TYPES: { STATUS: 'status', PRIORITY: 'priority', TIME: 'time' },
    INTERVAL_MODES: { SCHEDULED_DUE: 'scheduled-due', STARTS_DONE: 'starts-done' }
};

// 提供给设置面板的默认值，只包含用户可修改的字段
export const DEFAULT_SETTINGS = {
    TASK_FOLDERS: ['"pages/A 系统/A 任务系统"'],
    ROOT_PATH: 'pages/A 系统/A 任务系统/',
    WORK_HOURS_PER_DAY: 12,
    STATUS_COLORS: {
        todo: '#2e333b',
        planned: '#4b525b',
        'in-progress': '#7fb8f0',
        completed: '#47852f',
        cancelled: '#c3393e'
    },
    PRIORITY_ORDER: ['⏬', '🔽', '🔼', '⏫', '🔺'],
    PRIORITY_COLORS: ['#98c379', '#61afef', '#d19a66', '#e06c75', '#c3393e'],
    REPEAT_COLORS: ['#a0c4ff', '#9bf6ff', '#ffd6a5', '#fdffb6'],
    DATE_MARK_COLORS: ['#b7bdf8', '#ed8796', '#f5a97f', '#eed49f', '#a6da95', '#8bd5ca'],
    YEAR_LIST: [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031]
};