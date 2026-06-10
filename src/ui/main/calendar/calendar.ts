// src/ui/main/calendar/calendar.ts
// 通用日历视图（兼容 TaskTreeNode）

import { TaskTreeNode } from "../../../core/task/task-tree";
import { DateUtils } from "../../../util/date-utils";

export function renderCalendar(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: { onClick?: (node: TaskTreeNode) => void; intervalMode?: string },
) {
	container.empty();
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();

	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dayOfWeek = startDay.getDay() || 7;
	startDay.setDate(1 - (dayOfWeek === 7 ? 6 : 1 - dayOfWeek));

	const grid = document.createElement("div");
	grid.className = "calendar-grid";
	grid.style.display = "grid";
	grid.style.gridTemplateColumns = "repeat(7, 1fr)";
	grid.style.gap = "4px";
	container.appendChild(grid);

	const dayHeaders = ["一", "二", "三", "四", "五", "六", "日"];
	dayHeaders.forEach((d) => {
		const cell = document.createElement("div");
		cell.style.fontWeight = "bold";
		cell.style.textAlign = "center";
		cell.textContent = d;
		grid.appendChild(cell);
	});

	const intervalMode = options?.intervalMode || "scheduled-due";

	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		const dateStr = DateUtils.formatDate(d);
		const cell = document.createElement("div");
		cell.style.border = "1px solid #ccc";
		cell.style.minHeight = "60px";
		cell.style.padding = "2px";
		cell.style.fontSize = "12px";

		const dayNum = document.createElement("div");
		dayNum.textContent = d.getDate().toString();
		dayNum.style.fontWeight = "bold";
		cell.appendChild(dayNum);

		const dayNodes = nodes.filter((node) => {
			const dateTs = d.getTime();
			if (intervalMode === "starts-done") {
				return (
					node.starts !== null &&
					node.starts <= dateTs + 86400000 &&
					(node.done ?? node.due ?? 0) >= dateTs
				);
			}
			return (
				node.scheduled !== null &&
				node.scheduled <= dateTs + 86400000 &&
				(node.due ?? 0) >= dateTs
			);
		});

		dayNodes.forEach((node) => {
			const line = document.createElement("div");
			line.style.whiteSpace = "nowrap";
			line.style.overflow = "hidden";
			line.style.textOverflow = "ellipsis";
			line.textContent = node.text || node.content;
			line.style.backgroundColor = "#e9ecef";
			line.style.marginTop = "2px";
			line.style.padding = "0 2px";
			line.style.borderRadius = "2px";
			line.addEventListener("click", () => options?.onClick?.(node));
			cell.appendChild(line);
		});

		grid.appendChild(cell);
	}
}
