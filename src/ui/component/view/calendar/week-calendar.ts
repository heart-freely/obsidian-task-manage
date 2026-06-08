// src/ui/component/view/calendar/week-calendar.ts

import { DateUtils } from "../../../../process/process";
import { TaskTreeNode } from "../../../../process/task/task-tree";

export function renderCalendarWeek(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";

	const allDates = getRelevantDates(nodes, intervalMode);
	if (allDates.length === 0) {
		container.createDiv({ text: "无任务日期", cls: "empty-placeholder" });
		return;
	}
	const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
	const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

	let weekStart = DateUtils.setStart(minDate);
	const dow = weekStart.getDay() || 7;
	weekStart.setDate(weekStart.getDate() - (dow - 1));

	const today = new Date();
	while (weekStart <= maxDate) {
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 6);

		const weekDiv = container.createDiv({ cls: "week-block" });
		weekDiv.createEl("div", {
			text: `📅 ${DateUtils.formatDate(weekStart)} ~ ${DateUtils.formatDate(weekEnd)} (第${DateUtils.getISOWeekNumber(weekStart)}周)`,
			cls: "week-title",
		});

		const grid = weekDiv.createDiv({ cls: "calendar-grid" });
		for (let i = 0; i < 7; i++) {
			const d = new Date(weekStart);
			d.setDate(d.getDate() + i);
			const dateStr = DateUtils.formatDate(d);
			const isToday = DateUtils.formatDate(today) === dateStr;

			const cell = grid.createDiv({
				cls: "cal-cell" + (isToday ? " today" : ""),
			});
			cell.createDiv({ text: `${d.getDate()}`, cls: "cal-cell-header" });

			const dayNodes = nodes.filter((node) =>
				isNodeInDate(node, d, intervalMode),
			);
			if (dayNodes.length > 0) {
				const list = cell.createEl("ul", { cls: "task-list-mini" });
				dayNodes.forEach((node) => {
					const li = list.createEl("li", {
						text: node.text || node.content,
					});
					li.addEventListener("click", () => {
						if (options?.onClick) options.onClick(node);
					});
				});
			}
		}

		weekStart.setDate(weekStart.getDate() + 7);
	}
}

function isNodeInDate(
	node: TaskTreeNode,
	date: Date,
	intervalMode: string,
): boolean {
	let startField: number | null, endField: number | null;

	if (intervalMode === "starts-done") {
		startField = node.starts;
		endField = node.done ?? node.due;
	} else {
		startField = node.scheduled;
		endField = node.due;
	}

	if (startField === null || endField === null) return false;
	const dayStart = DateUtils.setStart(date).getTime();
	const dayEnd = DateUtils.setEnd(date).getTime();
	return startField <= dayEnd && endField >= dayStart;
}

function getRelevantDates(nodes: TaskTreeNode[], intervalMode: string): Date[] {
	const dates: Date[] = [];
	nodes.forEach((node) => {
		if (intervalMode === "starts-done") {
			if (node.starts) dates.push(new Date(node.starts));
			if (node.done) dates.push(new Date(node.done));
			else if (node.due) dates.push(new Date(node.due));
		} else {
			if (node.scheduled) dates.push(new Date(node.scheduled));
			if (node.due) dates.push(new Date(node.due));
		}
	});
	return dates;
}
