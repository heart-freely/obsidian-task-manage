// src/process/config/config.ts

import { GlobalFilter } from "../../types";

// ========== 任务元素统一定义 ==========

export const TASK_ELEMENT_ORDER = [
	"status",
	"description",
	"priority",
	"repeat",
	"created",
	"scheduled",
	"starts",
	"cancel",
	"done",
	"due",
	"id",
	"forbid",
	"tag",
] as const;

interface TaskElementChild {
	key: string;
	zhName: string;
	enName: string;
	icon?: string;
	color?: string;
	markdownSymbol?: string;
}

interface TaskElementDef {
	key: string;
	zhName: string;
	enName: string;
	icon: string;
	pattern?: string;
	inMarkSequence: boolean;
	children?: TaskElementChild[];
	yaName?: string;
}

export const TASK_ELEMENTS: Record<string, TaskElementDef> = {
	status: {
		key: "status",
		zhName: "执行状态",
		enName: "Status",
		icon: "",
		inMarkSequence: true,
		yaName: "任务状态",
		children: [
			{
				key: "todo",
				zhName: "未开始",
				enName: "Todo",
				icon: "🔲",
				color: "#2e333b",
				markdownSymbol: " ",
			},
			{
				key: "planned",
				zhName: "计划中",
				enName: "Planned",
				icon: "❔",
				color: "#4b525b",
				markdownSymbol: "?",
			},
			{
				key: "in-progress",
				zhName: "进行中",
				enName: "In Progress",
				icon: "⏩",
				color: "#7fb8f0",
				markdownSymbol: ">",
			},
			{
				key: "completed",
				zhName: "已完成",
				enName: "Completed",
				icon: "✅",
				color: "#47852f",
				markdownSymbol: "x",
			},
			{
				key: "cancelled",
				zhName: "已取消",
				enName: "Cancelled",
				icon: "❎",
				color: "#c3393e",
				markdownSymbol: "-",
			},
		],
	},
	description: {
		key: "description",
		zhName: "任务描述",
		enName: "Description",
		icon: "",
		inMarkSequence: false,
		yaName: "任务名称",
	},
	priority: {
		key: "priority",
		zhName: "优先级",
		enName: "Priority",
		icon: "",
		pattern: "⏬|🔽|🔼|⏫|🔺",
		inMarkSequence: true,
		yaName: "任务优先级",
		children: [
			{
				key: "4",
				zhName: "最低",
				enName: "Lowest",
				icon: "⏬",
				color: "#98c379",
			},
			{
				key: "3",
				zhName: "低",
				enName: "Low",
				icon: "🔽",
				color: "#61afef",
			},
			{
				key: "2",
				zhName: "中",
				enName: "Medium",
				icon: "🔼",
				color: "#d19a66",
			},
			{
				key: "1",
				zhName: "高",
				enName: "High",
				icon: "⏫",
				color: "#e06c75",
			},
			{
				key: "0",
				zhName: "最高",
				enName: "Highest",
				icon: "🔺",
				color: "#c3393e",
			},
		],
	},
	repeat: {
		key: "repeat",
		zhName: "循环",
		enName: "Repeat",
		icon: "🔁",
		pattern:
			"🔁\\s*(every\\s+(\\d+\\s+)?(day|week|month|year)s?|every\\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|every\\s+\\d+(st|nd|rd|th)|on\\s+\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
		yaName: "任务周期",
		children: [
			{
				key: "every day",
				zhName: "每天",
				enName: "Every Day",
				color: "#a0c4ff",
			},
			{
				key: "every week",
				zhName: "每周",
				enName: "Every Week",
				color: "#9bf6ff",
			},
			{
				key: "every month",
				zhName: "每月",
				enName: "Every Month",
				color: "#ffd6a5",
			},
			{
				key: "every year",
				zhName: "每年",
				enName: "Every Year",
				color: "#fdffb6",
			},
		],
	},
	created: {
		key: "created",
		zhName: "创建",
		enName: "Created",
		icon: "➕",
		pattern: "➕\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
		yaName: "任务创建",
	},
	scheduled: {
		key: "scheduled",
		zhName: "计划",
		enName: "Scheduled",
		icon: "⏳",
		pattern: "⏳\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
		yaName: "任务计划",
	},
	starts: {
		key: "starts",
		zhName: "开始",
		enName: "Starts",
		icon: "🛫",
		pattern: "🛫\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
		yaName: "任务开始",
	},
	cancel: {
		key: "cancel",
		zhName: "取消",
		enName: "Cancel",
		icon: "❌",
		pattern: "❌\\s*(\\d{4}-\\d{2}-\\d{2})?",
		inMarkSequence: true,
		yaName: "任务取消",
	},
	done: {
		key: "done",
		zhName: "完成",
		enName: "Done",
		icon: "✅",
		pattern: "✅\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
		yaName: "任务完成",
	},
	due: {
		key: "due",
		zhName: "截止",
		enName: "Due",
		icon: "📅",
		pattern: "📅\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
		yaName: "任务截止",
	},
	tag: {
		key: "tag",
		zhName: "标签",
		enName: "Tag",
		icon: "🏁",
		pattern: "🏁\\s*(\\S+)",
		inMarkSequence: true,
		yaName: "任务标签",
	},
	id: {
		key: "id",
		zhName: "唯一ID",
		enName: "Unique ID",
		icon: "🆔",
		pattern: "🆔\\s*(\\S+)",
		inMarkSequence: true,
		yaName: "任务唯一ID",
	},
	forbid: {
		key: "forbid",
		zhName: "引用ID",
		enName: "Depends On",
		icon: "⛔",
		pattern: "⛔\\s*([^\\s,]+(?:\\s*,\\s*[^\\s,]+)*)",
		inMarkSequence: true,
		yaName: "任务引用ID",
	},
};

