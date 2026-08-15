// src/ui/main/board/matrix-board.ts

import { getPriorityColors } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderMatrix(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		onEnterEdit?: (node: TaskTreeNode) => void;
	},
) {
	container.empty();
	const priorityColors = getPriorityColors();
	const filteredNodes = nodes.filter((n) => n.priority !== 5);
	const quadrants: TaskTreeNode[][] = [[], [], [], []];
	filteredNodes.forEach((node) => {
		const p = node.priority;
		if (p === 0) quadrants[0].push(node);
		else if (p === 1) quadrants[1].push(node);
		else if (p === 2) quadrants[2].push(node);
		else quadrants[3].push(node);
	});
	const labels = [
		"🔺 紧急与重要",
		"⏫ 不紧急但重要",
		"🔼 紧急但不重要",
		"🔽⏬ 不紧急也不重要",
	];
	const colors = [
		priorityColors[0],
		priorityColors[1],
		priorityColors[2],
		priorityColors[3],
	];
	const grid = createDiv();
	grid.className = "matrix-grid";
	grid.addClass(
		"task-grid",
		"task-grid-cols-2",
		"task-grid-rows-2",
		"task-gap-3",
	);
	labels.forEach((label, idx) => {
		const card = createGroupCard({
			title: label,
			count: quadrants[idx].length,
			tasks: quadrants[idx],
			color: colors[idx],
			onClick: options?.onClick,
			onEnterEdit: options?.onEnterEdit,
		});
		grid.appendChild(card);
	});
	container.appendChild(grid);
}
