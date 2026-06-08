// src/ui/component/progress/progress.ts

import {
	ALLOWED_STATUSES,
	STATUS_COLORS,
	STATUS_ICONS,
	STATUS_NAMES,
} from "../../../process/config/config";
import { TaskTreeNode } from "../../../process/task/task-tree";
import { tooltip } from "../tooltip/tooltip";

export interface ProgressBarOptions {
	counts: Record<string, number>;
	total: number;
	height?: string;
	showPercent?: boolean;
}

export function createProgressBar(options: ProgressBarOptions): HTMLElement {
	const { counts, total, height, showPercent } = options;
	const barHeight = height || "6px";
	const safeTotal = total || 1;

	const container = document.createElement("div");
	container.className = "task-progress-bar";
	container.style.cssText =
		"display:flex;align-items:center;gap:4px;min-width:60px;";

	const barWrapper = document.createElement("div");
	barWrapper.style.cssText =
		"flex:1;height:" +
		barHeight +
		";border-radius:3px;overflow:hidden;background:var(--background-modifier-border);display:flex;";

	const order = ["todo", "planned", "in-progress", "completed", "cancelled"];
	let accumulated = 0;

	order.forEach((status) => {
		const count = counts[status] || 0;
		if (count > 0) {
			const pct = Math.min((count / safeTotal) * 100, 100 - accumulated);
			accumulated += pct;
			const segment = document.createElement("div");
			segment.style.cssText =
				"width:" +
				pct +
				"%;height:100%;background:" +
				(STATUS_COLORS[status] || "var(--text-muted)") +
				";flex-shrink:0;";
			barWrapper.appendChild(segment);
		}
	});

	container.appendChild(barWrapper);

	if (showPercent !== false) {
		const completed = counts["completed"] || 0;
		const cancelled = counts["cancelled"] || 0;
		const done = completed + cancelled;
		const pct = Math.min(Math.round((done / safeTotal) * 100), 100);
		const label = document.createElement("span");
		label.style.cssText =
			"font-size:var(--font-ui-smaller);color:var(--text-muted);white-space:nowrap;flex-shrink:0;";
		label.textContent = pct + "%";
		container.appendChild(label);
	}

	const tooltipHtml = buildProgressTooltip(counts, safeTotal);
	if (tooltipHtml) {
		container.addEventListener("mouseenter", (e) =>
			tooltip.show(tooltipHtml, e.clientX, e.clientY),
		);
		container.addEventListener("mousemove", (e) =>
			tooltip.move(e.clientX, e.clientY),
		);
		container.addEventListener("mouseleave", () => tooltip.hide());
	}

	return container;
}

function buildProgressTooltip(
	counts: Record<string, number>,
	total: number,
): string {
	const parts: string[] = [];
	const statusConfig: Array<{ key: string; icon: string; label: string }> = [
		{
			key: "todo",
			icon: STATUS_ICONS["todo"] || "🔲",
			label: STATUS_NAMES["todo"] || "未开始",
		},
		{
			key: "planned",
			icon: STATUS_ICONS["planned"] || "❔",
			label: STATUS_NAMES["planned"] || "计划中",
		},
		{
			key: "in-progress",
			icon: STATUS_ICONS["in-progress"] || "⏩",
			label: STATUS_NAMES["in-progress"] || "进行中",
		},
		{
			key: "cancelled",
			icon: STATUS_ICONS["cancelled"] || "❎",
			label: STATUS_NAMES["cancelled"] || "已取消",
		},
		{
			key: "completed",
			icon: STATUS_ICONS["completed"] || "✅",
			label: STATUS_NAMES["completed"] || "已完成",
		},
	];

	statusConfig.forEach(({ key, icon, label }) => {
		const count = counts[key] || 0;
		const percent = total > 0 ? Math.round((count / total) * 100) : 0;
		parts.push(icon + " " + label + " " + percent + "% " + count);
	});

	return parts.join("<br>");
}

export function countTaskStatuses(nodes: TaskTreeNode[]): {
	counts: Record<string, number>;
	total: number;
} {
	const counts: Record<string, number> = {};
	ALLOWED_STATUSES.forEach((s) => {
		counts[s] = 0;
	});

	nodes.forEach((node) => {
		const status = node.status || "todo";
		counts[status] = (counts[status] || 0) + 1;
	});

	return { counts, total: nodes.length };
}
