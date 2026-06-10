// src/ui/main/calendar/year-calendar.ts
// 年视图 — 委托给统一日历视图

import { TaskTreeNode } from "../../../core/task/task-tree";
import { renderCalendarView } from "./calendar";

export function renderCalendarYear(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		intervalMode?: string;
	},
) {
	renderCalendarView(container, nodes, {
		subView: "year",
		intervalMode: options?.intervalMode,
		onClick: options?.onClick,
	});
}
