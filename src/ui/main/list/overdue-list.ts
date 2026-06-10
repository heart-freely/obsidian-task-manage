// src/ui/main/list/overdue-list.ts

import { TaskTreeNode } from "../../../core/task/task-tree";
import { createGroupCard } from "../card/group-card";

function getEffectiveStatus(node: TaskTreeNode): string {
	const incomplete =
		node.status === "todo" ||
		// 修复：planned → scheduled
		node.status === "scheduled" ||
		node.status === "in-progress";
	if (incomplete && node.done) return "completed";
	if (incomplete && node.cancelled) return "cancelled";
	return node.status;
}

export function renderOverdueList(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void },
) {
	container.empty();

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayTime = today.getTime();

	const overdueNodes = nodes.filter((node) => {
		const effectiveStatus = getEffectiveStatus(node);
		const isIncomplete =
			effectiveStatus === "todo" ||
			// 修复：planned → scheduled
			effectiveStatus === "scheduled" ||
			effectiveStatus === "in-progress";

		if (isIncomplete && node.due) return node.due < todayTime;
		if (
			(effectiveStatus === "completed" ||
				effectiveStatus === "cancelled") &&
			node.due &&
			node.done
		)
			return node.due < node.done;
		return false;
	});

	if (overdueNodes.length === 0) {
		container.createDiv({ text: "✅ 暂无逾期任务" });
		return;
	}

	const groups: Record<string, TaskTreeNode[]> = {};
	overdueNodes.forEach((node) => {
		const effectiveStatus = getEffectiveStatus(node);
		const isCompleted =
			effectiveStatus === "completed" || effectiveStatus === "cancelled";
		const dueTime = node.due!;

		let days: number;
		if (isCompleted && node.done) {
			days = Math.floor((node.done - dueTime) / 86400000);
		} else {
			days = Math.floor((todayTime - dueTime) / 86400000);
		}

		const label =
			days === 0 ? "今天到期" : days === 1 ? "逾期1天" : `逾期${days}天`;
		if (!groups[label]) groups[label] = [];
		groups[label].push(node);
	});

	const sortedKeys = Object.keys(groups).sort((a, b) => {
		const na = parseInt(a.replace(/[^0-9]/g, "")) || 0;
		const nb = parseInt(b.replace(/[^0-9]/g, "")) || 0;
		return nb - na;
	});

	sortedKeys.forEach((key) => {
		const card = createGroupCard({
			title: `⏰ ${key}`,
			count: groups[key].length,
			tasks: groups[key],
			color: "rgba(224,108,117,0.25)",
			onClick: options?.onClick,
		});
		container.appendChild(card);
	});
}