export const STATUS_ALL_SYMBOLS: Record<string, string[]> = {
	todo: [" "],
	planned: ["?"],
	"in-progress": [">", "/", "\\"],
	completed: ["x", "X"],
	cancelled: ["-"],
};

export const SYMBOL_TO_STATUS: Record<string, string> = {};
for (const [statusKey, symbols] of Object.entries(STATUS_ALL_SYMBOLS)) {
	for (const s of symbols) {
		SYMBOL_TO_STATUS[s] = statusKey;
	}
}

export const RX: Record<string, RegExp> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = TASK_ELEMENTS[k];
	if (el.pattern) {
		RX[k] = new RegExp(el.pattern, k === "priority" ? "g" : "");
	}
});

export const ALLOWED_STATUSES = TASK_ELEMENTS.status.children!.map(
	(c) => c.key,
);
export const STATUS_NAMES: Record<string, string> = {};
TASK_ELEMENTS.status.children!.forEach((c) => {
	STATUS_NAMES[c.key] = c.zhName;
});
export const STATUS_ICONS: Record<string, string> = {};
TASK_ELEMENTS.status.children!.forEach((c) => {
	STATUS_ICONS[c.key] = c.icon!;
});
export const STATUS_SORT_ORDER = TASK_ELEMENTS.status.children!.map(
	(c) => c.key,
);
export const STATUS_SYMBOL_MAP: Record<string, string> = {};
TASK_ELEMENTS.status.children!.forEach((c) => {
	if (c.markdownSymbol) STATUS_SYMBOL_MAP[c.markdownSymbol] = c.key;
});
STATUS_SYMBOL_MAP["/"] = "in-progress";
STATUS_SYMBOL_MAP["\\"] = "in-progress";
STATUS_SYMBOL_MAP["X"] = "completed";
export const STATUS_COLORS: Record<string, string> = {};
TASK_ELEMENTS.status.children!.forEach((c) => {
	STATUS_COLORS[c.key] = c.color!;
});

export const PRIORITY_ORDER = TASK_ELEMENTS.priority.children!.map(
	(c) => c.icon!,
);
export const PRIORITY_COLORS = TASK_ELEMENTS.priority.children!.map(
	(c) => c.color!,
);
export const PRIORITY_ICONS: Record<string, string> = {};
TASK_ELEMENTS.priority.children!.forEach((c) => {
	PRIORITY_ICONS[c.key] = c.icon!;
});
export const PRIORITY_LABELS: Record<string, string> = {};
TASK_ELEMENTS.priority.children!.forEach((c) => {
	PRIORITY_LABELS[c.key] = `${c.enName}|${c.zhName}`;
});
PRIORITY_LABELS["none"] = "None|无";

