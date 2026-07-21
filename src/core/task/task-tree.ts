// src/core/task/task-tree.ts

import { HideConfig, TaskStatus } from "../../type/type";
import { ContentNode, ParsedFileData } from "../parser/md-parser";
import { getTaskMarks } from "./task-derived";

export interface TaskTreeNode {
	readonly uid: string;
	type: "file" | "heading" | "list";
	path: string;
	line: number;
	rawLine: string;
	depth: number;
	parent: TaskTreeNode | null;
	children: TaskTreeNode[];
	text: string;
	display: boolean;
	match: boolean;
	status: TaskStatus;
	content: string;
	priority: number;
	repeat: string;
	created: number | null;
	scheduled: number | null;
	starts: number | null;
	due: number | null;
	done: number | null;
	cancelled: number | null;
	id: string;
	forbid: string;
	tag: string;
	headingLevel?: number;
	headingText?: string;
	fileRelations?: FileRelations;
	yamlStartLine: number;
	yamlEndLine: number;
	isFrontmatter: boolean;
	hasYaml: boolean;
}

export interface FileRelations {
	declaredParentName: string | null;
	declaredParent: TaskTreeNode | null;
	declaredChildren: TaskTreeNode[];
	linkedChildrenNames: string[];
	linkedChildren: TaskTreeNode[];
	linkedParents: TaskTreeNode[];
	conflict: "meta_mismatch" | "meta_missing" | "link_missing" | null;
	missingLinks: string[];
}

export interface TreeFilterOptions {
	statuses?: string[];
	searchText?: string[];
	priorityValues?: string[];
	repeatCycles?: string[];
	includeMarks?: string[];
}

export const ROOT_NODE_UID = "__task_root__";

export function normalizeFileName(raw: string): string {
	let n = (raw || "").trim();
	n = n.split("/").pop()!.replace(/\.md$/i, "");
	n = n.replace(/[\u200B-\u200D\uFEFF]/g, "");
	n = n.split("#")[0].split("|")[0];
	return n.toLowerCase();
}

export function extractAllLinks(content: string): string[] {
	if (!content) return [];
	const l: string[] = [];
	let m: RegExpExecArray | null;
	const wr = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
	while ((m = wr.exec(content)) !== null) {
		const nm = normalizeFileName(m[1].trim());
		if (nm.endsWith("任务")) l.push(nm);
	}
	const mr = /\[([^\]]*)\]\(([^)]+\.md)\)/g;
	while ((m = mr.exec(content)) !== null) {
		const nm = normalizeFileName(m[2].trim());
		if (nm.endsWith("任务")) l.push(nm);
	}
	return [...new Set(l)];
}

export function parseParentField(raw: unknown): string | null {
	if (!raw) return null;
	const s = String(raw).trim();
	const m = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g.exec(s);
	const nm = normalizeFileName(m ? m[1].trim() : s);
	return nm.endsWith("任务") ? nm : null;
}

