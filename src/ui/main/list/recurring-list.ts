// src/ui/main/list/recurring-list.ts

import { getRepeatColors } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderRecurring(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();
	const recurringNodes = nodes.filter((n) => n.repeat);
	if (recurringNodes.length === 0) {
		container.createDiv({ text: "🔁 暂无循环任务" });
		return;
	}

	const repeatColors = getRepeatColors();
	const groups: Record<string, TaskTreeNode[]> = {};
	recurringNodes.forEach((node) => {
		const cycle = node.repeat || "其他";
		if (!groups[cycle]) groups[cycle] = [];
		groups[cycle].push(node);
	});

	const cycleOrder = ["every day", "every week", "every month", "every year"];

	const grid = document.createElement("div");
	grid.className = "recurring-grid";
	grid.style.display = "grid";
	grid.style.gridTemplateColumns = "1fr 1fr";
	grid.style.gridTemplateRows = "auto auto";
	grid.style.gap = "12px";

	cycleOrder.forEach((cycle, index) => {
		const tasksInGroup = groups[cycle] || [];
		const card = createGroupCard({
			title: `🔁 ${cycle}`,
			count: tasksInGroup.length,
			tasks: tasksInGroup,
			onClick: options?.onClick,
			color: repeatColors[index],
		});
		grid.appendChild(card);
	});

	container.appendChild(grid);
}
