// src/ui/component/lists/uniqueId-renderer.ts

import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderUniqueId(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();
	const uniqueIdNodes = nodes.filter((n) => n.id);
	if (uniqueIdNodes.length === 0) {
		container.createDiv({ text: "🆔 暂无带唯一ID的任务" });
		return;
	}

	const sorted = [...uniqueIdNodes].sort(
		(a, b) => (a.id ? 1 : 0) - (b.id ? 1 : 0),
	);

	const card = createGroupCard({
		title: "🆔 唯一ID任务",
		count: sorted.length,
		tasks: sorted,
		onClick: options?.onClick,
		color: "rgba(140, 120, 200, 0.25)",
	});
	container.appendChild(card);
}
