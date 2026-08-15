// src/core/config/config.ts

import {
	getThemeColor,
	getThemeColorArray,
	getThemeColorMap,
	makeColor,
	ThemeColor,
} from "../../util/color-utils";

export interface PathFilterConfig {
	pattern: string;
	caseSensitive: boolean;
	wholeWord: boolean;
	useRegex: boolean;
	exclude: boolean;
}

export interface TaskItemFilterConfig {
	pattern: string;
	exclude: boolean;
}

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

const C = {
	statusNone: {
		dark: "rgba(128,128,128,0.5)",
		light: "rgba(128,128,128,0.5)",
	},
	statusTodo: { dark: "rgba(85, 90, 100, 0.75)", light: "#6b7280" },
	statusScheduled: { dark: "rgba(105, 125, 170, 0.75)", light: "#6b7ea8" },
	statusInProgress: { dark: "rgba(80, 140, 210, 0.80)", light: "#3b82c4" },
	statusCancelled: { dark: "rgba(175, 62, 68, 0.70)", light: "#d14343" },
	statusCompleted: { dark: "rgba(80, 150, 120, 0.75)", light: "#4a8c6a" },
	prioHighest: { dark: "rgba(200, 65, 65, 0.80)", light: "#c93030" },
	prioHigh: { dark: "rgba(210, 110, 90, 0.80)", light: "#d47040" },
	prioMedium: { dark: "rgba(200, 155, 85, 0.80)", light: "#c89038" },
	prioLow: { dark: "rgba(80, 150, 215, 0.80)", light: "#4a8ec7" },
	prioLowest: { dark: "rgba(110, 160, 100, 0.80)", light: "#5a946e" },
	missing: { dark: "rgba(128,128,128,0.5)", light: "rgba(128,128,128,0.5)" },
	repeatDay: { dark: "rgba(80, 130, 200, 0.75)", light: "#4a7ec4" },
	repeatWeek: { dark: "rgba(85, 170, 195, 0.75)", light: "#3d9ba8" },
	repeatMonth: { dark: "rgba(170, 135, 90, 0.70)", light: "#b8783a" },
	repeatYear: { dark: "rgba(155, 160, 100, 0.70)", light: "#9e9a40" },
	created: { dark: "rgba(140, 160, 210, 0.70)", light: "#8a9cc8" },
	scheduled: { dark: "rgba(120, 175, 200, 0.72)", light: "#6aa0b8" },
	starts: { dark: "rgba(100, 185, 185, 0.72)", light: "#5aa8a0" },
	cancelled: { dark: "rgba(195, 110, 110, 0.72)", light: "#c46a6a" },
	done: { dark: "rgba(120, 170, 115, 0.75)", light: "#5a946e" },
	due: { dark: "rgba(185, 85, 85, 0.75)", light: "#c94a4a" },
	tag: { dark: "rgba(165, 140, 210, 0.75)", light: "#8a76b8" },
	id: { dark: "rgba(115, 150, 215, 0.75)", light: "#5a82c4" },
	forbid: { dark: "rgba(200, 115, 115, 0.75)", light: "#c46a6a" },
	both: { dark: "rgba(150, 125, 180, 0.70)", light: "#8a72a8" },
};

interface BaseChildDef {
	key: string;
	zhName: string;
	darkColor: string;
	lightColor: string;
	icon?: string;
	enName?: string;
}
interface TaskElementBase {
	key: string;
	zhName: string;
	enName: string;
	icon: string;
	inMarkSequence: boolean;
	yaName: string;
	darkColor: string;
	lightColor: string;
	children?: BaseChildDef[];
}

