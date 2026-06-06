// src/process/task/task-tree.ts
// 任务树数据结构 + 构建 + 筛选 + 扁平化

import { HideConfig, TaskItem } from "../../types";
import { TASK_ROOT_PATH } from "../config/config";
import { ContentNode, ParsedFileData } from "./md-parser";

// ========== 类型定义 ==========

export interface TreeNode {
	path: string;
	name: string;
	relPath: string;
	folderParts: string[];
	metaParent: string | null;
	linkParent: string | null;
	children: TreeNode[];
	tasks: TaskItem[];
	conflict: "meta_mismatch" | "meta_missing" | "link_missing" | null;
	missingLinks: string[];
	contentRoots?: ContentNode[];
	_task?: TaskItem;
}

export { ContentNode };

export interface TreeFilterOptions {
	statuses?: string[];
	hideRepeat?: boolean;
	hideCompleted?: boolean;
	hideCancelled?: boolean;
	searchText?: string;
	priorityValues?: string[];
	repeatCycles?: string[];
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

// ========== 去重过滤 ==========

function filterDuplicateListTasks(
	roots: ContentNode[],
	fileTaskName: string,
): ContentNode[] {
	if (!fileTaskName || roots.length === 0) return roots;
	return roots
		.map((cn) => {
			if (cn.type === "task" && cn._task) {
				if (
					cn._task._cleanText === fileTaskName &&
					!cn._task._isFileTask
				)
					return null;
			}
			if (cn.children.length > 0)
				cn.children = filterDuplicateListTasks(
					cn.children,
					fileTaskName,
				);
			return cn;
		})
		.filter((cn): cn is ContentNode => {
			if (!cn) return false;
			if (cn.type === "heading" && cn.children.length === 0 && !cn._task)
				return false;
			return true;
		});
}

// ========== 构建文件树 ==========

export function buildTreeFromParsedFiles(
	files: ParsedFileData[],
	tasks: TaskItem[],
	prefix?: string,
): TreeNode[] {
	const effectivePrefix = prefix || TASK_ROOT_PATH + "/";
	const map = new Map<string, TreeNode>();

	for (const file of files) {
		const path = file.path;
		const name = file.name.replace(/\.md$/, "");
		const metaParent = parseParentField(
			file.yaml["父任务"] || file.yaml["任务父任务"],
		);
		let contentRoots = file.contentRoots;
		const fileTask =
			file.fileTask ||
			({
				_status: "todo",
				_cleanText: name,
				path: file.path,
				line: 0,
				lineNumber: 0,
				fileName: name,
				_isFileTask: true,
				_isHeadingTask: false,
			} as TaskItem);

		if (contentRoots && fileTask) {
			contentRoots = filterDuplicateListTasks(
				contentRoots,
				fileTask._cleanText,
			);
			if (contentRoots && contentRoots.length === 0)
				contentRoots = undefined;
		}

		const node: TreeNode = {
			path,
			name,
			relPath: path.startsWith(effectivePrefix)
				? path.slice(effectivePrefix.length)
				: path,
			folderParts: [],
			metaParent,
			linkParent: null,
			children: [],
			tasks: [],
			conflict: null,
			missingLinks: [],
			contentRoots,
			_task: fileTask,
		};
		map.set(path, node);
	}

	const getBodyLinks = (content: string): string[] => {
		if (!content) return [];
		let body = content;
		if (body.startsWith("---")) {
			const endIdx = body.indexOf("---", 3);
			if (endIdx !== -1) body = body.substring(endIdx + 3);
		}
		body = body.replace(/```[\s\S]*?```/g, "");
		return extractAllLinks(body);
	};

	for (const file of files) {
		const node = map.get(file.path);
		if (!node) continue;
		const normalizedSelfName = normalizeFileName(node.name);
		const allLinks = getBodyLinks(file.content);
		for (const linkName of allLinks) {
			if (linkName === normalizedSelfName) continue;
			const child = findNodeByName(map, linkName);
			if (child && !child.metaParent) {
				child.linkParent = normalizeFileName(node.name);
			}
		}
	}

	const roots: TreeNode[] = [];
	const nodeParentMap = new Map<string, string>();

	map.forEach((node) => {
		let parentPath: string | null = null;
		if (node.metaParent && node.linkParent) {
			parentPath = node.metaParent;
		} else if (node.metaParent) {
			parentPath = node.metaParent;
		} else if (node.linkParent) {
			node.conflict = "meta_missing";
			parentPath = node.linkParent;
		}

		if (parentPath) {
			let current: string | null = parentPath;
			const visited = new Set<string>();
			let hasCycle = false;
			while (current) {
				if (visited.has(current)) {
					hasCycle = true;
					break;
				}
				if (current === normalizeFileName(node.name)) {
					hasCycle = true;
					break;
				}
				visited.add(current);
				current = nodeParentMap.get(current) || null;
			}
			if (!hasCycle) {
				nodeParentMap.set(normalizeFileName(node.name), parentPath);
				const parent = findNodeByName(map, parentPath);
				if (parent) {
					parent.children.push(node);
					return;
				}
			}
		}
		roots.push(node);
	});

	map.forEach((parentNode) => {
		const file = files.find((f) => f.path === parentNode.path);
		if (!file) return;
		const normalizedSelfName = normalizeFileName(parentNode.name);
		const allLinks = getBodyLinks(file.content);
		for (const linkName of allLinks) {
			if (linkName === normalizedSelfName) continue;
			const child = findNodeByName(map, linkName);
			if (
				child &&
				!parentNode.children.some((c) => c.path === child.path)
			)
				parentNode.missingLinks.push(linkName);
		}
		if (parentNode.missingLinks.length > 0 && !parentNode.conflict)
			parentNode.conflict = "link_missing";
	});

	roots.sort((a, b) => a.name.localeCompare(b.name));
	roots.forEach(sortNodeChildren);
	return roots;
}

function findNodeByName(
	map: Map<string, TreeNode>,
	name: string,
): TreeNode | null {
	const lower = name.toLowerCase();
	for (const node of map.values()) {
		if (node.name.toLowerCase() === lower) return node;
	}
	return null;
}

function sortNodeChildren(node: TreeNode): void {
	node.children.sort((a, b) => a.name.localeCompare(b.name));
	node.children.forEach(sortNodeChildren);
}

// ========== 树筛选 ==========

export function filterTree(
	roots: TreeNode[],
	options: TreeFilterOptions,
): TreeNode[] {
	const result: TreeNode[] = [];
	for (const node of roots) {
		const f = filterTreeNode(node, options);
		if (f) result.push(f);
	}
	return result;
}

function filterTreeNode(
	node: TreeNode,
	options: TreeFilterOptions,
): TreeNode | null {
	const fc: TreeNode[] = [];
	for (const c of node.children) {
		const f = filterTreeNode(c, options);
		if (f) fc.push(f);
	}
	let fcr: ContentNode[] | undefined;
	if (node.contentRoots?.length) {
		fcr = [];
		for (const cn of node.contentRoots) {
			const f = filterContentNode(cn, options);
			if (f) fcr.push(f);
		}
		if (!fcr.length) fcr = undefined;
	}
	const hasC = fc.length > 0,
		hasCR = !!fcr;
	const self = node._task ? taskMatchesFilter(node._task, options) : false;
	if (!hasC && !hasCR && !self) return null;
	return {
		...node,
		children: fc,
		contentRoots: fcr || node.contentRoots,
		_task: self ? node._task : undefined,
	};
}

function filterContentNode(
	node: ContentNode,
	options: TreeFilterOptions,
): ContentNode | null {
	const fc: ContentNode[] = [];
	for (const c of node.children) {
		const f = filterContentNode(c, options);
		if (f) fc.push(f);
	}
	let self = false;
	if (node.type === "task" && node._task)
		self = taskMatchesFilter(node._task, options);
	else if (node.type === "heading") self = true;
	if (!self && !fc.length) return null;
	if (node.type === "heading" && !fc.length) return null;
	return { ...node, children: fc, _task: self ? node._task : undefined };
}

function taskMatchesFilter(
	task: TaskItem,
	options: TreeFilterOptions,
): boolean {
	if (!task) return false;
	if (options.statuses?.length && !options.statuses.includes(task._status))
		return false;
	if (options.hideRepeat && task._repeat) return false;
	if (options.hideCompleted && task._status === "completed") return false;
	if (options.hideCancelled && task._status === "cancelled") return false;
	if (options.searchText) {
		const kw = options.searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		const text = (task._cleanText || task.text || "").toLowerCase();
		if (!kw.every((k) => text.includes(k))) return false;
	}
	if (options.priorityValues?.length) {
		const allPriorities = ["🔺", "⏫", "🔼", "🔽", "⏬"];
		const isAllSelected = allPriorities.every((p) =>
			options.priorityValues!.includes(p),
		);
		if (!isAllSelected) {
			const icon = task._priorityIcon;
			if (icon && !options.priorityValues!.includes(icon)) return false;
		}
	}
	if (options.repeatCycles?.length) {
		const allCycles = [
			"every day",
			"every week",
			"every month",
			"every year",
		];
		const isAllSelected = allCycles.every((c) =>
			options.repeatCycles!.includes(c),
		);
		if (!isAllSelected) {
			if (!task._repeat) return false;
			if (
				!options.repeatCycles!.some((c: string) =>
					task._repeat.toLowerCase().includes(c),
				)
			)
				return false;
		}
	}
	return true;
}

// ========== 时间范围筛选 ==========

export function filterTreeByDateRange(
	roots: TreeNode[],
	dateRange: { start: number | null; end: number | null; isAll: boolean },
	intervalMode: string = "scheduled-due",
): TreeNode[] {
	if (dateRange.isAll || dateRange.start == null || dateRange.end == null)
		return roots;
	const result: TreeNode[] = [];
	for (const node of roots) {
		const filtered = filterTreeNodeByDate(node, dateRange, intervalMode);
		if (filtered) result.push(filtered);
	}
	return result;
}

function filterTreeNodeByDate(
	node: TreeNode,
	dateRange: { start: number; end: number },
	intervalMode: string,
): TreeNode | null {
	const fc: TreeNode[] = [];
	for (const c of node.children) {
		const f = filterTreeNodeByDate(c, dateRange, intervalMode);
		if (f) fc.push(f);
	}
	let fcr: ContentNode[] | undefined;
	if (node.contentRoots?.length) {
		fcr = [];
		for (const cn of node.contentRoots) {
			const f = filterContentNodeByDate(cn, dateRange, intervalMode);
			if (f) fcr.push(f);
		}
		if (!fcr.length) fcr = undefined;
	}
	const hasC = fc.length > 0,
		hasCR = !!fcr;
	const self = node._task
		? taskInDateRange(node._task, dateRange, intervalMode)
		: false;
	if (!hasC && !hasCR && !self) return null;
	return {
		...node,
		children: fc,
		contentRoots: fcr || node.contentRoots,
		_task: self ? node._task : undefined,
	};
}

function filterContentNodeByDate(
	node: ContentNode,
	dateRange: { start: number; end: number },
	intervalMode: string,
): ContentNode | null {
	const fc: ContentNode[] = [];
	for (const c of node.children) {
		const f = filterContentNodeByDate(c, dateRange, intervalMode);
		if (f) fc.push(f);
	}
	let self = false;
	if (node.type === "task" && node._task)
		self = taskInDateRange(node._task, dateRange, intervalMode);
	else if (node.type === "heading") self = true;
	if (!self && !fc.length) return null;
	if (node.type === "heading" && !fc.length) return null;
	return { ...node, children: fc, _task: self ? node._task : undefined };
}

function taskInDateRange(
	task: TaskItem,
	dateRange: { start: number; end: number },
	intervalMode: string,
): boolean {
	let startStr: string | null = null;
	let endStr: string | null = null;
	if (intervalMode === "starts-done") {
		startStr = task._starts;
		endStr = task._done || task._due;
	} else {
		startStr = task._scheduled;
		endStr = task._due;
	}
	if (!startStr || !endStr) return false;
	const start = new Date(startStr).getTime();
	const end = new Date(endStr).getTime();
	if (isNaN(start) || isNaN(end)) return false;
	return start <= dateRange.end && end >= dateRange.start;
}

// ========== 隐藏配置筛选 ==========

export function filterTreeByHideConfig(
	roots: TreeNode[],
	hideConfig: HideConfig,
): TreeNode[] {
	const result: TreeNode[] = [];
	for (const node of roots) {
		const filtered = filterTreeNodeByHide(node, hideConfig);
		if (filtered) result.push(filtered);
	}
	return result;
}

function filterTreeNodeByHide(
	node: TreeNode,
	hideConfig: HideConfig,
): TreeNode | null {
	const fc: TreeNode[] = [];
	for (const c of node.children) {
		const f = filterTreeNodeByHide(c, hideConfig);
		if (f) fc.push(f);
	}
	let fcr: ContentNode[] | undefined;
	if (node.contentRoots?.length) {
		fcr = [];
		for (const cn of node.contentRoots) {
			const f = filterContentNodeByHide(cn, hideConfig);
			if (f) fcr.push(f);
		}
		if (!fcr.length) fcr = undefined;
	}
	const hasC = fc.length > 0,
		hasCR = !!fcr;
	const self = node._task ? taskNotHidden(node._task, hideConfig) : false;
	if (!hasC && !hasCR && !self) return null;
	return {
		...node,
		children: fc,
		contentRoots: fcr || node.contentRoots,
		_task: self ? node._task : undefined,
	};
}

function filterContentNodeByHide(
	node: ContentNode,
	hideConfig: HideConfig,
): ContentNode | null {
	const fc: ContentNode[] = [];
	for (const c of node.children) {
		const f = filterContentNodeByHide(c, hideConfig);
		if (f) fc.push(f);
	}
	let self = false;
	if (node.type === "task" && node._task)
		self = taskNotHidden(node._task, hideConfig);
	else if (node.type === "heading") self = true;
	if (!self && !fc.length) return null;
	if (node.type === "heading" && !fc.length) return null;
	return { ...node, children: fc, _task: self ? node._task : undefined };
}

function taskNotHidden(task: TaskItem, hideConfig: HideConfig): boolean {
	if (
		hideConfig.hideStatuses.length > 0 &&
		hideConfig.hideStatuses.includes(task._status)
	)
		return false;
	if (
		hideConfig.hidePriorityValues.length > 0 &&
		hideConfig.hidePriorityValues.includes(task._priorityIcon)
	)
		return false;
	if (hideConfig.hideRepeatCycles.length > 0 && task._repeat) {
		if (
			hideConfig.hideRepeatCycles.some((c) =>
				task._repeat.toLowerCase().includes(c),
			)
		)
			return false;
	}
	if (hideConfig.hideMarks.length > 0) {
		for (const m of hideConfig.hideMarks) {
			if (task._marks?.[m]) return false;
		}
	}
	if (hideConfig.hideSearchText) {
		const kw = hideConfig.hideSearchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		if (kw.length > 0) {
			const text = (task._cleanText || task.text || "").toLowerCase();
			if (kw.every((k) => text.includes(k))) return false;
		}
	}
	return true;
}

// ========== 扁平化 ==========

export function flattenTree(roots: TreeNode[]): TaskItem[] {
	const tasks: TaskItem[] = [];
	const seen = new Set<string>();
	function add(task: TaskItem) {
		if (!task?.path) return;
		const key =
			(task.path || "") + ":" + (task.lineNumber ?? task.line ?? 0);
		if (!seen.has(key)) {
			seen.add(key);
			tasks.push(task);
		}
	}
	function walk(node: TreeNode) {
		const fileTaskName = node._task?._cleanText;
		if (node._task) add(node._task);
		if (node.contentRoots) {
			for (const cn of node.contentRoots) walkCN(cn, fileTaskName);
		}
		for (const c of node.children) walk(c);
	}
	function walkCN(cn: ContentNode, fileTaskName?: string) {
		const task = cn._task;
		if (task) {
			if (
				fileTaskName &&
				task._cleanText === fileTaskName &&
				!task._isFileTask
			)
				return;
			add(task);
		}
		for (const c of cn.children) walkCN(c, fileTaskName);
	}
	for (const root of roots) walk(root);
	return tasks;
}
