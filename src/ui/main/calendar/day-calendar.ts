// src/ui/main/calendar/day-calendar.ts

import { TaskTreeNode } from "../../../core/task/task-tree";
import { DateUtils } from "../../../util/date-utils";

export function renderCalendarDay(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";

	const map = new Map<string, TaskTreeNode[]>();
	const today = new Date();

	nodes.forEach((node) => {
		const dates = getDatesForNode(node, intervalMode);
		dates.forEach((dateStr) => {
			if (!map.has(dateStr)) map.set(dateStr, []);
			map.get(dateStr)!.push(node);
		});
	});

	const sortedDates = Array.from(map.keys()).sort();
	if (sortedDates.length === 0) {
		container.createDiv({ text: "暂无任务日期", cls: "empty-placeholder" });
		return;
	}

	sortedDates.forEach((dateStr) => {
		const groupDiv = container.createDiv({ cls: "day-group" });
		groupDiv.createEl("div", { text: `📅 ${dateStr}`, cls: "day-header" });
		const list = groupDiv.createEl("ul", { cls: "task-list" });
		const dayNodes = map.get(dateStr)!;
		dayNodes.forEach((node) => {
			const li = list.createEl("li", { cls: "task-item" });
			li.createSpan({ text: `${node.text || node.content}` });
			li.addEventListener("click", () => {
				if (options?.onClick) options.onClick(node);
			});
		});
	});
}

function getDatesForNode(node: TaskTreeNode, intervalMode: string): string[] {
	const dates: string[] = [];
	let startField: number | null, endField: number | null;

	if (intervalMode === "starts-done") {
		startField = node.starts;
		endField = node.done ?? node.due;
	} else {
		startField = node.scheduled;
		endField = node.due;
	}

	if (startField !== null && endField !== null) {
		let cur = DateUtils.setStart(new Date(startField));
		const finish = DateUtils.setEnd(new Date(endField)).getTime();
		while (cur.getTime() <= finish) {
			dates.push(DateUtils.formatDate(cur));
			cur.setDate(cur.getDate() + 1);
		}
	}
	return dates;
}