export const TASK_ELEMENTS: Record<string, TaskElementBase> = {
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
	},
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
	},
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
	},
	created: {
		key: "created",
		zhName: "创建",
		enName: "Created",
		icon: "➕",
		inMarkSequence: true,
		yaName: "任务创建",
		darkColor: C.created.dark,
		lightColor: C.created.light,
	},
	scheduled: {
		key: "scheduled",
		zhName: "计划",
		enName: "Scheduled",
		icon: "⏳",
		inMarkSequence: true,
		yaName: "任务计划",
		darkColor: C.scheduled.dark,
		lightColor: C.scheduled.light,
	},
	starts: {
		key: "starts",
		zhName: "开始",
		enName: "Starts",
		icon: "🛫",
		inMarkSequence: true,
		yaName: "任务开始",
		darkColor: C.starts.dark,
		lightColor: C.starts.light,
	},
	cancelled: {
		key: "cancelled",
		zhName: "取消",
		enName: "Cancel",
		icon: "❌",
		inMarkSequence: true,
		yaName: "任务取消",
		darkColor: C.cancelled.dark,
		lightColor: C.cancelled.light,
	},
	done: {
		key: "done",
		zhName: "完成",
		enName: "Done",
		icon: "✅",
		inMarkSequence: true,
		yaName: "任务完成",
		darkColor: C.done.dark,
		lightColor: C.done.light,
	},
	due: {
		key: "due",
		zhName: "截止",
		enName: "Due",
		icon: "📅",
		inMarkSequence: true,
		yaName: "任务截止",
		darkColor: C.due.dark,
		lightColor: C.due.light,
	},
	tag: {
		key: "tag",
		zhName: "标签",
		enName: "Tag",
		icon: "🏁",
		inMarkSequence: true,
		yaName: "任务标签",
		darkColor: C.tag.dark,
		lightColor: C.tag.light,
	},
	id: {
		key: "id",
		zhName: "唯一ID",
		enName: "Unique ID",
		icon: "🆔",
		inMarkSequence: true,
		yaName: "任务唯一ID",
		darkColor: C.id.dark,
		lightColor: C.id.light,
	},
	forbid: {
		key: "forbid",
		zhName: "引用ID",
		enName: "Depends On",
		icon: "⛔",
		inMarkSequence: true,
		yaName: "任务引用ID",
		darkColor: C.forbid.dark,
		lightColor: C.forbid.light,
	},
};

const statusChildren = TASK_ELEMENTS.status.children ?? [];
const priorityChildren = TASK_ELEMENTS.priority.children ?? [];
const repeatChildren = TASK_ELEMENTS.repeat.children ?? [];

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
	const el = TASK_ELEMENTS[k];
	if (el.darkColor && el.lightColor)
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

export const STATUS_ALL_SYMBOLS: Record<string, string[]> = {
	todo: [" "],
	"in-progress": [">", "/", "\\"],
	completed: ["x", "X"],
	cancelled: ["-"],
	scheduled: ["?"],
};
export const SYMBOL_TO_STATUS: Record<string, string> = {};
for (const [sk, ss] of Object.entries(STATUS_ALL_SYMBOLS)) {
	for (const s of ss) SYMBOL_TO_STATUS[s] = sk;
}

export const ALLOWED_STATUSES = statusChildren.map((c) => c.key);
export const STATUS_NAMES: Record<string, string> = {};
statusChildren.forEach((c) => {
	STATUS_NAMES[c.key] = c.zhName;
});
export const STATUS_ICONS: Record<string, string> = {};
statusChildren.forEach((c) => {
	STATUS_ICONS[c.key] = c.icon ?? "";
});
export const STATUS_SORT_ORDER = [
	"none",
	"todo",
	"scheduled",
	"in-progress",
	"cancelled",
	"completed",
];
export const STATUS_SYMBOL_MAP: Record<string, string> = {};
for (const [sk, ss] of Object.entries(STATUS_ALL_SYMBOLS)) {
	for (const s of ss) STATUS_SYMBOL_MAP[s] = sk;
}
export function getStatusColors(): Record<string, string> {
	return getThemeColorMap(STATUS_COLOR_DEFS);
}

export const PRIORITY_ORDER = priorityChildren.map((c) => c.icon ?? "");
export const PRIORITY_ICONS: Record<string, string> = {};
priorityChildren.forEach((c) => {
	PRIORITY_ICONS[c.key] = c.icon ?? "";
});
export const PRIORITY_LABELS: Record<string, string> = {};
priorityChildren.forEach((c) => {
	PRIORITY_LABELS[c.key] = `${c.enName ?? ""}|${c.zhName}`;
});
PRIORITY_LABELS["none"] = "None|无";
export function getPriorityColors(): string[] {
	return getThemeColorArray(PRIORITY_COLOR_DEFS);
}
export function getMissingColor(): string {
	return getThemeColor(makeColor(C.missing.dark, C.missing.light));
}

export const REPEAT_ORDER = repeatChildren.map((c) => c.key);
export const REPEAT_ICON = TASK_ELEMENTS.repeat.icon;
export const REPEAT_LABELS: Record<string, string> = {};
repeatChildren.forEach((c) => {
	REPEAT_LABELS[c.key] = c.zhName;
});
export function getRepeatColors(): string[] {
	return getThemeColorArray(REPEAT_COLOR_DEFS);
}

