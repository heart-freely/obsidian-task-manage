// src/core/config/tasks-config.ts

import { TASK_ELEMENT_ORDER } from "./config";

interface TasksStatusDef {
	key: string;
	zhName: string;
	icon: string;
	color: string;
}

export const TASKS_STATUS_SYMBOLS: Record<string, TasksStatusDef> = {
	" ": { key: "todo", zhName: "待办中", icon: "🔲", color: "#2e333b" },
	">": { key: "in-progress", zhName: "进行中", icon: "⏩", color: "#7fb8f0" },
	"/": { key: "in-progress", zhName: "进行中", icon: "⏩", color: "#7fb8f0" },
	"\\": {
		key: "in-progress",
		zhName: "进行中",
		icon: "⏩",
		color: "#7fb8f0",
	},
	x: { key: "completed", zhName: "已完成", icon: "✅", color: "#47852f" },
	X: { key: "completed", zhName: "已完成", icon: "✅", color: "#47852f" },
	"-": { key: "cancelled", zhName: "已取消", icon: "❎", color: "#c3393e" },
	"?": { key: "scheduled", zhName: "计划中", icon: "❔", color: "#4b525b" },
};

export const TASKS_SYMBOL_TO_STATUS: Record<string, string> = {};
for (const [s, d] of Object.entries(TASKS_STATUS_SYMBOLS))
	TASKS_SYMBOL_TO_STATUS[s] = d.key;
export const TASKS_STATUS_TO_SYMBOL: Record<string, string> = {};
for (const [s, d] of Object.entries(TASKS_STATUS_SYMBOLS))
	TASKS_STATUS_TO_SYMBOL[d.key] = s;

export const TASKS_MARK_PATTERNS: Record<string, string> = {
	priority: "⏬|🔽|🔼|⏫|🔺",
	repeat: "🔁\\s*(every\\s+(\\d+\\s+)?(day|week|month|year)s?|every\\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|every\\s+\\d+(st|nd|rd|th)|on\\s+\\d{4}-\\d{2}-\\d{2})",
	created: "➕\\s*(\\d{4}-\\d{2}-\\d{2})",
	scheduled: "⏳\\s*(\\d{4}-\\d{2}-\\d{2})",
	starts: "🛫\\s*(\\d{4}-\\d{2}-\\d{2})",
	cancelled: "❌\\s*(\\d{4}-\\d{2}-\\d{2})?",
	done: "✅\\s*(\\d{4}-\\d{2}-\\d{2})",
	due: "📅\\s*(\\d{4}-\\d{2}-\\d{2})",
	tag: "🏁\\s*(\\S+)",
	id: "🆔\\s*(\\S+)",
	forbid: "⛔\\s*([^\\s,]+(?:\\s*,\\s*[^\\s,]+)*)",
};

export const TASKS_RX: Record<string, RegExp> = {};
TASK_ELEMENT_ORDER.forEach((k) => {
	const p = TASKS_MARK_PATTERNS[k];
	if (p) TASKS_RX[k] = new RegExp(p, "");
});

export const TASKS_PRIORITY_ICON_TO_NUM: Record<string, number> = {
	"🔺": 0,
	"⏫": 1,
	"🔼": 2,
	"🔽": 3,
	"⏬": 4,
};
export const TASKS_PRIORITY_NUM_TO_ICON: Record<number, string> = {
	0: "🔺",
	1: "⏫",
	2: "🔼",
	3: "🔽",
	4: "⏬",
};
export const TASKS_REPEAT_NORMALIZE: Record<string, string> = {
	"every day": "every day",
	"every days": "every day",
	"every week": "every week",
	"every weeks": "every week",
	"every month": "every month",
	"every months": "every month",
	"every year": "every year",
	"every years": "every year",
};
