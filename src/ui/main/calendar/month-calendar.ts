// src/ui/main/calendar/month-calendar.ts
// 月视图 — 委托给统一日历视图

import { TaskTreeNode } from "../../../core/task/task-tree";
import { renderCalendarView } from "./calendar";

export function renderCalendarMonth(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		onClick?: (node: TaskTreeNode) => void;
		intervalMode?: string;
	},
) {
	renderCalendarView(container, nodes, {
		subView: "month",
		intervalMode: options?.intervalMode,
		onClick: options?.onClick,
	});
}
