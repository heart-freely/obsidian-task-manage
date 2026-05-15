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