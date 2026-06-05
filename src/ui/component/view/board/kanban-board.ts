import { createGroupCard } from "../card/group-card";

export function renderKanban(container: HTMLElement, tasks: any[]) {
	container.empty();

	// 仅保留有效状态的任务
	const validStatuses = ["todo", "planned", "in-progress"];
	const filteredTasks = tasks.filter((t) =>
		validStatuses.includes(t._status),
	);

	const groups: Record<string, any[]> = {
		todo: [],
		planned: [],
		"in-progress": [],
	};
	filteredTasks.forEach((t) => {
		groups[t._status].push(t);
	});

	const columns = [
		{ key: "todo", label: "未开始", color: "rgba(180,180,180,0.25)" },
		{ key: "planned", label: "计划中", color: "rgba(97,175,239,0.25)" },
		{
			key: "in-progress",
			label: "进行中",
			color: "rgba(224,108,117,0.25)",
		},
	];

	const board = document.createElement("div");
	board.className = "kanban-board";
	board.style.display = "flex";
	board.style.gap = "12px";
	board.style.alignItems = "flex-start";

	columns.forEach((col) => {
		const card = createGroupCard({
			title: col.label,
			count: groups[col.key].length,
			tasks: groups[col.key],
			color: col.color,
		});
		card.style.flex = "1";
		card.style.minWidth = "0";
		board.appendChild(card);
	});

	container.appendChild(board);
}
