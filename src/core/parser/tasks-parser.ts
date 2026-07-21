// src/core/parser/tasks-parser.ts

import { TaskData, TaskStatus } from "../../type/type";
import { matchTaskItem, SYMBOL_TO_STATUS } from "../config/config";
import { TASKS_PRIORITY_ICON_TO_NUM, TASKS_RX } from "../config/tasks-config";

const ALL_STATUS_SYMBOLS = [
	" ",
	"/",
	"x",
	"X",
	"-",
	">",
	"<",
	"?",
	"!",
	"*",
	'"',
	"l",
	"b",
];
const ALL_STATUS_SYMBOLS_STR = ALL_STATUS_SYMBOLS.map((s) =>
	s === "-" || s === "]" || s === "^" || s === "\\" ? "\\" + s : s,
).join("");
export const TASK_REGEX = new RegExp(
	`^\\s*-\\s*\\[([${ALL_STATUS_SYMBOLS_STR}])\\]\\s+(.+)$`,
);

function parseDate(dateStr: string): number | null {
	if (!dateStr) return null;
	const p = dateStr.split("-");
	if (p.length !== 3) return null;
	const d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
	d.setHours(0, 0, 0, 0);
	const ts = d.getTime();
	return isNaN(ts) ? null : ts;
}

export function parseTaskLine(
	fullLine: string,
	_filePath: string,
	_line: number,
): TaskData | null {
	const sm = fullLine.match(/^\s*- \[(.)\]\s*/);
	if (sm && !matchTaskItem(sm[1])) return null;
	const status: TaskStatus = sm
		? ((SYMBOL_TO_STATUS[sm[1]] || "todo") as TaskStatus)
		: "todo";
	const text = fullLine.replace(/^\s*- \[.\]\s*/, "");
	function m(rx: RegExp, idx?: number): string | null {
		const mt = text.match(rx);
		return mt ? mt[idx !== undefined ? idx : 1] || null : null;
	}
	const pm = text.match(TASKS_RX.priority);
	const pi = pm ? pm[0] : "";
	const priority = TASKS_PRIORITY_ICON_TO_NUM[pi] ?? 5;
	const ct = text
		.replace(/⏬|🔽|🔼|⏫|🔺/g, "")
		.replace(/🔁\s*every\s+(day|week|month|year)/gi, "")
		.replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/❌\s*(\d{4}-\d{2}-\d{2})?/g, "")
		.replace(/🏁\s*\S+/g, "")
		.replace(/🆔\s*\S+/g, "")
		.replace(/⛔\s*[^\s,]+(?:\s*,\s*[^\s,]+)*/g, "")
		.replace(/<[^>]+>/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();
	return {
		rawLine: fullLine,
		status,
		content: ct,
		priority,
		repeat: (m(TASKS_RX.repeat) || "").replace(/^🔁\s*/, ""),
		created: parseDate(m(TASKS_RX.created) || ""),
		scheduled: parseDate(m(TASKS_RX.scheduled) || ""),
		starts: parseDate(m(TASKS_RX.starts) || ""),
		due: parseDate(m(TASKS_RX.due) || ""),
		done: parseDate(m(TASKS_RX.done) || ""),
		cancelled: parseDate(m(TASKS_RX.cancelled) || ""),
		tag: m(TASKS_RX.tag) || "",
		id: m(TASKS_RX.id) || "",
		forbid: m(TASKS_RX.forbid)
			? m(TASKS_RX.forbid)!.replace(/\s/g, "")
			: "",
	};
}
