// src/ui/main/calendar/calendar.ts
// 统一日历视图 — 日/周/月/季/年

import {
	getStatusColors,
	STATUS_SORT_ORDER,
} from "../../../core/config/config";
import {
	buildCellItems,
	buildDateTaskMap,
	buildGlobalOrder,
	CalendarCellItem,
	formatDate,
	getISOWeekNumber,
	getMonthDays,
	getMonthsInRange,
	getQuartersInRange,
	getWeeksInRange,
	getYearsInRange,
	inferDateRange,
	setEnd,
	setStart,
} from "../../../core/process/calendar-view-process";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createTaskCard } from "../card/card";

// ========== 常量 ==========

const CELL_MIN_HEIGHT = 40;
const CELL_MAX_HEIGHT = 280;
const MAX_VISIBLE_ITEMS_IN_CELL = 5;
const YEAR_MONTHS_PER_ROW = 4;
const YEAR_HEAT_RGB = "64, 120, 209";

// ========== 工具函数 ==========

function padTwo(n: number): string {
	return n < 10 ? "0" + n : String(n);
}

// ========== 样式注入（每次主题切换时重新注入） ==========

let styleInjected = false;
let currentStyleEl: HTMLStyleElement | null = null;

function injectCalendarStyles() {
	// 移除旧样式标签
	if (currentStyleEl) {
		currentStyleEl.remove();
		currentStyleEl = null;
	}

	const styleEl = document.createElement("style");
	styleEl.id = "task-calendar-custom-style";
	currentStyleEl = styleEl;

	const statusColors = getStatusColors();
	let lineColorStyles = "";
	for (const status of STATUS_SORT_ORDER) {
		const color = statusColors[status];
		if (color) {
			lineColorStyles += `.cal-span-line.${status} { background: ${color}; opacity: 0.6; }\n`;
		}
	}

	styleEl.textContent = `
		.day-group { margin-bottom: 24px; }
		.day-header { font-weight: bold; font-size: 1.1em; margin-bottom: 8px; color: var(--text-normal); border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 4px; }
		.calendar-stack { display: flex; flex-direction: column; gap: 24px; }
		.cal-cell {
			background: transparent;
			border: 1px solid var(--background-modifier-border);
			border-radius: 6px;
			padding: 4px;
			min-height: ${CELL_MIN_HEIGHT}px;
			max-height: ${CELL_MAX_HEIGHT}px;
			overflow-y: auto;
			display: flex;
			flex-direction: column;
			cursor: pointer;
			transition: all 0.2s;
		}
		.cal-cell.expanded {
			grid-column: span 2;
			max-height: none;
			z-index: 10;
			background: var(--background-primary);
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		}
		.cal-cell-header { font-weight: bold; text-align: center; font-size: clamp(12px, 2vw, 16px); margin-bottom: 2px; }
		.cal-cell.today { border: 2px solid var(--text-accent); }
		.other-month { opacity: 0.5; }
		.week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
		.week-block { margin-bottom: 24px; }
		.week-title { font-weight: bold; margin-bottom: 8px; color: var(--text-normal); }
		.month-block { width: 100%; margin-bottom: 24px; }
		.month-title { font-weight: bold; font-size: 1.2em; margin-bottom: 8px; color: var(--text-normal); }
		.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; width: 100%; }
		.quarter-block { margin-bottom: 32px; }
		.quarter-title { font-weight: bold; font-size: 1.3em; margin-bottom: 12px; color: var(--text-normal); }
		.cal-span-line {
			height: 12px;
			margin: 10px 0;
			border-radius: 2px;
			cursor: pointer;
			flex-shrink: 0;
			box-sizing: border-box;
		}
		.cal-span-line.placeholder { opacity: 0; pointer-events: none; }
		${lineColorStyles}
		.cal-more-indicator {
			padding: 4px;
			text-align: center;
			font-size: 12px;
			color: var(--text-muted);
			background: var(--background-modifier-hover);
			border-radius: 4px;
			margin: 2px 0;
			cursor: pointer;
		}
		.cal-more-indicator:hover { background: var(--background-modifier-border); }
		.empty-message { padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }
		.year-block { margin-bottom: 32px; }
		.year-grid { display: grid; grid-template-columns: repeat(${YEAR_MONTHS_PER_ROW}, 1fr); gap: 16px; }
		.year-month-card { background: transparent; border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 6px; }
		.year-month-title { font-weight: bold; text-align: center; margin-bottom: 4px; color: var(--text-normal); }
		.year-heat-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
		.year-heat-cell {
			background: transparent;
			border: 1px solid var(--background-modifier-border);
			border-radius: 2px;
			padding: 1px;
			text-align: center;
			font-size: 8px;
			cursor: pointer;
			aspect-ratio: 1/1;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.year-heat-cell.today { border: 2px solid var(--text-accent); }
		.calendar-toolbar { display: flex; gap: 8px; padding: 8px 0; flex-wrap: wrap; align-items: center; }
		.calendar-toolbar button { padding: 4px 12px; border-radius: 16px; border: none; cursor: pointer; background: var(--interactive-normal); color: var(--text-normal); }
		.calendar-toolbar button.active { background: var(--interactive-accent); color: white; }
		.empty-periods-row {
			display: flex;
			flex-wrap: wrap;
			gap: 4px 12px;
			margin-top: 8px;
			justify-content: flex-start;
		}
		.empty-period-tag {
			font-size: 12px;
			color: var(--text-muted);
			padding: 1px 6px;
			background: var(--background-secondary);
			border-radius: 10px;
			line-height: 1.4;
		}
		@media screen and (max-width: 800px) {
			.year-grid { grid-template-columns: repeat(2, 1fr); }
		}
	`;
	document.head.appendChild(styleEl);
	styleInjected = true;
}

