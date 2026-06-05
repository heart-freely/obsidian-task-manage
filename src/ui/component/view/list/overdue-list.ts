// src/ui/component/lists/overdue-list.ts
import { createGroupCard } from "../card/group-card";

export function renderOverdueList(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayTime = today.getTime();

	// 筛选逾期任务
	const overdueTasks = tasks.filter((task) => {
		// 未完成：截止日期在今天之前
		const isIncomplete =
			task._status === "todo" ||
			task._status === "planned" ||
			task._status === "in-progress";
		if (isIncomplete && task._due) {
			const dueTime = new Date(task._due).getTime();
			return dueTime < todayTime;
		}
		// 已完成：截止日期在完成日期之前
		if (
			(task._status === "completed" || task._status === "cancelled") &&
			task._due &&
			task._done
		) {
			const dueTime = new Date(task._due).getTime();
			const doneTime = new Date(task._done).getTime();
			return dueTime < doneTime;
		}
		return false;
	});

	if (overdueTasks.length === 0) {
		container.createDiv({ text: "✅ 暂无逾期任务" });
		return;
	}

	// 按逾期天数分组
	const groups: Record<string, any[]> = {};
	overdueTasks.forEach((task) => {
		const dueTime = new Date(task._due).getTime();
		const days = Math.floor((todayTime - dueTime) / 86400000);
		const label =
			days === 0 ? "今天到期" : days === 1 ? "逾期1天" : `逾期${days}天`;
		if (!groups[label]) groups[label] = [];
		groups[label].push(task);
	});

	const sortedKeys = Object.keys(groups).sort((a, b) => {
		const na = parseInt(a.replace(/[^0-9]/g, "")) || 0;
		const nb = parseInt(b.replace(/[^0-9]/g, "")) || 0;
		return nb - na;
	});

	sortedKeys.forEach((key) => {
		const card = createGroupCard({
			title: `⏰ ${key}`,
			count: groups[key].length,
			tasks: groups[key],
			color: "rgba(224,108,117,0.25)",
			onClick: options?.onClick,
		});
		container.appendChild(card);
	});
}
