// src/ui/main/calendar/calendar.ts
// 统一日历视图 — 日/周/月/季/年（时间轴换行方案）

import {
	getStatusColors,
	STATUS_SORT_ORDER,
} from "../../../core/config/config";
import {
	buildDateTaskMap,
	buildGlobalOrder,
	formatDate,
	getISOWeekNumber,
	getMonthsInRange,
	getQuartersInRange,
	getTaskInterval,
	getWeeksInRange,
	getYearsInRange,
	setEnd,
	setStart,
} from "../../../core/process/calendar-view-process";
import { buildTooltip, getDisplayText } from "../../../core/task/task-format";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { tooltip } from "../../component/tooltip/tooltip";
import { createTaskCard } from "../card/card";
// ========== 常量 ==========

const YEAR_HEAT_RGB = "64, 120, 209";
const TIMELINE_ROW_HEIGHT = 20;
const TIMELINE_BAR_HEIGHT = 16;
// ========== 工具函数 ==========

function padTwo(n: number): string {
	return n < 10 ? "0" + n : String(n);
}

// ========== 样式注入 ==========

let currentStyleEl: HTMLStyleElement | null = null;

function injectCalendarStyles() {
	if (currentStyleEl) {
		currentStyleEl.remove();
		currentStyleEl = null;
	}

	const styleEl = document.createElement("style");
	styleEl.id = "task-calendar-custom-style";
	currentStyleEl = styleEl;

	const statusColors = getStatusColors();
	let statusBarStyles = "";
	for (const status of STATUS_SORT_ORDER) {
		const color = statusColors[status];
		if (color) {
			statusBarStyles += `.cal-span-line.${status}, .timeline-bar.${status} { background: ${color}; opacity: 0.7; }\n`;
		}
	}

	styleEl.textContent = `
        .calendar-stack { display: flex; flex-direction: column; gap: 24px; }
        .empty-message { padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }
        .calendar-toolbar { display: flex; gap: 8px; padding: 8px 0; flex-wrap: wrap; align-items: center; }
        .calendar-toolbar button { padding: 4px 12px; border-radius: 16px; border: none; cursor: pointer; background: var(--interactive-normal); color: var(--text-normal); }
        .calendar-toolbar button.active { background: var(--interactive-accent); color: white; }
        .empty-periods-row {
            display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 8px; justify-content: flex-start;
        }
        .empty-period-tag {
            font-size: 12px; color: var(--text-muted); padding: 1px 6px;
            background: var(--background-secondary); border-radius: 10px; line-height: 1.4;
        }
        .timeline-block { margin-bottom: 24px; }
        .timeline-block-title { font-weight: bold; margin-bottom: 4px; color: var(--text-normal); font-size: 1.1em; }
        .timeline-body { position: relative; width: 100%; }
        .timeline-grid-line { position: absolute; top: 0; width: 1px; background: var(--background-modifier-border); pointer-events: none; }
        .timeline-bar {
            position: absolute; height: ${TIMELINE_BAR_HEIGHT}px;
            border-radius: 3px; display: flex; align-items: center;
            padding-left: 4px; overflow: hidden; cursor: pointer;
            font-size: 11px; color: white; white-space: nowrap;
        }
        .timeline-bar-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .timeline-header-day { text-align: center; font-size: 11px; padding: 2px 0; }
        .timeline-header-day.today { color: var(--text-accent); font-weight: bold; }
        .year-view-header { display: grid; grid-template-columns: repeat(31, 1fr); width: 100%; position: sticky; top: 0; z-index: 2; background: var(--background-primary); }
        .year-view-day { text-align: center; font-size: 11px; padding: 4px 0; }
        .year-view-day.today { color: var(--text-accent); font-weight: bold; }
        ${statusBarStyles}
    `;
	document.head.appendChild(styleEl);
}

// ========== 时间轴组件（行组方案，任务条各自独占一行）==========

