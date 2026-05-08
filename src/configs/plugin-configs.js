//  <!-- SYNC_COMMENTS_START -->
/**
 * 文件：src/configs/plugin-configs.js
 * 描述：插件核心常量和配置定义，包括任务文件夹、状态、优先级、循环、日期标记等配置
 * 所属模块：configs
 * 依赖：无
 * 对外导出：所有命名导出常量 + CONFIG 和 DEFAULT_SETTINGS
 * 注意事项：所有常量应避免运行时修改，CONFIG 为运行时聚合配置，DEFAULT_SETTINGS 为用户自定义默认值
 * @see .cline/skills/code/configs/plugin-configs.md
 */

/* @skill-state 无（纯常量定义，无运行时状态） */

/* @skill-global-state
CONFIG = {
  TASK_FOLDERS, STATUS_*, PRIORITY_*, REPEAT_*, DATE_MARK_*, ...
}
DEFAULT_SETTINGS = {
  TASK_FOLDERS, STATUS_COLORS, PRIORITY_ORDER, ...
}
*/

//  <!-- SYNC_COMMENTS_END -->

/** 任务文件所在文件夹路径数组 */
export const TASK_FOLDERS = ['"pages/A 系统/A 任务系统"'];

/** 任务文件名匹配正则 */
export const FILE_NAME_PATTERN = /任务$/;

/** 任务根路径 */
export const ROOT_PATH = "pages/A 系统/A 任务系统/";

/** 任务文件夹路径 */
export const TASK_FOLDER_PATH = "pages/A 系统/A 任务系统";

/** 任务文件名的正则表达式字符串形式 */
export const TASK_FILENAME_REGEX_TASKS = "/.*任务\\.md$/";

/** 任务文件名的正则表达式对象 */
export const TASK_FILENAME_REGEXP = /.*任务\.md$/;

/** 允许的任务状态列表 */
export const ALLOWED_STATUSES = [
	"todo",
	"planned",
	"in-progress",
	"completed",
	"cancelled",
];

/** 状态名称映射：英文标识 → 中文名称 */
export const STATUS_NAMES = {
	todo: "未开始",
	planned: "计划中",
	"in-progress": "进行中",
	completed: "已完成",
	cancelled: "已取消",
};

/** 状态图标映射：英文标识 → 图标字符 */
export const STATUS_ICONS = {
	todo: "🔲",
	planned: "❔",
	"in-progress": "⏩",
	completed: "✅",
	cancelled: "❎",
};

/** 状态排序顺序 */
export const STATUS_SORT_ORDER = [
	"todo",
	"planned",
	"in-progress",
	"completed",
	"cancelled",
];

/** 任务标记符号到状态的映射 */
export const STATUS_SYMBOL_MAP = {
	" ": "todo",
	"?": "planned",
	"/": "in-progress",
	x: "completed",
	X: "completed",
	"-": "cancelled",
};

/** 优先级排序顺序（从低到高） */
export const PRIORITY_ORDER = ["⏬", "🔽", "🔼", "⏫", "🔺"];

/** 优先级颜色映射（与 PRIORITY_ORDER 一一对应） */
export const PRIORITY_COLORS = [
	"#98c379",
	"#61afef",
	"#d19a66",
	"#e06c75",
	"#c3393e",
];

/** 优先级图标映射：优先级数值 → 图标 */
export const PRIORITY_ICONS = {
	0: "🔺",
	1: "⏫",
	2: "🔼",
	3: "🔽",
	4: "⏬",
	none: "",
};

/** 优先级标签映射：优先级数值 → 中文/英文标签 */
export const PRIORITY_LABELS = {
	0: "Highest|最高",
	1: "High|高",
	2: "Medium|中",
	3: "Low|低",
	4: "Lowest|最低",
	none: "None|无",
};

/** 优先级名称映射：优先级数值 → 简短名称 */
export const PRIORITY_NAME_MAP = {
	0: "VH🔺",
	1: "H⏫",
	2: "M🔼",
	3: "L🔽",
	4: "VL⏬",
	none: "NON",
};

/** 循环类型排序顺序 */
export const REPEAT_ORDER = [
	"every day",
	"every week",
	"every month",
	"every year",
];

/** 循环类型颜色映射（与 REPEAT_ORDER 一一对应） */
export const REPEAT_COLORS = ["#a0c4ff", "#9bf6ff", "#ffd6a5", "#fdffb6"];

/** 循环图标 */
export const REPEAT_ICON = "🔁";

/** 循环标签映射 */
export const REPEAT_LABELS = {
	day: "每天",
	week: "每周",
	month: "每月",
	year: "每年",
};

/** 日期标记类型排序顺序 */
export const DATE_MARK_ORDER = [
	"created",
	"scheduled",
	"starts",
	"due",
	"done",
	"cancel",
];

/** 日期标记图标映射：标记类型 → 图标 */
export const DATE_MARK_ICONS = {
	created: "➕",
	scheduled: "⏳",
	starts: "🛫",
	due: "📅",
	done: "✅",
	cancel: "❌",
};

/** 日期标记名称映射：标记类型 → 带图标的中文名称 */
export const DATE_MARK_NAMES = {
	created: "➕ 创建",
	scheduled: "⏳ 计划",
	starts: "🛫 开始",
	due: "📅 截止",
	done: "✅ 结束",
	cancel: "❌ 取消",
};

/** 日期字段排序顺序 */
export const DATE_FIELD_SORT_ORDER = [
	"created",
	"starts",
	"scheduled",
	"due",
	"cancel",
	"done",
];

/** 唯一 ID 图标 */
export const ID_ICON = "🆔";

