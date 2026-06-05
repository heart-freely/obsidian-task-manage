// src/process/task/task-tree.ts
// 任务树数据结构 + 构建 + 筛选 + 扁平化

import {
	STATUS_ALL_SYMBOLS,
	SYMBOL_TO_STATUS,
	TASK_ELEMENTS,
	YAML_DATE_FIELDS,
} from "../config/config";
import { ParsedFileData } from "./md-parser";

const PREFIX = "pages/A 系统/A 任务系统/";
const ALL_STATUS_SYMBOLS = (() => {
	const allSymbols = new Set<string>();
	for (const symbols of Object.values(STATUS_ALL_SYMBOLS)) {
		for (const s of symbols) allSymbols.add(s);
	}
	const escapedSymbols = [...allSymbols].map((s) =>
		s === "-" || s === "]" || s === "^" || s === "\\" ? "\\" + s : s,
	);
	const hasDash = escapedSymbols.includes("\\-");
	return hasDash
		? ["\\-", ...escapedSymbols.filter((s) => s !== "\\-")].join("")
		: escapedSymbols.join("");
})();
const TASK_REGEX = new RegExp(
	`^\\s*-\\s*\\[([${ALL_STATUS_SYMBOLS}])\\]\\s+(.+)$`,
);

export interface TreeNode {
	path: string;
	name: string;
	relPath: string;
	folderParts: string[];
	metaParent: string | null;
	linkParent: string | null;
	children: TreeNode[];
	tasks: any[];
	conflict: "meta_mismatch" | "meta_missing" | "link_missing" | null;
	missingLinks: string[];
	contentRoots?: ContentNode[];
	_task?: any;
}

export interface ContentNode {
	type: "heading" | "task";
	level?: number;
	text: string;
	raw: string;
	line: number;
	children: ContentNode[];
	parent: ContentNode | null;
	_task?: any;
	yamlStartLine?: number;
	yamlEndLine?: number;
}

export interface TreeFilterOptions {
	statuses?: string[];
	hideRepeat?: boolean;
	hideCompleted?: boolean;
	hideCancelled?: boolean;
	searchText?: string;
	priorityValues?: string[];
	repeatCycles?: string[];
}

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

export function parseTaskLine(
	fullLine: string,
	path: string,
	line: number,
): any {
	const RX_PRIORITY = /⏬|🔽|🔼|⏫|🔺/g;
	const RX_REPEAT = /🔁\s*(every\s+(day|week|month|year))/;
	const RX_CREATED = /➕\s*(\d{4}-\d{2}-\d{2})/;
	const RX_SCHEDULED = /⏳\s*(\d{4}-\d{2}-\d{2})/;
	const RX_STARTS = /🛫\s*(\d{4}-\d{2}-\d{2})/;
	const RX_DUE = /📅\s*(\d{4}-\d{2}-\d{2})/;
	const RX_DONE = /✅\s*(\d{4}-\d{2}-\d{2})/;
	const RX_CANCEL = /❌\s*(\d{4}-\d{2}-\d{2})?/;
	const RX_TAG = /🏁\s*(\S+)/;
	const RX_ID = /🆔\s*(\S+)/;
	const RX_FORBID = /⛔\s*([^\s,]+(?:\s*,\s*[^\s,]+)*)/;

	function m(rx: RegExp, idx?: number): string | null {
		const match = fullLine.match(rx);
		return match ? match[idx !== undefined ? idx : 1] || null : null;
	}

	const statusMatch = fullLine.match(/^\s*- \[(.)\]\s*/);
	let status = "todo";
	if (statusMatch) status = SYMBOL_TO_STATUS[statusMatch[1]] || "todo";

	const cleanText = fullLine
		.replace(/⏬|🔽|🔼|⏫|🔺/g, "")
		.replace(/🔁\s*every\s+(day|week|month|year)/gi, "")
		.replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/❌\s*(\d{4}-\d{2}-\d{2})?/g, "")
		.replace(/🏁\s*\S+/g, "")
		.replace(/🆔\s*\S+/g, "")
		.replace(/⛔\s*[^\s,]+(?:\s*,\s*[^\s,]+)*/g, "")
		.replace(/<[^>]+>/g, "")
		.replace(/^\s*- \[.\]\s*/, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	const priorityIcon = (fullLine.match(RX_PRIORITY) || [null])[0];

	return {
		_status: status,
		_cleanText: cleanText,
		_fullLine: fullLine,
		_priorityIcon: priorityIcon || "",
		_created: m(RX_CREATED),
		_scheduled: m(RX_SCHEDULED),
		_starts: m(RX_STARTS),
		_due: m(RX_DUE),
		_done: m(RX_DONE),
		_cancel: m(RX_CANCEL) || "",
		_tag: m(RX_TAG),
		_id: m(RX_ID),
		_forbid: m(RX_FORBID) ? m(RX_FORBID).replace(/\s/g, "") : "",
		_repeat: m(RX_REPEAT),
		path,
		line: line,
		lineNumber: line,
		text: cleanText,
		description: cleanText,
		priority: priorityIcon
			? ["🔺", "⏫", "🔼", "🔽", "⏬"].indexOf(priorityIcon).toString()
			: "none",
		status: statusMatch ? statusMatch[1] : " ",
		_isHeadingTask: false,
		_isFileTask: false,
		_headingLevel: 0,
		_headingText: "",
	};
}

