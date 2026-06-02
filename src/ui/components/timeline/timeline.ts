import { createGroupCard } from "../cards/group-card";

export function renderTimeline(container: HTMLElement, tasks: any[]) {
	container.empty();
	const groups: Record<string, any[]> = {};
	tasks.forEach((task) => {
		const due = task._due || "无截止日期";
		if (!groups[due]) groups[due] = [];
		groups[due].push(task);
	});

	const sortedDates = Object.keys(groups).sort((a, b) => {
		if (a === "无截止日期") return 1;
		if (b === "无截止日期") return -1;
		return a.localeCompare(b);
	});

	// 统一颜色条
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
