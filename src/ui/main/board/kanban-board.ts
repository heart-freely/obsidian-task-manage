// src/ui/main/board/kanban-board.ts

import { TaskTreeNode } from "../../../core/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderKanban(container: HTMLElement, nodes: TaskTreeNode[]) {
	container.empty();

	// 修复：planned → scheduled
	const validStatuses = ["todo", "scheduled", "in-progress"];
	const filteredNodes = nodes.filter((n) => validStatuses.includes(n.status));

	const groups: Record<string, TaskTreeNode[]> = {
		todo: [],
		// 修复：planned → scheduled
		scheduled: [],
		"in-progress": [],
	};
	filteredNodes.forEach((n) => {
		groups[n.status].push(n);
	});

	const columns = [
		{ key: "todo", label: "待办中", color: "rgba(180,180,180,0.25)" },
		// 修复：planned → scheduled
		{ key: "scheduled", label: "计划中", color: "rgba(97,175,239,0.25)" },
		{
			key: "in-progress",
			label: "进行中",
			color: "rgba(224,108,117,0.25)",
		},
	];

	const board = document.createElement("div");
	board.className = "kanban-board";
	board.style.display = "flex";
	board.style.gap = "12px";
	board.style.alignItems = "flex-start";

	columns.forEach((col) => {
		const card = createGroupCard({
			title: col.label,
			count: groups[col.key].length,
			tasks: groups[col.key],
			color: col.color,
		});
		card.style.flex = "1";
		card.style.minWidth = "0";
		board.appendChild(card);
	});

	container.appendChild(board);
}
