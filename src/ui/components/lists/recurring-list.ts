import { createGroupCard } from "../cards/group-card";

// 低亮度、半透明的循环周期颜色条，适配深色主题
const REPEAT_COLORS = [
	"rgba(100,150,200,0.25)", // 天 - 柔和蓝
	"rgba(100,180,150,0.25)", // 周 - 柔和绿
	"rgba(180,150,100,0.25)", // 月 - 柔和橙
	"rgba(170,130,160,0.25)", // 年 - 柔和紫
];

export function renderRecurring(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();
	const recurringTasks = tasks.filter((t) => t._repeat);
	if (recurringTasks.length === 0) {
		container.createDiv({ text: "🔁 暂无循环任务" });
		return;
	}

	const groups: Record<string, any[]> = {};
	recurringTasks.forEach((task) => {
		const cycle = task._repeat || "其他";
		if (!groups[cycle]) groups[cycle] = [];
		groups[cycle].push(task);
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
			color: REPEAT_COLORS[index % REPEAT_COLORS.length],
		});
		grid.appendChild(card);
	});

	container.appendChild(grid);
}
