// src/process/task/task-tree.ts

import { HideConfig, TaskStatus } from "../../types";
import { TASK_ROOT_PATH } from "../config/config";
import { ContentNode, ParsedFileData } from "./md-parser";
import { getTaskMarks } from "./task-derived";

// ========== 类型定义 ==========

/**
 * 统一任务树节点
 *
 * 层级关系示例：
 *   depth=0  file    个人任务管理任务.md
 *   depth=1  heading    ## 收集任务
 *   depth=2  list         - [ ] 整理邮箱
 *   depth=3  list           - [ ] 子任务（缩进）
 */
export interface TaskTreeNode {
	// ===== 节点标识 =====
	readonly uid: string;
	type: "file" | "heading" | "list";

	// ===== 定位信息 =====
	path: string;
	line: number;
	rawLine: string;

	// ===== 树结构 =====
	depth: number;
	parent: TaskTreeNode | null;
	children: TaskTreeNode[];

	// ===== 显示 =====
	text: string;
	/** 是否在视图中显示，false 表示被隐藏筛选过滤，默认 true */
	display: boolean;

	// ===== 执行状态 =====
	status: TaskStatus;

	// ===== 任务属性 =====
	content: string;
	priority: number;
	repeat: string;

	// ===== 日期字段 =====
	created: number | null;
	scheduled: number | null;
	starts: number | null;
	due: number | null;
	done: number | null;
	cancelled: number | null;

	// ===== 标识字段 =====
	id: string;
	forbid: string;
	tag: string;

	// ===== 标题特有 =====
	headingLevel?: number;
	headingText?: string;

	// ===== 文件间引用关系 =====
	fileRelations?: FileRelations;
}

/**
 * 文件间引用关系（仅 type === 'file' 的节点）
 */
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

/** 树筛选选项 */
export interface TreeFilterOptions {
	statuses?: string[];
	hideRepeat?: boolean;
	hideCompleted?: boolean;
	hideCancelled?: boolean;
	searchText?: string;
	priorityValues?: string[];
	repeatCycles?: string[];
	includeMarks?: string[];
}

// ========== 文件名规范化 ==========

export function normalizeFileName(raw: string): string {
	let name = (raw || "").trim();
	name = name.split("/").pop()!.replace(/\.md$/i, "");
	name = name.replace(/[\u200B-\u200D\uFEFF]/g, "");
	name = name.split("#")[0].split("|")[0];
	return name.toLowerCase();
}

export function extractAllLinks(content: string): string[] {
	if (!content) return [];
	const links: string[] = [];

	const wikiRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
	let match: RegExpExecArray | null;
	while ((match = wikiRegex.exec(content)) !== null) {
		const name = normalizeFileName(match[1].trim());
		if (name.endsWith("任务")) links.push(name);
	}

	const mdRegex = /\[([^\]]*)\]\(([^)]+\.md)\)/g;
	while ((match = mdRegex.exec(content)) !== null) {
		const name = normalizeFileName(match[2].trim());
		if (name.endsWith("任务")) links.push(name);
	}

	return [...new Set(links)];
}

export function parseParentField(raw: any): string | null {
	if (!raw) return null;
	const str = String(raw).trim();
	const m = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g.exec(str);
	const name = normalizeFileName(m ? m[1].trim() : str);
	return name.endsWith("任务") ? name : null;
}

// ========== 构建统一任务树 ==========

