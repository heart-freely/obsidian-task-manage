// src/ui/main/list/depends-list.ts

import { DEPENDS_COLOR_DEF } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { getThemeColor } from "../../../util/color-utils";
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

	const color = getThemeColor(DEPENDS_COLOR_DEF);
	const sorted = [...dependsNodes].sort(
		(a, b) => (b.forbid ? 1 : 0) - (a.forbid ? 1 : 0),
	);

	const card = createGroupCard({
		title: "🔗 依赖任务",
		count: sorted.length,
		tasks: sorted,
		onClick: options?.onClick,
		color: color,
	});
	container.appendChild(card);
}
