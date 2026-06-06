// src/ui/component/view/list/tree-list.ts
// 任务树列表渲染组件

import {
	countContentNodeStatuses,
	countNodeStatuses,
	removeHeadingNumber,
	sortContentNodes,
	sortFileNodes,
} from "../../../../process/component/tree-view-process";
import { ContentNode, TreeNode } from "../../../../process/task/task-tree";
import { TaskItem } from "../../../../types";
import { createProgressBar } from "../../progress/progress";
import { createTaskCard } from "../card/card";

const INDENT_WIDTH = 24;

export interface TreeListOptions {
	hideFolders?: boolean;
	roots: TreeNode[];
	onClick?: (node: any) => void;
	sort?: { type: string; order: "asc" | "desc" };
	/** 每渲染一个行节点时回调，用于甘特图等扩展 */
	onRowRender?: (
		rowEl: HTMLElement,
		node: TreeNode | ContentNode,
		task: TaskItem | null,
	) => void;
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
		// 通知扩展（甘特图等）树结构发生了变化
		const treeRoot =
			b.closest(".task-tree") ||
			b.closest(".gantt-tree-container") ||
			b.closest(".task-tree-nav-content");
		if (treeRoot) {
			treeRoot.dispatchEvent(
				new CustomEvent("tree-toggle", { bubbles: true }),
			);
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
	const card = createTaskCard(task, { showTooltip: true, compact: true });

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
	let roots = options.roots;
	const sort = options.sort;
	if (sort) {
		roots = sortFileNodes(roots, sort);
	}

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

// ========== 渲染文件节点 ==========

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
	const { counts, total } = countNodeStatuses(node);
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
		contentContainer.appendChild(card);
		if (total > 0 && hasContent)
			addProgressBadge(contentContainer, counts, total);
	}

	rowWrapper.appendChild(contentContainer);
	const rightSpacer = document.createElement("div");
	rightSpacer.style.cssText = "flex:1;";
	rowWrapper.appendChild(rightSpacer);
	parentEl.appendChild(rowWrapper);

	options?.onRowRender?.(rowWrapper, node, task || null);

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

// ========== 渲染内容节点 ==========

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
	const wrappedNode = { ...node, _filePath: filePath };

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
		const { counts, total } = countContentNodeStatuses(node);

		if (task) {
			const originalCleanText = task._cleanText;
			task._cleanText = hTag + " " + cleanTitle;
			const card = createTreeCard(task, onClick, wrappedNode);
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
			const card = createTreeCard(pseudoTask, onClick, wrappedNode);
			contentContainer.appendChild(card);
			if (total > 0 && hasChildren)
				addProgressBadge(contentContainer, counts, total);
		}

		rowWrapper.appendChild(contentContainer);
		const rightSpacer = document.createElement("div");
		rightSpacer.style.cssText = "flex:1;";
		rowWrapper.appendChild(rightSpacer);
		parentEl.appendChild(rowWrapper);

		const nodeTask = task || null;
		options?.onRowRender?.(rowWrapper, node, nodeTask);

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
		const taskData: any = task || {
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
			const { counts, total } = countContentNodeStatuses(node);
			const originalText = taskData._cleanText;
			if (!originalText.startsWith("● "))
				taskData._cleanText = "● " + originalText;
			const card = createTreeCard(taskData, onClick, wrappedNode);
			contentContainer.appendChild(card);
			if (total > 0) addProgressBadge(contentContainer, counts, total);
			taskData._cleanText = originalText;
		} else {
			rowWrapper.appendChild(createSpacer());
			const originalText = taskData._cleanText;
			if (!originalText.startsWith("● "))
				taskData._cleanText = "● " + originalText;
			const card = createTreeCard(taskData, onClick, wrappedNode);
			contentContainer.appendChild(card);
			taskData._cleanText = originalText;
		}

		rowWrapper.appendChild(contentContainer);
		const rightSpacer = document.createElement("div");
		rightSpacer.style.cssText = "flex:1;";
		rowWrapper.appendChild(rightSpacer);
		parentEl.appendChild(rowWrapper);

		options?.onRowRender?.(rowWrapper, node, task || taskData);

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
