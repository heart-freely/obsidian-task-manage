// src/core/edit/task-editor.ts
// 编辑操作对象 + 快照管理 + 文件写入

import { EditState } from "../../type/type";
import { TASKS_RX } from "../config/tasks-config";
import { TaskTreeNode } from "../task/task-tree";

const AUTOCOMPLETE_DAYS = 0;
const MAX_SNAPSHOTS = 5;

// ========== 持久化存储 ==========

interface SnapshotEntry {
	time: string;
	snapshot: Record<string, string>;
}

let _snapshotCache: SnapshotEntry[] = [];
let _snapshotSaveFn: ((snapshots: SnapshotEntry[]) => Promise<void>) | null =
	null;

export function initStorage(
	initialSnapshots: SnapshotEntry[],
	saveFn: (snapshots: SnapshotEntry[]) => Promise<void>,
) {
	_snapshotCache = initialSnapshots || [];
	_snapshotSaveFn = saveFn;
}

export function getSnapshotCache(): SnapshotEntry[] {
	return _snapshotCache;
}
export function loadSnapshots(): SnapshotEntry[] {
	return _snapshotCache;
}

export function saveSnapshots(snapshots: SnapshotEntry[]) {
	_snapshotCache = [...snapshots];
	if (_snapshotSaveFn) {
		_snapshotSaveFn([...snapshots]).catch((e: unknown) => {
			console.warn("快照持久化失败:", e);
		});
	}
}

function addSnapshot(snapshot: Record<string, string>) {
	const snapshots = loadSnapshots();
	snapshots.unshift({ time: new Date().toLocaleString(), snapshot });
	if (snapshots.length > MAX_SNAPSHOTS) snapshots.length = MAX_SNAPSHOTS;
	saveSnapshots(snapshots);
}

// ========== 辅助函数 ==========

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
	)
		return null;
	return d;
}

// ========== YAML 字段名映射 ==========

const KEY_TO_YAML_NAME: Record<string, string> = {
	status: "任务状态",
	priority: "任务优先级",
	repeat: "任务周期",
	created: "任务创建",
	scheduled: "任务计划",
	starts: "任务开始",
	due: "任务截止",
	done: "任务完成",
	cancelled: "任务取消",
	tag: "任务标签",
	id: "任务唯一ID",
	forbid: "任务引用ID",
};

// ========== 编辑操作 ==========

export const Op = {
	setStatus(line: string, status: string): string {
		const symbol = STATUS_SYMBOLS[status] ?? " ";
		return line.replace(/^(- \[).(\] )/, `$1${symbol}$2`);
	},

	setContent(line: string, newContent: string): string {
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
			const rx = TASKS_RX[key];
			parts.push(rx ? (line.match(rx)?.[0] ?? "") : "");
		}
		let clean = line;
		for (const part of parts) {
			if (part) clean = clean.replace(part, "");
		}
		clean = clean
			.replace(/\s+/g, " ")
			.trim()
			.replace(/^- \[.\]\s*/, "")
			.trim();
		const prefixMatch = line.match(/^(- \[.\]\s*)/);
		const prefix = prefixMatch ? prefixMatch[1] : "- [ ] ";
		return (prefix + newContent + " " + parts.filter(Boolean).join(" "))
			.replace(/\s+/g, " ")
			.trim();
	},

	setPriority(line: string, emoji: string): string {
		return (
			line
				.replace(TASKS_RX.priority, "")
				.replace(/\s{2,}/g, " ")
				.trim() +
			" " +
			emoji
		)
			.replace(/\s{2,}/g, " ")
			.trim();
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

	setYamlField(
		yamlContent: string,
		key: string,
		value: string | null,
	): string {
		const yaName = KEY_TO_YAML_NAME[key];
		if (!yaName) return yamlContent;
		const lines = yamlContent.split("\n");
		let found = false;
		for (let i = 0; i < lines.length; i++) {
			const colonIdx = lines[i].indexOf(":");
			if (colonIdx === -1) continue;
			if (lines[i].substring(0, colonIdx).trim() === yaName) {
				if (value === null) lines.splice(i, 1);
				else lines[i] = `${yaName}: ${value}`;
				found = true;
				break;
			}
		}
		if (!found && value !== null) lines.push(`${yaName}: ${value}`);
		return lines.filter((l) => l.trim() !== "").join("\n");
	},
	delYamlField(yamlContent: string, key: string): string {
		return Op.setYamlField(yamlContent, key, null);
	},

	setYamlContent(yamlContent: string, newContent: string): string {
		const lines = yamlContent.split("\n");
		let found = false;
		for (let i = 0; i < lines.length; i++) {
			const colonIdx = lines[i].indexOf(":");
			if (colonIdx === -1) continue;
			const fieldName = lines[i].substring(0, colonIdx).trim();
			if (fieldName === "任务简介" || fieldName === "任务名称") {
				lines[i] = `${fieldName}: ${newContent}`;
				found = true;
				break;
			}
		}
		if (!found) lines.push(`任务简介: ${newContent}`);
		return lines.filter((l) => l.trim() !== "").join("\n");
	},

	autoComplete(line: string, days?: number): string {
		const doneMatch: RegExpMatchArray | null = line.match(TASKS_RX.done);
		const cancelledMatch: RegExpMatchArray | null = line.match(
			TASKS_RX.cancelled,
		);
		if (!doneMatch && !cancelledMatch) return line;
		const dateStr: string | undefined = doneMatch
			? doneMatch[1]
			: cancelledMatch?.[1];
		if (!dateStr) return line;
		const baseDate: Date | null = parseDateNative(dateStr);
		if (!baseDate) return line;

		const n = days ?? AUTOCOMPLETE_DAYS;
		let newLine = Op.sortTags(line);
		const baseStr = formatDateNative(baseDate);

		if (!TASKS_RX.due.test(newLine)) newLine += " 📅 " + baseStr;
		else newLine = replaceMark(newLine, TASKS_RX.due, "📅 " + baseStr);

		const startsDate = new Date(baseDate);
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
			const rx = TASKS_RX[key];
			parts.push(rx ? (line.match(rx)?.[0] ?? "") : "");
		}
		const prefixMatch: RegExpMatchArray | null =
			line.match(/^(\s*- \[.\]\s*)/);
		const prefix = prefixMatch ? prefixMatch[1] : "- [ ] ";
		let desc = line.substring(prefix.length);
		for (const part of parts) {
			if (part) desc = desc.replace(part, "");
		}
		desc = desc.trim();
		return prefix + desc + " " + parts.filter(Boolean).join(" ");
	},
};