// ========== DOM 组件 ==========

function createTaskSpanLine(node: TaskTreeNode): HTMLElement {
	const line = document.createElement("div");
	line.className = `cal-span-line ${node.status}`;
	line.title = node.text || node.content || "";
	return line;
}

function createTaskSpanLinePlaceholder(): HTMLElement {
	const line = document.createElement("div");
	line.className = "cal-span-line placeholder";
	return line;
}

// ========== 格子渲染 ==========

function buildCalendarCell(
	date: Date,
	isOtherMonth: boolean,
	isToday: boolean,
	items: CalendarCellItem[],
	onDayClick?: (date: Date) => void,
): HTMLElement {
	const cell = document.createElement("div");
	cell.className =
		"cal-cell" +
		(isOtherMonth ? " other-month" : "") +
		(isToday ? " today" : "");

	const header = document.createElement("div");
	header.className = "cal-cell-header";
	header.textContent = padTwo(date.getDate());
	header.addEventListener("click", (e) => {
		e.stopPropagation();
		onDayClick?.(date);
	});
	header.style.cursor = "pointer";
	header.title = "点击查看当日任务";
	cell.appendChild(header);

	const contentWrapper = document.createElement("div");
	contentWrapper.style.cssText = `overflow-y: auto; max-height: ${CELL_MAX_HEIGHT}px;`;

	for (const item of items) {
		if (item.type === "task") {
			contentWrapper.appendChild(
				createTaskCard(item.node, { compact: true, showTooltip: true }),
			);
		} else if (item.type === "line") {
			contentWrapper.appendChild(createTaskSpanLine(item.node));
		} else {
			contentWrapper.appendChild(createTaskSpanLinePlaceholder());
		}
	}

	const totalVisible = items.filter((i) => i.type !== "placeholder").length;
	if (totalVisible > MAX_VISIBLE_ITEMS_IN_CELL) {
		const indicator = document.createElement("div");
		indicator.className = "cal-more-indicator";
		indicator.textContent = `+ ${totalVisible - MAX_VISIBLE_ITEMS_IN_CELL} 个任务`;
		indicator.addEventListener("click", (e) => {
			e.stopPropagation();
			cell.classList.add("expanded");
			contentWrapper.style.maxHeight = "none";
			indicator.style.display = "none";
		});
		contentWrapper.appendChild(indicator);
	}

	cell.appendChild(contentWrapper);

	cell.addEventListener("click", (ev) => {
		const target = ev.target as HTMLElement;
		if (
			target.closest(".task-item") ||
			target.closest(".cal-span-line") ||
			target.closest(".cal-more-indicator") ||
			target.closest(".cal-cell-header")
		) {
			return;
		}
		if (cell.classList.contains("expanded")) {
			cell.classList.remove("expanded");
			contentWrapper.style.maxHeight = CELL_MAX_HEIGHT + "px";
		} else {
			cell.classList.add("expanded");
			contentWrapper.style.maxHeight = "none";
		}
	});

	return cell;
}

// ========== 视图渲染 ==========

