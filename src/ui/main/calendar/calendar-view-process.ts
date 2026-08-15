// src/core/process/calendar-view-process.ts
// 日历视图数据处理 — 纯函数，不涉及 DOM

import { getTaskTimeRange, normalizeIntervalMode } from "../../../core/task/task-derived";
import { TaskTreeNodeLike } from "../../../type/type";
import { DateUtils } from "../../../util/date-utils";

// ========== 日期工具 ==========

export function formatDate(d: Date): string {
	return DateUtils.formatDate(d);
}
export function setStart(d: Date): Date {
	return DateUtils.setStart(d);
}
export function setEnd(d: Date): Date {
	return DateUtils.setEnd(d);
}
export function getISOWeekNumber(d: Date): number {
	return DateUtils.getISOWeekNumber(d);
}

// ========== 任务时间区间 ==========

export function getTaskInterval(
	node: TaskTreeNodeLike,
	intervalMode: string,
): { start: number; end: number } | null {
	const range = getTaskTimeRange(node, normalizeIntervalMode(intervalMode));
	if (!range) return null;
	return { start: range.start, end: range.end };
}

/** 构建日期→任务列表映射（仅含首尾日期） */

export function buildDateTaskMap(
	nodes: TaskTreeNodeLike[],
	intervalMode: string,
): Map<string, TaskTreeNodeLike[]> {
	const map = new Map<string, TaskTreeNodeLike[]>();
	const added = new Set<string>();

	for (const node of nodes) {
		const interval = getTaskInterval(node, intervalMode);
		if (!interval) continue;

		const start = setStart(new Date(interval.start));
		const end = setEnd(new Date(interval.end));

		const firstKey = formatDate(start);
		if (!added.has(node.uid + "|" + firstKey)) {
			added.add(node.uid + "|" + firstKey);
			if (!map.has(firstKey)) map.set(firstKey, []);
			map.get(firstKey)!.push(node);
		}

		const lastKey = formatDate(end);
		if (lastKey !== firstKey && !added.has(node.uid + "|" + lastKey)) {
			added.add(node.uid + "|" + lastKey);
			if (!map.has(lastKey)) map.set(lastKey, []);
			map.get(lastKey)!.push(node);
		}
	}

	return map;
}

/** 判断任务在某天是否是中间日期（非首尾） */
export function isMiddleDay(
	node: TaskTreeNodeLike,
	date: Date,
	intervalMode: string,
): boolean {
	const interval = getTaskInterval(node, intervalMode);
	if (!interval) return false;

	const dateStart = setStart(date).getTime();
	const dateEnd = setEnd(date).getTime();
	const taskStart = setStart(new Date(interval.start)).getTime();
	const taskEnd = setEnd(new Date(interval.end)).getTime();

	if (taskStart === taskEnd) return false;
	if (dateStart <= taskStart && taskStart <= dateEnd) return false;
	if (dateStart <= taskEnd && taskEnd <= dateEnd) return false;
	return taskStart < dateStart && dateEnd < taskEnd;
}

// ========== 任务排序 ==========

/** 全局排序：优先级 > 状态 */
export function buildGlobalOrder(
	nodes: TaskTreeNodeLike[],
): Map<string, number> {
	const arr = [...nodes];
	arr.sort((a, b) => {
		if (a.priority !== b.priority) return b.priority - a.priority;
		const order: Record<string, number> = {
			todo: 0,
			scheduled: 1,
			"in-progress": 2,
			cancelled: 3,
			completed: 4,
		};
		return (order[a.status] || 99) - (order[b.status] || 99);
	});
	const map = new Map<string, number>();
	arr.forEach((n, i) => map.set(n.uid, i));
	return map;
}

// ========== 日期范围推断 ==========

