// src/ui/component/view/list/status-list.ts
// 状态分组列表渲染器

import { STATUS_COLORS, STATUS_ICONS } from "../../../../process/config/config";
import { createGroupCard } from "../card/group-card";

export function renderStatus(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();

	const groups: Record<string, any[]> = {
		todo: [],
		planned: [],
		"in-progress": [],
		completed: [],
		cancelled: [],
	};

	tasks.forEach((task) => {
		const status = task._status || "todo";
		if (groups[status]) groups[status].push(task);
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