export function parseFileContent(
	content: string,
	filePath?: string,
): ContentNode[] {
	if (!content) return [];

	let body = content;
	if (body.startsWith("---")) {
		const endIdx = body.indexOf("---", 3);
		if (endIdx !== -1) body = body.substring(endIdx + 3);
	}

	const lines = body.split("\n");
	const roots: ContentNode[] = [];
	const headingStack: ContentNode[] = [];
	const indentStack: { indent: number; node: ContentNode }[] = [];
	let inCodeBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (trimmed.startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) continue;
		if (trimmed === "") continue;

		const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const title = headingMatch[2].trim();

			if (title.endsWith("任务")) {
				const { yamlData, yamlStartLine, yamlEndLine } =
					parseHeadingYamlBlock(lines, i, level);
				let taskData: any = null;
				if (yamlData) {
					taskData = yamlDataToTaskData(yamlData, filePath || "", i);
					taskData._headingText = title;
					taskData._headingLevel = level;
				}

				const node: ContentNode = {
					type: "heading",
					level,
					text: title,
					raw: trimmed,
					line: i,
					children: [],
					parent: null,
					yamlStartLine:
						yamlStartLine >= 0 ? yamlStartLine : undefined,
					yamlEndLine: yamlEndLine >= 0 ? yamlEndLine : undefined,
				};
				if (taskData) node._task = taskData;

				while (
					headingStack.length > 0 &&
					headingStack[headingStack.length - 1].level! >= level
				) {
					headingStack.pop();
				}

				if (headingStack.length > 0) {
					headingStack[headingStack.length - 1].children.push(node);
				} else {
					roots.push(node);
				}

				headingStack.push(node);
				indentStack.length = 0;
				continue;
			}
			continue;
		}

		const currentHeading =
			headingStack.length > 0
				? headingStack[headingStack.length - 1]
				: null;
		if (
			currentHeading?.yamlStartLine !== undefined &&
			currentHeading?.yamlEndLine !== undefined &&
			i > currentHeading.yamlStartLine &&
			i < currentHeading.yamlEndLine
		) {
			continue;
		}

		const taskMatch = trimmed.match(TASK_REGEX);
		if (!taskMatch) continue;

		const fullLine = trimmed;
		const taskData = parseTaskLine(fullLine, filePath || "", i);

		const node: ContentNode = {
			type: "task",
			text: taskData._cleanText,
			raw: fullLine,
			line: i,
			children: [],
			parent: null,
		};
		node._task = taskData;

		const indent = getIndentLevel(line);

		while (
			indentStack.length > 0 &&
			indentStack[indentStack.length - 1].indent >= indent
		) {
			indentStack.pop();
		}

		if (indentStack.length > 0) {
			indentStack[indentStack.length - 1].node.children.push(node);
		} else if (headingStack.length > 0) {
			headingStack[headingStack.length - 1].children.push(node);
		} else {
			roots.push(node);
		}

		indentStack.push({ indent, node });
	}

	return roots;
}

