// src/ui/main/list/tree-list.ts
// 任务树列表渲染组件

import {
	countNodeStatuses,
	sortFileNodes,
} from "../../../core/component/tree-view-process";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createProgressBar } from "../../component/progress/progress";
import { createTaskCard } from "../card/card";

const INDENT_WIDTH = 24;

export interface TreeListOptions {
	hideFolders?: boolean;
	root: TaskTreeNode;
	onClick?: (node: TaskTreeNode) => void;
	sort?: { type: string; order: "asc" | "desc" };
	onRowRender?: (rowEl: HTMLElement, node: TaskTreeNode) => void;
}

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
		const treeRoot =
			b.closest(".task-tree") ||
			b.closest(".gantt-tree-container") ||
			b.closest(".task-tree-nav-content");
		if (treeRoot)
			treeRoot.dispatchEvent(
				new CustomEvent("tree-toggle", { bubbles: true }),
			);
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

export function renderTaskTree(
	container: HTMLElement,
	options: TreeListOptions,
) {
	container.empty();
	const root = options.root;

	const tree = document.createElement("div");
	tree.className = "task-tree";

	const sortedChildren =
		options.sort && options.sort.type
			? sortFileNodes(root.children, options.sort)
			: root.children;

	for (const child of sortedChildren) {
		renderNode(child, tree, options);
	}

	container.appendChild(tree);
}

function renderNode(
	node: TaskTreeNode,
	parentEl: HTMLElement,
	options?: TreeListOptions,
) {
	if (!node.display) return;

	const hasChildren = node.children.length > 0;
	const childContainer = document.createElement("div");
	const { counts, total } = countNodeStatuses(node);

	const rowWrapper = createRowWrapper(node.depth);
	if (hasChildren) rowWrapper.appendChild(createToggleBtn(childContainer));
	else rowWrapper.appendChild(createSpacer());

	const contentContainer = document.createElement("div");
	contentContainer.style.cssText =
		"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";

	// 类型标记由 task-format.ts 的 buildDescription 统一处理
	const card = createTaskCard(node, {
		showTooltip: true,
		compact: true,
		onClick: options?.onClick,
	});
	contentContainer.appendChild(card);
	if (total > 0 && hasChildren)
		addProgressBadge(contentContainer, counts, total);

	rowWrapper.appendChild(contentContainer);
	const rightSpacer = document.createElement("div");
	rightSpacer.style.cssText = "flex:1;";
	rowWrapper.appendChild(rightSpacer);
	parentEl.appendChild(rowWrapper);

	options?.onRowRender?.(rowWrapper, node);

	const sortedChildren =
		options?.sort && options.sort.type
			? sortFileNodes(node.children, options.sort)
			: node.children;

	for (const child of sortedChildren) {
		renderNode(child, childContainer, options);
	}
	parentEl.appendChild(childContainer);
}