function renderWeekView(
	container: HTMLElement,
	startDate: Date,
	dateTaskMap: Map<string, TaskTreeNode[]>,
	nodes: TaskTreeNode[],
	intervalMode: string,
	globalOrderMap: Map<string, number>,
	onDayClick?: (date: Date) => void,
): boolean {
	const weekNum = getISOWeekNumber(startDate);

	const endDate = new Date(startDate);
	endDate.setDate(startDate.getDate() + 6);

	let hasTask = false;
	const todayStr = formatDate(new Date());
	const days: Date[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(startDate);
		d.setDate(startDate.getDate() + i);
		days.push(d);
		if (dateTaskMap.has(formatDate(d))) hasTask = true;
	}

	if (!hasTask) return false;

	const weekBlock = document.createElement("div");
	weekBlock.className = "week-block";

	const title = document.createElement("div");
	title.className = "week-title";
	title.textContent = `${startDate.getFullYear()}年${padTwo(weekNum)}周(${formatDate(startDate)}~${formatDate(endDate)})`;
	weekBlock.appendChild(title);

	const weekRow = document.createElement("div");
	weekRow.className = "week-row";

	for (const d of days) {
		const isToday = formatDate(d) === todayStr;
		const items = buildCellItems(d, dateTaskMap, intervalMode);
		items.sort(
			(a, b) =>
				(globalOrderMap.get(a.node.uid) || 999999) -
				(globalOrderMap.get(b.node.uid) || 999999),
		);
		weekRow.appendChild(
			buildCalendarCell(d, false, isToday, items, onDayClick),
		);
	}

	weekBlock.appendChild(weekRow);
	container.appendChild(weekBlock);
	return true;
}

function renderMonthGrid(
	container: HTMLElement,
	year: number,
	month: number,
	dateTaskMap: Map<string, TaskTreeNode[]>,
	nodes: TaskTreeNode[],
	intervalMode: string,
	globalOrderMap: Map<string, number>,
	onDayClick?: (date: Date) => void,
): boolean {
	const days = getMonthDays(year, month);

	let hasTask = false;
	for (const d of days) {
		if (dateTaskMap.has(formatDate(d))) {
			hasTask = true;
			break;
		}
	}

	if (!hasTask) return false;

	const grid = document.createElement("div");
	grid.className = "calendar-grid";

	const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
	for (const wd of weekdays) {
		const hd = document.createElement("div");
		hd.style.cssText =
			"text-align:center; font-weight:bold; padding:4px 0;";
		hd.textContent = wd;
		grid.appendChild(hd);
	}

	const todayStr = formatDate(new Date());
	for (const d of days) {
		const isOtherMonth = d.getMonth() !== month;
		const isToday = formatDate(d) === todayStr;
		const items = buildCellItems(d, dateTaskMap, intervalMode);
		items.sort(
			(a, b) =>
				(globalOrderMap.get(a.node.uid) || 999999) -
				(globalOrderMap.get(b.node.uid) || 999999),
		);
		grid.appendChild(
			buildCalendarCell(d, isOtherMonth, isToday, items, onDayClick),
		);
	}

	container.appendChild(grid);
	return true;
}

