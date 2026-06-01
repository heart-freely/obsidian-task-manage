// src/ui/components/lists/priority-renderer.ts
import { PRIORITY_LABELS, PRIORITY_ORDER } from "../../../configs/configs";
import { createGroupCard } from "../cards/group-card";

const PRIORITY_COLORS = [
	"rgba(224,108,117,0.25)", // 🔺 最高 - 柔和红
	"rgba(209,154,102,0.25)", // ⏫ 高   - 柔和橙
	"rgba(97,175,239,0.25)", // 🔼 中   - 柔和蓝
	"rgba(152,195,121,0.25)", // 🔽 低   - 柔和绿
	"rgba(150,150,150,0.15)", // ⏬ 最低 - 柔和灰
	"rgba(120,120,120,0.1)", // 无优先级 - 淡灰
];

export function renderPriority(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();

	const groups: Record<string, any[]> = {};
	PRIORITY_ORDER.forEach((icon) => {
		groups[icon] = [];
	});
	groups["none"] = [];

	tasks.forEach((task) => {
		const icon = task._priorityIcon || "none";
		if (groups[icon]) groups[icon].push(task);
	});

	// 🔺 在前（最高），无在最后（最低）
	const renderOrder = [...PRIORITY_ORDER].reverse().concat("none");
	renderOrder.forEach((icon, index) => {
		if (groups[icon].length === 0) return;

		// 组内排序：高到低
		const sorted = groups[icon].sort((a, b) => {
			const pa = a._priorityIcon
				? PRIORITY_ORDER.indexOf(a._priorityIcon)
				: -1;
			const pb = b._priorityIcon
				? PRIORITY_ORDER.indexOf(b._priorityIcon)
				: -1;
			return pb - pa;
		});

		let title: string;
		if (icon === "none") {
			title = "无优先级";
		} else {
			const key = (
				PRIORITY_ORDER.length -
				1 -
				PRIORITY_ORDER.indexOf(icon)
			).toString();
			const label = PRIORITY_LABELS[key] || icon;
			const parts = label.split("|");
			const zhName = parts[1] || parts[0];
			title = `${icon} ${zhName}`;
		}

		const card = createGroupCard({
			title,
			count: sorted.length,
			tasks: sorted,
			onClick: options?.onClick,
			color: PRIORITY_COLORS[index],
		});
		container.appendChild(card);
	});
}
