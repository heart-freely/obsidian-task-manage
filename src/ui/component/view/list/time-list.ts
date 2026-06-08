// src/ui/component/lists/time-list.ts

import { formatDisplayDate } from "../../../../process/config/config";
import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createGroupCard } from "../card/group-card";

const COLOR = "rgba(97,175,239,0.25)";

export function renderTimeList(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();

	const groups: Record<string, TaskTreeNode[]> = {};
	nodes.forEach((node) => {
		const date = node.scheduled
			? formatDisplayDate(new Date(node.scheduled))
			: "无计划日期";
		if (!groups[date]) groups[date] = [];
		groups[date].push(node);
	});

	const sortedDates = Object.keys(groups).sort((a, b) => {
		if (a === "无计划日期") return 1;
		if (b === "无计划日期") return -1;
		return a.localeCompare(b);
	});

	sortedDates.forEach((date) => {
		const card = createGroupCard({
			title: `⏳ ${date}`,
			count: groups[date].length,
			tasks: groups[date],
			color: COLOR,
			onClick: options?.onClick,
		});
		container.appendChild(card);
	});
}