function renderYearView(
	container: HTMLElement,
	year: number,
	dateTaskMap: Map<string, TaskTreeNode[]>,
	onDayClick?: (date: Date) => void,
): boolean {
	let hasTask = false;
	for (const tasks of dateTaskMap.values()) {
		if (tasks.length > 0) {
			hasTask = true;
			break;
		}
	}

	if (!hasTask) return false;

	const yearBlock = document.createElement("div");
	yearBlock.className = "year-block";

	const title = document.createElement("div");
	title.style.cssText =
		"font-size:1.4em; font-weight:bold; margin-bottom:16px; color:var(--text-normal);";
	title.textContent = `${year}年`;
	yearBlock.appendChild(title);

	const grid = document.createElement("div");
	grid.className = "year-grid";

	const todayStr = formatDate(new Date());

	let maxCount = 1;
	for (const tasks of dateTaskMap.values()) {
		if (tasks.length > maxCount) maxCount = tasks.length;
	}

	for (let m = 0; m < 12; m++) {
		const monthDiv = document.createElement("div");
		monthDiv.className = "year-month-card";

		const monTitle = document.createElement("div");
		monTitle.className = "year-month-title";
		monTitle.textContent = `${padTwo(m + 1)}月`;
		monthDiv.appendChild(monTitle);

		const heatGrid = document.createElement("div");
		heatGrid.className = "year-heat-grid";

		const days = getMonthDays(year, m);
		for (const curDate of days) {
			const dateStr = formatDate(curDate);
			const count = (dateTaskMap.get(dateStr) || []).length;

			const cell = document.createElement("div");
			cell.className =
				"year-heat-cell" + (dateStr === todayStr ? " today" : "");
			cell.textContent = padTwo(curDate.getDate());

			if (count > 0) {
				const intensity = 0.1 + (count / maxCount) * 0.9;
				cell.style.backgroundColor = `rgba(${YEAR_HEAT_RGB}, ${intensity.toFixed(2)})`;
				cell.title = `${count}个任务`;
			}

			if (curDate.getMonth() !== m) cell.style.opacity = "0.4";

			cell.addEventListener("click", () => onDayClick?.(curDate));
			heatGrid.appendChild(cell);
		}

		monthDiv.appendChild(heatGrid);
		grid.appendChild(monthDiv);
	}

	yearBlock.appendChild(grid);
	container.appendChild(yearBlock);
	return true;
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
		onDaySelect?: (date: Date) => void;
		selectedDate?: Date;
		dateRange?: {
			start: number | null;
			end: number | null;
			isAll: boolean;
		};
		filterTitle?: string;
	},
) {
	// 每次渲染时重新注入样式以适配当前主题
	injectCalendarStyles();
	container.empty();

	const subView = options?.subView || "month";
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

	const { startDate, endDate } =
		options?.dateRange &&
		!options.dateRange.isAll &&
		options.dateRange.start &&
		options.dateRange.end
			? {
					startDate: setStart(new Date(options.dateRange.start)),
					endDate: setEnd(new Date(options.dateRange.end)),
				}
			: inferDateRange(nodes, intervalMode);

	const dateTaskMap = buildDateTaskMap(nodes, intervalMode);

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

	const handleDayClick = (date: Date) => {
		options?.onDaySelect?.(date);
		options?.onSubViewChange?.("day");
	};

	const stackDiv = document.createElement("div");
	stackDiv.className = "calendar-stack";

	const emptyPeriods: string[] = [];

	if (subView === "day") {
		const selectedDateStr = formatDate(selectedDate);
		const dayNodes = dateTaskMap.get(selectedDateStr) || [];

		const dayGroup = document.createElement("div");
		dayGroup.className = "day-group";

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

		stackDiv.appendChild(dayGroup);
	} else if (subView === "week") {
		for (const week of getWeeksInRange(startDate, endDate)) {
			const hasContent = renderWeekView(
				stackDiv,
				week.start,
				dateTaskMap,
				nodes,
				intervalMode,
				globalOrderMap,
				handleDayClick,
			);
			if (!hasContent) {
				const weekNum = getISOWeekNumber(week.start);
				emptyPeriods.push(
					`${week.start.getFullYear()}年${padTwo(weekNum)}周`,
				);
			}
		}
	} else if (subView === "month") {
		for (const m of getMonthsInRange(startDate, endDate)) {
			const block = document.createElement("div");
			block.className = "month-block";
			const title = document.createElement("div");
			title.className = "month-title";
			title.textContent = `${m.year}年${padTwo(m.month + 1)}月`;
			block.appendChild(title);
			const hasContent = renderMonthGrid(
				block,
				m.year,
				m.month,
				dateTaskMap,
				nodes,
				intervalMode,
				globalOrderMap,
				handleDayClick,
			);
			if (hasContent) {
				stackDiv.appendChild(block);
			} else {
				emptyPeriods.push(`${m.year}年${padTwo(m.month + 1)}月`);
			}
		}
	} else if (subView === "quarter") {
		for (const q of getQuartersInRange(startDate, endDate)) {
			const quarterBlock = document.createElement("div");
			quarterBlock.className = "quarter-block";
			const title = document.createElement("div");
			title.className = "quarter-title";
			title.textContent = `${q.year}年${padTwo(q.quarter)}季`;
			quarterBlock.appendChild(title);

			const startMonth = (q.quarter - 1) * 3;
			let quarterHasContent = false;
			for (let mo = 0; mo < 3; mo++) {
				const monthIdx = startMonth + mo;
				const block = document.createElement("div");
				block.className = "month-block";
				const mTitle = document.createElement("div");
				mTitle.className = "month-title";
				mTitle.textContent = `${q.year}年${padTwo(monthIdx + 1)}月`;
				block.appendChild(mTitle);
				const hasContent = renderMonthGrid(
					block,
					q.year,
					monthIdx,
					dateTaskMap,
					nodes,
					intervalMode,
					globalOrderMap,
					handleDayClick,
				);
				if (hasContent) {
					quarterBlock.appendChild(block);
					quarterHasContent = true;
				}
			}

			if (quarterHasContent) {
				stackDiv.appendChild(quarterBlock);
			} else {
				emptyPeriods.push(`${q.year}年${padTwo(q.quarter)}季`);
			}
		}
	} else if (subView === "year") {
		for (const y of getYearsInRange(startDate, endDate)) {
			const hasContent = renderYearView(
				stackDiv,
				y,
				dateTaskMap,
				handleDayClick,
			);
			if (!hasContent) {
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
