// src/core/task/task-editor.ts

import { TASKS_RX } from "../config/tasks-config";
import { TaskTreeNode } from "./task-tree";
import { EditState } from "../../type/type";
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

// ========== 状态符号映射 ==========

const STATUS_SYMBOLS: Record<string, string> = {
	todo: " ",
	scheduled: "?",
	"in-progress": "/",
	completed: "x",
	cancelled: "-",
};

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

function parseDateNative(dateStr: string): Date | null {
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	const d = new Date(
		parseInt(match[1]),
		parseInt(match[2]) - 1,
		parseInt(match[3]),
	);
	if (
		d.getFullYear() !== parseInt(match[1]) ||
		d.getMonth() !== parseInt(match[2]) - 1 ||
		d.getDate() !== parseInt(match[3])
	) {
		return null;
	}
	return d;
}

// ========== 编辑操作 ==========

export const Op = {
	setStatus(line: string, status: string): string {
		const symbol = STATUS_SYMBOLS[status] ?? " ";
		return line.replace(/^(- \[).(\] )/, `$1${symbol}$2`);
	},

	setContent(line: string, newContent: string): string {
		let cleaned = line;
		const allMarks = [
			TASKS_RX.priority,
			TASKS_RX.repeat,
			TASKS_RX.created,
			TASKS_RX.scheduled,
			TASKS_RX.starts,
			TASKS_RX.due,
			TASKS_RX.done,
			TASKS_RX.cancelled,
			TASKS_RX.tag,
			TASKS_RX.id,
			TASKS_RX.forbid,
		];
		const prefix = cleaned.match(/^(- \[.\]\s*)/)?.[1] || "- [ ] ";
		cleaned = cleaned.replace(/^(- \[.\]\s*)/, "");
		for (const rx of allMarks) {
			if (rx) cleaned = cleaned.replace(rx, "");
		}
		cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
		return prefix + newContent + " " + cleaned;
	},

	setPriority(line: string, emoji: string): string {
		const cleaned = line
			.replace(TASKS_RX.priority, "")
			.replace(/\s{2,}/g, " ")
			.trim();
		return (cleaned + " " + emoji).replace(/\s{2,}/g, " ").trim();
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

	setId(line: string, id: string): string {
		return replaceMark(line, TASKS_RX.id, "🆔 " + id);
	},
	delId(line: string): string {
		return replaceMark(line, TASKS_RX.id, undefined);
	},

	setForbid(line: string, forbid: string): string {
		return replaceMark(line, TASKS_RX.forbid, "⛔ " + forbid);
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

		if (!TASKS_RX.due.test(newLine)) newLine += " 📅 " + doneStr;
		else newLine = replaceMark(newLine, TASKS_RX.due, "📅 " + doneStr);

		const startsDate = new Date(doneDate);
		startsDate.setDate(startsDate.getDate() - n);
		const startsStr = formatDateNative(startsDate);

		if (!TASKS_RX.starts.test(newLine)) newLine += " 🛫 " + startsStr;
		else newLine = replaceMark(newLine, TASKS_RX.starts, "🛫 " + startsStr);

		if (!TASKS_RX.scheduled.test(newLine)) newLine += " ⏳ " + startsStr;
		else
			newLine = replaceMark(
				newLine,
				TASKS_RX.scheduled,
				"⏳ " + startsStr,
			);

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

// ========== 快照管理 ==========

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

// ========== 文件写入 ==========

export async function writeToFiles(
	app: any,
	getNode: (uid: string) => TaskTreeNode | undefined,
	taskIds: string[],
	linesMap: Record<string, string>,
): Promise<number> {
	const groups: Record<string, Array<{ line: number; newLine: string }>> = {};
	for (const id of taskIds) {
		const node = getNode(id);
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

// ========== 保存与撤回 ==========

export async function saveSingleTask(
	state: EditState,
	app: any,
	getNode: (uid: string) => TaskTreeNode | undefined,
	node: TaskTreeNode,
): Promise<EditState> {
	const uid = node.uid;
	const preview = state.previews.get(uid);
	if (!preview || preview === node.rawLine) return state;

	const snapshot: Record<string, string> = {};
	snapshot[uid] = node.rawLine;
	const snapshots = loadSnapshots();
	addSnapshot(snapshots, snapshot);

	const linesMap: Record<string, string> = {};
	linesMap[uid] = preview;
	await writeToFiles(app, getNode, [uid], linesMap);

	state.savedTasks.add(uid);
	return state;
}

export async function saveAllChanges(
	state: EditState,
	app: any,
	getNode: (uid: string) => TaskTreeNode | undefined,
): Promise<EditState> {
	const toSave: string[] = [];
	const linesMap: Record<string, string> = {};
	const snapshotMap: Record<string, string> = {};

	for (const uid of state.selectedTasks) {
		if (state.savedTasks.has(uid)) continue;
		const node = getNode(uid);
		if (!node) continue;
		const preview = state.previews.get(uid);
		if (!preview || preview === node.rawLine) continue;

		toSave.push(uid);
		linesMap[uid] = preview;
		snapshotMap[uid] = node.rawLine;
	}

	if (toSave.length === 0) return state;

	const snapshots = loadSnapshots();
	addSnapshot(snapshots, snapshotMap);

	await writeToFiles(app, getNode, toSave, linesMap);

	for (const uid of toSave) {
		state.savedTasks.add(uid);
	}

	return state;
}

export async function revertSingleTask(
	state: EditState,
	app: any,
	getNode: (uid: string) => TaskTreeNode | undefined,
	node: TaskTreeNode,
): Promise<EditState> {
	const uid = node.uid;
	if (!state.savedTasks.has(uid)) return state;

	let originalLine = node.rawLine;
	const snapshots = loadSnapshots();
	for (const snap of snapshots) {
		if (snap.snapshot[uid]) {
			originalLine = snap.snapshot[uid];
			break;
		}
	}

	const linesMap: Record<string, string> = {};
	linesMap[uid] = originalLine;
	await writeToFiles(app, getNode, [uid], linesMap);

	state.savedTasks.delete(uid);
	state.previews.delete(uid);
	state.selectedTasks.add(uid);
	state.previews.set(uid, originalLine);

	return state;
}

export async function revertFromSnapshot(
	state: EditState,
	app: any,
	getNode: (uid: string) => TaskTreeNode | undefined,
	snapshotIndex: number,
): Promise<EditState> {
	const snapshots = loadSnapshots();
	if (snapshotIndex < 0 || snapshotIndex >= snapshots.length) return state;

	const snap = snapshots[snapshotIndex];
	const taskIds = Object.keys(snap.snapshot);
	const linesMap: Record<string, string> = {};

	for (const uid of taskIds) {
		linesMap[uid] = snap.snapshot[uid];
	}

	await writeToFiles(app, getNode, taskIds, linesMap);

	snapshots.splice(0, snapshotIndex + 1);
	saveSnapshots(snapshots);

	state.savedTasks.clear();
	state.previews.clear();
	state.selectedTasks.clear();

	return state;
}
