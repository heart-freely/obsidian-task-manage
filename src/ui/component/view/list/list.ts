// src/ui/component/lists/list.ts

import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createTaskCard } from "../card/card";

interface TaskListOptions {
	onClick?: (node: TaskTreeNode) => void;
	compact?: boolean;
}

export function renderTaskList(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options: TaskListOptions = {},
) {
	const ul = container.createEl("ul", { cls: "task-list" });
	nodes.forEach((node) => {
		const card = createTaskCard(node, {
			showTooltip: options.compact ?? false,
		});
		if (options.compact) {
			card.classList.add("task-item-compact");
			const meta = card.querySelector(".task-meta");
			if (meta) meta.remove();
			const desc = card.querySelector(".task-desc");
			if (desc) (desc as HTMLElement).style.whiteSpace = "nowrap";
		}
		if (options.onClick) {
			card.addEventListener("click", (e) => {
				e.stopPropagation();
				options.onClick!(node);
			});
		}
		ul.appendChild(card);
	});
}
