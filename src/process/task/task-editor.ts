// src/process/task/task-editor.ts

import { RX } from "../config/config";
import { TaskTreeNode } from "./task-tree";

const AUTOCOMPLETE_DAYS = 3;
const MAX_SNAPSHOTS = 5;
const STORAGE_KEY_SNAPSHOTS = "organizeSnapshots";

export function isIncomplete(s: string): boolean {
	return s === "todo" || s === "planned" || s === "in-progress";
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

export const Op = {
	setPriority(line: string, emoji: string): string {
		return replaceMark(line, RX.priority, emoji);
	},
	delPriority(line: string): string {
		return replaceMark(line, RX.priority, undefined);
	},
	setRepeat(line: string, rule: string): string {
		return replaceMark(line, RX.repeat, "🔁 " + rule.replace(/^🔁\s*/, ""));
	},
	delRepeat(line: string): string {
		return replaceMark(line, RX.repeat, undefined);
	},
	setCreated(line: string, date: string): string {
		return replaceMark(line, RX.created, "➕ " + date);
	},
	delCreated(line: string): string {
		return replaceMark(line, RX.created, undefined);
	},
	setScheduled(line: string, date: string): string {
		return replaceMark(line, RX.scheduled, "⏳ " + date);
	},
	delScheduled(line: string): string {
		return replaceMark(line, RX.scheduled, undefined);
	},
	setStarts(line: string, date: string): string {
		return replaceMark(line, RX.starts, "🛫 " + date);
	},
	delStarts(line: string): string {
		return replaceMark(line, RX.starts, undefined);
	},
	setDue(line: string, date: string): string {
		return replaceMark(line, RX.due, "📅 " + date);
	},
	delDue(line: string): string {
		return replaceMark(line, RX.due, undefined);
	},
	setDone(line: string, date: string): string {
		return replaceMark(line, RX.done, "✅ " + date);
	},
	delDone(line: string): string {
		return replaceMark(line, RX.done, undefined);
	},
	setCancelled(line: string, date: string): string {
		return replaceMark(line, RX.cancelled, "❌ " + date);
	},
	delCancelled(line: string): string {
		return replaceMark(line, RX.cancelled, undefined);
	},
	setTag(line: string, keyword: string): string {
		return replaceMark(line, RX.tag, "🏁 " + keyword.replace(/^🏁\s*/, ""));
	},
	delTag(line: string): string {
		return replaceMark(line, RX.tag, undefined);
	},
	delId(line: string): string {
		return replaceMark(line, RX.id, undefined);
	},
	delForbid(line: string): string {
		return replaceMark(line, RX.forbid, undefined);
	},
	autoComplete(line: string, days?: number): string {
		const doneMatch = line.match(RX.done);
		if (!doneMatch) return line;
		const n = days || AUTOCOMPLETE_DAYS;
		const doneDate = (window as any).moment(
			doneMatch[1],
			"YYYY-MM-DD",
			true,
		);
		if (!doneDate.isValid()) return line;
		let newLine = Op.sortTags(line);
		if (!RX.due.test(newLine))
			newLine += " 📅 " + doneDate.format("YYYY-MM-DD");
		else
			newLine = replaceMark(
				newLine,
				RX.due,
				"📅 " + doneDate.format("YYYY-MM-DD"),
			);
		const expectedStarts = doneDate.clone().subtract(n, "days");
		if (!RX.starts.test(newLine))
			newLine += " 🛫 " + expectedStarts.format("YYYY-MM-DD");
		else
			newLine = replaceMark(
				newLine,
				RX.starts,
				"🛫 " + expectedStarts.format("YYYY-MM-DD"),
			);
		if (!RX.scheduled.test(newLine))
			newLine += " ⏳ " + expectedStarts.format("YYYY-MM-DD");
		else
			newLine = replaceMark(
				newLine,
				RX.scheduled,
				"⏳ " + expectedStarts.format("YYYY-MM-DD"),
			);
		if (!RX.created.test(newLine))
			newLine += " ➕ " + expectedStarts.format("YYYY-MM-DD");
		else
			newLine = replaceMark(
				newLine,
				RX.created,
				"➕ " + expectedStarts.format("YYYY-MM-DD"),
			);
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
			const m = line.match(RX[key]);
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