export function buildTaskTree(files: ParsedFileData[]): TaskTreeNode {
	const nodeMap = new Map<string, TaskTreeNode>();
	for (const file of files) {
		const name = file.name.replace(/\.md$/, "");
		const uid = file.path + ":0";
		const hcr = file.contentRoots?.length > 0;
		if (!file.fileTask && !hcr) continue;
		const td = file.fileTask || {
			status: "none" as TaskStatus,
			content: name,
			priority: 5,
			repeat: "",
			created: null,
			scheduled: null,
			starts: null,
			due: null,
			done: null,
			cancelled: null,
			tag: "",
			id: "",
			forbid: "",
		};
		const hf = file.hasFrontmatter ?? false;
		const fn: TaskTreeNode = {
			uid,
			type: "file",
			path: file.path,
			line: 0,
			rawLine: file.fileTask?.rawLine || name,
			depth: 0,
			parent: null,
			children: [],
			text: name,
			display: true,
			match: true,
			status: td.status,
			content: td.content,
			priority: td.priority,
			repeat: td.repeat,
			created: td.created,
			scheduled: td.scheduled,
			starts: td.starts,
			due: td.due,
			done: td.done,
			cancelled: td.cancelled,
			id: td.id,
			forbid: td.forbid,
			tag: td.tag,
			yamlStartLine: hf ? 0 : -1,
			yamlEndLine: hf ? (file.yamlEndLine ?? -1) : -1,
			isFrontmatter: true,
			hasYaml: hf,
		};
		if (hcr) fn.children = convertContentNodes(file.contentRoots!, fn);
		nodeMap.set(file.path, fn);
	}
	for (const file of files) {
		const node = nodeMap.get(file.path);
		if (!node) continue;
		if (!node.fileRelations)
			node.fileRelations = {
				declaredParentName: null,
				declaredParent: null,
				declaredChildren: [],
				linkedChildrenNames: [],
				linkedChildren: [],
				linkedParents: [],
				conflict: null,
				missingLinks: [],
			};
		const r = node.fileRelations;
		if (!r.declaredParentName) {
			const mp = parseParentField(
				file.yaml["父任务"] || file.yaml["任务父任务"],
			);
			if (mp) {
				r.declaredParentName = mp;
				const pn = findNodeByName(nodeMap, mp);
				if (pn) {
					r.declaredParent = pn;
					if (!pn.fileRelations) initFileRelations(pn);
					if (!pn.fileRelations!.declaredChildren.includes(node))
						pn.fileRelations!.declaredChildren.push(node);
				} else {
					if (!r.missingLinks.includes(mp)) r.missingLinks.push(mp);
				}
			}
		}
		const bl = getBodyLinks(file.content);
		for (const ln of bl) {
			if (!r.linkedChildrenNames.includes(ln))
				r.linkedChildrenNames.push(ln);
			const cn = findNodeByName(nodeMap, ln);
			if (cn) {
				if (!r.linkedChildren.includes(cn)) r.linkedChildren.push(cn);
				if (!cn.fileRelations) initFileRelations(cn);
				if (!cn.fileRelations!.linkedParents.includes(node))
					cn.fileRelations!.linkedParents.push(node);
			} else {
				if (!r.missingLinks.includes(ln)) r.missingLinks.push(ln);
			}
		}
	}
	for (const node of nodeMap.values()) {
		if (!node.fileRelations) continue;
		const r = node.fileRelations;
		const hd = r.declaredParentName !== null;
		const hl = r.linkedParents.length > 0;
		if (hd && hl) {
			if (
				!r.linkedParents.some(
					(p) => normalizeFileName(p.text) === r.declaredParentName!,
				)
			)
				r.conflict = "meta_mismatch";
		} else if (hl && !hd) {
			r.conflict = "meta_missing";
		} else if (hd && !hl) {
			r.conflict = "link_missing";
		}
	}
	const roots: TaskTreeNode[] = [];
	for (const node of nodeMap.values()) {
		const dp = node.fileRelations?.declaredParent ?? null;
		const lp = node.fileRelations?.linkedParents ?? [];
		if (dp) {
			if (!isAncestor(node, dp)) {
				node.parent = dp;
				dp.children.push(node);
			}
		} else if (lp.length > 0) {
			const lpn = lp[0];
			if (!isAncestor(node, lpn)) {
				node.parent = lpn;
				lpn.children.push(node);
			}
		} else {
			roots.push(node);
		}
	}
	const rootNode = createRootNode(roots);
	for (const child of roots) child.parent = rootNode;
	computeDepth(rootNode, 0);
	return rootNode;
}

function createRootNode(children: TaskTreeNode[]): TaskTreeNode {
	return {
		uid: ROOT_NODE_UID,
		type: "file",
		path: "",
		line: 0,
		rawLine: "",
		depth: 0,
		parent: null,
		children,
		text: "🗂️ 任务管理",
		display: true,
		match: true,
		status: "none",
		content: "任务管理",
		priority: 5,
		repeat: "",
		created: null,
		scheduled: null,
		starts: null,
		due: null,
		done: null,
		cancelled: null,
		id: "",
		forbid: "",
		tag: "",
		yamlStartLine: -1,
		yamlEndLine: -1,
		isFrontmatter: false,
		hasYaml: false,
	};
}

function initFileRelations(node: TaskTreeNode): void {
	if (!node.fileRelations)
		node.fileRelations = {
			declaredParentName: null,
			declaredParent: null,
			declaredChildren: [],
			linkedChildrenNames: [],
			linkedChildren: [],
			linkedParents: [],
			conflict: null,
			missingLinks: [],
		};
}

function getBodyLinks(content: string): string[] {
	if (!content) return [];
	let b = content;
	if (b.startsWith("---")) {
		const ei = b.indexOf("---", 3);
		if (ei !== -1) b = b.substring(ei + 3);
	}
	b = b.replace(/```[\s\S]*?```/g, "");
	return extractAllLinks(b);
}

function isAncestor(node: TaskTreeNode, target: TaskTreeNode): boolean {
	let c: TaskTreeNode | null = target;
	const v = new Set<TaskTreeNode>();
	while (c) {
		if (c === node) return true;
		if (v.has(c)) return true;
		v.add(c);
		c = c.parent;
	}
	return false;
}

function computeDepth(node: TaskTreeNode, depth: number): void {
	node.depth = depth;
	for (const c of node.children) computeDepth(c, depth + 1);
}

function findNodeByName(
	map: Map<string, TaskTreeNode>,
	name: string,
): TaskTreeNode | null {
	const l = name.toLowerCase();
	for (const n of map.values()) {
		if (n.type === "file" && normalizeFileName(n.text) === l) return n;
	}
	return null;
}