export const DATE_MARK_ORDER = [...DATE_MARK_ORDER_INTERNAL];
export const DATE_MARK_ICONS: Record<string, string> = {};
DATE_MARK_ORDER_INTERNAL.forEach((k) => {
	if (TASK_ELEMENTS[k].icon) DATE_MARK_ICONS[k] = TASK_ELEMENTS[k].icon;
});
export const DATE_MARK_NAMES: Record<string, string> = {};
DATE_MARK_ORDER_INTERNAL.forEach((k) => {
	const el = TASK_ELEMENTS[k];
	if (el.icon && el.zhName) DATE_MARK_NAMES[k] = el.icon + " " + el.zhName;
});
export function getDateMarkColors(): Record<string, string> {
	return getThemeColorMap(DATE_MARK_COLOR_DEFS);
}

export const ID_ICON = TASK_ELEMENTS.id.icon;
export const DEPENDS_ICON = TASK_ELEMENTS.forbid.icon;
export const TAG_ICON = TASK_ELEMENTS.tag.icon;
export const ID_COLOR_DEF = makeColor(C.id.dark, C.id.light);
export const DEPENDS_COLOR_DEF = makeColor(C.forbid.dark, C.forbid.light);
export const TAG_COLOR_DEF = makeColor(C.tag.dark, C.tag.light);
export const BOTH_COLOR_DEF = makeColor(C.both.dark, C.both.light);
export function getTagPalette(): string[] {
	return getThemeColorArray(TAG_PALETTE_DEFS);
}

export const TASK_MARK_SEQUENCE = TASK_ELEMENT_ORDER.filter(
	(k) => TASK_ELEMENTS[k].inMarkSequence,
);
export const MARK_NAMES: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	if (TASK_ELEMENTS[k].inMarkSequence)
		MARK_NAMES[k] = TASK_ELEMENTS[k].zhName;
});
export const ALL_MARKS = Object.keys(MARK_NAMES);

export const TABLE_COLUMNS = TASK_ELEMENT_ORDER.map((k) => ({
	key: k,
	label: k === "status" ? "状态" : TASK_ELEMENTS[k].zhName,
}));
const descIdx = TABLE_COLUMNS.findIndex((c) => c.key === "status");
if (descIdx >= 0)
	TABLE_COLUMNS.splice(descIdx + 1, 0, { key: "content", label: "描述" });
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

export const YAML_NAME_TO_KEY: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	if (TASK_ELEMENTS[k].yaName) YAML_NAME_TO_KEY[TASK_ELEMENTS[k].yaName] = k;
});
export const YAML_NAME_TO_ICON: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	if (TASK_ELEMENTS[k].yaName && TASK_ELEMENTS[k].icon)
		YAML_NAME_TO_ICON[TASK_ELEMENTS[k].yaName] = TASK_ELEMENTS[k].icon;
});
export const YAML_NAME_TO_ZHNAME: Record<string, string> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	if (TASK_ELEMENTS[k].yaName)
		YAML_NAME_TO_ZHNAME[TASK_ELEMENTS[k].yaName] = TASK_ELEMENTS[k].zhName;
});
export const YAML_DATE_FIELDS: string[] = TASK_ELEMENT_ORDER.filter(
	(k) =>
		!!TASK_ELEMENTS[k].yaName &&
		["created", "scheduled", "starts", "due", "done", "cancelled"].includes(
			k,
		),
)
	.map((k) => TASK_ELEMENTS[k].yaName ?? "")
	.filter(Boolean);
export const YAML_DISPLAY_ORDER: string[] = TASK_ELEMENT_ORDER.filter(
	(k) => !!TASK_ELEMENTS[k].yaName,
)
	.map((k) => TASK_ELEMENTS[k].yaName ?? "")
	.filter(Boolean);

export function getPriorityLabel(icon: string): string {
	const idx = PRIORITY_ORDER.indexOf(icon);
	return idx >= 0 && idx < priorityChildren.length
		? priorityChildren[idx].zhName
		: "无";
}

export let TASK_ROOT_PATHS: string[] = [];
export let HEADING_TASK_PATTERN = new RegExp("");
export let TASK_FOLDER_FILTERS: PathFilterConfig[] = [];
export let TASK_FILE_FILTERS: PathFilterConfig[] = [];
export let TASK_HEADING_FILTERS: PathFilterConfig[] = [];
export let TASK_ITEM_FILTERS: TaskItemFilterConfig[] = [];

