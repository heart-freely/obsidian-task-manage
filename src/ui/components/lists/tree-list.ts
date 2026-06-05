// src/ui/components/lists/tree-list.ts
// 任务树列表渲染组件

import {
	ContentNode,
	TreeNode,
	buildNodeMap,
	resolveRelations,
} from "../../../process/components/tree-task-process";
import { createTaskCard } from "../cards/card";
import { countTaskStatuses, createProgressBar } from "../progress/progress";

// ========== 统一缩进宽度 ==========
const INDENT_WIDTH = 24;

// ========== 渲染选项 ==========
export interface TreeListOptions {
	hideFolders?: boolean;
	dv?: any;
	pages?: any[];
	onClick?: (node: any) => void;
	sort?: { type: string; order: "asc" | "desc" };
}

// ========== 去除 number headings 插件序号 ==========
function removeHeadingNumber(text: string): string {
	return text
		.replace(/^[\d]+\.[\d.]*\s+/, "")
		.replace(/^[A-Z]+\.\s+/, "")
		.replace(/^[IVXLCDM]+\.\s+/, "")
		.replace(/^[\d]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^[A-Z]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^[IVXLCDM]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^_[\.\s]*/, "")
		.trim();
}

// ========== 收集任务 ==========
function collectNodeTasks(node: ContentNode): any[] {
	const seen = new Set<string>();
	const tasks: any[] = [];
	function add(task: any) {
		const key = (task.path || "") + ":" + (task.lineNumber ?? task.line);
		if (!seen.has(key)) {
			seen.add(key);
			tasks.push(task);
		}
	}
	if (node.type === "task" && node._task) add(node._task);
	node.children.forEach((child) => collectNodeTasks(child).forEach(add));
	return tasks;
}

function collectAllTasksFromNode(node: TreeNode): any[] {
	const seen = new Set<string>();
	const all: any[] = [];
	function add(task: any) {
		const key = (task.path || "") + ":" + (task.lineNumber ?? task.line);
		if (!seen.has(key)) {
			seen.add(key);
			all.push(task);
		}
	}
	node.tasks.forEach(add);
	node.children.forEach((child) =>
		collectAllTasksFromNode(child).forEach(add),
	);
	if (node.contentRoots)
		node.contentRoots.forEach((cn) => collectNodeTasks(cn).forEach(add));
	return all;
}

function collectRenderedLines(contentNodes: ContentNode[]): Set<number> {
	const lines = new Set<number>();
	function walk(nodes: ContentNode[]) {
		nodes.forEach((cn) => {
			if (cn.type === "task") lines.add(cn.line);
			walk(cn.children);
		});
	}
	walk(contentNodes);
	return lines;
}

// ========== 排序 ==========
function getNodeGroupOrder(node: ContentNode): number {
	if (node.type === "task") return 0;
	if (node.type === "heading") return 1;
	return 2;
}

function compareTasks(
	taskA: any,
	taskB: any,
	sortType?: string,
	order: number = 1,
): number {
	if (!sortType) return 0;
	if (sortType === "status") {
		const statusOrder: Record<string, number> = {
			todo: 0,
			planned: 1,
			"in-progress": 2,
			completed: 3,
			cancelled: 4,
		};
		const sa = statusOrder[taskA._status] ?? 5,
			sb = statusOrder[taskB._status] ?? 5;
		if (sa !== sb) return (sa - sb) * order;
	} else if (sortType === "priority") {
		const priorityOrder: Record<string, number> = {
			"🔺": 0,
			"⏫": 1,
			"🔼": 2,
			"🔽": 3,
			"⏬": 4,
		};
		const pa = taskA._priorityIcon
			? (priorityOrder[taskA._priorityIcon] ?? 5)
			: 5;
		const pb = taskB._priorityIcon
			? (priorityOrder[taskB._priorityIcon] ?? 5)
			: 5;
		if (pa !== pb) return (pa - pb) * order;
	} else if (sortType === "scheduled") {
		const da = taskA._scheduled
			? new Date(taskA._scheduled).getTime()
			: null;
		const db = taskB._scheduled
			? new Date(taskB._scheduled).getTime()
			: null;
		if (!da && !db) return 0;
		if (!da) return 1;
		if (!db) return -1;
		if (da !== db) return (da - db) * order;
	}
	return (
		(taskA._cleanText || "").localeCompare(taskB._cleanText || "") * order
	);
}