function convertContentNodes(
	nodes: ContentNode[],
	parent: TaskTreeNode,
): TaskTreeNode[] {
	const r: TaskTreeNode[] = [];
	for (const cn of nodes) {
		if (cn.type === "heading" && !cn.task) {
			if (cn.children.length > 0)
				r.push(...convertContentNodes(cn.children, parent));
			continue;
		}
		const hy =
			cn.yamlStartLine !== undefined &&
			cn.yamlStartLine >= 0 &&
			cn.yamlEndLine !== undefined &&
			cn.yamlEndLine >= 0;
		const ch: TaskTreeNode = {
			uid: parent.path + ":" + cn.line,
			type: cn.type === "task" ? "list" : "heading",
			path: parent.path,
			line: cn.line,
			rawLine: cn.raw,
			depth: parent.depth + 1,
			parent,
			children: [],
			text: cn.text,
			display: true,
			match: true,
			status: cn.task?.status ?? "none",
			content: cn.task?.content ?? cn.text,
			priority: cn.task?.priority ?? 5,
			repeat: cn.task?.repeat ?? "",
			created: cn.task?.created ?? null,
			scheduled: cn.task?.scheduled ?? null,
			starts: cn.task?.starts ?? null,
			due: cn.task?.due ?? null,
			done: cn.task?.done ?? null,
			cancelled: cn.task?.cancelled ?? null,
			id: cn.task?.id ?? "",
			forbid: cn.task?.forbid ?? "",
			tag: cn.task?.tag ?? "",
			headingLevel: cn.type === "heading" ? cn.depth : undefined,
			headingText: cn.type === "heading" ? cn.text : undefined,
			yamlStartLine: hy ? cn.yamlStartLine! : cn.line,
			yamlEndLine: hy ? cn.yamlEndLine! : -1,
			isFrontmatter: false,
			hasYaml: hy,
		};
		ch.children = convertContentNodes(cn.children, ch);
		r.push(ch);
	}
	return r;
}

export function filterTree(
	root: TaskTreeNode,
	options: TreeFilterOptions,
): TaskTreeNode {
	const fc: TaskTreeNode[] = [];
	for (const c of root.children) {
		const f = filterNode(c, options);
		if (f) fc.push(f);
	}
	return { ...root, children: fc };
}

function filterNode(
	node: TaskTreeNode,
	options: TreeFilterOptions,
): TaskTreeNode | null {
	const fc: TaskTreeNode[] = [];
	for (const c of node.children) {
		const f = filterNode(c, options);
		if (f) fc.push(f);
	}
	const hc = fc.length > 0;
	const sf = taskMatchesFilter(node, options);
	node.match = sf;
	if (!hc && !sf) return null;
	return { ...node, children: fc };
}

function taskMatchesFilter(
	node: TaskTreeNode,
	options: TreeFilterOptions,
): boolean {
	const ag: Array<() => boolean> = [];
	if (options.statuses?.length)
		ag.push(() => options.statuses!.includes(node.status));
	if (options.priorityValues?.length)
		ag.push(() => {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			return options.priorityValues!.includes(icons[node.priority] || "");
		});
	if (options.repeatCycles?.length)
		ag.push(() => {
			if (!node.repeat) return false;
			const tc = node.repeat.toLowerCase().replace(/^🔁\s*/, "");
			return options.repeatCycles!.some((c) => {
				const fc = c.toLowerCase().replace(/^🔁\s*/, "");
				if (tc === fc) return true;
				if (
					fc === "every day" &&
					/\bevery\s+(\d+\s+)?days?\b/i.test(tc)
				)
					return true;
				if (
					fc === "every week" &&
					/\bevery\s+(\d+\s+)?weeks?\b/i.test(tc)
				)
					return true;
				if (
					fc === "every month" &&
					/\bevery\s+(\d+\s+)?months?\b/i.test(tc)
				)
					return true;
				if (
					fc === "every year" &&
					/\bevery\s+(\d+\s+)?years?\b/i.test(tc)
				)
					return true;
				return false;
			});
		});
	const im = options.includeMarks || [];
	const marks = getTaskMarks(node);
	const adm = ["created", "scheduled", "starts", "cancelled", "done", "due"];
	const dms = adm.filter((k) => im.includes(k));
	if (dms.length)
		ag.push(() => dms.some((m) => marks[m as keyof typeof marks]));
	const dpm = ["id", "forbid"];
	const dpms = dpm.filter((k) => im.includes(k));
	if (dpms.length)
		ag.push(() => dpms.some((m) => marks[m as keyof typeof marks]));
	if (im.includes("tag")) ag.push(() => !!node.tag);
	if (options.searchText?.length) {
		const kw = options.searchText.filter((k: string) => k.length > 0);
		if (kw.length)
			ag.push(() => {
				const t = (node.content || node.text || "").toLowerCase();
				return kw.every((k: string) => t.includes(k.toLowerCase()));
			});
	}
	if (ag.length === 0) return true;
	return ag.some((check) => check());
}

