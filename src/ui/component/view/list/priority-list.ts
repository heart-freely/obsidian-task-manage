// src/ui/component/lists/priority-renderer.ts

import {
	PRIORITY_LABELS,
	PRIORITY_ORDER,
} from "../../../../process/config/config";
import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createGroupCard } from "../card/group-card";

const PRIORITY_COLORS = [
	"rgba(224,108,117,0.25)",
	"rgba(209,154,102,0.25)",
	"rgba(97,175,239,0.25)",
	"rgba(152,195,121,0.25)",
	"rgba(150,150,150,0.15)",
	"rgba(120,120,120,0.1)",
];

const PRIORITY_ICONS = ["🔺", "⏫", "🔼", "🔽", "⏬"];

export function renderPriority(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();

	const groups: Record<string, TaskTreeNode[]> = {};
	PRIORITY_ORDER.forEach((icon) => {
		groups[icon] = [];
	});
	groups["none"] = [];

	nodes.forEach((node) => {
		const icon = PRIORITY_ICONS[node.priority] || "none";
		if (groups[icon]) groups[icon].push(node);
	});

	const renderOrder = [...PRIORITY_ORDER].reverse().concat("none");
	renderOrder.forEach((icon, index) => {
		if (groups[icon].length === 0) return;

		const sorted = groups[icon].sort((a, b) => b.priority - a.priority);

		let title: string;
		if (icon === "none") {
			title = "无优先级";
		} else {
			const key = (
				PRIORITY_ORDER.length -
				1 -
				PRIORITY_ORDER.indexOf(icon)
			).toString();
			const label = PRIORITY_LABELS[key] || icon;
			const parts = label.split("|");
			const zhName = parts[1] || parts[0];
			title = `${icon} ${zhName}`;
		}

		const card = createGroupCard({
			title,
			count: sorted.length,
			tasks: sorted,
			onClick: options?.onClick,
			color: PRIORITY_COLORS[index],
		});
		container.appendChild(card);
	});
}
