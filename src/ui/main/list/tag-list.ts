// src/ui/main/list/tag-list.ts
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createGroupCard } from "../card/group-card";

const TAG_COLORS = [
	"rgba(255,180,100,0.25)",
	"rgba(180,220,120,0.25)",
	"rgba(150,180,240,0.25)",
	"rgba(240,130,130,0.25)",
	"rgba(200,170,220,0.25)",
];

export function renderTag(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();
	// 修复：node.task.tag → node.tag
	const taggedNodes = nodes.filter((n) => n.tag);
	if (taggedNodes.length === 0) {
		container.createDiv({ text: "🏷️ 暂无标签任务" });
		return;
	}

	const tagMap = new Map<string, TaskTreeNode[]>();
	taggedNodes.forEach((node) => {
		// 修复：node.task.tag → node.tag
		const tag = node.tag || "无标签";
		if (!tagMap.has(tag)) tagMap.set(tag, []);
		tagMap.get(tag)!.push(node);
	});

	let colorIndex = 0;
	tagMap.forEach((tagNodes, tag) => {
		const color = TAG_COLORS[colorIndex % TAG_COLORS.length];
		colorIndex++;
		const card = createGroupCard({
			title: `🏁 ${tag}`,
			count: tagNodes.length,
			tasks: tagNodes,
			onClick: options?.onClick,
			color: color,
		});
		container.appendChild(card);
	});
}
