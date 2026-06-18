// src/ui/main/list/status-list.ts

import { getStatusColors, STATUS_ICONS } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderStatus(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		onEnterEdit?: (node: TaskTreeNode) => void;
	},
) {
	container.empty();

	const statusColors = getStatusColors();
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

	const order = [
		"todo",
		"scheduled",
		"in-progress",
		"cancelled",
		"completed",
	];
	const labelMap: Record<string, string> = {
		todo: "待办中",
		scheduled: "计划中",
		"in-progress": "进行中",
		cancelled: "已取消",
		completed: "已完成",
	};

	order.forEach((status) => {
		const card = createGroupCard({
			title: `${STATUS_ICONS[status] || "🔲"} ${labelMap[status] || status}`,
			count: groups[status].length,
			tasks: groups[status],
			onClick: options?.onClick,
			onEnterEdit: options?.onEnterEdit,
			color: statusColors[status],
		});
		container.appendChild(card);
	});
}
