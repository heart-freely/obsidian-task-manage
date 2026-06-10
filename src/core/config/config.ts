// src/core/config/config.ts
// core/config/config.ts

import { PathFilterConfig, TaskItemFilterConfig } from "../../setting/setting";

// ========== 任务元素统一定义（通用）==========

export const TASK_ELEMENT_ORDER = [
	"status",
	"priority",
	"repeat",
	"created",
	"scheduled",
	"starts",
	"cancelled",
	"done",
	"due",
	"id",
	"forbid",
	"tag",
] as const;

export const TASK_ELEMENTS = {
	status: {
		key: "status" as const,
		zhName: "执行状态",
		enName: "Status",
		icon: "",
		inMarkSequence: true,
		yaName: "任务状态",
		children: [
			{
				key: "todo" as const,
				zhName: "待办中",
				icon: "🔲",
				color: "#2e333b",
			},
			{
				key: "in-progress" as const,
				zhName: "进行中",
				icon: "⏩",
				color: "#7fb8f0",
			},
			{
				key: "completed" as const,
				zhName: "已完成",
				icon: "✅",
				color: "#47852f",
			},
			{
				key: "cancelled" as const,
				zhName: "已取消",
				icon: "❎",
				color: "#c3393e",
			},
			{
				key: "scheduled" as const,
				zhName: "计划中",
				icon: "❔",
				color: "#4b525b",
			},
		],
	},
	priority: {
		key: "priority" as const,
		zhName: "优先级",
		enName: "Priority",
		icon: "",
		inMarkSequence: true,
		yaName: "任务优先级",
		children: [
			{
				key: "4" as const,
				zhName: "最低",
				enName: "Lowest",
				icon: "⏬" as const,
				color: "#98c379",
			},
			{
				key: "3" as const,
				zhName: "低",
				enName: "Low",
				icon: "🔽" as const,
				color: "#61afef",
			},
			{
				key: "2" as const,
				zhName: "中",
				enName: "Medium",
				icon: "🔼" as const,
				color: "#d19a66",
			},
			{
				key: "1" as const,
				zhName: "高",
				enName: "High",
				icon: "⏫" as const,
				color: "#e06c75",
			},
			{
				key: "0" as const,
				zhName: "最高",
				enName: "Highest",
				icon: "🔺" as const,
				color: "#c3393e",
			},
		],
	},
	repeat: {
		key: "repeat" as const,
		zhName: "循环",
		enName: "Repeat",
		icon: "🔁",
		inMarkSequence: true,
		yaName: "任务周期",
		children: [
			{
				key: "every day" as const,
				zhName: "每天",
				enName: "Every Day",
				color: "#a0c4ff",
			},
			{
				key: "every week" as const,
				zhName: "每周",
				enName: "Every Week",
				color: "#9bf6ff",
			},
			{
				key: "every month" as const,
				zhName: "每月",
				enName: "Every Month",
				color: "#ffd6a5",
			},
			{
				key: "every year" as const,
				zhName: "每年",
				enName: "Every Year",
				color: "#fdffb6",
			},
		],
	},
	created: {
		key: "created" as const,
		zhName: "创建",
		enName: "Created",
		icon: "➕",
		inMarkSequence: true,
		yaName: "任务创建",
	},
	scheduled: {
		key: "scheduled" as const,
		zhName: "计划",
		enName: "Scheduled",
		icon: "⏳",
		inMarkSequence: true,
		yaName: "任务计划",
	},
	starts: {
		key: "starts" as const,
		zhName: "开始",
		enName: "Starts",
		icon: "🛫",
		inMarkSequence: true,
		yaName: "任务开始",
	},
	cancelled: {
		key: "cancelled" as const,
		zhName: "取消",
		enName: "Cancel",
		icon: "❌",
		inMarkSequence: true,
		yaName: "任务取消",
	},
	done: {
		key: "done" as const,
		zhName: "完成",
		enName: "Done",
		icon: "✅",
		inMarkSequence: true,
		yaName: "任务完成",
	},
	due: {
		key: "due" as const,
		zhName: "截止",
		enName: "Due",
		icon: "📅",
		inMarkSequence: true,
		yaName: "任务截止",
	},
	tag: {
		key: "tag" as const,
		zhName: "标签",
		enName: "Tag",
		icon: "🏁",
		inMarkSequence: true,
		yaName: "任务标签",
	},
	id: {
		key: "id" as const,
		zhName: "唯一ID",
		enName: "Unique ID",
		icon: "🆔",
		inMarkSequence: true,
		yaName: "任务唯一ID",
	},
	forbid: {
		key: "forbid" as const,
		zhName: "引用ID",
		enName: "Depends On",
		icon: "⛔",
		inMarkSequence: true,
		yaName: "任务引用ID",
	},
} as const;