export const REPEAT_ORDER = TASK_ELEMENTS.repeat.children!.map((c) => c.key);
export const REPEAT_COLORS = TASK_ELEMENTS.repeat.children!.map(
	(c) => c.color!,
);
export const REPEAT_ICON = TASK_ELEMENTS.repeat.icon;
export const REPEAT_LABELS: Record<string, string> = {};
TASK_ELEMENTS.repeat.children!.forEach((c) => {
	REPEAT_LABELS[c.key] = c.zhName;
});

export const DATE_MARK_ORDER = TASK_ELEMENT_ORDER.filter((k) =>
	["created", "scheduled", "starts", "cancel", "done", "due"].includes(k),
);
export const DATE_MARK_ICONS: Record<string, string> = {};
DATE_MARK_ORDER.forEach((k) => {
	DATE_MARK_ICONS[k] = TASK_ELEMENTS[k].icon;
});
export const DATE_MARK_NAMES: Record<string, string> = {};
DATE_MARK_ORDER.forEach((k) => {
	DATE_MARK_NAMES[k] = TASK_ELEMENTS[k].icon + " " + TASK_ELEMENTS[k].zhName;
});
export const DATE_MARK_COLORS = [
	"#b7bdf8",
	"#ed8796",
	"#f5a97f",
	"#eed49f",
	"#a6da95",
	"#8bd5ca",
];
export const DATE_FIELD_SORT_ORDER = [...DATE_MARK_ORDER];
export const ID_ICON = TASK_ELEMENTS.id.icon;
export const DEPENDS_ICON = TASK_ELEMENTS.forbid.icon;
export const TAG_ICON = TASK_ELEMENTS.tag.icon;
export const TASK_MARK_SEQUENCE = TASK_ELEMENT_ORDER.filter(
	(k) => TASK_ELEMENTS[k].inMarkSequence,
);
export const MARK_NAMES: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	if (TASK_ELEMENTS[k].inMarkSequence)
		MARK_NAMES[k] = TASK_ELEMENTS[k].zhName;
});
export const ALL_MARKS = Object.keys(MARK_NAMES);

export const TABLE_COLUMNS = TASK_ELEMENT_ORDER.filter(
	(k) => k !== "description",
).map((k) => ({
	key: k,
	label: k === "status" ? "状态" : TASK_ELEMENTS[k].zhName,
}));
const descIdx = TABLE_COLUMNS.findIndex((c) => c.key === "status");
if (descIdx >= 0) {
	TABLE_COLUMNS.splice(descIdx + 1, 0, { key: "content", label: "描述" });
}
export const DEFAULT_TABLE_COLUMNS: Record<string, boolean> = {
	status: true,
	content: true,
	priority: true,
	repeat: false,
	created: false,
	scheduled: true,
	starts: true,
	cancel: true,
	done: false,
	due: true,
	tag: false,
	id: false,
	forbid: false,
};

export const YAML_NAME_TO_KEY: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = TASK_ELEMENTS[k];
	if (el.yaName) YAML_NAME_TO_KEY[el.yaName] = k;
});
export const YAML_NAME_TO_ICON: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = TASK_ELEMENTS[k];
	if (el.yaName && el.icon) YAML_NAME_TO_ICON[el.yaName] = el.icon;
});
export const YAML_NAME_TO_ZHNAME: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = TASK_ELEMENTS[k];
	if (el.yaName) YAML_NAME_TO_ZHNAME[el.yaName] = el.zhName;
});
export const YAML_DATE_FIELDS: string[] = TASK_ELEMENT_ORDER.filter((k) => {
	const el = TASK_ELEMENTS[k];
	return (
		el.yaName &&
		["created", "scheduled", "starts", "due", "done", "cancel"].includes(k)
	);
}).map((k) => TASK_ELEMENTS[k].yaName!);
export const YAML_DISPLAY_ORDER: string[] = TASK_ELEMENT_ORDER.filter(
	(k) => TASK_ELEMENTS[k].yaName,
).map((k) => TASK_ELEMENTS[k].yaName!);

export function getPriorityLabel(icon: string): string {
	const idx = PRIORITY_ORDER.indexOf(icon);
	if (idx >= 0) return TASK_ELEMENTS.priority.children![idx].zhName;
	return "无";
}

// ========== 任务文件识别配置 ==========

/** 默认任务文件根路径 */
export const DEFAULT_TASK_ROOT_PATH = "pages/A 系统/A 任务系统";

/** 默认文件名匹配模式 */
export const DEFAULT_TASK_FILE_PATTERN = "任务\\.md$";