function sortContentNodes(
	nodes: ContentNode[],
	sort?: { type: string; order: "asc" | "desc" },
): ContentNode[] {
	if (!nodes || nodes.length === 0) return nodes;
	const sorted = [...nodes];
	const order = sort?.order === "asc" ? 1 : -1;
	sorted.sort((a, b) => {
		const groupA = getNodeGroupOrder(a),
			groupB = getNodeGroupOrder(b);
		if (groupA !== groupB) return groupA - groupB;
		const taskA = (a as any)._task,
			taskB = (b as any)._task;
		if (!taskA && !taskB) return 0;
		if (!taskA) return 1;
		if (!taskB) return -1;
		return compareTasks(taskA, taskB, sort?.type, order);
	});
	return sorted;
}

function sortTreeNodes(
	nodes: TreeNode[],
	sort?: { type: string; order: "asc" | "desc" },
) {
	if (!nodes || nodes.length === 0) return;
	const order = sort?.order === "asc" ? 1 : -1;
	nodes.sort((a, b) => a.name.localeCompare(b.name));
	for (const node of nodes) {
		if (node.children.length > 0) sortTreeNodes(node.children, sort);
		if (node.contentRoots?.length > 0)
			node.contentRoots = sortContentNodes(node.contentRoots, sort);
		if (node.tasks.length > 0 && sort)
			node.tasks.sort((a, b) => compareTasks(a, b, sort.type, order));
	}
}

function sortNodeTasks(
	tasks: any[],
	sort: { type: string; order: "asc" | "desc" },
): any[] {
	if (!tasks || tasks.length === 0) return tasks;
	const sorted = [...tasks];
	const order = sort.order === "asc" ? 1 : -1;
	sorted.sort((a, b) => compareTasks(a, b, sort.type, order));
	return sorted;
}

// ========== DOM 工具 ==========
function createRowWrapper(depth: number): HTMLElement {
	const wrapper = document.createElement("div");
	wrapper.style.cssText = `margin-left:${depth * INDENT_WIDTH}px;display:flex;align-items:center;gap:0;`;
	return wrapper;
}

function createToggleBtn(childContainer: HTMLElement): HTMLElement {
	const btn = document.createElement("span");
	btn.className = "tree-toggle-btn";
	btn.style.cssText =
		"display:inline-flex;align-items:center;justify-content:center;width:16px;min-width:16px;height:22px;font-size:10px;flex-shrink:0;cursor:pointer;user-select:none;";
	btn.textContent = "▼";
	btn.addEventListener("click", (e) => {
		e.stopPropagation();
		e.preventDefault();
		if (childContainer.style.display === "none") {
			childContainer.style.display = "";
			btn.textContent = "▼";
		} else {
			childContainer.style.display = "none";
			btn.textContent = "▶";
		}
	});
	return btn;
}

function createSpacer(): HTMLElement {
	const spacer = document.createElement("span");
	spacer.style.cssText = "display:inline-flex;width:16px;flex-shrink:0;";
	return spacer;
}

function addProgressBadge(
	container: HTMLElement,
	counts: Record<string, number>,
	total: number,
) {
	const wrapper = document.createElement("div");
	wrapper.style.cssText =
		"display:flex;align-items:center;gap:4px;margin-left:4px;flex-shrink:0;";
	const progressBar = createProgressBar({
		counts,
		total,
		height: "8px",
		showPercent: true,
	});
	progressBar.style.cssText += "width:60px;min-width:60px;flex-shrink:0;";
	wrapper.appendChild(progressBar);
	const badge = document.createElement("span");
	badge.textContent = "(" + total + ")";
	badge.style.cssText =
		"font-size:var(--font-ui-smaller);color:var(--text-muted);flex-shrink:0;";
	wrapper.appendChild(badge);
	container.appendChild(wrapper);
}

// ========== 核心：创建任务树内嵌卡片 ==========
/**
 * 创建任务树内嵌卡片。
 * 关键：如果提供了 onClick，则用 capture 阶段拦截点击事件，
 * 阻止 createTaskCard 自带的默认跳转行为。
 */
