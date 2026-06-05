// src/ui/component/view/list/tree-list.ts
// 任务树列表渲染组件

import { ContentNode, TreeNode } from "../../../../process/task/task-tree";
import { countTaskStatuses, createProgressBar } from "../../progress/progress";
import { createTaskCard } from "../card/card";

const INDENT_WIDTH = 24;

export interface TreeListOptions {
	hideFolders?: boolean;
	roots: TreeNode[];
	onClick?: (node: any) => void;
	sort?: { type: string; order: "asc" | "desc" };
}

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
		const so: Record<string, number> = {
			todo: 0,
			planned: 1,
			"in-progress": 2,
			completed: 3,
			cancelled: 4,
		};
		const sa = so[taskA._status] ?? 5,
			sb = so[taskB._status] ?? 5;
		if (sa !== sb) return (sa - sb) * order;
	} else if (sortType === "priority") {
		const po: Record<string, number> = {
			"🔺": 0,
			"⏫": 1,
			"🔼": 2,
			"🔽": 3,
			"⏬": 4,
		};
		const pa = taskA._priorityIcon ? (po[taskA._priorityIcon] ?? 5) : 5;
		const pb = taskB._priorityIcon ? (po[taskB._priorityIcon] ?? 5) : 5;
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
		const ga = getNodeGroupOrder(a),
			gb = getNodeGroupOrder(b);
		if (ga !== gb) return ga - gb;
		const ta = (a as any)._task,
			tb = (b as any)._task;
		if (!ta && !tb) return 0;
		if (!ta) return 1;
		if (!tb) return -1;
		return compareTasks(ta, tb, sort?.type, order);
	});
	return sorted;
}

// ========== DOM 工具 ==========
function createRowWrapper(depth: number): HTMLElement {
	const w = document.createElement("div");
	w.style.cssText = `margin-left:${depth * INDENT_WIDTH}px;display:flex;align-items:center;gap:0;`;
	return w;
}
function createToggleBtn(childContainer: HTMLElement): HTMLElement {
	const b = document.createElement("span");
	b.className = "tree-toggle-btn";
	b.style.cssText =
		"display:inline-flex;align-items:center;justify-content:center;width:16px;min-width:16px;height:22px;font-size:10px;flex-shrink:0;cursor:pointer;user-select:none;";
	b.textContent = "▼";
	b.addEventListener("click", (e) => {
		e.stopPropagation();
		e.preventDefault();
		if (childContainer.style.display === "none") {
			childContainer.style.display = "";
			b.textContent = "▼";
		} else {
			childContainer.style.display = "none";
			b.textContent = "▶";
		}
	});
	return b;
}
function createSpacer(): HTMLElement {
	const s = document.createElement("span");
	s.style.cssText = "display:inline-flex;width:16px;flex-shrink:0;";
	return s;
}
function addProgressBadge(
	container: HTMLElement,
	counts: Record<string, number>,
	total: number,
) {
	const w = document.createElement("div");
	w.style.cssText =
		"display:flex;align-items:center;gap:4px;margin-left:4px;flex-shrink:0;";
	const pb = createProgressBar({
		counts,
		total,
		height: "8px",
		showPercent: true,
	});
	pb.style.cssText += "width:60px;min-width:60px;flex-shrink:0;";
	w.appendChild(pb);
	const b = document.createElement("span");
	b.textContent = "(" + total + ")";
	b.style.cssText =
		"font-size:var(--font-ui-smaller);color:var(--text-muted);flex-shrink:0;";
	w.appendChild(b);
	container.appendChild(w);
}

function createTreeCard(
	task: any,
	onClick?: (node: any) => void,
	node?: any,
): HTMLElement {
	const card = createTaskCard(task, { showTooltip: true });
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
	card.addEventListener("mouseenter", () => {
		card.style.backgroundColor = "var(--background-modifier-hover)";
	});
	card.addEventListener("mouseleave", () => {
		card.style.backgroundColor = "transparent";
	});
	if (onClick && node) {
		card.addEventListener(
			"click",
			(e) => {
				e.stopPropagation();
				e.preventDefault();
				onClick(node);
			},
			true,
		);
	}
	return card;
}

// ========== 主渲染 ==========
export function renderTaskTree(
	container: HTMLElement,
	options: TreeListOptions,
) {
	container.empty();
	const roots = options.roots;
	const tree = document.createElement("div");
	tree.className = "task-tree";
	if (roots.length > 0) {
		roots.forEach((root) => renderFileNodeInline(root, 0, tree, options));
	} else {
		const dr = document.createElement("div");
		dr.style.cssText =
			"padding:2px 4px;font-size:var(--font-ui-small);color:var(--text-muted);";
		dr.textContent = "📄 任务系统";
		tree.appendChild(dr);
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
		(node.contentRoots?.length || 0) > 0 || node.children.length > 0;
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
