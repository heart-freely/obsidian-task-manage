// src/ui/component/view/list/timeline-list.ts

import { formatDisplayDate } from "../../../../process/config/config";
import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderTimeline(container: HTMLElement, nodes: TaskTreeNode[]) {
	container.empty();
	const groups: Record<string, TaskTreeNode[]> = {};
	nodes.forEach((node) => {
		const due = node.due
			? formatDisplayDate(new Date(node.due))
			: "无截止日期";
		if (!groups[due]) groups[due] = [];
		groups[due].push(node);
	});

	const sortedDates = Object.keys(groups).sort((a, b) => {
		if (a === "无截止日期") return 1;
		if (b === "无截止日期") return -1;
		return a.localeCompare(b);
	});

	const color = "rgba(97,175,239,0.25)";

	sortedDates.forEach((date) => {
		const card = createGroupCard({
			title: `📅 ${date}`,
			count: groups[date].length,
			tasks: groups[date],
			color: color,
		});
		container.appendChild(card);
	});
}
