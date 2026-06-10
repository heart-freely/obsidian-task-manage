// src/ui/main/calendar/week-calendar.ts
// 周视图 — 委托给统一日历视图

import { TaskTreeNode } from "../../../core/task/task-tree";
import { renderCalendarView } from "./calendar";

export function renderCalendarWeek(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		intervalMode?: string;
	},
) {
	renderCalendarView(container, nodes, {
		subView: "week",
		intervalMode: options?.intervalMode,
		onClick: options?.onClick,
	});
}