export function filterTreeByDateRange(
	root: TaskTreeNode,
	dateRange: { start: number | null; end: number | null; isAll: boolean },
	intervalMode: string = "scheduled-due",
): TaskTreeNode {
	if (dateRange.isAll || dateRange.start == null || dateRange.end == null)
		return root;
	const fc: TaskTreeNode[] = [];
	for (const c of root.children) {
		const f = filterNodeByDate(
			c,
			{ start: dateRange.start, end: dateRange.end },
			intervalMode,
		);
		if (f) fc.push(f);
	}
	return { ...root, children: fc };
}

function filterNodeByDate(
	node: TaskTreeNode,
	dateRange: { start: number; end: number },
	intervalMode: string,
): TaskTreeNode | null {
	const fc: TaskTreeNode[] = [];
	for (const c of node.children) {
		const f = filterNodeByDate(c, dateRange, intervalMode);
		if (f) fc.push(f);
	}
	const hc = fc.length > 0;
	const sf = taskInDateRange(node, dateRange, intervalMode);
	if (!hc && !sf) return null;
	return { ...node, children: fc };
}

function taskInDateRange(
	node: TaskTreeNode,
	dateRange: { start: number; end: number },
	intervalMode: string,
): boolean {
	if (intervalMode === "none") return true;
	if (intervalMode === "starts-done") {
		const s = node.starts;
		const e = node.done ?? node.cancelled;
		if (s === null || e === null) return false;
		return s <= dateRange.end && e >= dateRange.start;
	}
	if (intervalMode === "any-date") {
		const ds = [
			node.created,
			node.scheduled,
			node.starts,
			node.due,
			node.done,
			node.cancelled,
		];
		for (const d of ds) {
			if (d !== null && d >= dateRange.start && d <= dateRange.end)
				return true;
		}
		return false;
	}
	const s = node.scheduled;
	const e = node.due;
	if (s === null || e === null) return false;
	return s <= dateRange.end && e >= dateRange.start;
}

export function applyHideConfig(
	root: TaskTreeNode,
	hideConfig: HideConfig,
): void {
	applyHideConfigToNode(root, hideConfig);
}

function applyHideConfigToNode(
	node: TaskTreeNode,
	hideConfig: HideConfig,
): void {
	node.display = !isNodeHidden(node, hideConfig);
	for (const c of node.children) applyHideConfigToNode(c, hideConfig);
}

function isNodeHidden(node: TaskTreeNode, hideConfig: HideConfig): boolean {
	const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
	const icon = icons[node.priority] || "";
	if (
		hideConfig.hideStatuses.length > 0 &&
		hideConfig.hideStatuses.includes(node.status)
	)
		return true;
	if (
		hideConfig.hidePriorityValues.length > 0 &&
		hideConfig.hidePriorityValues.includes(icon)
	)
		return true;
	if (hideConfig.hideRepeatCycles.length > 0 && node.repeat) {
		const tc = node.repeat.toLowerCase().replace(/^🔁\s*/, "");
		if (
			hideConfig.hideRepeatCycles.some((c) => {
				const fc = c.toLowerCase().replace(/^🔁\s*/, "");
				if (tc === fc) return true;
				if (
					fc === "every day" &&
					/\bevery\s+(\d+\s+)?days?\b/i.test(tc)
				)
					return true;
				if (
					fc === "every week" &&
					/\bevery\s+(\d+\s+)?weeks?\b/i.test(tc)
				)
					return true;
				if (
					fc === "every month" &&
					/\bevery\s+(\d+\s+)?months?\b/i.test(tc)
				)
					return true;
				if (
					fc === "every year" &&
					/\bevery\s+(\d+\s+)?years?\b/i.test(tc)
				)
					return true;
				return false;
			})
		)
			return true;
	}
	if (hideConfig.hideMarks.length > 0) {
		const marks = getTaskMarks(node);
		for (const m of hideConfig.hideMarks) {
			if (marks[m as keyof typeof marks]) return true;
		}
	}
	if (hideConfig.hideSearchText) {
		const kw = hideConfig.hideSearchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		if (kw.length > 0) {
			const t = (node.content || node.text || "").toLowerCase();
			if (kw.every((k) => t.includes(k))) return true;
		}
	}
	return false;
}

export function flattenTree(root: TaskTreeNode): TaskTreeNode[] {
	const r: TaskTreeNode[] = [];
	const s = new Set<string>();
	function walk(n: TaskTreeNode) {
		if (!s.has(n.uid)) {
			s.add(n.uid);
			r.push(n);
		}
		for (const c of n.children) walk(c);
	}
	walk(root);
	return r;
}
