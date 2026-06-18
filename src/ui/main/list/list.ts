// src/ui/main/list/list.ts

import { TaskTreeNode } from "../../../core/task/task-tree";
import { createTaskCard } from "../card/card";

interface TaskListOptions {
	onClick?: (node: TaskTreeNode) => void;
	compact?: boolean;
	onEnterEdit?: (node: TaskTreeNode) => void;
}

export function renderTaskList(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options: TaskListOptions = {},
) {
	const ul = container.createEl("ul", { cls: "task-list" });
	ul.style.paddingLeft = "0";
	ul.style.listStyle = "none";
	nodes.forEach((node) => {
		const card = createTaskCard(node, {
			compact: options.compact,
			onClick: options.onClick,
			onEnterEdit: options.onEnterEdit,
		});
		if (options.compact) {
			card.classList.add("task-item-compact");
			const meta = card.querySelector(".task-meta");
			if (meta) meta.remove();
			const desc = card.querySelector(".task-desc");
			if (desc) (desc as HTMLElement).style.whiteSpace = "nowrap";
		}
		ul.appendChild(card);
	});
}
