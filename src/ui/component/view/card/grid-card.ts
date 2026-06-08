// src/ui/component/view/card/grid-card.ts

import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createTaskCard } from "./card";

export function renderCards(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();

	if (nodes.length === 0) {
		container.createDiv({ text: "暂无任务" });
		return;
	}

	const grid = document.createElement("div");
	grid.className = "task-cards-grid";
	grid.style.display = "grid";
	grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";
	grid.style.gap = "12px";

	nodes.forEach((node) => {
		const card = createTaskCard(node);
		card.style.borderLeft = "3px solid rgba(180,180,180,0.2)";
		if (options?.onClick) {
			card.addEventListener("click", (e) => {
				e.stopPropagation();
				options.onClick!(node);
			});
		}
		grid.appendChild(card);
	});

	container.appendChild(grid);
}