/** 依赖图标 */
export const DEPENDS_ICON = "⛔";

/** 标签图标 */
export const TAG_ICON = "🏁";

/** 任务标记序列（解析和渲染顺序） */
export const TASK_MARK_SEQUENCE = [
	"status",
	"description",
	"priority",
	"repeat",
	"created",
	"scheduled",
	"starts",
	"due",
	"done",
	"cancel",
	"id",
	"forbid",
	"tag",
];

/** 标记名称映射：标记键名 → 中文名称 */
export const MARK_NAMES = {
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

/** 所有标记键名列表 */
export const ALL_MARKS = Object.keys(MARK_NAMES);

/**
 * 运行时聚合配置对象
 * 包含插件运行所需的全部常量配置，将上述独立导出常量聚合为单一对象
 * @type {Object}
 * @property {string[]} TASK_FOLDERS - 任务文件所在文件夹路径数组
 * @property {RegExp} FILE_NAME_PATTERN - 任务文件名匹配正则
 * @property {string} ROOT_PATH - 任务根路径
 * @property {string} TASK_FOLDER_PATH - 任务文件夹路径
 * @property {string} TASK_FILENAME_REGEX_TASKS - 任务文件名的正则表达式字符串
 * @property {RegExp} TASK_FILENAME_REGEXP - 任务文件名的正则表达式对象
 * @property {string[]} ALLOWED_STATUSES - 允许的任务状态列表
 * @property {Object} STATUS_NAMES - 状态名称映射
 * @property {Object} STATUS_ICONS - 状态图标映射
 * @property {string[]} STATUS_SORT_ORDER - 状态排序顺序
 * @property {Object} STATUS_SYMBOL_MAP - 任务标记符号到状态的映射
 * @property {string[]} PRIORITY_ORDER - 优先级排序顺序
 * @property {string[]} PRIORITY_COLORS - 优先级颜色映射
 * @property {Object} PRIORITY_ICONS - 优先级图标映射
 * @property {Object} PRIORITY_LABELS - 优先级标签映射
 * @property {Object} PRIORITY_NAME_MAP - 优先级名称映射
 * @property {string[]} REPEAT_ORDER - 循环类型排序顺序
 * @property {string[]} REPEAT_COLORS - 循环类型颜色映射
 * @property {string} REPEAT_ICON - 循环图标
 * @property {Object} REPEAT_LABELS - 循环标签映射
 * @property {string[]} DATE_MARK_ORDER - 日期标记类型排序顺序
 * @property {Object} DATE_MARK_ICONS - 日期标记图标映射
 * @property {Object} DATE_MARK_NAMES - 日期标记名称映射
 * @property {string[]} DATE_FIELD_SORT_ORDER - 日期字段排序顺序
 * @property {string} ID_ICON - 唯一 ID 图标
 * @property {string} DEPENDS_ICON - 依赖图标
 * @property {string} TAG_ICON - 标签图标
 * @property {Object} MARK_NAMES - 标记名称映射
 * @property {string[]} ALL_MARKS - 所有标记键名列表
 * @property {string[]} TASK_MARK_SEQUENCE - 任务标记序列
 * @property {number[]} YEAR_LIST - 年份列表
 * @property {number} WORK_HOURS_PER_DAY - 每天工作小时数
 * @property {Object} SORT_TYPES - 排序类型常量
 * @property {Object} INTERVAL_MODES - 时间区间模式常量
 * @property {Object} DEFAULT_FILTER_STATE - 默认过滤状态
 */
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
	YEAR_LIST: [
		2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031,
	],
	WORK_HOURS_PER_DAY: 12,
	SORT_TYPES: { STATUS: "status", PRIORITY: "priority", TIME: "time" },
	INTERVAL_MODES: {
		SCHEDULED_DUE: "scheduled-due",
		STARTS_DONE: "starts-done",
	},
	DEFAULT_FILTER_STATE: {
		hideRepeatTasks: true,
		hideCompletedTasks: true,
		hideCancelledTasks: true,
		hideFolders: true,
		leftSort: { type: "status", order: "asc" },
		chartScale: 1,
		leftPanelWidth: 300,
	},
};

/**
 * 用户自定义默认设置
 * 用于插件的 Settings 初始化，用户可在设置界面中修改
 * @type {Object}
 * @property {string[]} TASK_FOLDERS - 任务文件夹列表
 * @property {string} ROOT_PATH - 任务根路径
 * @property {number} WORK_HOURS_PER_DAY - 每天工作小时数
 * @property {Object} STATUS_COLORS - 状态颜色映射
 * @property {string[]} PRIORITY_ORDER - 优先级排序顺序
 * @property {string[]} PRIORITY_COLORS - 优先级颜色映射
 * @property {string[]} REPEAT_COLORS - 循环类型颜色映射
 * @property {string[]} DATE_MARK_COLORS - 日期标记颜色数组
 * @property {number[]} YEAR_LIST - 年份列表
 */
export const DEFAULT_SETTINGS = {
	TASK_FOLDERS,
	ROOT_PATH,
	WORK_HOURS_PER_DAY: 12,
	STATUS_COLORS: {
		todo: "#2e333b",
		planned: "#4b525b",
		"in-progress": "#7fb8f0",
		completed: "#47852f",
		cancelled: "#c3393e",
	},
	PRIORITY_ORDER,
	PRIORITY_COLORS,
	REPEAT_COLORS,
	DATE_MARK_COLORS: [
		"#b7bdf8",
		"#ed8796",
		"#f5a97f",
		"#eed49f",
		"#a6da95",
		"#8bd5ca",
	],
	YEAR_LIST: [
		2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031,
	],
};