function createTreeCard(
	task: any,
	onClick?: (node: any) => void,
	node?: any,
): HTMLElement {
	const card = createTaskCard(task, { showTooltip: true });

	// 内嵌样式
	card.style.border = "none";
	card.style.background = "transparent";
	card.style.padding = "0";
	card.style.margin = "0";
	card.style.fontSize = "var(--font-ui-small)";
	card.style.listStyle = "none";
	card.style.borderRadius = "4px";
	card.style.borderLeft = "none";
	card.style.display = "block";
	card.style.paddingLeft = "4px";

	const meta = card.querySelector(".task-meta") as HTMLElement;
	if (meta) meta.style.display = "none";

	const desc = card.querySelector(".task-desc") as HTMLElement;
	if (desc) {
		desc.style.fontWeight = "normal";
		desc.style.marginBottom = "0";
		desc.style.whiteSpace = "nowrap";
		desc.style.overflow = "hidden";
		desc.style.textOverflow = "ellipsis";
		desc.style.paddingLeft = "0";
	}

	// 统一 hover
	card.addEventListener("mouseenter", () => {
		card.style.backgroundColor = "var(--background-modifier-hover)";
	});
	card.addEventListener("mouseleave", () => {
		card.style.backgroundColor = "transparent";
	});

	// 关键：如果有 onClick 回调，拦截点击事件
	if (onClick && node) {
		// 使用 capture 阶段在最前面拦截，阻止冒泡到 createTaskCard 的 click 事件
		card.addEventListener(
			"click",
			(e) => {
				e.stopPropagation();
				e.preventDefault();
				onClick(node);
			},
			true,
		); // capture 阶段
	}

	return card;
}

// ========== 主渲染 ==========
export function renderTaskTree(
	container: HTMLElement,
	tasks: any[],
	options: TreeListOptions = {},
) {
	container.empty();
	const hideFolders = options?.hideFolders ?? true;
	const dv = options?.dv;
	const pages = options?.pages;
	const onClick = options?.onClick;
	const sort = options?.sort;

	const fileMap = new Map<string, any[]>();
	tasks.forEach((task) => {
		if (!fileMap.has(task.path)) fileMap.set(task.path, []);
		fileMap.get(task.path)!.push(task);
	});

	let roots: TreeNode[] = [];
	if (dv && pages && pages.length > 0) {
		const nodeMap = buildNodeMap(pages, fileMap, dv);
		roots = resolveRelations(nodeMap);
		if (sort) sortTreeNodes(roots, sort);
	}

	const tree = document.createElement("div");
	tree.className = "task-tree";
	if (roots.length > 0)
		roots.forEach((root) => renderFileNodeInline(root, 0, tree, options));
	else if (pages && pages.length > 0)
		renderSimpleTree(fileMap, 0, tree, hideFolders, options);
	else {
		const defaultRoot = document.createElement("div");
		defaultRoot.style.cssText =
			"padding:2px 4px;font-size:var(--font-ui-small);color:var(--text-muted);";
		defaultRoot.textContent = "📄 任务系统";
		tree.appendChild(defaultRoot);
	}
	container.appendChild(tree);
}

