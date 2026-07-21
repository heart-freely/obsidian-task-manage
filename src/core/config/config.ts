// src/core/config/config.ts

import { PathFilterConfig, TaskItemFilterConfig } from "../../setting/setting";
import {
	getThemeColorArray,
	getThemeColorMap,
	makeColor,
	ThemeColor,
} from "../../util/color-utils";

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

// ========== 颜色定义（深浅双值）==========

const C = {
	// 执行状态
	statusNone: {
		dark: "rgba(128,128,128,0.5)",
		light: "rgba(128,128,128,0.5)",
	},
	statusTodo: { dark: "rgba(85, 90, 100, 0.75)", light: "#6b7280" },
	statusScheduled: { dark: "rgba(105, 125, 170, 0.75)", light: "#6b7ea8" },
	statusInProgress: { dark: "rgba(80, 140, 210, 0.80)", light: "#3b82c4" },
	statusCancelled: { dark: "rgba(175, 62, 68, 0.70)", light: "#d14343" },
	statusCompleted: { dark: "rgba(80, 150, 120, 0.75)", light: "#4a8c6a" },
	// 优先级
	prioHighest: { dark: "rgba(200, 65, 65, 0.80)", light: "#c93030" },
	prioHigh: { dark: "rgba(210, 110, 90, 0.80)", light: "#d47040" },
	prioMedium: { dark: "rgba(200, 155, 85, 0.80)", light: "#c89038" },
	prioLow: { dark: "rgba(80, 150, 215, 0.80)", light: "#4a8ec7" },
	prioLowest: { dark: "rgba(110, 160, 100, 0.80)", light: "#5a946e" },
	// 循环
	repeatDay: { dark: "rgba(80, 130, 200, 0.75)", light: "#4a7ec4" },
	repeatWeek: { dark: "rgba(85, 170, 195, 0.75)", light: "#3d9ba8" },
	repeatMonth: { dark: "rgba(170, 135, 90, 0.70)", light: "#b8783a" },
	repeatYear: { dark: "rgba(155, 160, 100, 0.70)", light: "#9e9a40" },
	// 日期标记
	created: { dark: "rgba(140, 160, 210, 0.70)", light: "#8a9cc8" },
	scheduled: { dark: "rgba(120, 175, 200, 0.72)", light: "#6aa0b8" },
	starts: { dark: "rgba(100, 185, 185, 0.72)", light: "#5aa8a0" },
	cancelled: { dark: "rgba(195, 110, 110, 0.72)", light: "#c46a6a" },
	done: { dark: "rgba(120, 170, 115, 0.75)", light: "#5a946e" },
	due: { dark: "rgba(185, 85, 85, 0.75)", light: "#c94a4a" },
	// 其他
	tag: { dark: "rgba(165, 140, 210, 0.75)", light: "#8a76b8" },
	id: { dark: "rgba(115, 150, 215, 0.75)", light: "#5a82c4" },
	forbid: { dark: "rgba(200, 115, 115, 0.75)", light: "#c46a6a" },
	both: { dark: "rgba(150, 125, 180, 0.70)", light: "#8a72a8" },
};

// ========== 子元素类型（有 children 的元素中的子项）==========

interface StatusChildDef {
	key: string;
	zhName: string;
	icon: string;
	darkColor: string;
	lightColor: string;
}

interface PriorityChildDef {
	key: string;
	zhName: string;
	enName: string;
	icon: string;
	darkColor: string;
	lightColor: string;
}

interface RepeatChildDef {
	key: string;
	zhName: string;
	enName: string;
	darkColor: string;
	lightColor: string;
}

// ========== TASK_ELEMENTS 定义（移除 as const，使用显式类型）==========

interface StatusElementDef {
	key: "status";
	zhName: string;
	enName: string;
	icon: string;
	inMarkSequence: boolean;
	yaName: string;
	darkColor: string;
	lightColor: string;
	children: StatusChildDef[];
}

