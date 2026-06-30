// core/parser/tasks-parser.ts
// Tasks 格式列表任务行解析器

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
	const parts = dateStr.split("-");
	if (parts.length !== 3) return null;
	const d = new Date(
		parseInt(parts[0]),
		parseInt(parts[1]) - 1,
		parseInt(parts[2]),
	);
	d.setHours(0, 0, 0, 0);
	const ts = d.getTime();
	return isNaN(ts) ? null : ts;
}

export function parseTaskLine(
	fullLine: string,
	filePath: string,
	line: number,
): TaskData | null {
	const statusMatch = fullLine.match(/^\s*- \[(.)\]\s*/);

	// 任务项过滤
	if (statusMatch) {
		const symbol = statusMatch[1];
		if (!matchTaskItem(symbol)) return null;
	}

	let status: TaskStatus = "todo";
	if (statusMatch)
		status = (SYMBOL_TO_STATUS[statusMatch[1]] || "todo") as TaskStatus;
	const text = fullLine.replace(/^\s*- \[.\]\s*/, "");

	function m(rx: RegExp, idx?: number): string | null {
		const match = text.match(rx);
		return match ? match[idx !== undefined ? idx : 1] || null : null;
	}

	// 使用 match 获取首个匹配，无 g 标志时返回数组包含完整匹配信息
	const priorityMatch = text.match(TASKS_RX.priority);
	const priorityIcon = priorityMatch ? priorityMatch[0] : "";
	const priority = TASKS_PRIORITY_ICON_TO_NUM[priorityIcon] ?? 5;

	const cleanText = text
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
		content: cleanText,
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
		forbid: m(TASKS_RX.forbid) ? m(TASKS_RX.forbid).replace(/\s/g, "") : "",
	};
}