function renderTimeline(
	container: HTMLElement,
	days: Date[],
	dateTaskMap: Map<string, TaskTreeNode[]>,
	intervalMode: string,
	globalOrderMap: Map<string, number>,
	maxDays: number = 31,
	heatMapMax?: number,
	onDayClick?: (date: Date) => void,
	onTaskClick?: (task: TaskTreeNode) => void,
): boolean {
	try {
		const displayDays = days.slice(0, maxDays);
		const seen = new Set<string>();
		const allTasks: TaskTreeNode[] = [];
		const taskIntervals = new Map<
			string,
			{ start: number; end: number } | null
		>();
		const rangeStart = setStart(displayDays[0]).getTime();
		const rangeEnd = setStart(
			displayDays[displayDays.length - 1],
		).getTime();

		for (const taskList of dateTaskMap.values()) {
			for (const task of taskList) {
				if (seen.has(task.uid)) continue;
				seen.add(task.uid);
				const interval = getTaskInterval(task, intervalMode);
				taskIntervals.set(task.uid, interval);
				if (interval) {
					if (
						interval.start <= rangeEnd &&
						interval.end >= rangeStart
					) {
						allTasks.push(task);
					}
				} else {
					const fallbackTs =
						task.scheduled ||
						task.due ||
						task.starts ||
						task.created ||
						task.done ||
						task.cancelled;
					if (fallbackTs) {
						const dateStr = formatDate(new Date(fallbackTs));
						const idx = displayDays.findIndex(
							(d) => formatDate(d) === dateStr,
						);
						if (idx >= 0) allTasks.push(task);
					}
				}
			}
		}

		if (allTasks.length === 0) return false;

		allTasks.sort(
			(a, b) =>
				(globalOrderMap.get(a.uid) || 999999) -
				(globalOrderMap.get(b.uid) || 999999),
		);

		const todayStr = formatDate(new Date());
		const actualDays = displayDays.length;
		const colsPerRow = maxDays <= 7 ? maxDays : 7;
		const totalRows = Math.ceil(actualDays / colsPerRow);
		const colWidth = 100 / colsPerRow;

		const rowTasks: TaskTreeNode[][] = [];
		const rowTaskIntervals: Map<
			string,
			{ taskStart: number; taskEnd: number }
		>[] = [];
		for (let row = 0; row < totalRows; row++) {
			rowTasks.push([]);
			rowTaskIntervals.push(new Map());
			const rowStart = row * colsPerRow;
			const rowEnd = Math.min(rowStart + colsPerRow - 1, actualDays - 1);

			for (const task of allTasks) {
				const interval = taskIntervals.get(task.uid);
				let taskStart = -1,
					taskEnd = -1;

				if (interval) {
					const startDate = setStart(new Date(interval.start));
					const endDate = setEnd(new Date(interval.end));
					const sIdx = displayDays.findIndex(
						(d) => formatDate(d) === formatDate(startDate),
					);
					const eIdx = displayDays.findIndex(
						(d) => formatDate(d) === formatDate(endDate),
					);
					if (sIdx >= 0 && eIdx >= 0) {
						taskStart = sIdx;
						taskEnd = eIdx;
					}
				} else {
					const fallbackTs =
						task.scheduled ||
						task.due ||
						task.starts ||
						task.created ||
						task.done ||
						task.cancelled;
					if (fallbackTs) {
						const dateStr = formatDate(new Date(fallbackTs));
						const idx = displayDays.findIndex(
							(d) => formatDate(d) === dateStr,
						);
						if (idx >= 0) taskStart = taskEnd = idx;
					}
				}

				if (taskStart < 0) continue;
				if (taskEnd < rowStart || taskStart > rowEnd) continue;

				rowTasks[row].push(task);
				rowTaskIntervals[row].set(task.uid, { taskStart, taskEnd });
			}
		}

		const hasAnyRow = rowTasks.some((arr) => arr.length > 0);
		if (!hasAnyRow) return false;

		const body = document.createElement("div");
		body.className = "timeline-body";

		for (let row = 0; row < totalRows; row++) {
			const tasksInRow = rowTasks[row];
			if (tasksInRow.length === 0) continue;

			const taskCount = tasksInRow.length;
			const taskAreaHeight = taskCount * TIMELINE_ROW_HEIGHT;
			const rowHeight = TIMELINE_ROW_HEIGHT + taskAreaHeight;

			const rowGroup = document.createElement("div");
			rowGroup.style.position = "relative";
			rowGroup.style.height = rowHeight + "px";

			const dateRow = document.createElement("div");
			dateRow.style.display = "grid";
			dateRow.style.gridTemplateColumns = `repeat(${colsPerRow}, 1fr)`;
			dateRow.style.borderBottom =
				"1px solid var(--background-modifier-border)";

			for (let col = 0; col < colsPerRow; col++) {
				const idx = row * colsPerRow + col;
				const dayEl = document.createElement("div");
				dayEl.className = "timeline-header-day";

				if (idx < actualDays) {
					const d = displayDays[idx];
					const dateStr = formatDate(d);
					const count = (dateTaskMap.get(dateStr) || []).length;
					const isToday = dateStr === todayStr;
					if (isToday) dayEl.classList.add("today");
					dayEl.textContent = padTwo(d.getDate());

					if (
						heatMapMax !== undefined &&
						heatMapMax > 0 &&
						count > 0
					) {
						const intensity = 0.05 + (count / heatMapMax) * 0.3;
						dayEl.style.backgroundColor = `rgba(${YEAR_HEAT_RGB}, ${intensity.toFixed(2)})`;
					}
					if (onDayClick) {
						dayEl.style.cursor = "pointer";
						dayEl.addEventListener("click", () => onDayClick(d));
					}
				}
				dateRow.appendChild(dayEl);
			}
			rowGroup.appendChild(dateRow);

			const taskArea = document.createElement("div");
			taskArea.style.position = "absolute";
			taskArea.style.top = TIMELINE_ROW_HEIGHT + "px";
			taskArea.style.left = "0";
			taskArea.style.right = "0";
			taskArea.style.height = taskAreaHeight + "px";

			for (let col = 0; col <= colsPerRow; col++) {
				const line = document.createElement("div");
				line.className = "timeline-grid-line";
				line.style.left = col * colWidth + "%";
				line.style.height = "100%";
				taskArea.appendChild(line);
			}

			const rowStart = row * colsPerRow;
			const rowEnd = Math.min(rowStart + colsPerRow - 1, actualDays - 1);

			tasksInRow.forEach((task, taskIdx) => {
				const interval = taskIntervals.get(task.uid);
				const taskInfo = rowTaskIntervals[row].get(task.uid);
				if (!taskInfo) return;

				const clampedStart = Math.max(taskInfo.taskStart, rowStart);
				const clampedEnd = Math.min(taskInfo.taskEnd, rowEnd);
				const col = clampedStart - rowStart;
				const spanCols = clampedEnd - clampedStart + 1;

				const bar = document.createElement("div");
				bar.className = `timeline-bar ${task.status}`;
				bar.style.left = col * colWidth + "%";
				bar.style.top = taskIdx * TIMELINE_ROW_HEIGHT + 2 + "px";
				bar.style.width = spanCols * colWidth + "%";

				const label = document.createElement("span");
				label.className = "timeline-bar-text";
				label.textContent = task.text || task.content || "";
				bar.appendChild(label);

				const tipHtml =
					getDisplayText(task) + "<br>" + buildTooltip(task);
				if (tipHtml) {
					bar.addEventListener("mouseenter", (e) =>
						tooltip.show(tipHtml, e.clientX, e.clientY),
					);
					bar.addEventListener("mousemove", (e) =>
						tooltip.move(e.clientX, e.clientY),
					);
					bar.addEventListener("mouseleave", () => tooltip.hide());
				}

				if (!interval) bar.style.opacity = "0.5";

				if (onTaskClick) {
					bar.addEventListener("dblclick", (e) => {
						const rect = bar.getBoundingClientRect();
						const clickX = e.clientX - rect.left;
						if (
							clickX > rect.width * 0.15 &&
							clickX < rect.width * 0.85
						) {
							e.stopPropagation();
							onTaskClick(task);
						}
					});
					bar.style.cursor = "pointer";
				}

				taskArea.appendChild(bar);
			});

			rowGroup.appendChild(taskArea);
			body.appendChild(rowGroup);
		}

		container.appendChild(body);
		return true;
	} catch (e) {
		console.error("[TaskManage] 时间轴渲染失败:", e);
		return false;
	}
}