/** 默认标题任务匹配模式 */
export const DEFAULT_HEADING_TASK_PATTERN = "任务$";

/** 任务文件根路径 */
export let TASK_ROOT_PATH = DEFAULT_TASK_ROOT_PATH;

/** 文件名匹配正则 */
export let TASK_FILE_PATTERN: RegExp = new RegExp(DEFAULT_TASK_FILE_PATTERN);

/** 标题任务匹配正则 */
export let HEADING_TASK_PATTERN: RegExp = new RegExp(
	DEFAULT_HEADING_TASK_PATTERN,
);

/** 白名单配置 */
export let TASK_WHITELIST: {
	enabled: boolean;
	useRegex: boolean;
	pattern: string;
} = { enabled: false, useRegex: false, pattern: "" };

/** 黑名单配置 */
export let TASK_BLACKLIST: {
	enabled: boolean;
	useRegex: boolean;
	pattern: string;
} = { enabled: false, useRegex: false, pattern: "" };

export function isTaskFile(fileName: string, hasListTasks: boolean): boolean {
	if (TASK_FILE_PATTERN.test(fileName)) return true;
	if (hasListTasks) return true;
	return false;
}

export function isWhitelisted(filePath: string): boolean {
	if (!TASK_WHITELIST.enabled || !TASK_WHITELIST.pattern) return true;
	if (TASK_WHITELIST.useRegex) {
		try {
			return new RegExp(TASK_WHITELIST.pattern).test(filePath);
		} catch {
			return true;
		}
	}
	return filePath.includes(TASK_WHITELIST.pattern);
}

export function isBlacklisted(filePath: string): boolean {
	if (!TASK_BLACKLIST.enabled || !TASK_BLACKLIST.pattern) return false;
	if (TASK_BLACKLIST.useRegex) {
		try {
			return new RegExp(TASK_BLACKLIST.pattern).test(filePath);
		} catch {
			return false;
		}
	}
	return filePath.includes(TASK_BLACKLIST.pattern);
}

export function updateTaskFileConfig(config: {
	rootPath?: string;
	filePattern?: string;
	headingPattern?: string;
	whitelist?: { enabled?: boolean; useRegex?: boolean; pattern?: string };
	blacklist?: { enabled?: boolean; useRegex?: boolean; pattern?: string };
}) {
	if (config.rootPath !== undefined) TASK_ROOT_PATH = config.rootPath;
	if (config.filePattern !== undefined) {
		try {
			TASK_FILE_PATTERN = new RegExp(config.filePattern);
		} catch {
			/* 保持原值 */
		}
	}
	if (config.headingPattern !== undefined) {
		try {
			HEADING_TASK_PATTERN = new RegExp(config.headingPattern);
		} catch {
			/* 保持原值 */
		}
	}
	if (config.whitelist) {
		if (config.whitelist.enabled !== undefined)
			TASK_WHITELIST.enabled = config.whitelist.enabled;
		if (config.whitelist.useRegex !== undefined)
			TASK_WHITELIST.useRegex = config.whitelist.useRegex;
		if (config.whitelist.pattern !== undefined)
			TASK_WHITELIST.pattern = config.whitelist.pattern;
	}
	if (config.blacklist) {
		if (config.blacklist.enabled !== undefined)
			TASK_BLACKLIST.enabled = config.blacklist.enabled;
		if (config.blacklist.useRegex !== undefined)
			TASK_BLACKLIST.useRegex = config.blacklist.useRegex;
		if (config.blacklist.pattern !== undefined)
			TASK_BLACKLIST.pattern = config.blacklist.pattern;
	}
}

// ========== 筛选默认值 ==========

export function getDefaultFilter(): GlobalFilter {
	return {
		dateRange: { start: null, end: null, isAll: true },
		statuses: ALLOWED_STATUSES,
		includeMarks: [...ALL_MARKS],
		excludeMarks: [],
		hideRepeat: true,
		hideCompleted: true,
		hideCancelled: true,
		rootPath: null,
		hideFolders: true,
		priorityValues: [...PRIORITY_ORDER],
		repeatCycles: [...REPEAT_ORDER],
	};
}

export const DATE_FORMAT = "YYYY-MM-DD";
export function formatDisplayDate(d: any): string {
	if (!d) return "";
	if (typeof d === "string") return d.substring(0, 10);
	if (d instanceof Date) return d.toISOString().substring(0, 10);
	return String(d).substring(0, 10);
}