export function buildTaskTree(
	files: ParsedFileData[],
	prefix?: string,
): TaskTreeNode[] {
	const effectivePrefix = prefix || TASK_ROOT_PATH + "/";
	const nodeMap = new Map<string, TaskTreeNode>();

	// 1. 为每个文件创建文件级节点
	for (const file of files) {
		const name = file.name.replace(/\.md$/, "");
		const uid = file.path + ":0";

		const fileNode: TaskTreeNode = {
			uid,
			type: "file",
			path: file.path,
			line: 0,
			rawLine: "",
			depth: 0,
			parent: null,
			children: [],
			text: name,
			display: true,
			status: file.fileTask?.status ?? "todo",
			content: file.fileTask?.content ?? name,
			priority: file.fileTask?.priority ?? 5,
			repeat: file.fileTask?.repeat ?? "",
			created: file.fileTask?.created ?? null,
			scheduled: file.fileTask?.scheduled ?? null,
			starts: file.fileTask?.starts ?? null,
			due: file.fileTask?.due ?? null,
			done: file.fileTask?.done ?? null,
			cancelled: file.fileTask?.cancelled ?? null,
			id: file.fileTask?.id ?? "",
			forbid: file.fileTask?.forbid ?? "",
			tag: file.fileTask?.tag ?? "",
		};

		if (file.contentRoots && file.contentRoots.length > 0) {
			fileNode.children = convertContentNodes(
				file.contentRoots,
				fileNode,
			);
		}

		nodeMap.set(file.path, fileNode);
	}

	// 2. 解析文件间关系
	for (const file of files) {
		const node = nodeMap.get(file.path);
		if (!node) continue;

		const relations: FileRelations = {
			declaredParentName: null,
			declaredParent: null,
			declaredChildren: [],
			linkedChildrenNames: [],
			linkedChildren: [],
			linkedParents: [],
			conflict: null,
			missingLinks: [],
		};

		const metaParent = parseParentField(
			file.yaml["父任务"] || file.yaml["任务父任务"],
		);
		if (metaParent) {
			relations.declaredParentName = metaParent;
			const parentNode = findNodeByName(nodeMap, metaParent);
			if (parentNode) {
				relations.declaredParent = parentNode;
				if (!parentNode.fileRelations) initFileRelations(parentNode);
				parentNode.fileRelations!.declaredChildren.push(node);
			} else {
				relations.missingLinks.push(metaParent);
			}
		}

		const bodyLinks = getBodyLinks(file.content);
		relations.linkedChildrenNames = bodyLinks;
		for (const linkName of bodyLinks) {
			const childNode = findNodeByName(nodeMap, linkName);
			if (childNode) {
				relations.linkedChildren.push(childNode);
				if (!childNode.fileRelations) initFileRelations(childNode);
				childNode.fileRelations!.linkedParents.push(node);
			} else {
				relations.missingLinks.push(linkName);
			}
		}

		node.fileRelations = relations;
	}

	// 3. 检测冲突
	for (const node of nodeMap.values()) {
		if (!node.fileRelations) continue;
		const r = node.fileRelations;

		const hasDeclared = r.declaredParentName !== null;
		const hasLinked = r.linkedParents.length > 0;

		if (hasDeclared && hasLinked) {
			const declaredName = r.declaredParentName!;
			const linkedMatch = r.linkedParents.some(
				(p) => normalizeFileName(p.text) === declaredName,
			);
			if (!linkedMatch) r.conflict = "meta_mismatch";
		} else if (hasLinked && !hasDeclared) {
			r.conflict = "meta_missing";
		} else if (hasDeclared && !hasLinked) {
			r.conflict = "link_missing";
		}
	}

	// 4. 建立父子关系，计算深度
	const roots: TaskTreeNode[] = [];

	for (const node of nodeMap.values()) {
		if (!node.fileRelations?.declaredParent) {
			roots.push(node);
		} else {
			const parent = node.fileRelations.declaredParent;
			if (!isAncestor(node, parent)) {
				node.parent = parent;
				parent.children.push(node);
			}
		}
	}

	for (const root of roots) {
		computeDepth(root, 0);
	}

	return roots;
}