// ========== 主入口 ==========

export function renderCalendarView(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		subView?: "day" | "week" | "month" | "quarter" | "year";
		intervalMode?: string;
		onClick?: (node: TaskTreeNode) => void;
		onSubViewChange?: (subView: string) => void;
		onDayClick?: (date: Date) => void;
		selectedDate?: Date;
		dateRange?: {
			start: number | null;
			end: number | null;
			isAll: boolean;
		};
		filterTitle?: string;
	},
) {
	injectCalendarStyles();
	container.empty();

	const subView = options?.subView || "day";
	const intervalMode =
		options?.intervalMode && options.intervalMode !== "none"
			? options.intervalMode
			: "any-date";
	const selectedDate = options?.selectedDate || new Date();

	if (nodes.length === 0) {
		const empty = document.createElement("div");
		empty.className = "empty-message";
		empty.textContent = "📭 符合条件的无任务";
		container.appendChild(empty);
		return;
	}

	const globalOrderMap = buildGlobalOrder(nodes);

	const { startDate, endDate } = {
		startDate: options?.dateRange?.start
			? new Date(options.dateRange.start)
			: new Date(),
		endDate: options?.dateRange?.end
			? new Date(options.dateRange.end)
			: new Date(),
	};

	const dateTaskMap = buildDateTaskMap(nodes, intervalMode);

	for (const [, taskList] of dateTaskMap) {
		taskList.sort(
			(a, b) =>
				(globalOrderMap.get(a.uid) || 999999) -
				(globalOrderMap.get(b.uid) || 999999),
		);
	}

	let globalMaxCount = 1;
	for (const [, taskList] of dateTaskMap) {
		if (taskList.length > globalMaxCount) globalMaxCount = taskList.length;
	}

	const titleEl = document.createElement("div");
	titleEl.style.cssText =
		"margin-bottom:8px; font-weight:bold; font-size:14px; color:var(--text-muted);";
	titleEl.textContent =
		"🔍 " +
		(options?.filterTitle ||
			`${formatDate(startDate)} ~ ${formatDate(endDate)} · ${nodes.length}个任务`);
	container.appendChild(titleEl);

	const toolbar = document.createElement("div");
	toolbar.className = "calendar-toolbar";
	const viewLabels: Record<string, string> = {
		year: "年",
		quarter: "季",
		month: "月",
		week: "周",
		day: "日",
	};
	for (const [key, label] of Object.entries(viewLabels)) {
		const btn = document.createElement("button");
		btn.textContent = label;
		if (key === subView) btn.classList.add("active");
		btn.addEventListener("click", () => options?.onSubViewChange?.(key));
		toolbar.appendChild(btn);
	}
	container.appendChild(toolbar);

	const onDayClick = options?.onDayClick;
	const onTaskClick = options?.onClick;

	const stackDiv = document.createElement("div");
	stackDiv.className = "calendar-stack";
	const emptyPeriods: string[] = [];

	if (subView === "day") {
		const selectedDateStr = formatDate(selectedDate);
		const dayNodes = dateTaskMap.get(selectedDateStr) || [];

		const dayGroup = document.createElement("div");
		dayGroup.className = "day-group";
		stackDiv.appendChild(dayGroup);

		const header = document.createElement("div");
		header.className = "day-header";
		header.textContent = selectedDateStr;
		dayGroup.appendChild(header);

		if (dayNodes.length === 0) {
			const empty = document.createElement("div");
			empty.className = "empty-message";
			empty.textContent = "📭 当日无任务";
			dayGroup.appendChild(empty);
		} else {
			const seen = new Set<string>();
			const uniqueNodes = dayNodes.filter((n) => {
				if (seen.has(n.uid)) return false;
				seen.add(n.uid);
				return true;
			});
			uniqueNodes.sort(
				(a, b) =>
					(globalOrderMap.get(a.uid) || 999999) -
					(globalOrderMap.get(b.uid) || 999999),
			);
			for (const node of uniqueNodes) {
				dayGroup.appendChild(
					createTaskCard(node, {
						compact: false,
						onClick: options?.onClick,
					}),
				);
			}
		}
	} else if (subView === "week") {
		for (const week of getWeeksInRange(startDate, endDate)) {
			const days: Date[] = [];
			for (let i = 0; i < 7; i++) {
				const d = new Date(week.start);
				d.setDate(week.start.getDate() + i);
				days.push(d);
			}

			const weekBlock = document.createElement("div");
			weekBlock.className = "timeline-block";
			stackDiv.appendChild(weekBlock);

			const weekNum = getISOWeekNumber(week.start);
			const weekEndDate = new Date(week.start);
			weekEndDate.setDate(week.start.getDate() + 6);
			const title = document.createElement("div");
			title.className = "timeline-block-title";
			title.textContent = `${week.start.getFullYear()}年${padTwo(week.start.getMonth() + 1)}月${padTwo(weekNum)}周`;
			weekBlock.appendChild(title);

			const hasContent = renderTimeline(
				weekBlock,
				days,
				dateTaskMap,
				intervalMode,
				globalOrderMap,
				7,
				globalMaxCount,
				onDayClick,
				onTaskClick,
			);
			if (!hasContent) {
				weekBlock.remove();
				emptyPeriods.push(
					`${week.start.getFullYear()}年${padTwo(weekNum)}周`,
				);
			}
		}
	} else if (subView === "month") {
		for (const m of getMonthsInRange(startDate, endDate)) {
			const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
			const days: Date[] = [];
			for (let d = 1; d <= daysInMonth; d++) {
				days.push(new Date(m.year, m.month, d));
			}

			const block = document.createElement("div");
			block.className = "timeline-block";
			stackDiv.appendChild(block);

			const title = document.createElement("div");
			title.className = "timeline-block-title";
			title.textContent = `${m.year}年${padTwo(m.month + 1)}月`;
			block.appendChild(title);

			const hasContent = renderTimeline(
				block,
				days,
				dateTaskMap,
				intervalMode,
				globalOrderMap,
				31,
				globalMaxCount,
				onDayClick,
				onTaskClick,
			);
			if (!hasContent) {
				block.remove();
				emptyPeriods.push(`${m.year}年${padTwo(m.month + 1)}月`);
			}
		}
	} else if (subView === "quarter") {
		for (const q of getQuartersInRange(startDate, endDate)) {
			const startMonth = (q.quarter - 1) * 3;
			let quarterHasContent = false;
			const quarterBlock = document.createElement("div");
			quarterBlock.className = "timeline-block";
			stackDiv.appendChild(quarterBlock);

			const title = document.createElement("div");
			title.className = "timeline-block-title";
			title.style.fontSize = "1.2em";
			title.textContent = `${q.year}年${padTwo(q.quarter)}季`;
			quarterBlock.appendChild(title);

			for (let mo = 0; mo < 3; mo++) {
				const monthIdx = startMonth + mo;
				const daysInMonth = new Date(q.year, monthIdx + 1, 0).getDate();
				const days: Date[] = [];
				for (let d = 1; d <= daysInMonth; d++) {
					days.push(new Date(q.year, monthIdx, d));
				}

				let monthHasContent = false;
				const monthBlock = document.createElement("div");
				monthBlock.className = "timeline-block";
				quarterBlock.appendChild(monthBlock);

				const monthTitle = document.createElement("div");
				monthTitle.className = "timeline-block-title";
				monthTitle.style.fontSize = "1em";
				monthTitle.textContent = `${padTwo(monthIdx + 1)}月`;
				monthBlock.appendChild(monthTitle);

				const hasContent = renderTimeline(
					monthBlock,
					days,
					dateTaskMap,
					intervalMode,
					globalOrderMap,
					31,
					globalMaxCount,
					onDayClick,
					onTaskClick,
				);
				if (!hasContent) {
					monthBlock.remove();
				} else {
					quarterHasContent = true;
				}
			}
			if (!quarterHasContent) {
				quarterBlock.remove();
				emptyPeriods.push(`${q.year}年${padTwo(q.quarter)}季`);
			}
		}
	} else if (subView === "year") {
		for (const y of getYearsInRange(startDate, endDate)) {
			let yearHasContent = false;
			const yearBlock = document.createElement("div");
			yearBlock.className = "timeline-block";
			stackDiv.appendChild(yearBlock);

			const title = document.createElement("div");
			title.className = "timeline-block-title";
			title.style.fontSize = "1.3em";
			title.textContent = `${y}年`;
			yearBlock.appendChild(title);

			for (let m = 0; m < 12; m++) {
				const daysInMonth = new Date(y, m + 1, 0).getDate();
				const days: Date[] = [];
				for (let d = 1; d <= daysInMonth; d++) {
					days.push(new Date(y, m, d));
				}

				let monthHasTask = false;
				for (const d of days) {
					if ((dateTaskMap.get(formatDate(d)) || []).length > 0) {
						monthHasTask = true;
						break;
					}
				}
				if (!monthHasTask) continue;

				yearHasContent = true;
				const monthBlock = document.createElement("div");
				monthBlock.className = "timeline-block";
				yearBlock.appendChild(monthBlock);

				const monthTitle = document.createElement("div");
				monthTitle.className = "timeline-block-title";
				monthTitle.style.fontSize = "1em";
				monthTitle.textContent = `${padTwo(m + 1)}月`;
				monthBlock.appendChild(monthTitle);

				const actualDays = days.length;
				const todayStr = formatDate(new Date());

				const scrollDiv = document.createElement("div");
				scrollDiv.style.cssText = "position:relative;";

				const header = document.createElement("div");
				header.className = "year-view-header";
				for (let i = 0; i < actualDays; i++) {
					const d = days[i];
					const dateStr = formatDate(d);
					const count = (dateTaskMap.get(dateStr) || []).length;
					const isToday = dateStr === todayStr;

					const dayEl = document.createElement("div");
					dayEl.className =
						"year-view-day" + (isToday ? " today" : "");
					dayEl.textContent = padTwo(d.getDate());
					dayEl.style.cursor = "pointer";

					if (globalMaxCount > 0 && count > 0) {
						const intensity = 0.1 + (count / globalMaxCount) * 0.9;
						dayEl.style.backgroundColor = `rgba(${YEAR_HEAT_RGB}, ${intensity.toFixed(2)})`;
						dayEl.title = `${count}个任务`;
					}

					if (onDayClick) {
						dayEl.addEventListener("click", () => onDayClick(d));
					}

					header.appendChild(dayEl);
				}
				scrollDiv.appendChild(header);
				monthBlock.appendChild(scrollDiv);
			}
			if (!yearHasContent) {
				yearBlock.remove();
				emptyPeriods.push(`${y}年`);
			}
		}
	}

	if (emptyPeriods.length > 0) {
		const emptyRow = document.createElement("div");
		emptyRow.className = "empty-periods-row";
		for (const period of emptyPeriods) {
			const tag = document.createElement("span");
			tag.className = "empty-period-tag";
			tag.textContent = period;
			emptyRow.appendChild(tag);
		}
		stackDiv.appendChild(emptyRow);
	}

	container.appendChild(stackDiv);
}
