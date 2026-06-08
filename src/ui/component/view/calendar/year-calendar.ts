// src/ui/component/view/calendar/year-calendar.ts

import { DateUtils } from "../../../../process/process";
import { TaskTreeNode } from "../../../../process/task/task-tree";

export function renderCalendarYear(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void; intervalMode?: string },
) {
	container.empty();
	const year = new Date().getFullYear();
	const monthNames = [
		"1月",
		"2月",
		"3月",
		"4月",
		"5月",
		"6月",
		"7月",
		"8月",
		"9月",
		"10月",
		"11月",
		"12月",
	];
	const grid = container.createDiv({ cls: "year-grid" });

	for (let m = 0; m < 12; m++) {
		const monthDiv = grid.createDiv({ cls: "year-month-card" });
		monthDiv.createDiv({ text: monthNames[m], cls: "year-month-title" });

		const firstDay = new Date(year, m, 1);
		const startDay = new Date(firstDay);
		const dow = startDay.getDay() || 7;
		startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

		const miniGrid = monthDiv.createDiv({ cls: "year-heat-grid" });
		for (let i = 0; i < 42; i++) {
			const d = new Date(startDay);
			d.setDate(startDay.getDate() + i);
			const isOtherMonth = d.getMonth() !== m;
			const cell = miniGrid.createDiv({
				cls: "year-heat-cell" + (isOtherMonth ? " other-month" : ""),
			});
			cell.textContent = d.getDate().toString();

			const intervalMode = options?.intervalMode || "scheduled-due";
			const dayNodes = nodes.filter((node) =>
				isNodeInDate(node, d, intervalMode),
			);
			if (dayNodes.length > 0) {
				cell.style.backgroundColor = "#4dabf7";
				cell.style.color = "white";
			}
		}
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
