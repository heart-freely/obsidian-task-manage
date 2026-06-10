// src/ui/main/list/status-list.ts

import { STATUS_COLORS, STATUS_ICONS } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderStatus(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();

	// 修复：planned → scheduled
	const groups: Record<string, TaskTreeNode[]> = {
		todo: [],
		scheduled: [],
		"in-progress": [],
		completed: [],
		cancelled: [],
	};

	nodes.forEach((node) => {
		if (groups[node.status]) groups[node.status].push(node);
	});

	// 修复：planned → scheduled
	const statusOrder = [
		"todo",
		"scheduled",
		"in-progress",
		"completed",
		"cancelled",
	];
	const labelMap: Record<string, string> = {
		todo: "待办中",
		// 修复：planned → scheduled
		scheduled: "计划中",
		"in-progress": "进行中",
		completed: "已完成",
		cancelled: "已取消",
	};

	statusOrder.forEach((status) => {
		const card = createGroupCard({
			title: `${STATUS_ICONS[status] || "🔲"} ${labelMap[status] || status}`,
			count: groups[status].length,
			tasks: groups[status],
			onClick: options?.onClick,
			color: STATUS_COLORS[status],
		});
		container.appendChild(card);
	});
}
