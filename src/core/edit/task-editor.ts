// src/core/edit/task-editor.ts

import { EditState } from "../../type/type";
import logger from "../../util/logger";
import { TASK_ELEMENT_ORDER } from "../config/config";
import { TASKS_RX } from "../config/tasks-config";
import { TaskTreeNode } from "../task/task-tree";

/** 标记排序顺序：与 TASK_ELEMENT_ORDER 保持一致（排除执行状态） */
const MARK_SORT_ORDER: string[] = TASK_ELEMENT_ORDER.filter(
	(k) => k !== "status",
);

const AUTOCOMPLETE_DAYS = 0;
const MAX_SNAPSHOTS = 5;

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

export const Op = {
	setStatus(line: string, status: string): string {
		const symbol = STATUS_SYMBOLS[status] ?? " ";
		return line.replace(/^(- \[).(\] )/, `$1${symbol}$2`);
	},
	setContent(line: string, newContent: string): string {
		const order = MARK_SORT_ORDER;
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
		const prefixMatch: RegExpMatchArray | null =
			line.match(/^(- \[.\]\s*)/);
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
			if (lines[i].indexOf(":") === -1) continue;
			if (
				lines[i].substring(0, lines[i].indexOf(":")).trim() === yaName
			) {
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
			if (lines[i].indexOf(":") === -1) continue;
			const fn = lines[i].substring(0, lines[i].indexOf(":")).trim();
			if (fn === "任务简介" || fn === "任务名称") {
				lines[i] = `${fn}: ${newContent}`;
				found = true;
				break;
			}
		}
		if (!found) lines.push(`任务简介: ${newContent}`);
		return lines.filter((l) => l.trim() !== "").join("\n");
	},
	autoComplete(line: string, days?: number): string {
		const dm: RegExpMatchArray | null = line.match(TASKS_RX.done);
		const cm: RegExpMatchArray | null = line.match(TASKS_RX.cancelled);
		if (!dm && !cm) return line;
		const ds: string | undefined = dm ? dm[1] : cm?.[1];
		if (!ds) return line;
		const bd: Date | null = parseDateNative(ds);
		if (!bd) return line;
		const n = days ?? AUTOCOMPLETE_DAYS;
		let nl = Op.sortTags(line);
		const bs = formatDateNative(bd);
		if (!TASKS_RX.due.test(nl)) nl += " 📅 " + bs;
		else nl = replaceMark(nl, TASKS_RX.due, "📅 " + bs);
		const sd = new Date(bd);
		sd.setDate(sd.getDate() - n);
		const ss = formatDateNative(sd);
		if (!TASKS_RX.starts.test(nl)) nl += " 🛫 " + ss;
		else nl = replaceMark(nl, TASKS_RX.starts, "🛫 " + ss);
		if (!TASKS_RX.scheduled.test(nl)) nl += " ⏳ " + ss;
		else nl = replaceMark(nl, TASKS_RX.scheduled, "⏳ " + ss);
		if (!TASKS_RX.created.test(nl)) nl += " ➕ " + ss;
		else nl = replaceMark(nl, TASKS_RX.created, "➕ " + ss);
		return Op.sortTags(nl);
	},
	sortTags(line: string): string {
		const order = MARK_SORT_ORDER;
		const parts: string[] = [];
		for (const key of order) {
			const rx = TASKS_RX[key];
			parts.push(rx ? (line.match(rx)?.[0] ?? "") : "");
		}
		const pm: RegExpMatchArray | null = line.match(/^(\s*- \[.\]\s*)/);
		const prefix = pm ? pm[1] : "- [ ] ";
		let desc = line.substring(prefix.length);
		for (const part of parts) {
			if (part) desc = desc.replace(part, "");
		}
		desc = desc.trim();
		return prefix + desc + " " + parts.filter(Boolean).join(" ");
	},
};

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
	type LI = { line: number; newLine: string; rawLine: string };
	type YI = {
		startLine: number;
		endLine: number;
		newYaml: string;
		isFrontmatter: boolean;
		hasYaml: boolean;
	};
	const lg: Record<string, LI[]> = {};
	const yg: Record<string, YI[]> = {};
	for (const id of taskIds) {
		const node = getNode(id);
		if (!node) continue;
		const nc = linesMap[id];
		if (!nc || nc === node.rawLine) continue;
		if (node.type === "list") {
			if (!lg[node.path]) lg[node.path] = [];
			lg[node.path].push({
				line: node.line,
				newLine: nc,
				rawLine: node.rawLine,
			});
		} else {
			if (!yg[node.path]) yg[node.path] = [];
			yg[node.path].push({
				startLine: node.yamlStartLine,
				endLine: node.yamlEndLine,
				newYaml: nc,
				isFrontmatter: node.isFrontmatter,
				hasYaml: node.hasYaml,
			});
		}
	}
	let count = 0;
	for (const [path, items] of Object.entries(lg)) {
		try {
			const file = app.vault.getAbstractFileByPath(path);
			if (!file) continue;
			await app.vault.process(file, (data: string): string => {
				const dls: string[] = data.split("\n");
				for (const item of items) {
					let tl: number = item.line;
					const rt: string = item.rawLine.trim();
					if (tl < dls.length && dls[tl].trim() !== rt) {
						const fi = dls.findIndex(
							(dl: string) => dl.trim() === rt,
						);
						if (fi >= 0) tl = fi;
					} else if (tl >= dls.length) {
						const fi = dls.findIndex(
							(dl: string) => dl.trim() === rt,
						);
						if (fi >= 0) tl = fi;
					}
					const ol: string = dls[tl] ?? "";
					const im: RegExpMatchArray | null = ol.match(/^(\s*)/);
					dls[tl] = (im?.[1] ?? "") + item.newLine.trim();
				}
				return dls.join("\n");
			});
			count += items.length;
		} catch (e: unknown) {
			logger.error("[TaskManage] 写入文件失败:", path, e);
		}
	}
	for (const [path, items] of Object.entries(yg)) {
		try {
			const file = app.vault.getAbstractFileByPath(path);
			if (!file) continue;
			await app.vault.process(file, (data: string): string => {
				const dls: string[] = data.split("\n");
				for (const item of items) {
					const nyl: string[] = item.newYaml
						.split("\n")
						.filter((l: string) => l.trim() !== "");
					if (!item.hasYaml) {
						if (nyl.length === 0) continue;
						if (item.isFrontmatter)
							dls.unshift("---", ...nyl, "---");
						else
							dls.splice(
								(item.startLine >= 0 ? item.startLine : 0) + 1,
								0,
								"```yaml",
								...nyl,
								"```",
							);
					} else {
						if (nyl.length === 0)
							dls.splice(
								item.startLine,
								item.endLine - item.startLine + 1,
							);
						else
							dls.splice(
								item.startLine + 1,
								Math.max(0, item.endLine - item.startLine - 1),
								...nyl,
							);
					}
				}
				return dls.join("\n");
			});
			count += items.length;
		} catch (e: unknown) {
			logger.error("[TaskManage] 写入YAML文件失败:", path, e);
		}
	}
	return count;
}

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
	const ts: string[] = [];
	const lm: Record<string, string> = {};
	const sm: Record<string, string> = {};
	const pv: Record<string, string> = {};
	for (const uid of state.selectedTasks) {
		if (state.savedTasks.has(uid)) continue;
		const node = getNode(uid);
		if (!node) continue;
		const preview = state.previews.get(uid);
		if (!preview || preview === node.rawLine) continue;
		ts.push(uid);
		lm[uid] = preview;
		sm[uid] = node.rawLine;
		pv[uid] = preview;
	}
	if (ts.length === 0) return { state, previews: pv };
	if (ts.length > 500) {
		for (let i = 0; i < ts.length; i += 500) {
			const b = ts.slice(i, i + 500);
			const bs: Record<string, string> = {};
			for (const uid of b) bs[uid] = sm[uid];
			addSnapshot(bs);
		}
	} else {
		addSnapshot(sm);
	}
	await writeToFiles(app, getNode, ts, lm);
	for (const uid of ts) state.savedTasks.add(uid);
	return { state, previews: pv };
}
export async function revertSingleTask(
	state: EditState,
	app: AppLike,
	getNode: (uid: string) => TaskTreeNode | undefined,
	node: TaskTreeNode,
): Promise<EditState> {
	if (!state.savedTasks.has(node.uid)) return state;
	let ol = node.rawLine;
	for (const snap of loadSnapshots()) {
		if (snap.snapshot[node.uid]) {
			ol = snap.snapshot[node.uid];
			break;
		}
	}
	await writeToFiles(app, getNode, [node.uid], { [node.uid]: ol });
	state.savedTasks.delete(node.uid);
	state.previews.delete(node.uid);
	state.selectedTasks.add(node.uid);
	state.previews.set(node.uid, ol);
	return state;
}
export async function revertFromSnapshot(
	state: EditState,
	app: AppLike,
	getNode: (uid: string) => TaskTreeNode | undefined,
	si: number,
): Promise<EditState> {
	const snapshots = loadSnapshots();
	if (si < 0 || si >= snapshots.length) return state;
	const snap = snapshots[si];
	const lm: Record<string, string> = {};
	for (const uid of Object.keys(snap.snapshot)) lm[uid] = snap.snapshot[uid];
	await writeToFiles(app, getNode, Object.keys(snap.snapshot), lm);
	snapshots.splice(0, si + 1);
	saveSnapshots(snapshots);
	state.savedTasks.clear();
	state.previews.clear();
	state.selectedTasks.clear();
	return state;
}
