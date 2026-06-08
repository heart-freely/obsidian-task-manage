// src/ui/component/view/calendar/month-calendar.ts

import { DateUtils } from "../../../../process/process";
import { TaskTreeNode } from "../../../../process/task/task-tree";

export function renderCalendarMonth(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";
	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth();

	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dow = startDay.getDay() || 7;
	startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

	const grid = container.createDiv({ cls: "calendar-grid" });
	["一", "二", "三", "四", "五", "六", "日"].forEach((d) => {
		grid.createDiv({ text: d, cls: "cal-cell-header" });
	});

	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		const dateStr = DateUtils.formatDate(d);
		const isToday = DateUtils.formatDate(today) === dateStr;
		const isOtherMonth = d.getMonth() !== month;

		const cell = grid.createDiv({
			cls:
				"cal-cell" +
				(isToday ? " today" : "") +
				(isOtherMonth ? " other-month" : ""),
		});
		cell.createDiv({ text: `${d.getDate()}`, cls: "cal-cell-header" });

		const dayNodes = nodes.filter((node) =>
			isNodeInDate(node, d, intervalMode),
		);
		dayNodes.forEach((node) => {
			const taskEl = cell.createDiv({ cls: "cal-task" });
			taskEl.createSpan({ text: node.text || node.content });
			taskEl.addEventListener("click", () => {
				if (options?.onClick) options.onClick(node);
			});
		});
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
