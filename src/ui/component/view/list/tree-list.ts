// src/ui/component/view/list/tree-list.ts

import {
	countNodeStatuses,
	removeHeadingNumber,
	sortFileNodes,
} from "../../../../process/component/tree-view-process";
import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createProgressBar } from "../../progress/progress";
import { createTaskCard } from "../card/card";

const INDENT_WIDTH = 24;

export interface TreeListOptions {
	hideFolders?: boolean;
	roots: TaskTreeNode[];
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

function createTreeCard(
	node: TaskTreeNode,
	onClick?: (node: TaskTreeNode) => void,
): HTMLElement {
	const card = createTaskCard(node, { showTooltip: true, compact: true });
	if (onClick) {
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

export function renderTaskTree(
	container: HTMLElement,
	options: TreeListOptions,
) {
	container.empty();
	let roots = options.roots;
	if (options.sort) roots = sortFileNodes(roots, options.sort);

	const tree = document.createElement("div");
	tree.className = "task-tree";

	if (roots.length > 0) {
		roots.forEach((root) => renderNode(root, tree, options));
	} else {
		const dr = document.createElement("div");
		dr.style.cssText =
			"padding:2px 4px;font-size:var(--font-ui-small);color:var(--text-muted);";
		dr.textContent = "📄 任务系统";
		tree.appendChild(dr);
	}
	container.appendChild(tree);
}

function renderNode(
	node: TaskTreeNode,
	parentEl: HTMLElement,
	options?: TreeListOptions,
) {
	const hasChildren = node.children.length > 0;
	const childContainer = document.createElement("div");
	const { counts, total } = countNodeStatuses(node);

	const rowWrapper = createRowWrapper(node.depth);
	if (hasChildren) rowWrapper.appendChild(createToggleBtn(childContainer));
	else rowWrapper.appendChild(createSpacer());

	const contentContainer = document.createElement("div");
	contentContainer.style.cssText =
		"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";

	if (node.type === "file") {
		if (!node.text.startsWith("📄 ")) node.text = "📄 " + node.text;
	} else if (node.type === "heading") {
		node.text =
			"H" +
			(node.headingLevel || node.depth) +
			" " +
			removeHeadingNumber(node.text);
	} else {
		if (!node.text.startsWith("● ")) node.text = "● " + node.text;
	}

	const card = createTreeCard(node, options?.onClick);
	contentContainer.appendChild(card);
	if (total > 0 && hasChildren)
		addProgressBadge(contentContainer, counts, total);

	rowWrapper.appendChild(contentContainer);
	const rightSpacer = document.createElement("div");
	rightSpacer.style.cssText = "flex:1;";
	rowWrapper.appendChild(rightSpacer);
	parentEl.appendChild(rowWrapper);

	options?.onRowRender?.(rowWrapper, node);

	for (const child of node.children)
		renderNode(child, childContainer, options);
	parentEl.appendChild(childContainer);
}
