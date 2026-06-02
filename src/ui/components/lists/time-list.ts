// src/ui/components/lists/time-list.ts
import { createGroupCard } from "../cards/group-card";

const COLOR = "rgba(97,175,239,0.25)";

export function renderTimeList(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();

	const groups: Record<string, any[]> = {};
	tasks.forEach((task) => {
		const date = task._scheduled || "无计划日期";
		if (!groups[date]) groups[date] = [];
		groups[date].push(task);
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
			color: COLOR,
			onClick: options?.onClick,
		});
		container.appendChild(card);
	});
}
