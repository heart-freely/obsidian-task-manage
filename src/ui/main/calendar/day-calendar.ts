// src/ui/main/calendar/day-calendar.ts
// 日视图 — 委托给统一日历视图

import { TaskTreeNode } from "../../../core/task/task-tree";
import { renderCalendarView } from "./calendar";

export function renderCalendarDay(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		intervalMode?: string;
	},
) {
	renderCalendarView(container, nodes, {
		subView: "day",
		intervalMode: options?.intervalMode,
		onClick: options?.onClick,
	});
}
