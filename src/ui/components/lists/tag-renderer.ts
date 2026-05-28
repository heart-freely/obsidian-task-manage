import { createGroupCard } from "../cards/group-card";

const TAG_COLORS = [
	"rgba(255,180,100,0.25)",
	"rgba(180,220,120,0.25)",
	"rgba(150,180,240,0.25)",
	"rgba(240,130,130,0.25)",
	"rgba(200,170,220,0.25)",
];

export function renderTag(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();
	// 只保留有标签的任务
	const taggedTasks = tasks.filter((t) => t._tag);
	if (taggedTasks.length === 0) {
		container.createDiv({ text: "🏷️ 暂无标签任务" });
		return;
	}

	const tagMap = new Map<string, any[]>();
	taggedTasks.forEach((task) => {
		const tag = task._tag || "无标签";
		if (!tagMap.has(tag)) tagMap.set(tag, []);
		tagMap.get(tag)!.push(task);
	});

	let colorIndex = 0;
	tagMap.forEach((tagTasks, tag) => {
		const color = TAG_COLORS[colorIndex % TAG_COLORS.length];
		colorIndex++;
		const card = createGroupCard({
			title: `🏁 ${tag}`,
			count: tagTasks.length,
			tasks: tagTasks,
			onClick: options?.onClick,
			color: color,
		});
		container.appendChild(card);
	});
}
