// src/ui/main/list/tag-list.ts

import { getTagPalette, TAG_COLOR_DEF } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { getThemeColor } from "../../../util/color-utils";
import { createGroupCard } from "../card/group-card";

export function renderTag(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();
	const taggedNodes = nodes.filter((n) => n.tag);
	if (taggedNodes.length === 0) {
		container.createDiv({ text: "🏷️ 暂无标签任务" });
		return;
	}

	const tagColor = getThemeColor(TAG_COLOR_DEF);
	const tagPalette = getTagPalette();
	const tagMap = new Map<string, TaskTreeNode[]>();
	taggedNodes.forEach((node) => {
		const tag = node.tag || "无标签";
		if (!tagMap.has(tag)) tagMap.set(tag, []);
		tagMap.get(tag)!.push(node);
	});

	let colorIndex = 0;
	tagMap.forEach((tagNodes, tag) => {
		const color =
			colorIndex === 0
				? tagColor
				: tagPalette[(colorIndex - 1) % tagPalette.length];
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
