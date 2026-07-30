// src/ui/main/calendar/calendar.ts
// 统一日历视图 — 日/周/月/季/年（时间轴换行方案）

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
import { createEl } from "../../../util/dom-utils";
import logger from "../../../util/logger";
import { tooltip } from "../../component/tooltip/tooltip";
import { createTaskCard } from "../card/card";

// ========== 模块级缓存 ==========

interface CalendarCacheEntry {
	fingerprint: string;
	intervalMode: string;
	dateTaskMap: Map<string, TaskTreeNode[]>;
}

let calendarCache: CalendarCacheEntry | null = null;

/**
 * 使日历视图缓存失效
 * 在数据变更（编辑保存、筛选条件变化）时调用
 */
export function invalidateCalendarCache() {
	calendarCache = null;
}

function getCalendarCacheKey(
	nodes: TaskTreeNode[],
	intervalMode: string,
): string {
	if (nodes.length === 0) return "empty";
	return `${nodes.length}-${nodes[0].uid}-${nodes[nodes.length - 1].uid}-${intervalMode}`;
}

// ========== 常量 ==========

const YEAR_HEAT_RGB = "64, 120, 209";
const TIMELINE_ROW_HEIGHT = 20;

function padTwo(n: number): string {
	return n < 10 ? "0" + n : String(n);
}