// ========== 状态符号映射（与第一版一致）==========

export const STATUS_ALL_SYMBOLS: Record<string, string[]> = {
	todo: [" "],
	"in-progress": [">", "/", "\\"],
	completed: ["x", "X"],
	cancelled: ["-"],
	scheduled: ["?"],
};

export const SYMBOL_TO_STATUS: Record<string, string> = {};
for (const [statusKey, symbols] of Object.entries(STATUS_ALL_SYMBOLS)) {
	for (const s of symbols) {
		SYMBOL_TO_STATUS[s] = statusKey;
	}
}

// ========== 状态相关 ==========

export const ALLOWED_STATUSES = TASK_ELEMENTS.status.children.map((c) => c.key);
export const STATUS_NAMES: Record<string, string> = {};
TASK_ELEMENTS.status.children.forEach((c) => {
	STATUS_NAMES[c.key] = c.zhName;
});
export const STATUS_ICONS: Record<string, string> = {};
TASK_ELEMENTS.status.children.forEach((c) => {
	STATUS_ICONS[c.key] = c.icon;
});
export const STATUS_SORT_ORDER = TASK_ELEMENTS.status.children.map(
	(c) => c.key,
);
export const STATUS_SYMBOL_MAP: Record<string, string> = {};
for (const [statusKey, symbols] of Object.entries(STATUS_ALL_SYMBOLS)) {
	for (const s of symbols) {
		STATUS_SYMBOL_MAP[s] = statusKey;
	}
}
export const STATUS_COLORS: Record<string, string> = {};
TASK_ELEMENTS.status.children.forEach((c) => {
	STATUS_COLORS[c.key] = c.color!;
});

// ========== 优先级相关 ==========

export const PRIORITY_ORDER = TASK_ELEMENTS.priority.children.map(
	(c) => c.icon,
);
export const PRIORITY_COLORS = TASK_ELEMENTS.priority.children.map(
	(c) => c.color!,
);
export const PRIORITY_ICONS: Record<string, string> = {};
TASK_ELEMENTS.priority.children.forEach((c) => {
	PRIORITY_ICONS[c.key] = c.icon;
});
export const PRIORITY_LABELS: Record<string, string> = {};
TASK_ELEMENTS.priority.children.forEach((c) => {
	PRIORITY_LABELS[c.key] = `${c.enName}|${c.zhName}`;
});
PRIORITY_LABELS["none"] = "None|无";

// ========== 循环相关 ==========

export const REPEAT_ORDER = TASK_ELEMENTS.repeat.children.map((c) => c.key);
export const REPEAT_COLORS = TASK_ELEMENTS.repeat.children.map((c) => c.color!);
export const REPEAT_ICON = TASK_ELEMENTS.repeat.icon;
export const REPEAT_LABELS: Record<string, string> = {};
TASK_ELEMENTS.repeat.children.forEach((c) => {
	REPEAT_LABELS[c.key] = c.zhName;
});

// ========== 日期标记相关 ==========

export const DATE_MARK_ORDER = [
	"created",
	"scheduled",
	"starts",
	"cancelled",
	"done",
	"due",
] as const;
export const DATE_MARK_ICONS: Record<string, string> = {};
DATE_MARK_ORDER.forEach((k) => {
	DATE_MARK_ICONS[k] = (TASK_ELEMENTS as any)[k].icon;
});
export const DATE_MARK_NAMES: Record<string, string> = {};
DATE_MARK_ORDER.forEach((k) => {
	DATE_MARK_NAMES[k] =
		(TASK_ELEMENTS as any)[k].icon + " " + (TASK_ELEMENTS as any)[k].zhName;
});
export const DATE_MARK_COLORS: Record<string, string> = {
	created: "#b7bdf8",
	scheduled: "#ed8796",
	starts: "#f5a97f",
	cancelled: "#eed49f",
	done: "#a6da95",
	due: "#8bd5ca",
};
export const DATE_FIELD_SORT_ORDER = [...DATE_MARK_ORDER];

// ========== 图标常量 ==========