// ========== 文件节点 ==========
function renderFileNodeInline(
	node: TreeNode,
	depth: number,
	parentEl: HTMLElement,
	options?: TreeListOptions,
) {
	const onClick = options?.onClick;
	const sort = options?.sort;
	const hasContent =
		node.tasks.length > 0 ||
		node.children.length > 0 ||
		(node.contentRoots?.length || 0) > 0;
	const childContainer = document.createElement("div");
	const task = node._task;
	const allDescendantTasks = collectAllTasksFromNode(node);
	const { counts, total } = countTaskStatuses(allDescendantTasks);
	const rowWrapper = createRowWrapper(depth);
	if (hasContent) rowWrapper.appendChild(createToggleBtn(childContainer));
	else rowWrapper.appendChild(createSpacer());

	const contentContainer = document.createElement("div");
	contentContainer.style.cssText =
		"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";

	if (task) {
		const originalCleanText = task._cleanText;
		task._cleanText = "📄 " + (originalCleanText || node.name);
		const card = createTreeCard(task, onClick, node);
		card.style.cssText +=
			"flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
		contentContainer.appendChild(card);
		if (total > 0 && hasContent)
			addProgressBadge(contentContainer, counts, total);
		task._cleanText = originalCleanText;
	} else {
		const pseudoTask = {
			_status: "todo",
			_cleanText: "📄 " + node.name,
			path: node.path || "",
			line: 0,
			lineNumber: 0,
			_priorityIcon: "",
			_tag: "",
			_id: "",
			_forbid: "",
			_repeat: "",
			_created: "",
			_scheduled: "",
			_starts: "",
			_due: "",
			_done: "",
			_cancel: "",
			status: " ",
			priority: "none",
			fileName: node.name,
		};
		const card = createTreeCard(pseudoTask, onClick, node);
		card.style.cssText +=
			"flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
		contentContainer.appendChild(card);
		if (total > 0 && hasContent)
			addProgressBadge(contentContainer, counts, total);
	}

	rowWrapper.appendChild(contentContainer);
	const rightSpacer = document.createElement("div");
	rightSpacer.style.cssText = "flex:1;";
	rowWrapper.appendChild(rightSpacer);
	parentEl.appendChild(rowWrapper);

	if (node.contentRoots?.length > 0) {
		const renderedLines = collectRenderedLines(node.contentRoots);
		const sortedRoots = sort
			? sortContentNodes(node.contentRoots, sort)
			: sortContentNodes(node.contentRoots);
		sortedRoots.forEach((cn) =>
			renderContentNode(
				cn,
				depth + 1,
				childContainer,
				node.path,
				options,
			),
		);
		node.tasks.forEach((t) => {
			if (!renderedLines.has(t.lineNumber ?? t.line)) {
				renderContentNode(
					{
						type: "task",
						text: "",
						raw: "",
						line: t.lineNumber ?? t.line,
						children: [],
						parent: null,
						_task: t,
					},
					depth + 1,
					childContainer,
					undefined,
					options,
				);
			}
		});
	} else if (node.tasks.length > 0) {
		const sortedTasks = sort ? sortNodeTasks(node.tasks, sort) : node.tasks;
		sortedTasks.forEach((t) =>
			renderContentNode(
				{
					type: "task",
					text: "",
					raw: "",
					line: t.lineNumber ?? t.line,
					children: [],
					parent: null,
					_task: t,
				},
				depth + 1,
				childContainer,
				undefined,
				options,
			),
		);
	}
	node.children.forEach((child) =>
		renderFileNodeInline(child, depth + 1, childContainer, options),
	);
	parentEl.appendChild(childContainer);
}

