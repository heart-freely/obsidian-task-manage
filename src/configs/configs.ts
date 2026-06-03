// src/configs/configs.ts

import { GlobalFilter } from "../types";

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
	"tag",
	"id",
	"forbid",
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
}

export const TASK_ELEMENTS: Record<string, TaskElementDef> = {
	status: {
		key: "status",
		zhName: "执行状态",
		enName: "Status",
		icon: "",
		inMarkSequence: true,
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
				markdownSymbol: "/",
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
	},
	priority: {
		key: "priority",
		zhName: "优先级",
		enName: "Priority",
		icon: "",
		pattern: "⏬|🔽|🔼|⏫|🔺",
		inMarkSequence: true,
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
		pattern: "🔁\\s*(every\\s+(day|week|month|year))",
		inMarkSequence: true,
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
	},
	scheduled: {
		key: "scheduled",
		zhName: "计划",
		enName: "Scheduled",
		icon: "⏳",
		pattern: "⏳\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
	},
	starts: {
		key: "starts",
		zhName: "开始",
		enName: "Starts",
		icon: "🛫",
		pattern: "🛫\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
	},
	cancel: {
		key: "cancel",
		zhName: "取消",
		enName: "Cancel",
		icon: "❌",
		pattern: "❌\\s*(\\d{4}-\\d{2}-\\d{2})?",
		inMarkSequence: true,
	},
	done: {
		key: "done",
		zhName: "完成",
		enName: "Done",
		icon: "✅",
		pattern: "✅\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
	},
	due: {
		key: "due",
		zhName: "截止",
		enName: "Due",
		icon: "📅",
		pattern: "📅\\s*(\\d{4}-\\d{2}-\\d{2})",
		inMarkSequence: true,
	},
	tag: {
		key: "tag",
		zhName: "标签",
		enName: "Tag",
		icon: "🏁",
		pattern: "🏁\\s*(\\S+)",
		inMarkSequence: true,
	},
	id: {
		key: "id",
		zhName: "唯一ID",
		enName: "Unique ID",
		icon: "🆔",
		pattern: "🆔\\s*(\\S+)",
		inMarkSequence: true,
	},
	forbid: {
		key: "forbid",
		zhName: "引用ID",
		enName: "Depends On",
		icon: "⛔",
		pattern: "⛔\\s*([^\\s,]+(?:\\s*,\\s*[^\\s,]+)*)",
		inMarkSequence: true,
	},
};

// ========== 从 TASK_ELEMENTS 派生 RX 正则 ==========

export const RX: Record<string, RegExp> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const el = TASK_ELEMENTS[k];
	if (el.pattern) {
		RX[k] = new RegExp(el.pattern, k === "priority" ? "g" : "");
	}
});

// ========== 从 TASK_ELEMENTS 派生常量 ==========

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
STATUS_SYMBOL_MAP[">"] = "in-progress";
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
	if (TASK_ELEMENTS[k].inMarkSequence) {
		MARK_NAMES[k] = TASK_ELEMENTS[k].zhName;
	}
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

// ========== 工具函数 ==========

export function getPriorityLabel(icon: string): string {
	const idx = PRIORITY_ORDER.indexOf(icon);
	if (idx >= 0) {
		return TASK_ELEMENTS.priority.children![idx].zhName;
	}
	return "无";
}

// ========== 路径配置 ==========

export const TASK_FOLDERS: string[] = ['"pages/A 系统/A 任务系统"'];
export const FILE_NAME_PATTERN: RegExp = /任务$/;
export const ROOT_PATH: string = "pages/A 系统/A 任务系统/";
export const TASK_FOLDER_PATH: string = "pages/A 系统/A 任务系统";

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

// ========== 日期格式化 ==========

export const DATE_FORMAT = "YYYY-MM-DD";
export function formatDisplayDate(d: any): string {
	if (!d) return "";
	if (typeof d === "string") return d.substring(0, 10);
	if (d instanceof Date) return d.toISOString().substring(0, 10);
	return String(d).substring(0, 10);
}