export const ID_ICON = TASK_ELEMENTS.id.icon;
export const DEPENDS_ICON = TASK_ELEMENTS.forbid.icon;
export const TAG_ICON = TASK_ELEMENTS.tag.icon;

// ========== 标记相关 ==========

export const TASK_MARK_SEQUENCE = TASK_ELEMENT_ORDER.filter(
	(k) => (TASK_ELEMENTS as any)[k].inMarkSequence,
);
export const MARK_NAMES: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	if ((TASK_ELEMENTS as any)[k].inMarkSequence)
		MARK_NAMES[k] = (TASK_ELEMENTS as any)[k].zhName;
});
export const ALL_MARKS = Object.keys(MARK_NAMES);

// ========== 表格列 ==========

export const TABLE_COLUMNS = TASK_ELEMENT_ORDER.map((k) => ({
	key: k,
	label: k === "status" ? "状态" : (TASK_ELEMENTS as any)[k].zhName,
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
	cancelled: true,
	done: false,
	due: true,
	tag: false,
	id: false,
	forbid: false,
};

// ========== YAML 映射 ==========

export const YAML_NAME_TO_KEY: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = (TASK_ELEMENTS as any)[k];
	if (el.yaName) YAML_NAME_TO_KEY[el.yaName] = k;
});
export const YAML_NAME_TO_ICON: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = (TASK_ELEMENTS as any)[k];
	if (el.yaName && el.icon) YAML_NAME_TO_ICON[el.yaName] = el.icon;
});
export const YAML_NAME_TO_ZHNAME: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = (TASK_ELEMENTS as any)[k];
	if (el.yaName) YAML_NAME_TO_ZHNAME[el.yaName] = el.zhName;
});
export const YAML_DATE_FIELDS: string[] = TASK_ELEMENT_ORDER.filter((k) => {
	const el = (TASK_ELEMENTS as any)[k];
	return (
		el.yaName &&
		["created", "scheduled", "starts", "due", "done", "cancelled"].includes(
			k,
		)
	);
}).map((k) => (TASK_ELEMENTS as any)[k].yaName!);
export const YAML_DISPLAY_ORDER: string[] = TASK_ELEMENT_ORDER.filter(
	(k) => (TASK_ELEMENTS as any)[k].yaName,
).map((k) => (TASK_ELEMENTS as any)[k].yaName!);

// ========== 优先级标签函数 ==========

export function getPriorityLabel(icon: string): string {
	const idx = PRIORITY_ORDER.indexOf(icon);
	if (idx >= 0) return TASK_ELEMENTS.priority.children[idx].zhName;
	return "无";
}

// ========== 任务文件识别配置 ==========

export const DEFAULT_TASK_ROOT_PATH = "";
export const DEFAULT_TASK_FILE_PATTERN = "";
export const DEFAULT_HEADING_TASK_PATTERN = "";

export let TASK_ROOT_PATHS: string[] = [];
export let HEADING_TASK_PATTERN: RegExp = new RegExp("");
export let TASK_FOLDER_FILTERS: PathFilterConfig[] = [];
export let TASK_FILE_FILTERS: PathFilterConfig[] = [];
export let TASK_HEADING_FILTERS: PathFilterConfig[] = [];
export let TASK_ITEM_FILTERS: TaskItemFilterConfig[] = [];

function matchFilter(value: string, filter: PathFilterConfig): boolean {
	if (!filter.pattern) return true;
	let pattern = filter.pattern;
	if (filter.wholeWord) pattern = `\\b${pattern}\\b`;
	const flags = filter.caseSensitive ? "" : "i";
	let regex: RegExp;
	if (filter.useRegex) {
		try {
			regex = new RegExp(pattern, flags);
		} catch {
			return false;
		}
	} else {
		regex = new RegExp(
			pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
			flags,
		);
	}
	const result = regex.test(value);
	return filter.exclude ? !result : result;
}

export function matchTaskFilePath(filePath: string): boolean {
	if (
		TASK_ROOT_PATHS.length > 0 &&
		!TASK_ROOT_PATHS.some((p) => filePath.startsWith(p))
	)
		return false;
	if (TASK_FOLDER_FILTERS.length === 0) return true;
	const folders = filePath.split("/").slice(0, -1);
	const includeFilters = TASK_FOLDER_FILTERS.filter((f) => !f.exclude);
	const excludeFilters = TASK_FOLDER_FILTERS.filter((f) => f.exclude);
	if (
		excludeFilters.some((f) =>
			folders.some((folder) => matchFilter(folder, f)),
		)
	)
		return false;
	if (includeFilters.length === 0) return true;
	return includeFilters.some((f) =>
		folders.some((folder) => matchFilter(folder, f)),
	);
}

