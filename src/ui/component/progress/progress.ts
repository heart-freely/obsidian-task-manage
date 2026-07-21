// src/ui/component/progress/progress.ts

import {
	ALLOWED_STATUSES,
	getStatusColors,
	STATUS_ICONS,
	STATUS_NAMES,
} from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createEl } from "../../../util/dom-utils";
import { tooltip } from "../tooltip/tooltip";

export interface ProgressBarOptions {
	counts: Record<string, number>;
	total: number;
	height?: string;
	showPercent?: boolean;
}

export function createProgressBar(options: ProgressBarOptions): HTMLElement {
	const { counts, total, height, showPercent } = options;
	const bh = height || "6px";
	const st = total || 1;
	const container = createEl("div");
	container.className = "task-progress-bar";
	container.addClass(
		"task-flex",
		"task-items-center",
		"task-gap-1",
		"task-min-w-15",
	);
	const barWrapper = createEl("div");
	barWrapper.addClass(
		"task-flex-1",
		"task-rounded-sm",
		"task-overflow-hidden",
		"task-bg-border",
		"task-flex",
	);
	barWrapper.style.height = bh;
	const statusColors = getStatusColors();
	const order = [
		"todo",
		"scheduled",
		"in-progress",
		"completed",
		"cancelled",
	];
	let accumulated = 0;
	order.forEach((status) => {
		const count = counts[status] || 0;
		if (count > 0) {
			const pct = Math.min((count / st) * 100, 100 - accumulated);
			accumulated += pct;
			const seg = createEl("div");
			seg.addClass("task-h-full", "task-flex-shrink-0");
			seg.style.width = pct + "%";
			seg.style.background = statusColors[status] || "var(--text-muted)";
			barWrapper.appendChild(seg);
		}
	});
	container.appendChild(barWrapper);
	if (showPercent !== false) {
		const done = (counts["completed"] || 0) + (counts["cancelled"] || 0);
		const pct = Math.min(Math.round((done / st) * 100), 100);
		const label = createEl("span");
		label.addClass(
			"task-text-smaller",
			"task-text-muted",
			"task-text-nowrap",
			"task-flex-shrink-0",
		);
		label.textContent = pct + "%";
		container.appendChild(label);
	}
	const tipHtml = buildProgressTooltip(counts, st);
	if (tipHtml) {
		container.addEventListener("mouseenter", (e) =>
			tooltip.show(tipHtml, e.clientX, e.clientY),
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
	[
		{
			k: "todo",
			i: STATUS_ICONS["todo"] || "🔲",
			l: STATUS_NAMES["todo"] || "待办中",
		},
		{
			k: "scheduled",
			i: STATUS_ICONS["scheduled"] || "❔",
			l: STATUS_NAMES["scheduled"] || "计划中",
		},
		{
			k: "in-progress",
			i: STATUS_ICONS["in-progress"] || "⏩",
			l: STATUS_NAMES["in-progress"] || "进行中",
		},
		{
			k: "cancelled",
			i: STATUS_ICONS["cancelled"] || "❎",
			l: STATUS_NAMES["cancelled"] || "已取消",
		},
		{
			k: "completed",
			i: STATUS_ICONS["completed"] || "✅",
			l: STATUS_NAMES["completed"] || "已完成",
		},
	].forEach(({ k, i, l }) => {
		const c = counts[k] || 0;
		parts.push(
			`${i} ${l} ${total > 0 ? Math.round((c / total) * 100) : 0}% ${c}`,
		);
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
		const s = node.status || "todo";
		counts[s] = (counts[s] || 0) + 1;
	});
	return { counts, total: nodes.length };
}
