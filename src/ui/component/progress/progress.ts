// src/ui/component/bar/progress-bar.ts
// 任务进度条通用组件

import {
	ALLOWED_STATUSES,
	STATUS_COLORS,
} from "../../../process/config/config";
import { tooltip } from "../tooltip/tooltip";

export interface ProgressBarOptions {
	/** 各状态的任务数量 */
	counts: Record<string, number>;
	/** 总任务数 */
	total: number;
	/** 进度条高度 */
	height?: string;
	/** 是否显示百分比文字 */
	showPercent?: boolean;
}

/**
 * 创建任务进度条
 */
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

	// 按照 config 中的顺序：未开始 → 计划中 → 进行中 → 已完成 → 已取消
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

	// Tooltip：鼠标悬停显示各状态详情
	const tooltipHtml = buildProgressTooltip(counts, safeTotal);
	if (tooltipHtml) {
		container.addEventListener("mouseenter", (e) => {
			tooltip.show(tooltipHtml, e.clientX, e.clientY);
		});
		container.addEventListener("mousemove", (e) => {
			tooltip.move(e.clientX, e.clientY);
		});
		container.addEventListener("mouseleave", () => {
			tooltip.hide();
		});
	}

	return container;
}

/**
 * 构建进度条 Tooltip 内容
 * 顺序：未开始 → 计划中 → 进行中 → 已取消 → 已完成
 */
function buildProgressTooltip(
	counts: Record<string, number>,
	total: number,
): string {
	const parts: string[] = [];

	// 按照 config 中的执行状态顺序：未开始 → 计划中 → 进行中 → 已取消 → 已完成
	const statusConfig: Array<{ key: string; icon: string; label: string }> = [
		{ key: "todo", icon: "🔲", label: "未开始" },
		{ key: "planned", icon: "❔", label: "计划中" },
		{ key: "in-progress", icon: "⏩", label: "进行中" },
		{ key: "cancelled", icon: "❎", label: "已取消" },
		{ key: "completed", icon: "✅", label: "已完成" },
	];

	statusConfig.forEach(({ key, icon, label }) => {
		const count = counts[key] || 0;
		const percent = total > 0 ? Math.round((count / total) * 100) : 0;
		parts.push(icon + " " + label + " " + percent + "% " + count);
	});

	return parts.join("<br>");
}

/**
 * 统计任务列表中各状态数量
 */
export function countTaskStatuses(tasks: any[]): {
	counts: Record<string, number>;
	total: number;
} {
	const counts: Record<string, number> = {};
	ALLOWED_STATUSES.forEach((s) => {
		counts[s] = 0;
	});

	tasks.forEach((task) => {
		const status = task._status || "todo";
		counts[status] = (counts[status] || 0) + 1;
	});

	const total = tasks.length;
	return { counts, total };
}
