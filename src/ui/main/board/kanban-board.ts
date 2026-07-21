// src/ui/main/board/kanban-board.ts

import { getStatusColors } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createEl } from "../../../util/dom-utils";
import { createGroupCard } from "../card/group-card";

export function renderKanban(container: HTMLElement, nodes: TaskTreeNode[]) {
	container.empty();
	const statusColors = getStatusColors();
	const validStatuses = ["todo", "scheduled", "in-progress"];
	const filteredNodes = nodes.filter((n) => validStatuses.includes(n.status));
	const groups: Record<string, TaskTreeNode[]> = {
		todo: [],
		scheduled: [],
		"in-progress": [],
	};
	filteredNodes.forEach((n) => {
		groups[n.status].push(n);
	});
	const columns = [
		{ key: "todo", label: "待办中", color: statusColors["todo"] },
		{ key: "scheduled", label: "计划中", color: statusColors["scheduled"] },
		{
			key: "in-progress",
			label: "进行中",
			color: statusColors["in-progress"],
		},
	];
	const board = createEl("div");
	board.className = "kanban-board";
	board.addClass("task-flex", "task-gap-3", "task-items-start");
	columns.forEach((col) => {
		const card = createGroupCard({
			title: col.label,
			count: groups[col.key].length,
			tasks: groups[col.key],
			color: col.color,
		});
		card.addClass("task-flex-1", "task-min-w-0");
		board.appendChild(card);
	});
	container.appendChild(board);
}
