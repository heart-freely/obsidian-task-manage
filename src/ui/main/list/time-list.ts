// src/ui/main/list/time-list.ts

import { getDateMarkColors } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { formatDisplayDate } from "../../../util/date-utils";
import { createGroupCard } from "../card/group-card";

export function renderTimeList(
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
			color: dateMarkColors["scheduled"],
			onClick: options?.onClick,
			onEnterEdit: options?.onEnterEdit,
		});
		container.appendChild(card);
	});
}