interface PriorityElementDef {
	key: "priority";
	zhName: string;
	enName: string;
	icon: string;
	inMarkSequence: boolean;
	yaName: string;
	darkColor: string;
	lightColor: string;
	children: PriorityChildDef[];
}

interface RepeatElementDef {
	key: "repeat";
	zhName: string;
	enName: string;
	icon: string;
	inMarkSequence: boolean;
	yaName: string;
	darkColor: string;
	lightColor: string;
	children: RepeatChildDef[];
}

interface LeafElementDef {
	key: string;
	zhName: string;
	enName: string;
	icon: string;
	inMarkSequence: boolean;
	yaName: string;
	darkColor: string;
	lightColor: string;
}

type TaskElementDef =
	| StatusElementDef
	| PriorityElementDef
	| RepeatElementDef
	| LeafElementDef;

export const TASK_ELEMENTS: Record<string, TaskElementDef> = {
	status: {
		key: "status",
		zhName: "执行状态",
		enName: "Status",
		icon: "",
		inMarkSequence: true,
		yaName: "任务状态",
		darkColor: "",
		lightColor: "",
		children: [
			{
				key: "none",
				zhName: "无状态",
				icon: "",
				darkColor: C.statusNone.dark,
				lightColor: C.statusNone.light,
			},
			{
				key: "todo",
				zhName: "待办中",
				icon: "🔲",
				darkColor: C.statusTodo.dark,
				lightColor: C.statusTodo.light,
			},
			{
				key: "scheduled",
				zhName: "计划中",
				icon: "❔",
				darkColor: C.statusScheduled.dark,
				lightColor: C.statusScheduled.light,
			},
			{
				key: "in-progress",
				zhName: "进行中",
				icon: "⏩",
				darkColor: C.statusInProgress.dark,
				lightColor: C.statusInProgress.light,
			},
			{
				key: "cancelled",
				zhName: "已取消",
				icon: "❎",
				darkColor: C.statusCancelled.dark,
				lightColor: C.statusCancelled.light,
			},
			{
				key: "completed",
				zhName: "已完成",
				icon: "✅",
				darkColor: C.statusCompleted.dark,
				lightColor: C.statusCompleted.light,
			},
		],
	} as StatusElementDef,
	priority: {
		key: "priority",
		zhName: "优先级",
		enName: "Priority",
		icon: "",
		inMarkSequence: true,
		yaName: "任务优先级",
		darkColor: "",
		lightColor: "",
		children: [
			{
				key: "0",
				zhName: "最高",
				enName: "Highest",
				icon: "🔺",
				darkColor: C.prioHighest.dark,
				lightColor: C.prioHighest.light,
			},
			{
				key: "1",
				zhName: "高",
				enName: "High",
				icon: "⏫",
				darkColor: C.prioHigh.dark,
				lightColor: C.prioHigh.light,
			},
			{
				key: "2",
				zhName: "中",
				enName: "Medium",
				icon: "🔼",
				darkColor: C.prioMedium.dark,
				lightColor: C.prioMedium.light,
			},
			{
				key: "3",
				zhName: "低",
				enName: "Low",
				icon: "🔽",
				darkColor: C.prioLow.dark,
				lightColor: C.prioLow.light,
			},
			{
				key: "4",
				zhName: "最低",
				enName: "Lowest",
				icon: "⏬",
				darkColor: C.prioLowest.dark,
				lightColor: C.prioLowest.light,
			},
		],
	} as PriorityElementDef,
	repeat: {
		key: "repeat",
		zhName: "循环",
		enName: "Repeat",
		icon: "🔁",
		inMarkSequence: true,
		yaName: "任务周期",
		darkColor: "",
		lightColor: "",
		children: [
			{
				key: "every day",
				zhName: "每天",
				enName: "Every Day",
				darkColor: C.repeatDay.dark,
				lightColor: C.repeatDay.light,
			},
			{
				key: "every week",
				zhName: "每周",
				enName: "Every Week",
				darkColor: C.repeatWeek.dark,
				lightColor: C.repeatWeek.light,
			},
			{
				key: "every month",
				zhName: "每月",
				enName: "Every Month",
				darkColor: C.repeatMonth.dark,
				lightColor: C.repeatMonth.light,
			},
			{
				key: "every year",
				zhName: "每年",
				enName: "Every Year",
				darkColor: C.repeatYear.dark,
				lightColor: C.repeatYear.light,
			},
		],
	} as RepeatElementDef,
	created: {
		key: "created",
		zhName: "创建",
		enName: "Created",
		icon: "➕",
		inMarkSequence: true,
		yaName: "任务创建",
		darkColor: C.created.dark,
		lightColor: C.created.light,
	} as LeafElementDef,
	scheduled: {
		key: "scheduled",
		zhName: "计划",
		enName: "Scheduled",
		icon: "⏳",
		inMarkSequence: true,
		yaName: "任务计划",
		darkColor: C.scheduled.dark,
		lightColor: C.scheduled.light,
	} as LeafElementDef,
	starts: {
		key: "starts",
		zhName: "开始",
		enName: "Starts",
		icon: "🛫",
		inMarkSequence: true,
		yaName: "任务开始",
		darkColor: C.starts.dark,
		lightColor: C.starts.light,
	} as LeafElementDef,
	cancelled: {
		key: "cancelled",
		zhName: "取消",
		enName: "Cancel",
		icon: "❌",
		inMarkSequence: true,
		yaName: "任务取消",
		darkColor: C.cancelled.dark,
		lightColor: C.cancelled.light,
	} as LeafElementDef,
	done: {
		key: "done",
		zhName: "完成",
		enName: "Done",
		icon: "✅",
		inMarkSequence: true,
		yaName: "任务完成",
		darkColor: C.done.dark,
		lightColor: C.done.light,
	} as LeafElementDef,
	due: {
		key: "due",
		zhName: "截止",
		enName: "Due",
		icon: "📅",
		inMarkSequence: true,
		yaName: "任务截止",
		darkColor: C.due.dark,
		lightColor: C.due.light,
	} as LeafElementDef,
	tag: {
		key: "tag",
		zhName: "标签",
		enName: "Tag",
		icon: "🏁",
		inMarkSequence: true,
		yaName: "任务标签",
		darkColor: C.tag.dark,
		lightColor: C.tag.light,
	} as LeafElementDef,
	id: {
		key: "id",
		zhName: "唯一ID",
		enName: "Unique ID",
		icon: "🆔",
		inMarkSequence: true,
		yaName: "任务唯一ID",
		darkColor: C.id.dark,
		lightColor: C.id.light,
	} as LeafElementDef,
	forbid: {
		key: "forbid",
		zhName: "引用ID",
		enName: "Depends On",
		icon: "⛔",
		inMarkSequence: true,
		yaName: "任务引用ID",
		darkColor: C.forbid.dark,
		lightColor: C.forbid.light,
	} as LeafElementDef,
};

