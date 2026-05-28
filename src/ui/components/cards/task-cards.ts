import { createTaskCard } from "./task-card";

/**
 * 卡片视图：每个任务一个独立卡片，网格布局，自适应列数
 */
export function renderCards(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();

	if (tasks.length === 0) {
		container.createDiv({ text: "暂无任务" });
		return;
	}

	const grid = document.createElement("div");
	grid.className = "task-cards-grid";
	grid.style.display = "grid";
	grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";
	grid.style.gap = "12px";

	tasks.forEach((task) => {
		const card = createTaskCard(task);
		// 左侧颜色条调暗，与看板未开始列风格一致
		card.style.borderLeft = "3px solid rgba(180,180,180,0.2)";
		if (options?.onClick) {
			card.addEventListener("click", (e) => {
				e.stopPropagation();
				options.onClick(task);
			});
		}
		grid.appendChild(card);
	});

	container.appendChild(grid);
}