function initFileRelations(node: TaskTreeNode): void {
	if (!node.fileRelations) {
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
}

function getBodyLinks(content: string): string[] {
	if (!content) return [];
	let body = content;
	if (body.startsWith("---")) {
		const endIdx = body.indexOf("---", 3);
		if (endIdx !== -1) body = body.substring(endIdx + 3);
	}
	body = body.replace(/```[\s\S]*?```/g, "");
	return extractAllLinks(body);
}

function isAncestor(node: TaskTreeNode, target: TaskTreeNode): boolean {
	let current = target;
	const visited = new Set<TaskTreeNode>();
	while (current) {
		if (current === node) return true;
		if (visited.has(current)) return true;
		visited.add(current);
		current = current.parent!;
	}
	return false;
}

function computeDepth(node: TaskTreeNode, depth: number): void {
	node.depth = depth;
	for (const child of node.children) {
		computeDepth(child, depth + 1);
	}
}

function findNodeByName(
	map: Map<string, TaskTreeNode>,
	name: string,
): TaskTreeNode | null {
	const lower = name.toLowerCase();
	for (const node of map.values()) {
		if (node.type === "file" && normalizeFileName(node.text) === lower)
			return node;
	}
	return null;
}

function convertContentNodes(
	nodes: ContentNode[],
	parent: TaskTreeNode,
): TaskTreeNode[] {
	const result: TaskTreeNode[] = [];
	for (const cn of nodes) {
		const child: TaskTreeNode = {
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
			status: cn.task?.status ?? "todo",
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
		};
		child.children = convertContentNodes(cn.children, child);
		result.push(child);
	}
	return result;
}

// ========== 树筛选 ==========

export function filterTree(
	roots: TaskTreeNode[],
	options: TreeFilterOptions,
): TaskTreeNode[] {
	const result: TaskTreeNode[] = [];
	for (const node of roots) {
		const f = filterNode(node, options);
		if (f) result.push(f);
	}
	return result;
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

	const hasChildren = fc.length > 0;
	const self = taskMatchesFilter(node, options);

	if (!hasChildren && !self) return null;

	return { ...node, children: fc };
}

function taskMatchesFilter(
	node: TaskTreeNode,
	options: TreeFilterOptions,
): boolean {
	if (options.hideRepeat && node.repeat) return false;
	if (options.hideCompleted && node.status === "completed") return false;
	if (options.hideCancelled && node.status === "cancelled") return false;

	const activeGroups: Array<() => boolean> = [];

	const statuses = options.statuses || [];
	if (statuses.length > 0) {
		activeGroups.push(() => statuses.includes(node.status));
	}

	const priorityValues = options.priorityValues || [];
	if (priorityValues.length > 0) {
		activeGroups.push(() => {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			return priorityValues.includes(icons[node.priority] || "");
		});
	}

	const repeatCycles = options.repeatCycles || [];
	if (repeatCycles.length > 0) {
		activeGroups.push(() => {
			if (!node.repeat) return false;
			const taskCycle = node.repeat.toLowerCase().replace(/^🔁\s*/, "");
			return repeatCycles.some((c) => {
				const filterCycle = c.toLowerCase().replace(/^🔁\s*/, "");
				if (taskCycle === filterCycle) return true;
				if (
					filterCycle === "every day" &&
					/\bevery\s+(\d+\s+)?days?\b/i.test(taskCycle)
				)
					return true;
				if (
					filterCycle === "every week" &&
					/\bevery\s+(\d+\s+)?weeks?\b/i.test(taskCycle)
				)
					return true;
				if (
					filterCycle === "every month" &&
					/\bevery\s+(\d+\s+)?months?\b/i.test(taskCycle)
				)
					return true;
				if (
					filterCycle === "every year" &&
					/\bevery\s+(\d+\s+)?years?\b/i.test(taskCycle)
				)
					return true;
				return false;
			});
		});
	}

	const includeMarks = options.includeMarks || [];
	const marks = getTaskMarks(node);
	const allDateMarks = [
		"created",
		"scheduled",
		"starts",
		"cancelled",
		"done",
		"due",
	];
	const dateMarksSelected = allDateMarks.filter((k) =>
		includeMarks.includes(k),
	);
	if (dateMarksSelected.length > 0) {
		activeGroups.push(() =>
			dateMarksSelected.some((m) => marks[m as keyof typeof marks]),
		);
	}

	const allDepMarks = ["id", "forbid"];
	const depMarksSelected = allDepMarks.filter((k) =>
		includeMarks.includes(k),
	);
	if (depMarksSelected.length > 0) {
		activeGroups.push(() =>
			depMarksSelected.some((m) => marks[m as keyof typeof marks]),
		);
	}

	if (includeMarks.includes("tag")) {
		activeGroups.push(() => !!node.tag);
	}

	if (options.searchText) {
		const kw = options.searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		if (kw.length > 0) {
			activeGroups.push(() => {
				const text = (node.content || node.text || "").toLowerCase();
				return kw.every((k) => text.includes(k));
			});
		}
	}

	if (activeGroups.length === 0) return true;
	return activeGroups.some((check) => check());
}

// ========== 时间范围筛选 ==========

export function filterTreeByDateRange(
	roots: TaskTreeNode[],
	dateRange: { start: number | null; end: number | null; isAll: boolean },
	intervalMode: string = "scheduled-due",
): TaskTreeNode[] {
	if (dateRange.isAll || dateRange.start == null || dateRange.end == null)
		return roots;
	const result: TaskTreeNode[] = [];
	for (const node of roots) {
		const filtered = filterNodeByDate(node, dateRange, intervalMode);
		if (filtered) result.push(filtered);
	}
	return result;
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
	const hasChildren = fc.length > 0;
	const self = taskInDateRange(node, dateRange, intervalMode);
	if (!hasChildren && !self) return null;
	return { ...node, children: fc };
}

function taskInDateRange(
	node: TaskTreeNode,
	dateRange: { start: number; end: number },
	intervalMode: string,
): boolean {
	if (intervalMode === "none") return true;

	if (intervalMode === "starts-done") {
		const start = node.starts;
		const end = node.done ?? node.cancelled;
		if (start === null || end === null) return false;
		return start <= dateRange.end && end >= dateRange.start;
	}

	if (intervalMode === "any-date") {
		const dates = [
			node.created,
			node.scheduled,
			node.starts,
			node.due,
			node.done,
			node.cancelled,
		];
		for (const d of dates) {
			if (d !== null && d >= dateRange.start && d <= dateRange.end)
				return true;
		}
		return false;
	}

	const start = node.scheduled;
	const end = node.due;
	if (start === null || end === null) return false;
	return start <= dateRange.end && end >= dateRange.start;
}

// ========== 隐藏配置筛选（设置 display 标志，不删除节点）==========

export function applyHideConfig(
	roots: TaskTreeNode[],
	hideConfig: HideConfig,
): void {
	for (const root of roots) {
		applyHideConfigToNode(root, hideConfig);
	}
}

function applyHideConfigToNode(
	node: TaskTreeNode,
	hideConfig: HideConfig,
): void {
	node.display = !isNodeHidden(node, hideConfig);
	for (const child of node.children) {
		applyHideConfigToNode(child, hideConfig);
	}
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
		const taskCycle = node.repeat.toLowerCase().replace(/^🔁\s*/, "");
		if (
			hideConfig.hideRepeatCycles.some((c) => {
				const filterCycle = c.toLowerCase().replace(/^🔁\s*/, "");
				if (taskCycle === filterCycle) return true;
				if (
					filterCycle === "every day" &&
					/\bevery\s+(\d+\s+)?days?\b/i.test(taskCycle)
				)
					return true;
				if (
					filterCycle === "every week" &&
					/\bevery\s+(\d+\s+)?weeks?\b/i.test(taskCycle)
				)
					return true;
				if (
					filterCycle === "every month" &&
					/\bevery\s+(\d+\s+)?months?\b/i.test(taskCycle)
				)
					return true;
				if (
					filterCycle === "every year" &&
					/\bevery\s+(\d+\s+)?years?\b/i.test(taskCycle)
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
			const text = (node.content || node.text || "").toLowerCase();
			if (kw.every((k) => text.includes(k))) return true;
		}
	}
	return false;
}

// ========== 扁平化 ==========

export function flattenTree(roots: TaskTreeNode[]): TaskTreeNode[] {
	const result: TaskTreeNode[] = [];
	const seen = new Set<string>();

	function walk(node: TaskTreeNode) {
		if (!seen.has(node.uid)) {
			seen.add(node.uid);
			result.push(node);
		}
		for (const child of node.children) walk(child);
	}

	for (const root of roots) walk(root);
	return result;
}