/** 从任务列表中推断日期范围 */
export function inferDateRange(
	nodes: TaskTreeNodeLike[],
	intervalMode: string,
): { startDate: Date; endDate: Date } {
	let minTs: number | null = null;
	let maxTs: number | null = null;
	for (const node of nodes) {
		const interval = getTaskInterval(node, intervalMode);
		if (interval) {
			if (minTs === null || interval.start < minTs)
				minTs = interval.start;
			if (maxTs === null || interval.end > maxTs) maxTs = interval.end;
		}
	}
	return {
		startDate: minTs ? setStart(new Date(minTs)) : setStart(new Date()),
		endDate: maxTs ? setEnd(new Date(maxTs)) : setEnd(new Date()),
	};
}

// ========== 周/月/季/年列表生成 ==========

export function getWeeksInRange(
	startDate: Date,
	endDate: Date,
): Array<{ start: Date }> {
	const weeks: Array<{ start: Date }> = [];
	for (
		let cur = new Date(startDate);
		cur <= endDate;
		cur.setDate(cur.getDate() + 7)
	) {
		const ws = setStart(new Date(cur));
		const dow = ws.getDay() || 7;
		ws.setDate(ws.getDate() - (dow - 1));
		weeks.push({ start: new Date(ws) });
	}
	return weeks;
}

export function getMonthsInRange(
	startDate: Date,
	endDate: Date,
): Array<{ year: number; month: number }> {
	const months: Array<{ year: number; month: number }> = [];
	for (
		let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
		cur <= endDate;
		cur.setMonth(cur.getMonth() + 1)
	) {
		months.push({ year: cur.getFullYear(), month: cur.getMonth() });
	}
	return months;
}

export function getQuartersInRange(
	startDate: Date,
	endDate: Date,
): Array<{ year: number; quarter: number }> {
	const quarters: Array<{ year: number; quarter: number }> = [];
	for (
		let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
		cur <= endDate;
		cur.setMonth(cur.getMonth() + 3)
	) {
		const q = Math.floor(cur.getMonth() / 3) + 1;
		quarters.push({ year: cur.getFullYear(), quarter: q });
	}
	return quarters;
}

export function getYearsInRange(startDate: Date, endDate: Date): number[] {
	const years: number[] = [];
	for (let y = startDate.getFullYear(); y <= endDate.getFullYear(); y++) {
		years.push(y);
	}
	return years;
}

// ========== 日历格子数据 ==========

export interface CalendarCellItem {
	type: "task" | "line" | "placeholder";
	node: TaskTreeNodeLike;
}

/** 计算某天日历格子内应显示的项目列表 */
export function buildCellItems(
	date: Date,
	dateTaskMap: Map<string, TaskTreeNodeLike[]>,
	intervalMode: string,
): CalendarCellItem[] {
	const dateKey = formatDate(date);
	const tasksForDate = dateTaskMap.get(dateKey) || [];
	const todayStr = formatDate(new Date());
	const isDateToday = dateKey === todayStr;

	const items: CalendarCellItem[] = [];

	for (const node of tasksForDate) {
		const interval = getTaskInterval(node, intervalMode);
		if (!interval) {
			items.push({ type: "task", node });
			continue;
		}

		const taskStart = setStart(new Date(interval.start)).getTime();
		const taskEnd = setEnd(new Date(interval.end)).getTime();
		const dateStart = setStart(date).getTime();
		const dateEnd = setEnd(date).getTime();

		const isFirstOrLast =
			(dateStart <= taskStart && taskStart <= dateEnd) ||
			(dateStart <= taskEnd && taskEnd <= dateEnd);

		if (isFirstOrLast) {
			items.push({ type: "task", node });
		} else if (isDateToday) {
			items.push({ type: "task", node });
		} else {
			items.push({ type: "line", node });
		}
	}

	return items;
}

/** 生成月视图所需的42天日期数组 */
export function getMonthDays(year: number, month: number): Date[] {
	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dow = firstDay.getDay() || 7;
	startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

	const days: Date[] = [];
	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		days.push(d);
	}
	return days;
}
