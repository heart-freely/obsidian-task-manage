// src/core/task/task-editor.ts

import { TASKS_RX } from "../config/tasks-config";
import { TaskTreeNode } from "./task-tree";

const AUTOCOMPLETE_DAYS = 3;
const MAX_SNAPSHOTS = 5;
const STORAGE_KEY_SNAPSHOTS = "organizeSnapshots";

export function isIncomplete(s: string): boolean {
	return s === "todo" || s === "in-progress";
}

export function isCompleted(s: string): boolean {
	return s === "completed" || s === "cancelled";
}

export function hasEssentialTags(node: TaskTreeNode): boolean {
	return !!(
		node.priority !== 5 &&
		node.created &&
		node.scheduled &&
		node.starts &&
		node.due
	);
}

function replaceMark(
	line: string,
	regex: RegExp,
	newMark: string | undefined,
): string {
	if (newMark === undefined)
		return line
			.replace(regex, "")
			.replace(/\s{2,}/g, " ")
			.trim();
	if (regex.test(line))
		return line
			.replace(regex, newMark)
			.replace(/\s{2,}/g, " ")
			.trim();
	return (line + " " + newMark).replace(/\s{2,}/g, " ").trim();
}

/**
 * 格式化日期为 YYYY-MM-DD 格式（不依赖 moment.js）
 */
function formatDateNative(date: Date): string {
	const pad = (n: number) => (n < 10 ? "0" + n : n);
	return (
		date.getFullYear() +
		"-" +
		pad(date.getMonth() + 1) +
		"-" +
		pad(date.getDate())
	);
}

/**
 * 从 YYYY-MM-DD 字符串解析为 Date 对象
 */
function parseDateNative(dateStr: string): Date | null {
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	const d = new Date(
		parseInt(match[1]),
		parseInt(match[2]) - 1,
		parseInt(match[3]),
	);
	// 验证解析正确（处理 2月30日 这种无效日期）
	if (
		d.getFullYear() !== parseInt(match[1]) ||
		d.getMonth() !== parseInt(match[2]) - 1 ||
		d.getDate() !== parseInt(match[3])
	) {
		return null;
	}
	return d;
}

