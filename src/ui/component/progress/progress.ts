// src/ui/component/progress/progress.ts

import {
	ALLOWED_STATUSES,
	getStatusColors,
	STATUS_ICONS,
	STATUS_NAMES,
} from "../../../core/config/config";
import { getProgressConfig } from "../../../core/config/progress-config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { ProgressTextFormat } from "../../../setting/setting";
import { tooltip } from "../tooltip/tooltip";

export interface ProgressBarOptions {
	counts: Record<string, number>;
	total: number;
	height?: string;
	displayMode?: "graphical" | "text" | "both" | "none";
	textFormat?: ProgressTextFormat;
	customFormat?: string;
	showText?: boolean;
	supportHover?: boolean;
}

function doneCount(counts: Record<string, number>): number {
	return (counts["completed"] || 0) + (counts["cancelled"] || 0);
}

export function percentDone(counts: Record<string, number>, total: number): number {
	const st = total || 1;
	return Math.min(Math.round((doneCount(counts) / st) * 100), 100);
}

export function formatProgressText(
	counts: Record<string, number>,
	total: number,
	format: ProgressTextFormat,
	customFormat?: string,
): string {
	const st = total || 1;
	const completed = counts["completed"] || 0;
	const cancelled = counts["cancelled"] || 0;
	const inProgress = counts["in-progress"] || 0;
	const planned = counts["scheduled"] || 0;
	const abandoned = cancelled;
	const notStarted = counts["todo"] || 0;
	const done = completed + cancelled;
	const pct = Math.min(Math.round((done / st) * 100), 100);

	switch (format) {
		case "percentage":
			return pct + "%";
		case "bracketPercentage":
			return "[" + pct + "%]";
		case "fraction":
			return done + "/" + total;
		case "bracketFraction":
			return "[" + done + "/" + total + "]";
		case "detailed":
			return (
				"[" + completed + "✓ " + inProgress + "⟳ " + abandoned +
				"✗ " + planned + "? / " + total + "]"
			);
		case "range-based": {
			// 自定义进度范围文本（对齐 taskgenius）
			const cfg = getProgressConfig();
			if (cfg.customizeProgressRanges && cfg.progressRanges.length > 0) {
				const range = cfg.progressRanges.find(
					(r) => pct >= r.min && pct <= r.max,
				);
				if (range) {
					return range.text.replace(
						/{{PROGRESS}}/g,
						String(pct),
					);
				}
			}
			return pct + "%";
		}
		case "custom":
			if (customFormat) {
				return customFormat
					.replace(/{{COMPLETED}}/g, String(completed))
					.replace(/{{TOTAL}}/g, String(total))
					.replace(/{{IN_PROGRESS}}/g, String(inProgress))
					.replace(/{{PLANNED}}/g, String(planned))
					.replace(/{{ABANDONED}}/g, String(abandoned))
					.replace(/{{NOT_STARTED}}/g, String(notStarted))
					.replace(/{{PERCENT}}/g, String(pct))
					.replace(/{{PROGRESS}}/g, String(pct));
			}
			return "[" + done + "/" + total + "]";
		default:
			return pct + "%";
	}
}

export function createProgressBar(options: ProgressBarOptions): HTMLElement {
	const cfg = getProgressConfig();
	const { counts, total, height } = options;
	if (!cfg.enabled) {
		const disabled = createDiv({ cls: "task-progress-bar-disabled" });
		disabled.setCssStyles({ display: "none" });
		return disabled;
	}
	const displayMode = options.displayMode ?? cfg.displayMode;
	const textFormat = options.textFormat ?? cfg.textFormat;
	const customFormat = options.customFormat ?? cfg.customFormat;
	const supportHover = options.supportHover ?? cfg.supportHover;
	const showText = options.showText ?? true;

	const bh = height || "6px";
	const st = total || 1;
	const container = createDiv();
	container.className = "task-progress-bar";
	container.addClass(
		"task-flex",
		"task-items-center",
		"task-gap-1",
		"task-min-w-15",
	);

	const wantGraphical = displayMode === "graphical" || displayMode === "both";
	const wantText = displayMode === "text" || displayMode === "both";
	const graphical = wantGraphical && total > 0;

	if (graphical) {
		const barWrapper = createDiv();
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
			"cancelled",
			"completed",
		];
		let accumulated = 0;
		order.forEach((status) => {
			const count = counts[status] || 0;
			if (count > 0) {
				const pct = Math.min((count / st) * 100, 100 - accumulated);
				accumulated += pct;
				const seg = createDiv();
				seg.addClass("task-h-full", "task-flex-shrink-0");
				seg.style.width = pct + "%";
				seg.style.background =
					statusColors[status] || "var(--text-muted)";
				barWrapper.appendChild(seg);
			}
		});
		container.appendChild(barWrapper);
	}

	if (wantText && showText) {
		const label = createSpan();
		label.addClass(
			"task-text-smaller",
			"task-text-muted",
			"task-text-nowrap",
			"task-flex-shrink-0",
		);
		label.textContent = formatProgressText(
			counts,
			total,
			textFormat,
			customFormat,
		);
		container.appendChild(label);
	}

	const tipHtml = supportHover ? buildProgressTooltip(counts, st) : "";
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
			i + " " + l + " " + (total > 0 ? Math.round((c / total) * 100) : 0) + "% " + c,
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
