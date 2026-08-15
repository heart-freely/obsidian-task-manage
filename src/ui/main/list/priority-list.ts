// src/ui/main/list/priority-list.ts

import {
	getMissingColor,
	getPriorityColors,
	PRIORITY_LABELS,
	PRIORITY_ORDER,
} from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createGroupCard } from "../card/group-card";

const PRIORITY_ICONS = ["🔺", "⏫", "🔼", "🔽", "⏬"];

export function renderPriority(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		onEnterEdit?: (node: TaskTreeNode) => void;
	},
) {
	container.empty();

	const priorityColors = getPriorityColors();
	const groups: Record<string, TaskTreeNode[]> = {};
	PRIORITY_ORDER.forEach((icon) => {
		groups[icon] = [];
	});
	groups["none"] = [];

	nodes.forEach((node) => {
		const icon =
			node.priority >= 0 && node.priority < 5
				? PRIORITY_ICONS[node.priority]
				: "none";
		if (groups[icon]) groups[icon].push(node);
	});

	const renderOrder = [...PRIORITY_ORDER, "none"];
	renderOrder.forEach((icon) => {
		if (groups[icon].length === 0) return;

		const sorted = [...groups[icon]].sort(
			(a, b) => a.priority - b.priority,
		);

		let title: string;
		let color: string;
		if (icon === "none") {
			title = "无优先级";
			color = getMissingColor();
		} else {
			const priorityNum = PRIORITY_ORDER.indexOf(icon);
			const label = PRIORITY_LABELS[String(priorityNum)] || icon;
			const parts = label.split("|");
			const zhName = parts[1] || parts[0];
			title = `${icon} ${zhName}`;
			color = priorityColors[priorityNum];
		}

		const card = createGroupCard({
			title,
			count: sorted.length,
			tasks: sorted,
			onClick: options?.onClick,
			onEnterEdit: options?.onEnterEdit,
			color,
		});
		container.appendChild(card);
	});
}
