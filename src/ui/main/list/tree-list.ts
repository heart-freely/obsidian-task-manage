// src/ui/main/list/tree-list.ts

import {
	countNodeStatuses,
	removeHeadingNumber,
	sortFileNodes,
} from "../../../core/component/tree-view-process";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createProgressBar } from "../../component/progress/progress";
import { createTaskCard } from "../card/card";

const INDENT_WIDTH = 24;

export interface TreeListOptions {
	hideFolders?: boolean;
	root: TaskTreeNode;
	focusRoot?: TaskTreeNode;
	onClick?: (node: TaskTreeNode) => void;
	onDoubleClick?: (node: TaskTreeNode) => void;
	onRestore?: () => void;
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
	const displayRoot = options.focusRoot || options.root;
	const depthOffset = options.focusRoot?.depth ?? 0;

	const tree = document.createElement("div");
	tree.className = "task-tree";

	// 聚焦模式：显示"返回全树"标题栏
	if (options.focusRoot) {
		const focusBar = document.createElement("div");
		focusBar.style.cssText =
			"padding:2px 4px; cursor:pointer; font-size:var(--font-ui-small); color:var(--text-accent);";

		// 根据节点类型显示对应符号
		const typeIcons: Record<string, string> = {
			file: "📄",
			heading: "H" + (displayRoot.headingLevel || displayRoot.depth),
			list: "●",
		};
		const icon = typeIcons[displayRoot.type] || "📂";
		let displayText = displayRoot.text;
		// 标题任务去除 number headings 序号
		if (displayRoot.type === "heading") {
			displayText = removeHeadingNumber(displayText);
		}
		focusBar.textContent = icon + " " + displayText;
		focusBar.title = "点击返回全树，双击跳转到文件";
		focusBar.addEventListener("click", () => options.onRestore?.());
		tree.appendChild(focusBar);
	} else {
		// 全树模式：虚拟根节点
		const { counts, total } = countNodeStatuses(options.root);

		const rootRow = document.createElement("div");
		rootRow.style.cssText =
			"display:flex; align-items:center; gap:4px; padding:2px 4px;";

		const rootTitle = document.createElement("span");
		rootTitle.style.cssText =
			"font-size:var(--font-ui-small); color:var(--text-muted);";
		rootTitle.textContent = "🗂️ 任务管理";
		rootRow.appendChild(rootTitle);

		const childTotal = options.root.children.reduce((sum, child) => {
			const childStats = countNodeStatuses(child);
			return sum + childStats.total;
		}, 0);

		if (childTotal > 0) {
			const mergedCounts: Record<string, number> = {};
			for (const child of options.root.children) {
				const childStats = countNodeStatuses(child);
				for (const [status, count] of Object.entries(
					childStats.counts,
				)) {
					mergedCounts[status] = (mergedCounts[status] || 0) + count;
				}
			}
			const pb = createProgressBar({
				counts: mergedCounts,
				total: childTotal,
				height: "8px",
				showPercent: true,
			});
			pb.style.cssText += "width:60px; min-width:60px; flex-shrink:0;";
			rootRow.appendChild(pb);

			const badge = document.createElement("span");
			badge.style.cssText =
				"font-size:var(--font-ui-smaller); color:var(--text-muted); flex-shrink:0;";
			badge.textContent = "(" + childTotal + ")";
			rootRow.appendChild(badge);
		}

		tree.appendChild(rootRow);
	}

	const sortedChildren =
		options.sort && options.sort.type
			? sortFileNodes(displayRoot.children, options.sort)
			: displayRoot.children;

	for (const child of sortedChildren) {
		renderNode(child, tree, options, depthOffset);
	}

	container.appendChild(tree);
}

function renderNode(
	node: TaskTreeNode,
	parentEl: HTMLElement,
	options?: TreeListOptions,
	depthOffset: number = 0,
) {
	if (!node.display) return;
	if (!node.match && node.children.length === 0) return;

	const hasChildren = node.children.length > 0;
	const childContainer = document.createElement("div");
	const { counts, total } = countNodeStatuses(node);

	// 使用修正后的深度
	const displayDepth = Math.max(0, node.depth - depthOffset);
	const rowWrapper = createRowWrapper(displayDepth);
	if (hasChildren) rowWrapper.appendChild(createToggleBtn(childContainer));
	else rowWrapper.appendChild(createSpacer());

	const contentContainer = document.createElement("div");
	contentContainer.style.cssText =
		"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";

	const card = createTaskCard(node, {
		showTooltip: true,
		compact: true,
		onClick: options?.onDoubleClick,
		onSingleClick: options?.onClick,
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
		renderNode(child, childContainer, options, depthOffset);
	}
	parentEl.appendChild(childContainer);
}
