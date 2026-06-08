// src/ui/component/view/board/matrix-board.ts

import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderMatrix(container: HTMLElement, nodes: TaskTreeNode[]) {
	container.empty();

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
		"rgba(255,130,130,0.25)",
		"rgba(255,180,100,0.25)",
		"rgba(200,200,200,0.15)",
		"rgba(100,180,255,0.2)",
	];

	const grid = document.createElement("div");
	grid.className = "matrix-grid";
	grid.style.display = "grid";
	grid.style.gridTemplateColumns = "1fr 1fr";
	grid.style.gridTemplateRows = "1fr 1fr";
	grid.style.gap = "12px";

	labels.forEach((label, idx) => {
		const card = createGroupCard({
			title: label,
			count: quadrants[idx].length,
			tasks: quadrants[idx],
			color: colors[idx],
		});
		grid.appendChild(card);
	});

	container.appendChild(grid);
}