export function matchTaskFileName(fileName: string): boolean {
	if (TASK_FILE_FILTERS.length === 0) return false;
	const includeFilters = TASK_FILE_FILTERS.filter((f) => !f.exclude);
	const excludeFilters = TASK_FILE_FILTERS.filter((f) => f.exclude);
	if (excludeFilters.some((f) => matchFilter(fileName, f))) return false;
	if (includeFilters.length === 0) return true;
	return includeFilters.some((f) => matchFilter(fileName, f));
}

export function matchTaskHeading(heading: string): boolean {
	if (TASK_HEADING_FILTERS.length === 0) return false;
	const includeFilters = TASK_HEADING_FILTERS.filter((f) => !f.exclude);
	const excludeFilters = TASK_HEADING_FILTERS.filter((f) => f.exclude);
	if (excludeFilters.some((f) => matchFilter(heading, f))) return false;
	if (includeFilters.length === 0) return true;
	return includeFilters.some((f) => matchFilter(heading, f));
}

export function matchTaskItem(symbol: string): boolean {
	if (TASK_ITEM_FILTERS.length === 0) return true;
	const includeFilters = TASK_ITEM_FILTERS.filter((f) => !f.exclude);
	const excludeFilters = TASK_ITEM_FILTERS.filter((f) => f.exclude);
	if (excludeFilters.some((f) => f.pattern && f.pattern.includes(symbol)))
		return false;
	if (includeFilters.length === 0) return true;
	return includeFilters.some((f) => !f.pattern || f.pattern.includes(symbol));
}

export function isTaskFile(fileName: string, parsed: ParsedFileData): boolean {
	if (matchTaskFileName(fileName)) return true;
	if (parsed.contentRoots.length > 0) return true;
	if (parsed.fileTask) return true;
	return false;
}

export function isWhitelisted(filePath: string): boolean {
	return matchTaskFilePath(filePath);
}

export function isBlacklisted(filePath: string): boolean {
	return false;
}

export function updateTaskFileConfig(config: {
	rootPath?: string;
	folderFilters?: PathFilterConfig[];
	fileFilters?: PathFilterConfig[];
	headingFilters?: PathFilterConfig[];
	taskItemFilters?: TaskItemFilterConfig[];
}) {
	if (config.rootPath !== undefined && config.rootPath.trim()) {
		TASK_ROOT_PATHS = config.rootPath
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);
	}
	if (
		config.folderFilters !== undefined &&
		config.folderFilters.some((f) => f.pattern)
	) {
		TASK_FOLDER_FILTERS = config.folderFilters.filter((f) => f.pattern);
	}
	if (
		config.fileFilters !== undefined &&
		config.fileFilters.some((f) => f.pattern)
	) {
		TASK_FILE_FILTERS = config.fileFilters.filter((f) => f.pattern);
	}
	if (
		config.headingFilters !== undefined &&
		config.headingFilters.some((f) => f.pattern)
	) {
		TASK_HEADING_FILTERS = config.headingFilters.filter((f) => f.pattern);
		const first = config.headingFilters.find(
			(f) => f.pattern && !f.exclude,
		);
		if (first) {
			try {
				HEADING_TASK_PATTERN = new RegExp(first.pattern);
			} catch {}
		}
	}
	if (
		config.taskItemFilters !== undefined &&
		config.taskItemFilters.some((f) => f.pattern)
	) {
		TASK_ITEM_FILTERS = config.taskItemFilters.filter((f) => f.pattern);
	}
}

// ========== 日期格式化 ==========

export const DATE_FORMAT = "YYYY-MM-DD";
export function formatDisplayDate(d: any): string {
	if (!d) return "";
	if (typeof d === "string") return d.substring(0, 10);
	if (d instanceof Date) return d.toISOString().substring(0, 10);
	return String(d).substring(0, 10);
}

// ========== 派生类型 ==========

export type TaskStatus = (typeof TASK_ELEMENTS.status.children)[number]["key"];
export type PriorityIcon =
	| (typeof TASK_ELEMENTS.priority.children)[number]["icon"]
	| "";
export type RepeatCycle = (typeof TASK_ELEMENTS.repeat.children)[number]["key"];
export type DateMarkKey = (typeof DATE_MARK_ORDER)[number];
export type MarkKey = (typeof ALL_MARKS)[number];