// ========== 文件写入 ==========

interface VaultLike {
	getAbstractFileByPath(path: string): { path: string } | null;
	process(
		file: { path: string },
		fn: (data: string) => string,
	): Promise<void>;
}

interface AppLike {
	vault: VaultLike;
}

export async function writeToFiles(
	app: AppLike,
	getNode: (uid: string) => TaskTreeNode | undefined,
	taskIds: string[],
	linesMap: Record<string, string>,
): Promise<number> {
	type LineItem = { line: number; newLine: string; rawLine: string };
	type YamlItem = {
		startLine: number;
		endLine: number;
		newYaml: string;
		isFrontmatter: boolean;
		hasYaml: boolean;
	};

	const lineGroups: Record<string, LineItem[]> = {};
	const yamlGroups: Record<string, YamlItem[]> = {};

	for (const id of taskIds) {
		const node = getNode(id);
		if (!node) continue;
		const newContent = linesMap[id];
		if (!newContent || newContent === node.rawLine) continue;

		if (node.type === "list") {
			if (!lineGroups[node.path]) lineGroups[node.path] = [];
			lineGroups[node.path].push({
				line: node.line,
				newLine: newContent,
				rawLine: node.rawLine,
			});
		} else {
			if (!yamlGroups[node.path]) yamlGroups[node.path] = [];
			yamlGroups[node.path].push({
				startLine: node.yamlStartLine,
				endLine: node.yamlEndLine,
				newYaml: newContent,
				isFrontmatter: node.isFrontmatter,
				hasYaml: node.hasYaml,
			});
		}
	}

	let count = 0;

	for (const [path, items] of Object.entries(lineGroups)) {
		try {
			const file = app.vault.getAbstractFileByPath(path);
			if (!file) continue;
			await app.vault.process(file, (data: string): string => {
				const dataLines: string[] = data.split("\n");
				for (const item of items) {
					let targetLine: number = item.line;
					const rawTrimmed: string = item.rawLine.trim();
					if (
						targetLine < dataLines.length &&
						dataLines[targetLine].trim() !== rawTrimmed
					) {
						const foundIdx = dataLines.findIndex(
							(dl: string) => dl.trim() === rawTrimmed,
						);
						if (foundIdx >= 0) targetLine = foundIdx;
					} else if (targetLine >= dataLines.length) {
						const foundIdx = dataLines.findIndex(
							(dl: string) => dl.trim() === rawTrimmed,
						);
						if (foundIdx >= 0) targetLine = foundIdx;
					}
					const originalLine: string = dataLines[targetLine] ?? "";
					const indentMatch: RegExpMatchArray | null =
						originalLine.match(/^(\s*)/);
					const indent: string = indentMatch?.[1] ?? "";
					dataLines[targetLine] = indent + item.newLine.trim();
				}
				return dataLines.join("\n");
			});
			count += items.length;
		} catch (e: unknown) {
			logger.error("[TaskManage] 写入文件失败:", path, e);
		}
	}

	for (const [path, items] of Object.entries(yamlGroups)) {
		try {
			const file = app.vault.getAbstractFileByPath(path);
			if (!file) continue;
			await app.vault.process(file, (data: string): string => {
				const dataLines: string[] = data.split("\n");
				for (const item of items) {
					const newYamlLines: string[] = item.newYaml
						.split("\n")
						.filter((l: string) => l.trim() !== "");
					if (!item.hasYaml) {
						if (newYamlLines.length === 0) continue;
						if (item.isFrontmatter)
							dataLines.unshift("---", ...newYamlLines, "---");
						else
							dataLines.splice(
								(item.startLine >= 0 ? item.startLine : 0) + 1,
								0,
								"```yaml",
								...newYamlLines,
								"```",
							);
					} else {
						const innerStart = item.startLine + 1;
						if (newYamlLines.length === 0)
							dataLines.splice(
								item.startLine,
								item.endLine - item.startLine + 1,
							);
						else
							dataLines.splice(
								innerStart,
								Math.max(0, item.endLine - innerStart),
								...newYamlLines,
							);
					}
				}
				return dataLines.join("\n");
			});
			count += items.length;
		} catch (e: unknown) {
			logger.error("[TaskManage] 写入YAML文件失败:", path, e);
		}
	}

	return count;
}