// ========== 类型安全的状态子元素访问 ==========

const statusChildren: StatusChildDef[] = (
	TASK_ELEMENTS.status as StatusElementDef
).children;
const priorityChildren: PriorityChildDef[] = (
	TASK_ELEMENTS.priority as PriorityElementDef
).children;
const repeatChildren: RepeatChildDef[] = (
	TASK_ELEMENTS.repeat as RepeatElementDef
).children;

// ========== 颜色定义 ==========

const STATUS_COLOR_DEFS: Record<string, ThemeColor> = {};
statusChildren.forEach((c) => {
	STATUS_COLOR_DEFS[c.key] = makeColor(c.darkColor, c.lightColor);
});

const PRIORITY_COLOR_DEFS: ThemeColor[] = priorityChildren.map((c) =>
	makeColor(c.darkColor, c.lightColor),
);

const REPEAT_COLOR_DEFS: ThemeColor[] = repeatChildren.map((c) =>
	makeColor(c.darkColor, c.lightColor),
);

const DATE_MARK_ORDER_INTERNAL = [
	"created",
	"scheduled",
	"starts",
	"cancelled",
	"done",
	"due",
] as const;

const DATE_MARK_COLOR_DEFS: Record<string, ThemeColor> = {};
DATE_MARK_ORDER_INTERNAL.forEach((k) => {
	const el = TASK_ELEMENTS[k] as LeafElementDef;
	DATE_MARK_COLOR_DEFS[k] = makeColor(el.darkColor, el.lightColor);
});