function matchFilter(value: string, filter: PathFilterConfig): boolean {
	if (!filter.pattern) return true;
	let p = filter.pattern;
	if (filter.wholeWord) p = `\\b${p}\\b`;
	const flags = filter.caseSensitive ? "" : "i";
	let r: RegExp;
	try {
		r = filter.useRegex
			? new RegExp(p, flags)
			: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
	} catch {
		return false;
	}
	return filter.exclude ? !r.test(value) : r.test(value);
}
export function matchTaskFilePath(filePath: string): boolean {
	if (
		TASK_ROOT_PATHS.length > 0 &&
		!TASK_ROOT_PATHS.some((p) => filePath.startsWith(p))
	)
		return false;
	if (TASK_FOLDER_FILTERS.length === 0) return true;
	const folders = filePath.split("/").slice(0, -1);
	const inc = TASK_FOLDER_FILTERS.filter((f) => !f.exclude),
		exc = TASK_FOLDER_FILTERS.filter((f) => f.exclude);
	if (exc.some((f) => folders.some((fd) => matchFilter(fd, f)))) return false;
	return (
		inc.length === 0 ||
		inc.some((f) => folders.some((fd) => matchFilter(fd, f)))
	);
}
export function matchTaskFileName(fileName: string): boolean {
	if (TASK_FILE_FILTERS.length === 0) return false;
	const inc = TASK_FILE_FILTERS.filter((f) => !f.exclude),
		exc = TASK_FILE_FILTERS.filter((f) => f.exclude);
	if (exc.some((f) => matchFilter(fileName, f))) return false;
	return inc.length === 0 || inc.some((f) => matchFilter(fileName, f));
}
export function matchTaskHeading(heading: string): boolean {
	if (TASK_HEADING_FILTERS.length === 0) return false;
	const inc = TASK_HEADING_FILTERS.filter((f) => !f.exclude),
		exc = TASK_HEADING_FILTERS.filter((f) => f.exclude);
	if (exc.some((f) => matchFilter(heading, f))) return false;
	return inc.length === 0 || inc.some((f) => matchFilter(heading, f));
}
export function matchTaskItem(symbol: string): boolean {
	if (TASK_ITEM_FILTERS.length === 0) return true;
	const inc = TASK_ITEM_FILTERS.filter((f) => !f.exclude),
		exc = TASK_ITEM_FILTERS.filter((f) => f.exclude);
	if (exc.some((f) => f.pattern && f.pattern.includes(symbol))) return false;
	return (
		inc.length === 0 ||
		inc.some((f) => !f.pattern || f.pattern.includes(symbol))
	);
}
export function isTaskFile(
	fileName: string,
	parsed: { contentRoots: unknown[]; fileTask: unknown },
): boolean {
	return (
		matchTaskFileName(fileName) ||
		parsed.contentRoots.length > 0 ||
		!!parsed.fileTask
	);
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
	if (config.rootPath?.trim())
		TASK_ROOT_PATHS = config.rootPath
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);
	if (config.folderFilters?.some((f) => f.pattern))
		TASK_FOLDER_FILTERS = config.folderFilters.filter((f) => f.pattern);
	if (config.fileFilters?.some((f) => f.pattern))
		TASK_FILE_FILTERS = config.fileFilters.filter((f) => f.pattern);
	if (config.headingFilters?.some((f) => f.pattern)) {
		TASK_HEADING_FILTERS = config.headingFilters.filter((f) => f.pattern);
		const first = config.headingFilters.find(
			(f) => f.pattern && !f.exclude,
		);
		if (first) {
			try {
				HEADING_TASK_PATTERN = new RegExp(first.pattern);
			} catch {
				/* 忽略 */
			}
		}
	}
	if (config.taskItemFilters?.some((f) => f.pattern))
		TASK_ITEM_FILTERS = config.taskItemFilters.filter((f) => f.pattern);
}

export type TaskStatus = (typeof statusChildren)[number]["key"];
export type PriorityIcon = string;
export type RepeatCycle = (typeof repeatChildren)[number]["key"];
export type DateMarkKey = (typeof DATE_MARK_ORDER_INTERNAL)[number];
export type MarkKey = (typeof ALL_MARKS)[number];
