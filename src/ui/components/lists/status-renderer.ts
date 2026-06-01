// src/ui/components/lists/status-renderer.ts
import { CONFIG } from "../../../configs/configs";
import { createGroupCard } from "../cards/group-card";

const STATUS_COLORS: Record<string, string> = {
	todo: "rgba(180,180,180,0.25)",
	planned: "rgba(97,175,239,0.25)",
	"in-progress": "rgba(224,108,117,0.25)",
	completed: "rgba(71,133,47,0.25)",
	cancelled: "rgba(195,57,62,0.25)",
};

export function renderStatus(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();

	const groups: Record<string, any[]> = {
		todo: [],
		planned: [],
		"in-progress": [],
		completed: [],
		cancelled: [],
	};

	tasks.forEach((task) => {
		const status = task._status || "todo";
		if (groups[status]) groups[status].push(task);
	});

	const statusOrder = [
		"todo",
		"planned",
		"in-progress",
		"completed",
		"cancelled",
	];
	const labelMap: Record<string, string> = {
		todo: "未开始",
		planned: "计划中",
		"in-progress": "进行中",
		completed: "已完成",
		cancelled: "已取消",
	};

	statusOrder.forEach((status) => {
		const card = createGroupCard({
			title: `${CONFIG.STATUS_ICONS[status] || "🔲"} ${labelMap[status] || status}`,
			count: groups[status].length,
			tasks: groups[status],
			onClick: options?.onClick,
			color: STATUS_COLORS[status],
		});
		container.appendChild(card);
	});
}