const TAG_PALETTE_DEFS: ThemeColor[] = [
	makeColor("rgba(165, 140, 210, 0.75)", "#8a76b8"),
	makeColor("rgba(200, 115, 115, 0.75)", "#c46a6a"),
	makeColor("rgba(115, 150, 215, 0.75)", "#5a82c4"),
	makeColor("rgba(100, 160, 125, 0.75)", "#5a946e"),
	makeColor("rgba(185, 155, 100, 0.70)", "#a88450"),
	makeColor("rgba(200, 130, 80, 0.75)", "#c47a40"),
	makeColor("rgba(210, 120, 130, 0.75)", "#c46a7a"),
	makeColor("rgba(145, 155, 220, 0.75)", "#7a82c4"),
	makeColor("rgba(100, 185, 170, 0.75)", "#4a9e92"),
	makeColor("rgba(180, 175, 85, 0.70)", "#a8a040"),
];

// ========== 状态符号映射 ==========

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

export const ALLOWED_STATUSES = statusChildren.map((c) => c.key);
export const STATUS_NAMES: Record<string, string> = {};
statusChildren.forEach((c) => {
	STATUS_NAMES[c.key] = c.zhName;
});
export const STATUS_ICONS: Record<string, string> = {};
statusChildren.forEach((c) => {
	STATUS_ICONS[c.key] = c.icon;
});
export const STATUS_SORT_ORDER: string[] = [
	"none",
	"todo",
	"scheduled",
	"in-progress",
	"cancelled",
	"completed",
];
export const STATUS_SYMBOL_MAP: Record<string, string> = {};
for (const [statusKey, symbols] of Object.entries(STATUS_ALL_SYMBOLS)) {
	for (const s of symbols) {
		STATUS_SYMBOL_MAP[s] = statusKey;
	}
}

export function getStatusColors(): Record<string, string> {
	return getThemeColorMap(STATUS_COLOR_DEFS);
}

// ========== 优先级相关 ==========

export const PRIORITY_ORDER = priorityChildren.map((c) => c.icon);
export const PRIORITY_ICONS: Record<string, string> = {};
priorityChildren.forEach((c) => {
	PRIORITY_ICONS[c.key] = c.icon;
});
export const PRIORITY_LABELS: Record<string, string> = {};
priorityChildren.forEach((c) => {
	PRIORITY_LABELS[c.key] = `${c.enName}|${c.zhName}`;
});
PRIORITY_LABELS["none"] = "None|无";

export function getPriorityColors(): string[] {
	return getThemeColorArray(PRIORITY_COLOR_DEFS);
}

// ========== 循环相关 ==========

export const REPEAT_ORDER = repeatChildren.map((c) => c.key);
export const REPEAT_ICON = (TASK_ELEMENTS.repeat as RepeatElementDef).icon;
export const REPEAT_LABELS: Record<string, string> = {};
repeatChildren.forEach((c) => {
	REPEAT_LABELS[c.key] = c.zhName;
});

export function getRepeatColors(): string[] {
	return getThemeColorArray(REPEAT_COLOR_DEFS);
}

// ========== 日期标记相关 ==========

export const DATE_MARK_ORDER = DATE_MARK_ORDER_INTERNAL as unknown as string[];
export const DATE_MARK_ICONS: Record<string, string> = {};
DATE_MARK_ORDER_INTERNAL.forEach((k) => {
	DATE_MARK_ICONS[k] = (TASK_ELEMENTS[k] as LeafElementDef).icon;
});
export const DATE_MARK_NAMES: Record<string, string> = {};
DATE_MARK_ORDER_INTERNAL.forEach((k) => {
	const el = TASK_ELEMENTS[k] as LeafElementDef;
	DATE_MARK_NAMES[k] = el.icon + " " + el.zhName;
});
export const DATE_FIELD_SORT_ORDER = [...DATE_MARK_ORDER_INTERNAL];