// ========== 时间轴渲染（性能优化版） ==========

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
		// 优化：批量预计算所有任务的时间区间，避免每行重复计算
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

		// 预计算所有任务在各行的起始/结束列索引
		const taskRowInfo = new Map<
			string,
			Array<{ rowIndex: number; taskStart: number; taskEnd: number }>
		>();

		const todayStr = formatDate(new Date());
		const actualDays = displayDays.length;
		const colsPerRow = maxDays <= 7 ? maxDays : 7;
		const totalRows = Math.ceil(actualDays / colsPerRow);
		const colWidth = 100 / colsPerRow;

		// 预计算：一次性遍历所有行和任务，构建 taskRowInfo
		for (const task of allTasks) {
			const interval = taskIntervals.get(task.uid);
			let globalTaskStart = -1;
			let globalTaskEnd = -1;
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
					globalTaskStart = sIdx;
					globalTaskEnd = eIdx;
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
					if (idx >= 0) globalTaskStart = globalTaskEnd = idx;
				}
			}
			if (globalTaskStart < 0) continue;

			const rowInfos: Array<{
				rowIndex: number;
				taskStart: number;
				taskEnd: number;
			}> = [];
			for (let row = 0; row < totalRows; row++) {
				const rowStart = row * colsPerRow;
				const rowEnd = Math.min(
					rowStart + colsPerRow - 1,
					actualDays - 1,
				);
				if (globalTaskEnd < rowStart || globalTaskStart > rowEnd)
					continue;
				rowInfos.push({
					rowIndex: row,
					taskStart: Math.max(globalTaskStart, rowStart),
					taskEnd: Math.min(globalTaskEnd, rowEnd),
				});
			}
			if (rowInfos.length > 0) {
				taskRowInfo.set(task.uid, rowInfos);
			}
		}

		// 筛选出有任务的行
		const rowsWithTasks: number[] = [];
		for (let row = 0; row < totalRows; row++) {
			for (const [, infos] of taskRowInfo) {
				if (infos.some((info) => info.rowIndex === row)) {
					rowsWithTasks.push(row);
					break;
				}
			}
		}

		if (rowsWithTasks.length === 0) return false;

		const body = createEl("div");
		body.className = "timeline-body";

		for (const row of rowsWithTasks) {
			const tasksInRow: TaskTreeNode[] = [];
			for (const task of allTasks) {
				const infos = taskRowInfo.get(task.uid);
				if (infos?.some((info) => info.rowIndex === row)) {
					tasksInRow.push(task);
				}
			}

			if (tasksInRow.length === 0) continue;

			const taskCount = tasksInRow.length;
			const taskAreaHeight = taskCount * TIMELINE_ROW_HEIGHT;
			const rowHeight = TIMELINE_ROW_HEIGHT + taskAreaHeight;

			const rowGroup = createEl("div");
			rowGroup.addClass("timeline-row-group");
			rowGroup.setCssProps({ "--timeline-row-height": rowHeight + "px" });

			const dateRow = createEl("div");
			dateRow.addClass("timeline-date-row");
			dateRow.setCssProps({
				"--timeline-cols": `repeat(${colsPerRow}, 1fr)`,
			});

			for (let col = 0; col < colsPerRow; col++) {
				const idx = row * colsPerRow + col;
				const dayEl = createEl("div");
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
						dayEl.addClass("timeline-heat-day");
						dayEl.setCssProps({
							"--timeline-heat-bg": `rgba(${YEAR_HEAT_RGB}, ${intensity.toFixed(2)})`,
						});
					}
					if (onDayClick) {
						dayEl.addClass("task-clickable");
						dayEl.addEventListener("click", () => onDayClick(d));
					}
				}
				dateRow.appendChild(dayEl);
			}
			rowGroup.appendChild(dateRow);

			const taskArea = createEl("div");
			taskArea.addClass("timeline-task-area");
			taskArea.setCssProps({
				"--timeline-task-top": TIMELINE_ROW_HEIGHT + "px",
				"--timeline-task-height": taskAreaHeight + "px",
			});

			for (let col = 0; col <= colsPerRow; col++) {
				const line = createEl("div");
				line.className =
					"timeline-grid-line timeline-grid-line-dynamic";
				line.setCssProps({
					"--timeline-line-left": col * colWidth + "%",
				});
				taskArea.appendChild(line);
			}

			const rowStart = row * colsPerRow;
			const rowEnd = Math.min(rowStart + colsPerRow - 1, actualDays - 1);

			tasksInRow.forEach((task, taskIdx) => {
				const infos = taskRowInfo.get(task.uid);
				const rowInfo = infos?.find((info) => info.rowIndex === row);
				if (!rowInfo) return;

				const col = rowInfo.taskStart - rowStart;
				const spanCols = rowInfo.taskEnd - rowInfo.taskStart + 1;

				const bar = createEl("div");
				bar.className = `timeline-bar timeline-bar-dynamic ${task.status}`;
				bar.setCssProps({
					"--timeline-bar-left": col * colWidth + "%",
					"--timeline-bar-top":
						taskIdx * TIMELINE_ROW_HEIGHT + 2 + "px",
					"--timeline-bar-width": spanCols * colWidth + "%",
				});

				const label = createEl("span");
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

				const interval = taskIntervals.get(task.uid);
				if (!interval) bar.addClass("timeline-bar-no-interval");

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
					bar.addClass("task-clickable");
				}

				taskArea.appendChild(bar);
			});

			rowGroup.appendChild(taskArea);
			body.appendChild(rowGroup);
		}

		container.appendChild(body);
		return true;
	} catch (e: unknown) {
		logger.error("[TaskManage] 时间轴渲染失败:", e);
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
	container.empty();

	const subView = options?.subView || "day";
	const intervalMode =
		options?.intervalMode && options.intervalMode !== "none"
			? options.intervalMode
			: "any-date";
	const selectedDate = options?.selectedDate || new Date();

	if (nodes.length === 0) {
		const empty = createEl("div");
		empty.className = "empty-message";
		empty.textContent = "📭 符合条件的无任务";
		container.appendChild(empty);
		return;
	}

	const globalOrderMap = buildGlobalOrder(nodes);

	const startDate: Date = options?.dateRange?.start
		? new Date(options.dateRange.start)
		: new Date();
	const endDate: Date = options?.dateRange?.end
		? new Date(options.dateRange.end)
		: new Date();

	// 使用缓存键判断是否需要重建 dateTaskMap
	const cacheKey = getCalendarCacheKey(nodes, intervalMode);

	let dateTaskMap: Map<string, TaskTreeNode[]>;
	if (
		calendarCache &&
		calendarCache.fingerprint === cacheKey &&
		calendarCache.intervalMode === intervalMode
	) {
		dateTaskMap = calendarCache.dateTaskMap;
	} else {
		dateTaskMap = buildDateTaskMap(nodes, intervalMode);
		calendarCache = {
			fingerprint: cacheKey,
			intervalMode,
			dateTaskMap,
		};
	}

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

	const titleEl = createEl("div");
	titleEl.addClass("calendar-filter-title");
	const filterTitle: string =
		options?.filterTitle ||
		`${formatDate(startDate)} ~ ${formatDate(endDate)} · ${nodes.length}个任务`;
	titleEl.textContent = "🔍 " + filterTitle;
	container.appendChild(titleEl);

	const toolbar = createEl("div");
	toolbar.className = "calendar-toolbar";
	const viewLabels: Record<string, string> = {
		year: "年",
		quarter: "季",
		month: "月",
		week: "周",
		day: "日",
	};
	for (const [key, label] of Object.entries(viewLabels)) {
		const btn = createEl("button");
		btn.textContent = label;
		if (key === subView) btn.classList.add("active");
		btn.addEventListener("click", () => options?.onSubViewChange?.(key));
		toolbar.appendChild(btn);
	}
	container.appendChild(toolbar);

	const onDayClick = options?.onDayClick;
	const onTaskClick = options?.onClick;

	const stackDiv = createEl("div");
	stackDiv.className = "calendar-stack";
	const emptyPeriods: string[] = [];

	if (subView === "day") {
		const selectedDateStr = formatDate(selectedDate);
		const dayNodes = dateTaskMap.get(selectedDateStr) || [];
		const dayGroup = createEl("div");
		dayGroup.className = "day-group";
		stackDiv.appendChild(dayGroup);
		const header = createEl("div");
		header.className = "day-header";
		header.textContent = selectedDateStr;
		dayGroup.appendChild(header);
		if (dayNodes.length === 0) {
			const empty = createEl("div");
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
			const weekBlock = createEl("div");
			weekBlock.className = "timeline-block";
			stackDiv.appendChild(weekBlock);
			const weekNum = getISOWeekNumber(week.start);
			const title = createEl("div");
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
			for (let d = 1; d <= daysInMonth; d++)
				days.push(new Date(m.year, m.month, d));
			const block = createEl("div");
			block.className = "timeline-block";
			stackDiv.appendChild(block);
			const title = createEl("div");
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
			const quarterBlock = createEl("div");
			quarterBlock.className = "timeline-block";
			stackDiv.appendChild(quarterBlock);
			const title = createEl("div");
			title.className = "timeline-block-title calendar-quarter-title";
			title.textContent = `${q.year}年${padTwo(q.quarter)}季`;
			quarterBlock.appendChild(title);
			for (let mo = 0; mo < 3; mo++) {
				const monthIdx = startMonth + mo;
				const daysInMonth = new Date(q.year, monthIdx + 1, 0).getDate();
				const days: Date[] = [];
				for (let d = 1; d <= daysInMonth; d++)
					days.push(new Date(q.year, monthIdx, d));
				const monthBlock = createEl("div");
				monthBlock.className = "timeline-block";
				quarterBlock.appendChild(monthBlock);
				const monthTitle = createEl("div");
				monthTitle.className =
					"timeline-block-title calendar-month-title";
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
			const yearBlock = createEl("div");
			yearBlock.className = "timeline-block";
			stackDiv.appendChild(yearBlock);
			const title = createEl("div");
			title.className = "timeline-block-title calendar-year-title";
			title.textContent = `${y}年`;
			yearBlock.appendChild(title);
			for (let m = 0; m < 12; m++) {
				const daysInMonth = new Date(y, m + 1, 0).getDate();
				const days: Date[] = [];
				for (let d = 1; d <= daysInMonth; d++)
					days.push(new Date(y, m, d));
				let monthHasTask = false;
				for (const d of days) {
					if ((dateTaskMap.get(formatDate(d)) || []).length > 0) {
						monthHasTask = true;
						break;
					}
				}
				if (!monthHasTask) continue;
				yearHasContent = true;
				const monthBlock = createEl("div");
				monthBlock.className = "timeline-block";
				yearBlock.appendChild(monthBlock);
				const monthTitle = createEl("div");
				monthTitle.className =
					"timeline-block-title calendar-month-title";
				monthTitle.textContent = `${padTwo(m + 1)}月`;
				monthBlock.appendChild(monthTitle);
				const actualDays = days.length;
				const todayStr = formatDate(new Date());
				const scrollDiv = createEl("div");
				scrollDiv.addClass("task-relative");
				const header = createEl("div");
				header.className = "year-view-header";
				for (let i = 0; i < actualDays; i++) {
					const d = days[i];
					const dateStr = formatDate(d);
					const count = (dateTaskMap.get(dateStr) || []).length;
					const isToday = dateStr === todayStr;
					const dayEl = createEl("div");
					dayEl.className =
						"year-view-day" + (isToday ? " today" : "");
					dayEl.textContent = padTwo(d.getDate());
					dayEl.addClass("task-clickable");
					if (globalMaxCount > 0 && count > 0) {
						const intensity = 0.1 + (count / globalMaxCount) * 0.9;
						dayEl.addClass("year-heat-day");
						dayEl.setCssProps({
							"--year-heat-bg": `rgba(${YEAR_HEAT_RGB}, ${intensity.toFixed(2)})`,
						});
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
		const emptyRow = createEl("div");
		emptyRow.className = "empty-periods-row";
		for (const period of emptyPeriods) {
			const tag: HTMLElement = createEl("span");
			tag.className = "empty-period-tag";
			tag.textContent = period;
			emptyRow.appendChild(tag);
		}
		stackDiv.appendChild(emptyRow);
	}

	container.appendChild(stackDiv);
}
