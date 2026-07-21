// src/ui/main/card/grid-card.ts

import { TaskTreeNode } from "../../../core/task/task-tree";
import { createEl } from "../../../util/dom-utils";
import { createTaskCard } from "./card";

export function renderCards(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		onEnterEdit?: (node: TaskTreeNode) => void;
	},
) {
	container.empty();

	if (nodes.length === 0) {
		container.createDiv({ text: "暂无任务" });
		return;
	}

	const grid = createEl("div");
	grid.className = "task-cards-grid";
	grid.addClass("task-grid", "task-grid-cols-auto-fill", "task-gap-3");

	nodes.forEach((node) => {
		const card = createTaskCard(node, {
			onClick: options?.onClick,
			onEnterEdit: options?.onEnterEdit,
		});
		card.addClass("task-card-border-left");
		grid.appendChild(card);
	});

	container.appendChild(grid);
}
