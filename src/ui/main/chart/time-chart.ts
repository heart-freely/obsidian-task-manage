// src/ui/main/chart/time-chart.ts
// 时间统计图 — 独立通用视图组件（待实现）

import { TaskTreeNode } from "../../../core/task/task-tree";

export function renderTimeChart(container: HTMLElement, nodes: TaskTreeNode[]) {
	container.empty();
	container.createDiv({
		text: "📅 时间统计",
		attr: {
			style: "font-weight:600;font-size:var(--font-ui-medium);margin-bottom:8px;",
		},
	});
	container.createDiv({
		text: "时间统计图功能开发中...",
		attr: {
			style: "color:var(--text-muted);padding:40px;text-align:center;",
		},
	});
}
