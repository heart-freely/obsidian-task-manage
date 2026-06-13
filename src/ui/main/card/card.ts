// src/ui/main/card/card.ts
// 统一任务卡片组件 — 纯 DOM 创建和事件绑定

import { getStatusColors } from "../../../core/config/config";
import {
	buildDescription,
	buildMetaRow,
	buildTooltip,
} from "../../../core/task/task-format";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { tooltip } from "../../component/tooltip/tooltip";

export interface TaskCardOptions {
	/** 是否显示 tooltip，默认 false（详细模式不显示，信息已在元数据行中） */
	showTooltip?: boolean;
	/** 简洁模式：单行显示，隐藏元数据行，默认 false（详细模式） */
	compact?: boolean;
	/** 双击回调，传入被点击的任务节点 */
	onClick?: (node: TaskTreeNode) => void;
	/** 单击回调，传入被点击的任务节点（用于聚焦子树等） */
	onSingleClick?: (node: TaskTreeNode) => void;
}

export function createTaskCard(
	node: TaskTreeNode,
	options?: TaskCardOptions,
): HTMLElement {
	const showTooltip = options?.showTooltip ?? false;
	const compact = options?.compact ?? false;

	const descHtml = buildDescription(node, compact);

	const li = document.createElement("li");
	li.className = "task-item";
	li.setAttribute("data-path", node.path);
	li.setAttribute("data-line-number", String(node.line));

	// 根据执行状态获取左侧色条颜色
	const statusColors = getStatusColors();
	const statusColor = statusColors[node.status] || statusColors["todo"];

	if (compact) {
		li.style.cssText =
			"margin:0;padding:1px 0;background:transparent;border-radius:4px;font-size:var(--font-ui-small);cursor:pointer;border:none;display:block;list-style:none;";
		li.innerHTML = `<div class="task-desc" style="font-weight:normal;margin-bottom:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:0;line-height:1.5;">${descHtml}</div>`;
	} else {
		const metaHtml = buildMetaRow(node);
		li.style.cssText =
			"margin:6px 0; padding:8px 10px; background:var(--background-primary); border-radius:8px; font-size:0.9em; cursor:pointer; display:flex; flex-direction:column; color:var(--text-normal); transition:background 0.1s;";
		li.style.borderLeft = `3px solid ${statusColor}`;
		li.innerHTML = `<div class="task-desc" style="font-weight:500;margin-bottom:4px;">${descHtml}</div><div class="task-meta" style="font-size:0.8em;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;">${metaHtml}</div>`;
	}

	if (!node.display) {
		li.style.opacity = "0.4";
	}

	li.addEventListener("mouseenter", () => {
		li.style.backgroundColor = compact
			? "var(--background-modifier-hover)"
			: "var(--background-modifier-hover)";
	});
	li.addEventListener("mouseleave", () => {
		li.style.backgroundColor = compact
			? "transparent"
			: "var(--background-primary)";
	});

	if (showTooltip) {
		const tooltipHtml = buildTooltip(node);
		if (tooltipHtml) {
			li.addEventListener("mouseenter", (e) =>
				tooltip.show(tooltipHtml, e.clientX, e.clientY),
			);
			li.addEventListener("mousemove", (e) =>
				tooltip.move(e.clientX, e.clientY),
			);
			li.addEventListener("mouseleave", () => tooltip.hide());
		}
	}

	// 单击 — 延迟聚焦，让双击事件有机会触发
	if (options?.onSingleClick) {
		li.addEventListener("click", (e) => {
			e.stopPropagation();
			const nodeRef = node;
			const callback = options.onSingleClick!;
			setTimeout(() => callback(nodeRef), 150);
		});
	}
	// 双击 — 跳转到文件位置
	if (options?.onClick) {
		li.addEventListener("dblclick", (e) => {
			e.stopPropagation();
			options.onClick!(node);
		});
	}

	return li;
}