// ========== 内容节点 ==========
function renderContentNode(
	node: ContentNode,
	depth: number,
	parentEl: HTMLElement,
	filePath?: string,
	options?: TreeListOptions,
) {
	const onClick = options?.onClick;
	const sort = options?.sort;
	const childContainer = document.createElement("div");
	const hasChildren = node.children.length > 0;

	if (node.type === "heading") {
		const task = (node as any)._task;
		const level = node.level || 1;
		const hTag = "H" + level;
		const cleanTitle = removeHeadingNumber(node.text);
		const rowWrapper = createRowWrapper(depth);
		if (hasChildren)
			rowWrapper.appendChild(createToggleBtn(childContainer));
		else rowWrapper.appendChild(createSpacer());

		const contentContainer = document.createElement("div");
		contentContainer.style.cssText =
			"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";
		const childTasks = collectNodeTasks(node);
		const { counts, total } = countTaskStatuses(childTasks);

		if (task) {
			const originalCleanText = task._cleanText;
			task._cleanText = hTag + " " + cleanTitle;
			const card = createTreeCard(task, onClick, node);
			card.style.cssText +=
				"flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
			contentContainer.appendChild(card);
			if (total > 0 && hasChildren)
				addProgressBadge(contentContainer, counts, total);
			task._cleanText = originalCleanText;
		} else {
			const pseudoTask = {
				_status: "todo",
				_cleanText: hTag + " " + cleanTitle,
				path: filePath || "",
				line: node.line,
				lineNumber: node.line,
				_priorityIcon: "",
				_tag: "",
				_id: "",
				_forbid: "",
				_repeat: "",
				_created: "",
				_scheduled: "",
				_starts: "",
				_due: "",
				_done: "",
				_cancel: "",
				status: " ",
				priority: "none",
				fileName: filePath
					? filePath.split("/").pop()?.replace(".md", "")
					: "",
			};
			const card = createTreeCard(pseudoTask, onClick, node);
			card.style.cssText +=
				"flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
			contentContainer.appendChild(card);
			if (total > 0 && hasChildren)
				addProgressBadge(contentContainer, counts, total);
		}

		rowWrapper.appendChild(contentContainer);
		const rightSpacer = document.createElement("div");
		rightSpacer.style.cssText = "flex:1;";
		rowWrapper.appendChild(rightSpacer);
		parentEl.appendChild(rowWrapper);

		const sortedChildren = sort
			? sortContentNodes(node.children, sort)
			: sortContentNodes(node.children);
		sortedChildren.forEach((child) =>
			renderContentNode(
				child,
				depth + 1,
				childContainer,
				filePath,
				options,
			),
		);
	} else if (node.type === "task") {
		const task = (node as any)._task;
		const taskData = task || {
			_status: "todo",
			text: node.text,
			description: node.text,
			_cleanText: node.text,
			path: filePath || "",
			line: node.line,
			lineNumber: node.line,
			_priorityIcon: "",
			_tag: "",
			_id: "",
			_forbid: "",
			_repeat: "",
			_created: "",
			_scheduled: "",
			_starts: "",
			_due: "",
			_done: "",
			_cancel: "",
			status: " ",
			priority: "none",
		};
		const rowWrapper = createRowWrapper(depth);
		const contentContainer = document.createElement("div");
		contentContainer.style.cssText =
			"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";

		if (hasChildren) {
			rowWrapper.appendChild(createToggleBtn(childContainer));
			const childTasks = collectNodeTasks(node);
			const { counts, total } = countTaskStatuses(childTasks);
			const originalText = taskData._cleanText;
			if (!originalText.startsWith("● "))
				taskData._cleanText = "● " + originalText;
			const card = createTreeCard(taskData, onClick, node);
			card.style.cssText +=
				"flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
			contentContainer.appendChild(card);
			if (total > 0) addProgressBadge(contentContainer, counts, total);
			taskData._cleanText = originalText;
		} else {
			rowWrapper.appendChild(createSpacer());
			const originalText = taskData._cleanText;
			if (!originalText.startsWith("● "))
				taskData._cleanText = "● " + originalText;
			const card = createTreeCard(taskData, onClick, node);
			card.style.cssText +=
				"flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
			contentContainer.appendChild(card);
			taskData._cleanText = originalText;
		}

		rowWrapper.appendChild(contentContainer);
		const rightSpacer = document.createElement("div");
		rightSpacer.style.cssText = "flex:1;";
		rowWrapper.appendChild(rightSpacer);
		parentEl.appendChild(rowWrapper);

		const sortedChildren = sort
			? sortContentNodes(node.children, sort)
			: sortContentNodes(node.children);
		sortedChildren.forEach((child) =>
			renderContentNode(
				child,
				depth + 1,
				childContainer,
				filePath,
				options,
			),
		);
	}
	parentEl.appendChild(childContainer);
}

// ========== 简单文件夹树（回退） ==========
function renderSimpleTree(
	fileMap: Map<string, any[]>,
	depth: number,
	parentEl: HTMLElement,
	hideFolders: boolean,
	options?: TreeListOptions,
) {
	const onClick = options?.onClick;
	const sort = options?.sort;
	const prefix = "pages/A 系统/A 任务系统/";
	const pathTree = new Map<string, any>();
	fileMap.forEach((fileTasks, path) => {
		const relPath = path.startsWith(prefix)
			? path.slice(prefix.length)
			: path;
		const parts = relPath.split("/");
		let current = pathTree;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!current.has(parts[i])) current.set(parts[i], new Map());
			current = current.get(parts[i]);
		}
		const fileName = parts[parts.length - 1].replace(".md", "");
		if (!current.has("__files")) current.set("__files", new Map());
		current.get("__files").set(fileName, fileTasks);
	});
	renderPathNode(pathTree, depth, parentEl, hideFolders, options);
}