// ========== 保存与撤回 ==========

export async function saveSingleTask(
	state: EditState,
	app: AppLike,
	getNode: (uid: string) => TaskTreeNode | undefined,
	node: TaskTreeNode,
): Promise<EditState> {
	const preview = state.previews.get(node.uid);
	if (!preview || preview === node.rawLine) return state;
	await writeToFiles(app, getNode, [node.uid], { [node.uid]: preview });
	state.savedTasks.add(node.uid);
	return state;
}

export async function saveAllChanges(
	state: EditState,
	app: AppLike,
	getNode: (uid: string) => TaskTreeNode | undefined,
): Promise<{ state: EditState; previews: Record<string, string> }> {
	const toSave: string[] = [];
	const linesMap: Record<string, string> = {};
	const snapshotMap: Record<string, string> = {};
	const previews: Record<string, string> = {};

	for (const uid of state.selectedTasks) {
		if (state.savedTasks.has(uid)) continue;
		const node = getNode(uid);
		if (!node) continue;
		const preview = state.previews.get(uid);
		if (!preview || preview === node.rawLine) continue;
		toSave.push(uid);
		linesMap[uid] = preview;
		snapshotMap[uid] = node.rawLine;
		previews[uid] = preview;
	}

	if (toSave.length === 0) return { state, previews };
	if (toSave.length > 500) {
		for (let i = 0; i < toSave.length; i += 500) {
			const batch = toSave.slice(i, i + 500);
			const batchSnapshot: Record<string, string> = {};
			for (const uid of batch) batchSnapshot[uid] = snapshotMap[uid];
			addSnapshot(batchSnapshot);
		}
	} else {
		addSnapshot(snapshotMap);
	}

	await writeToFiles(app, getNode, toSave, linesMap);
	for (const uid of toSave) state.savedTasks.add(uid);
	return { state, previews };
}

export async function revertSingleTask(
	state: EditState,
	app: AppLike,
	getNode: (uid: string) => TaskTreeNode | undefined,
	node: TaskTreeNode,
): Promise<EditState> {
	if (!state.savedTasks.has(node.uid)) return state;
	let originalLine = node.rawLine;
	for (const snap of loadSnapshots()) {
		if (snap.snapshot[node.uid]) {
			originalLine = snap.snapshot[node.uid];
			break;
		}
	}
	await writeToFiles(app, getNode, [node.uid], { [node.uid]: originalLine });
	state.savedTasks.delete(node.uid);
	state.previews.delete(node.uid);
	state.selectedTasks.add(node.uid);
	state.previews.set(node.uid, originalLine);
	return state;
}

export async function revertFromSnapshot(
	state: EditState,
	app: AppLike,
	getNode: (uid: string) => TaskTreeNode | undefined,
	snapshotIndex: number,
): Promise<EditState> {
	const snapshots = loadSnapshots();
	if (snapshotIndex < 0 || snapshotIndex >= snapshots.length) return state;
	const snap = snapshots[snapshotIndex];
	const linesMap: Record<string, string> = {};
	for (const uid of Object.keys(snap.snapshot))
		linesMap[uid] = snap.snapshot[uid];
	await writeToFiles(app, getNode, Object.keys(snap.snapshot), linesMap);
	snapshots.splice(0, snapshotIndex + 1);
	saveSnapshots(snapshots);
	state.savedTasks.clear();
	state.previews.clear();
	state.selectedTasks.clear();
	return state;
}