function parseHeadingYamlBlock(
	lines: string[],
	headingLine: number,
	headingLevel: number,
): {
	yamlData: Record<string, any> | null;
	yamlStartLine: number;
	yamlEndLine: number;
} {
	let yamlStartLine = -1,
		yamlEndLine = -1;
	for (let i = headingLine + 1; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		const hm = trimmed.match(/^(#{1,6})\s+/);
		if (hm && hm[1].length <= headingLevel) break;
		if (trimmed === "```yaml" || trimmed === "```yml") {
			yamlStartLine = i;
			for (let j = i + 1; j < lines.length; j++) {
				if (lines[j].trim() === "```") {
					yamlEndLine = j;
					break;
				}
			}
			break;
		}
	}
	if (yamlStartLine === -1 || yamlEndLine === -1)
		return { yamlData: null, yamlStartLine: -1, yamlEndLine: -1 };
	const yamlData: Record<string, any> = {};
	for (const yamlLine of lines.slice(yamlStartLine + 1, yamlEndLine)) {
		const colonIdx = yamlLine.indexOf(":");
		if (colonIdx === -1) continue;
		const key = yamlLine.substring(0, colonIdx).trim();
		let value = yamlLine.substring(colonIdx + 1).trim();
		if (
			(value.startsWith("'") && value.endsWith("'")) ||
			(value.startsWith('"') && value.endsWith('"'))
		)
			value = value.slice(1, -1);
		if (key && value) yamlData[key] = value;
	}
	return {
		yamlData: Object.keys(yamlData).length > 0 ? yamlData : null,
		yamlStartLine,
		yamlEndLine,
	};
}

function yamlDataToTaskData(
	yamlData: Record<string, any>,
	filePath: string,
	headingLine: number,
): any {
	const statusMap: Record<string, string> = {};
	TASK_ELEMENTS.status.children?.forEach((c) => {
		statusMap[c.zhName] = c.key;
	});
	const priorityMap: Record<string, string> = {};
	TASK_ELEMENTS.priority.children?.forEach((c, idx) => {
		priorityMap[c.zhName] = c.icon!;
		priorityMap[String(4 - idx)] = c.icon!;
	});
	const rawStatus = yamlData["任务状态"] || "未开始",
		rawPriority = yamlData["任务优先级"] || "none";
	const statusKey = statusMap[rawStatus] || "todo",
		priorityIcon = priorityMap[rawPriority] || "";
	const formatDate = (val: any): string | null => {
		if (!val) return null;
		const str = String(val);
		if (str === "NaN" || str.includes("NaN")) return null;
		const dateMatch = str.match(/(\d{4}-\d{2}-\d{2})/);
		return dateMatch ? dateMatch[1] : str.substring(0, 10);
	};
	const dateValues: Record<string, string | null> = {};
	for (const yaName of YAML_DATE_FIELDS)
		dateValues[yaName] = formatDate(yamlData[yaName]);
	const name = yamlData["任务名称"] || "",
		description = yamlData["任务简介"] || name;
	return {
		_status: statusKey,
		_cleanText: description,
		_fullLine: "",
		_priorityIcon: priorityIcon,
		_created: dateValues["任务创建"] || "",
		_scheduled: dateValues["任务计划"] || "",
		_starts: dateValues["任务开始"] || "",
		_due: dateValues["任务截止"] || "",
		_done: dateValues["任务完成"] || "",
		_cancel: dateValues["任务取消"] || "",
		_tag: yamlData["任务标签"] || "",
		_id: yamlData["任务唯一ID"] || "",
		_forbid: yamlData["任务引用ID"] || "",
		_repeat: yamlData["任务周期"] || "",
		path: filePath,
		line: headingLine,
		lineNumber: headingLine,
		text: description,
		description,
		priority: rawPriority === "none" ? "none" : rawPriority,
		status: " ",
		_isHeadingTask: true,
		_isFileTask: false,
		_headingLevel: 0,
		_headingText: "",
	};
}

function getIndentLevel(line: string): number {
	const leading = line.length - line.trimStart().length;
	const tabCount = (line.match(/\t/g) || []).length;
	return tabCount + Math.floor((leading - tabCount) / 4);
}

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

export function buildTreeFromParsedFiles(
	files: ParsedFileData[],
	tasks: any[],
	prefix: string = PREFIX,
): TreeNode[] {
	const tasksByPath = new Map<string, any[]>();
	for (const task of tasks) {
		if (!tasksByPath.has(task.path)) tasksByPath.set(task.path, []);
		tasksByPath.get(task.path)!.push(task);
	}
	const map = new Map<string, TreeNode>();

	for (const file of files) {
		const path = file.path;
		const name = file.name.replace(/\.md$/, "");
		const metaParent = parseParentField(
			file.yaml["父任务"] || file.yaml["任务父任务"],
		);
		let contentRoots = file.content
			? parseFileContent(file.content, path)
			: undefined;
		const fileTask = file.fileTask || {
			_status: "todo",
			_cleanText: name,
			path: file.path,
			line: 0,
			lineNumber: 0,
			fileName: name,
			_isFileTask: true,
			_isHeadingTask: false,
		};

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
			relPath: path.startsWith(prefix) ? path.slice(prefix.length) : path,
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
		hasCR = !!fcr,
		self = node._task ? taskMatchesFilter(node._task, options) : false;
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
	if (node.type === "task" && (node as any)._task)
		self = taskMatchesFilter((node as any)._task, options);
	else if (node.type === "heading") self = true;
	if (!self && !fc.length) return null;
	if (node.type === "heading" && !fc.length) return null;
	return {
		...node,
		children: fc,
		_task: self ? (node as any)._task : undefined,
	};
}
function taskMatchesFilter(task: any, options: TreeFilterOptions): boolean {
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

export function flattenTree(roots: TreeNode[]): any[] {
	const tasks: any[] = [];
	const seen = new Set<string>();
	function add(task: any) {
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
		const task = (cn as any)._task;
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