function renderPathNode(
	node: Map<string, any>,
	depth: number,
	parentEl: HTMLElement,
	hideFolders: boolean,
	options?: TreeListOptions,
) {
	const onClick = options?.onClick;
	const sort = options?.sort;
	const folders = Array.from(node.keys())
		.filter((k) => k !== "__files")
		.sort();
	const files = node.get("__files") as Map<string, any[]> | undefined;

	folders.forEach((folderName) => {
		const subNode = node.get(folderName);
		const allTasks = collectAllTasksFromMap(subNode);
		const { counts, total } = countTaskStatuses(allTasks);
		if (allTasks.length === 0 && subNode.size === 0) return;
		if (!hideFolders) {
			const folderNode = document.createElement("div");
			folderNode.style.cssText = `margin-left:${depth * INDENT_WIDTH}px;cursor:pointer;user-select:none;padding:2px 0;display:flex;align-items:center;gap:4px;`;
			const toggle = document.createElement("span");
			toggle.textContent = "▼";
			toggle.style.cssText =
				"display:inline-block;width:16px;font-size:10px;flex-shrink:0;";
			const icon = document.createElement("span");
			icon.textContent = "📁";
			icon.style.flexShrink = "0";
			const name = document.createElement("span");
			name.textContent = folderName;
			name.style.cssText = "font-weight:normal;flex-shrink:0;";
			const badge = document.createElement("span");
			badge.textContent = "(" + total + ")";
			badge.style.cssText =
				"font-size:var(--font-ui-smaller);color:var(--text-muted);flex-shrink:0;";
			const progressBar = createProgressBar({
				counts,
				total,
				height: "4px",
			});
			progressBar.style.cssText += "flex:0 1 80px;min-width:40px;";
			folderNode.append(toggle, icon, name, badge, progressBar);
			const childContainer = document.createElement("div");
			toggle.addEventListener("click", (e) => {
				e.stopPropagation();
				if (childContainer.style.display === "none") {
					childContainer.style.display = "";
					toggle.textContent = "▼";
				} else {
					childContainer.style.display = "none";
					toggle.textContent = "▶";
				}
			});
			parentEl.appendChild(folderNode);
			parentEl.appendChild(childContainer);
			renderPathNode(
				subNode,
				depth + 1,
				childContainer,
				hideFolders,
				options,
			);
		} else renderPathNode(subNode, depth, parentEl, hideFolders, options);
	});

	if (files) {
		const fileNames = Array.from(files.keys()).sort();
		fileNames.forEach((fileName) => {
			const fileTasks = files.get(fileName)!;
			const { counts, total } = countTaskStatuses(fileTasks);
			const fileNode = document.createElement("div");
			fileNode.style.cssText = `margin-left:${depth * INDENT_WIDTH}px;cursor:pointer;user-select:none;padding:2px 0;display:flex;align-items:center;gap:4px;`;
			const toggle = document.createElement("span");
			toggle.textContent = "▼";
			toggle.style.cssText =
				"display:inline-block;width:16px;font-size:10px;flex-shrink:0;";
			const icon = document.createElement("span");
			icon.textContent = "📄";
			icon.style.flexShrink = "0";
			const name = document.createElement("span");
			name.textContent = fileName;
			name.style.cssText = "font-weight:normal;flex-shrink:0;";
			const badge = document.createElement("span");
			badge.textContent = "(" + total + ")";
			badge.style.cssText =
				"font-size:var(--font-ui-smaller);color:var(--text-muted);flex-shrink:0;";
			const progressBar = createProgressBar({
				counts,
				total,
				height: "4px",
			});
			progressBar.style.cssText += "flex:0 1 80px;min-width:40px;";
			fileNode.append(toggle, icon, name, badge, progressBar);

			if (onClick) {
				fileNode.addEventListener("click", (e) => {
					e.stopPropagation();
					e.preventDefault();
					onClick({
						type: "file",
						name: fileName,
						tasks: fileTasks,
						path: fileTasks[0]?.path,
					});
				});
			}

			const taskList = document.createElement("div");
			const sortedTasks = sort
				? sortNodeTasks(fileTasks, sort)
				: fileTasks;
			sortedTasks.forEach((task) =>
				renderContentNode(
					{
						type: "task",
						text: "",
						raw: "",
						line: 0,
						children: [],
						parent: null,
						_task: task,
					},
					depth + 1,
					taskList,
					undefined,
					options,
				),
			);
			toggle.addEventListener("click", (e) => {
				e.stopPropagation();
				if (taskList.style.display === "none") {
					taskList.style.display = "";
					toggle.textContent = "▼";
				} else {
					taskList.style.display = "none";
					toggle.textContent = "▶";
				}
			});
			parentEl.appendChild(fileNode);
			parentEl.appendChild(taskList);
		});
	}
}

function collectAllTasksFromMap(node: Map<string, any>): any[] {
	const all: any[] = [];
	const files = node.get("__files") as Map<string, any[]> | undefined;
	if (files)
		files.forEach((t) => {
			all.push(...t);
		});
	node.forEach((v, k) => {
		if (k !== "__files") all.push(...collectAllTasksFromMap(v));
	});
	return all;
}
