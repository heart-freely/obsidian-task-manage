// src/ui/main/list/uniqueId-list.ts

import { ID_COLOR_DEF } from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { getThemeColor } from "../../../util/color-utils";
import { createGroupCard } from "../card/group-card";

export function renderUniqueId(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		onEnterEdit?: (node: TaskTreeNode) => void;
	},
) {
	container.empty();
	const uniqueIdNodes = nodes.filter((n) => n.id);
	if (uniqueIdNodes.length === 0) {
		container.createDiv({ text: "🆔 暂无带唯一ID的任务" });
		return;
	}

	const color = getThemeColor(ID_COLOR_DEF);
	const sorted = [...uniqueIdNodes].sort(
		(a, b) => (b.id ? 1 : 0) - (a.id ? 1 : 0),
	);

	const card = createGroupCard({
		title: "🆔 唯一ID任务",
		count: sorted.length,
		tasks: sorted,
		onClick: options?.onClick,
		onEnterEdit: options?.onEnterEdit,
		color: color,
	});
	container.appendChild(card);
}
