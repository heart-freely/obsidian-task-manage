// src/ui/main/list/timeline-list.ts

import { getDateMarkColors } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { formatDisplayDate } from "../../../util/date-utils";
import { createGroupCard } from "../card/group-card";

export function renderTimeline(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		onEnterEdit?: (node: TaskTreeNode) => void;
	},
) {
	container.empty();

	const dateMarkColors = getDateMarkColors();
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

	sortedDates.forEach((date) => {
		const card = createGroupCard({
			title: `📅 ${date}`,
			count: groups[date].length,
			tasks: groups[date],
			color: dateMarkColors["due"],
			onClick: options?.onClick,
			onEnterEdit: options?.onEnterEdit,
		});
		container.appendChild(card);
	});
}