export const Op = {
	setPriority(line: string, emoji: string): string {
		return replaceMark(line, TASKS_RX.priority, emoji);
	},
	delPriority(line: string): string {
		return replaceMark(line, TASKS_RX.priority, undefined);
	},
	setRepeat(line: string, rule: string): string {
		return replaceMark(
			line,
			TASKS_RX.repeat,
			"🔁 " + rule.replace(/^🔁\s*/, ""),
		);
	},
	delRepeat(line: string): string {
		return replaceMark(line, TASKS_RX.repeat, undefined);
	},
	setCreated(line: string, date: string): string {
		return replaceMark(line, TASKS_RX.created, "➕ " + date);
	},
	delCreated(line: string): string {
		return replaceMark(line, TASKS_RX.created, undefined);
	},
	setScheduled(line: string, date: string): string {
		return replaceMark(line, TASKS_RX.scheduled, "⏳ " + date);
	},
	delScheduled(line: string): string {
		return replaceMark(line, TASKS_RX.scheduled, undefined);
	},
	setStarts(line: string, date: string): string {
		return replaceMark(line, TASKS_RX.starts, "🛫 " + date);
	},
	delStarts(line: string): string {
		return replaceMark(line, TASKS_RX.starts, undefined);
	},
	setDue(line: string, date: string): string {
		return replaceMark(line, TASKS_RX.due, "📅 " + date);
	},
	delDue(line: string): string {
		return replaceMark(line, TASKS_RX.due, undefined);
	},
	setDone(line: string, date: string): string {
		return replaceMark(line, TASKS_RX.done, "✅ " + date);
	},
	delDone(line: string): string {
		return replaceMark(line, TASKS_RX.done, undefined);
	},
	setCancelled(line: string, date: string): string {
		return replaceMark(line, TASKS_RX.cancelled, "❌ " + date);
	},
	delCancelled(line: string): string {
		return replaceMark(line, TASKS_RX.cancelled, undefined);
	},
	setTag(line: string, keyword: string): string {
		return replaceMark(
			line,
			TASKS_RX.tag,
			"🏁 " + keyword.replace(/^🏁\s*/, ""),
		);
	},
	delTag(line: string): string {
		return replaceMark(line, TASKS_RX.tag, undefined);
	},
	delId(line: string): string {
		return replaceMark(line, TASKS_RX.id, undefined);
	},
	delForbid(line: string): string {
		return replaceMark(line, TASKS_RX.forbid, undefined);
	},
	autoComplete(line: string, days?: number): string {
		const doneMatch = line.match(TASKS_RX.done);
		if (!doneMatch) return line;

		const n = days || AUTOCOMPLETE_DAYS;
		const doneDate = parseDateNative(doneMatch[1]);
		if (!doneDate) return line;

		let newLine = Op.sortTags(line);

		const doneStr = formatDateNative(doneDate);

		// 设置截止日期 = 完成日期
		if (!TASKS_RX.due.test(newLine)) newLine += " 📅 " + doneStr;
		else newLine = replaceMark(newLine, TASKS_RX.due, "📅 " + doneStr);

		// 计算开始日期 = 完成日期 - n 天
		const startsDate = new Date(doneDate);
		startsDate.setDate(startsDate.getDate() - n);
		const startsStr = formatDateNative(startsDate);

		if (!TASKS_RX.starts.test(newLine)) newLine += " 🛫 " + startsStr;
		else newLine = replaceMark(newLine, TASKS_RX.starts, "🛫 " + startsStr);

		// 计划日期 = 开始日期
		if (!TASKS_RX.scheduled.test(newLine)) newLine += " ⏳ " + startsStr;
		else
			newLine = replaceMark(
				newLine,
				TASKS_RX.scheduled,
				"⏳ " + startsStr,
			);

		// 创建日期 = 开始日期
		if (!TASKS_RX.created.test(newLine)) newLine += " ➕ " + startsStr;
		else
			newLine = replaceMark(newLine, TASKS_RX.created, "➕ " + startsStr);

		return Op.sortTags(newLine);
	},
	sortTags(line: string): string {
		const order = [
			"priority",
			"repeat",
			"created",
			"scheduled",
			"starts",
			"due",
			"done",
			"cancelled",
			"tag",
			"id",
			"forbid",
		];
		const parts: string[] = [];
		for (const key of order) {
			const m = line.match(TASKS_RX[key]);
			parts.push(m ? m[0] : "");
		}
		let clean = line;
		parts.forEach((p) => {
			if (p) clean = clean.replace(p, "");
		});
		clean = clean.replace(/\s+/g, " ").trim();
		return (clean + " " + parts.filter(Boolean).join(" "))
			.replace(/\s+/g, " ")
			.trim();
	},
};

// ---------- 快照管理 ----------
export function loadSnapshots(): Array<{
	time: string;
	snapshot: Record<string, string>;
}> {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY_SNAPSHOTS) || "[]");
	} catch (e) {
		console.warn("[TaskManage] 加载快照失败:", e);
		return [];
	}
}

export function saveSnapshots(
	snapshots: Array<{ time: string; snapshot: Record<string, string> }>,
): void {
	try {
		localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots));
	} catch (e) {
		console.warn("[TaskManage] 保存快照失败:", e);
	}
}

export function addSnapshot(
	snapshots: Array<{ time: string; snapshot: Record<string, string> }>,
	map: Record<string, string>,
): void {
	snapshots.unshift({ time: new Date().toLocaleString(), snapshot: map });
	if (snapshots.length > MAX_SNAPSHOTS) snapshots.pop();
	saveSnapshots(snapshots);
}

export async function writeToFiles(
	app: any,
	nodes: TaskTreeNode[],
	taskIds: string[],
	linesMap: Record<string, string>,
): Promise<number> {
	const groups: Record<string, Array<{ line: number; newLine: string }>> = {};
	for (const id of taskIds) {
		const node = nodes.find((n) => n.uid === id);
		if (!node) continue;
		const newLine = linesMap[id];
		if (!newLine || newLine === node.rawLine) continue;
		if (!groups[node.path]) groups[node.path] = [];
		groups[node.path].push({ line: node.line, newLine });
	}
	let count = 0;
	for (const [path, items] of Object.entries(groups)) {
		const file = app.vault.getAbstractFileByPath(path);
		if (!file) continue;
		await app.vault.process(file, (data: string) => {
			const dataLines = data.split("\n");
			for (const item of items)
				if (item.line < dataLines.length)
					dataLines[item.line] = item.newLine;
			return dataLines.join("\n");
		});
		count += items.length;
	}
	return count;
}
