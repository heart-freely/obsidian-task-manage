// src/ui/component/view/list/depends-list.ts

import { TaskTreeNode } from "../../../../process/task/task-tree";
import { createGroupCard } from "../card/group-card";

export function renderDepends(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();
	const dependsNodes = nodes.filter((n) => n.forbid);
	if (dependsNodes.length === 0) {
		container.createDiv({ text: "🔗 暂无依赖任务" });
		return;
	}

	const sorted = [...dependsNodes].sort(
		(a, b) => (a.forbid ? 1 : 0) - (b.forbid ? 1 : 0),
	);

	const card = createGroupCard({
		title: "🔗 依赖任务",
		count: sorted.length,
		tasks: sorted,
		onClick: options?.onClick,
		color: "rgba(224,108,117,0.25)",
	});
	container.appendChild(card);
}
