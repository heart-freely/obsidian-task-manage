// src/core/parser/dataview-parser.ts

import { TaskData } from "../../type/type";
import {
	DATAVIEW_EMOJI_DATE_REGEX,
	DATAVIEW_EMOJI_FIELD_MAP,
	DATAVIEW_INLINE_REGEX,
} from "../config/dataview-config";

function parseInlineFields(text: string): Record<string, string> {
	const f: Record<string, string> = {};
	let m: RegExpExecArray | null;
	const r = new RegExp(
		DATAVIEW_INLINE_REGEX.source,
		DATAVIEW_INLINE_REGEX.flags,
	);
	while ((m = r.exec(text)) !== null) f[m[1].trim()] = m[2].trim();
	return f;
}
function parseEmojiDates(text: string): Record<string, string> {
	const d: Record<string, string> = {};
	let m: RegExpExecArray | null;
	const r = new RegExp(
		DATAVIEW_EMOJI_DATE_REGEX.source,
		DATAVIEW_EMOJI_DATE_REGEX.flags,
	);
	while ((m = r.exec(text)) !== null) {
		const fn = DATAVIEW_EMOJI_FIELD_MAP[m[1]];
		if (fn) d[fn] = m[2];
	}
	return d;
}
function parseDate(val: string | undefined): number | null {
	if (!val) return null;
	const ts = new Date(val).getTime();
	return isNaN(ts) ? null : ts;
}

export function parseDataviewTask(lineText: string): TaskData {
	const inf = parseInlineFields(lineText);
	const emj = parseEmojiDates(lineText);
	const f = { ...inf, ...emj };
	return {
		rawLine: lineText,
		status: f["状态"] || "todo",
		content: f["描述"] || f["名称"] || "",
		priority: f["优先级"] ? parseInt(f["优先级"]) : 5,
		repeat: f["循环"] || "",
		created: parseDate(f["created"]),
		scheduled: parseDate(f["scheduled"]),
		starts: parseDate(f["start"]),
		due: parseDate(f["due"]),
		done: parseDate(f["completion"]),
		cancelled: parseDate(f["cancelled"]),
		tag: f["标签"] || "",
		id: f["ID"] || "",
		forbid: f["依赖"] || "",
	};
}