export function getDateMarkColors(): Record<string, string> {
	return getThemeColorMap(DATE_MARK_COLOR_DEFS);
}

// ========== 图标与颜色常量 ==========

export const ID_ICON = (TASK_ELEMENTS.id as LeafElementDef).icon;
export const DEPENDS_ICON = (TASK_ELEMENTS.forbid as LeafElementDef).icon;
export const TAG_ICON = (TASK_ELEMENTS.tag as LeafElementDef).icon;

export const ID_COLOR_DEF: ThemeColor = makeColor(C.id.dark, C.id.light);
export const DEPENDS_COLOR_DEF: ThemeColor = makeColor(
	C.forbid.dark,
	C.forbid.light,
);
export const TAG_COLOR_DEF: ThemeColor = makeColor(C.tag.dark, C.tag.light);
export const BOTH_COLOR_DEF: ThemeColor = makeColor(C.both.dark, C.both.light);

export function getTagPalette(): string[] {
	return getThemeColorArray(TAG_PALETTE_DEFS);
}

// ========== 标记相关 ==========

export const TASK_MARK_SEQUENCE = TASK_ELEMENT_ORDER.filter((k) => {
	const el = TASK_ELEMENTS[k];
	return el.inMarkSequence;
});
export const MARK_NAMES: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = TASK_ELEMENTS[k];
	if (el.inMarkSequence) MARK_NAMES[k] = el.zhName;
});
export const ALL_MARKS = Object.keys(MARK_NAMES);

// ========== 表格列 ==========

export const TABLE_COLUMNS = TASK_ELEMENT_ORDER.map((k) => {
	const el = TASK_ELEMENTS[k];
	return {
		key: k,
		label: k === "status" ? "状态" : el.zhName,
	};
});
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
		!!el.yaName &&
		["created", "scheduled", "starts", "due", "done", "cancelled"].includes(
			k,
		)
	);
}).map((k) => TASK_ELEMENTS[k].yaName!);
export const YAML_DISPLAY_ORDER: string[] = TASK_ELEMENT_ORDER.filter(
	(k) => !!TASK_ELEMENTS[k].yaName,
).map((k) => TASK_ELEMENTS[k].yaName!);

// ========== 优先级标签函数 ==========

export function getPriorityLabel(icon: string): string {
	const idx = PRIORITY_ORDER.indexOf(icon);
	if (idx >= 0) return priorityChildren[idx].zhName;
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

interface ParsedFileDataForConfig {
	contentRoots: unknown[];
	fileTask: unknown;
}
export function isTaskFile(
	fileName: string,
	parsed: ParsedFileDataForConfig,
): boolean {
	if (matchTaskFileName(fileName)) return true;
	if (parsed.contentRoots.length > 0) return true;
	if (parsed.fileTask) return true;
	return false;
}
export function isWhitelisted(filePath: string): boolean {
	return matchTaskFilePath(filePath);
}
export function isBlacklisted(_filePath: string): boolean {
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
			} catch {
				// 正则无效时忽略
			}
		}
	}
	if (
		config.taskItemFilters !== undefined &&
		config.taskItemFilters.some((f) => f.pattern)
	) {
		TASK_ITEM_FILTERS = config.taskItemFilters.filter((f) => f.pattern);
	}
}

// ========== 派生类型 ==========

export type TaskStatus = (typeof statusChildren)[number]["key"];
export type PriorityIcon = (typeof priorityChildren)[number]["icon"] | "";
export type RepeatCycle = (typeof repeatChildren)[number]["key"];
export type DateMarkKey = (typeof DATE_MARK_ORDER_INTERNAL)[number];
export type MarkKey = (typeof ALL_MARKS)[number];
