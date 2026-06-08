// src/ui/component/view/list/status-list.ts

import { STATUS_COLORS, STATUS_ICONS } from "../../../../process/config/config";
import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderStatus(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();

	const groups: Record<string, TaskTreeNode[]> = {
		todo: [],
		planned: [],
		"in-progress": [],
		completed: [],
		cancelled: [],
	};

	nodes.forEach((node) => {
		if (groups[node.status]) groups[node.status].push(node);
	});

	const statusOrder = [
		"todo",
		"planned",
		"in-progress",
		"completed",
		"cancelled",
	];
	const labelMap: Record<string, string> = {
		todo: "未开始",
		planned: "计划中",
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
