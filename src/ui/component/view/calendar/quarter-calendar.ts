// src/ui/component/view/calendar/quarter-calendar.ts

import { DateUtils } from "../../../../process/process";
import { TaskTreeNode } from "../../../../process/task/task-tree";

export function renderCalendarQuarter(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void; intervalMode?: string },
) {
	container.empty();
	const today = new Date();
	const q = Math.floor(today.getMonth() / 3) + 1;
	const startMonth = (q - 1) * 3;

	for (let m = 0; m < 3; m++) {
		const monthIdx = startMonth + m;
		const monDiv = container.createDiv({ cls: "quarter-month" });
		monDiv.createEl("div", {
			text: `${today.getFullYear()}年${monthIdx + 1}月`,
			cls: "quarter-month-title",
		});
		renderMiniMonth(monDiv, today.getFullYear(), monthIdx, nodes, options);
	}
}

function renderMiniMonth(
	container: HTMLElement,
	year: number,
	month: number,
	nodes: TaskTreeNode[],
	options?: any,
) {
	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dow = startDay.getDay() || 7;
	startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

	const grid = container.createDiv({ cls: "mini-calendar-grid" });
	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		const isOtherMonth = d.getMonth() !== month;
		const cell = grid.createDiv({
			cls: "mini-cell" + (isOtherMonth ? " other-month" : ""),
		});
		cell.textContent = d.getDate().toString();

		const intervalMode = options?.intervalMode || "scheduled-due";
		const dayNodes = nodes.filter((node) =>
			isNodeInDate(node, d, intervalMode),
		);
		if (dayNodes.length > 0) {
			cell.style.backgroundColor = "#4dabf7";
			cell.style.color = "white";
			cell.title = dayNodes.map((n) => n.text || n.content).join(", ");
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
