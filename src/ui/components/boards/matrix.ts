import { createGroupCard } from "../cards/group-card";

export function renderMatrix(container: HTMLElement, tasks: any[]) {
	container.empty();

	// 仅保留有优先级的任务
	const filteredTasks = tasks.filter((t) => t._priorityIcon);

	const quadrants: any[][] = [[], [], [], []];
	filteredTasks.forEach((task) => {
		const icon = task._priorityIcon;
		if (icon === "🔺") quadrants[0].push(task);
		else if (icon === "⏫") quadrants[1].push(task);
		else if (icon === "🔼") quadrants[2].push(task);
		else quadrants[3].push(task);
	});

	const labels = [
		"🔺 紧急与重要",
		"⏫ 不紧急但重要",
		"🔼 紧急但不重要",
		"🔽⏬ 不紧急也不重要",
	];
	const colors = [
		"rgba(255,130,130,0.25)",
		"rgba(255,180,100,0.25)",
		"rgba(200,200,200,0.15)",
		"rgba(100,180,255,0.2)",
	];

	const grid = document.createElement("div");
	grid.className = "matrix-grid";
	grid.style.display = "grid";
	grid.style.gridTemplateColumns = "1fr 1fr";
	grid.style.gridTemplateRows = "1fr 1fr";
	grid.style.gap = "12px";

	labels.forEach((label, idx) => {
		const card = createGroupCard({
			title: label,
			count: quadrants[idx].length,
			tasks: quadrants[idx],
			color: colors[idx],
		});
		grid.appendChild(card);
	});

	container.appendChild(grid);
}
