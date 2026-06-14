// core/parser/dataview-parser.ts
// Dataview 格式任务解析器

import { TaskData, TaskStatus } from "../../type/type";
import {
	DATAVIEW_EMOJI_DATE_REGEX,
	DATAVIEW_EMOJI_FIELD_MAP,
	DATAVIEW_INLINE_REGEX,
} from "../config/dataview-config";

function parseInlineFields(text: string): Record<string, string> {
	const fields: Record<string, string> = {};
	let match: RegExpExecArray | null;
	while ((match = DATAVIEW_INLINE_REGEX.exec(text)) !== null) {
		fields[match[1].trim()] = match[2].trim();
	}
	return fields;
}

function parseEmojiDates(text: string): Record<string, string> {
	const dates: Record<string, string> = {};
	let match: RegExpExecArray | null;
	while ((match = DATAVIEW_EMOJI_DATE_REGEX.exec(text)) !== null) {
		const fieldName = DATAVIEW_EMOJI_FIELD_MAP[match[1]];
		if (fieldName) {
			dates[fieldName] = match[2];
		}
	}
	return dates;
}

function parseDate(val: string | undefined): number | null {
	if (!val) return null;
	const ts = new Date(val).getTime();
	return isNaN(ts) ? null : ts;
}

export function parseDataviewTask(lineText: string): TaskData {
	const inlineFields = parseInlineFields(lineText);
	const emojiDates = parseEmojiDates(lineText);
	const fields = { ...inlineFields, ...emojiDates };

	return {
		rawLine: lineText,
		status: (fields["状态"] || "todo") as TaskStatus,
		content: fields["描述"] || fields["名称"] || "",
		priority: fields["优先级"] ? parseInt(fields["优先级"]) : 5,
		repeat: fields["循环"] || "",
		created: parseDate(fields["created"]),
		scheduled: parseDate(fields["scheduled"]),
		starts: parseDate(fields["start"]),
		due: parseDate(fields["due"]),
		done: parseDate(fields["completion"]),
		cancelled: parseDate(fields["cancelled"]),
		tag: fields["标签"] || "",
		id: fields["ID"] || "",
		forbid: fields["依赖"] || "",
	};
}
