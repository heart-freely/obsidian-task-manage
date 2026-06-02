// src/process/bars/bars-process.ts
// 图表数据计算、任务计算、滑动条计算、格式化函数（纯函数）

import {
	ALL_MARKS,
	CONFIG,
	PRIORITY_ORDER,
	REPEAT_ORDER,
} from "../../configs/configs";
import { GlobalFilter } from "../../types";

// ========== ISO 周数计算（内部使用） ==========

function isoWeekRaw(d: Date): number {
	const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	const dayNum = tmp.getUTCDay() || 7;
	tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
	return Math.ceil(
		((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
	);
}

// ========== 年份数据缓存 ==========

const DAYS_IN_YEAR_CACHE: Record<number, number> = {};
const WEEKS_IN_YEAR_CACHE: Record<number, number> = {};
const FIRST_MONDAY_CACHE: Record<number, number> = {};
const LAST_SUNDAY_CACHE: Record<number, number> = {};

function ensureYearCache(y: number): void {
	if (DAYS_IN_YEAR_CACHE[y] !== undefined) return;
	DAYS_IN_YEAR_CACHE[y] =
		(y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
	WEEKS_IN_YEAR_CACHE[y] = isoWeekRaw(new Date(y, 11, 31));
	const jan1 = new Date(y, 0, 1);
	const dow1 = jan1.getDay() || 7;
	FIRST_MONDAY_CACHE[y] = new Date(
		y,
		0,
		dow1 === 1 ? 1 : 1 + (8 - dow1),
		0,
		0,
		0,
		0,
	).getTime();
	const dec31 = new Date(y, 11, 31);
	const dow2 = dec31.getDay() || 7;
	LAST_SUNDAY_CACHE[y] = new Date(
		y,
		11,
		dow2 === 7 ? 31 : 31 + (7 - dow2),
		23,
		59,
		59,
		999,
	).getTime();
}

// ========== 日历查询函数（查表） ==========

export function daysInYear(y: number): number {
	ensureYearCache(y);
	return DAYS_IN_YEAR_CACHE[y];
}

export function weeksInYear(y: number): number {
	ensureYearCache(y);
	return WEEKS_IN_YEAR_CACHE[y];
}

export function getFirstMondayOfYear(y: number): Date {
	ensureYearCache(y);
	return new Date(FIRST_MONDAY_CACHE[y]);
}

export function getLastSundayOfYear(y: number): Date {
	ensureYearCache(y);
	return new Date(LAST_SUNDAY_CACHE[y]);
}

export function getFirstDayOfYear(y: number): Date {
	return new Date(y, 0, 1, 0, 0, 0, 0);
}

export function getLastDayOfYear(y: number): Date {
	return new Date(y, 11, 31, 23, 59, 59, 999);
}

export function isoWeek(d: Date): number {
	return isoWeekRaw(d);
}

export function dayOfYear(d: Date): number {
	ensureYearCache(d.getFullYear());
	const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	return Math.ceil(
		(start.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) /
			86400000,
	);
}

export function dayToDate(y: number, d: number): Date {
	const dt = new Date(y, 0, 1);
	dt.setDate(dt.getDate() + d - 1);
	return dt;
}

// ========== 格式化函数（纯函数） ==========

export function formatYearValue(x: number): string {
	return `${x}`;
}

export function formatQuarterValue(x: number, baseYear: number): string {
	const y = baseYear + Math.floor((x - 1) / 4);
	const q = ((x - 1) % 4) + 1;
	return `${y}/${q}`;
}

export function formatMonthValue(x: number, baseYear: number): string {
	const y = baseYear + Math.floor((x - 1) / 12);
	const m = ((x - 1) % 12) + 1;
	return `${y}/${m}`;
}

export function formatWeekValue(x: number, baseYear: number): string {
	let r = x,
		y = baseYear;
	while (r > weeksInYear(y)) {
		r -= weeksInYear(y);
		y++;
	}
	return `${y}/${r}`;
}

export function formatDayValue(x: number, baseYear: number): string {
	let r = x,
		y = baseYear;
	while (r > daysInYear(y)) {
		r -= daysInYear(y);
		y++;
	}
	const d = dayToDate(y, Math.max(1, r));
	return `${y}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDynamicValue(v: number, unit: string): string {
	if (v === 0) {
		if (unit === "day") return "本日";
		if (unit === "week") return "本周";
		if (unit === "month") return "本月";
		if (unit === "quarter") return "本季";
		if (unit === "year") return "本年";
	}
	const p = v < 0 ? "前" : "后";
	const abs = Math.abs(v);
	if (unit === "week") return `${p}${abs}周`;
	if (unit === "month") return `${p}${abs}月`;
	if (unit === "quarter") return `${p}${abs}季`;
	if (unit === "year") return `${p}${abs}年`;
	return `${p}${abs}日`;
}

export function formatDynamicLabel(a: number, b: number, unit: string): string {
	const fa = formatDynamicValue(a, unit);
	const fb = formatDynamicValue(b, unit);
	return a === b ? fa : `${fa}~${fb}`;
}

export function getTodayAbsoluteValue(
	lv: string,
	baseYear: number,
	getISOWeekNumber: (d: Date) => number,
): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const cy = today.getFullYear();
	let offset = 0;
	for (let y = baseYear; y < cy; y++) {
		switch (lv) {
			case "quarter":
				offset += 4;
				break;
			case "month":
				offset += 12;
				break;
			case "week":
				offset += weeksInYear(y);
				break;
			case "day":
				offset += daysInYear(y);
				break;
		}
	}
	switch (lv) {
		case "year":
			return cy;
		case "quarter":
			return Math.floor(today.getMonth() / 3) + 1 + offset;
		case "month":
			return today.getMonth() + 1 + offset;
		case "week":
			return getISOWeekNumber(today) + offset;
		case "day":
			return (
				Math.ceil(
					(today.getTime() - new Date(cy, 0, 0).getTime()) / 86400000,
				) + offset
			);
	}
	return 0;
}

// ========== 原 calcul-echarts 计算 ==========

export function computeTotalSpanDays(
	tasks: any[],
	fieldStart: string,
	fieldEnd: string,
): number {
	if (!tasks.length) return 0;
	let min = Infinity,
		max = -Infinity;
	tasks.forEach((t) => {
		const s = t[fieldStart] ? new Date(t[fieldStart]).getTime() : null;
		const e = t[fieldEnd] ? new Date(t[fieldEnd]).getTime() : null;
		if (s && e && s <= e) {
			if (s < min) min = s;
			if (e > max) max = e;
		}
	});
	if (min === Infinity || max === -Infinity) return 0;
	return Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
}

export function calcPlannedDuration(tasks: any[]): number {
	let total = 0;
	tasks.forEach((t) => {
		if (t._scheduled && t._due)
			total += Math.max(
				0,
				(new Date(t._due).getTime() -
					new Date(t._scheduled).getTime()) /
					86400000,
			);
	});
	return Math.round(total);
}

export function calcActualDuration(tasks: any[]): number {
	let total = 0;
	tasks.forEach((t) => {
		if (t._starts && t._done)
			total += Math.max(
				0,
				(new Date(t._done).getTime() - new Date(t._starts).getTime()) /
					86400000,
			);
	});
	return Math.round(total);
}

export function calcTotalSpanHours(
	tasks: any[],
	fieldStart: string,
	fieldEnd: string,
): number {
	const days = computeTotalSpanDays(tasks, fieldStart, fieldEnd);
	return days * CONFIG.WORK_HOURS_PER_DAY;
}

export function prepareDailyStatusStack(
	tasks: any[],
	dateRange: any,
	formatDate: (d: Date) => string,
	setStart: (d: Date) => Date,
	setEnd: (d: Date) => Date,
) {
	const dayMap: Record<string, any> = {};
	function keyOf(d: Date) {
		return formatDate(d);
	}
	function initDay() {
		return {
			todo: 0,
			planned: 0,
			"in-progress": 0,
			completed: 0,
			cancelled: 0,
		};
	}
	if (dateRange) {
		const cur = setStart(new Date(dateRange.start));
		const end = setStart(new Date(dateRange.end));
		while (cur <= end) {
			dayMap[keyOf(cur)] = initDay();
			cur.setDate(cur.getDate() + 1);
		}
	}
	tasks.forEach((t) => {
		const range = t._cachedTimeRange;
		if (!range) return;
		const cur = setStart(new Date(range.start));
		const end = setStart(new Date(range.end));
		while (cur <= end) {
			const key = keyOf(cur);
			if (dateRange) {
				if (dayMap[key]) dayMap[key][t._status]++;
			} else {
				if (!dayMap[key]) dayMap[key] = initDay();
				dayMap[key][t._status]++;
			}
			cur.setDate(cur.getDate() + 1);
		}
	});
	const sorted = Object.keys(dayMap)
		.sort()
		.map((k) => [k, dayMap[k]]);
	const dates = sorted.map((e) => e[0]);
	const seriesData: Record<string, number[]> = {};
	CONFIG.ALLOWED_STATUSES.forEach((s) => {
		seriesData[s] = sorted.map((e) => (e[1] as any)[s]);
	});
	return { dates, seriesData, statusOrder: CONFIG.ALLOWED_STATUSES };
}

// ========== 通用筛选函数 ==========

export function getTaskTimeRange(tasks: any[]): {
	minTime: number | null;
	maxTime: number | null;
} {
	let minTime: number | null = null;
	let maxTime: number | null = null;
	for (const task of tasks) {
		const dates: (string | undefined)[] = [
			task._created,
			task._scheduled,
			task._starts,
			task._due,
			task._done,
			task._cancel,
		];
		for (const dateStr of dates) {
			if (!dateStr) continue;
			const ts = new Date(dateStr).getTime();
			if (isNaN(ts)) continue;
			if (minTime === null || ts < minTime) minTime = ts;
			if (maxTime === null || ts > maxTime) maxTime = ts;
		}
	}
	return { minTime, maxTime };
}

// ========== 跨年偏移计算 ==========

function calcYearOffset(
	baseYear: number,
	targetYear: number,
): {
	quarter: number;
	month: number;
	week: number;
	day: number;
} {
	let quarter = 0,
		month = 0,
		week = 0,
		day = 0;
	for (let y = baseYear; y < targetYear; y++) {
		ensureYearCache(y);
		quarter += 4;
		month += 12;
		week += WEEKS_IN_YEAR_CACHE[y];
		day += DAYS_IN_YEAR_CACHE[y];
	}
	return { quarter, month, week, day };
}

export function absoluteValueToYear(
	lv: string,
	absValue: number,
	baseYear: number,
): number {
	let remaining = absValue;
	let year = baseYear;
	switch (lv) {
		case "quarter":
			while (remaining > 4) {
				remaining -= 4;
				year++;
			}
			break;
		case "month":
			while (remaining > 12) {
				remaining -= 12;
				year++;
			}
			break;
		case "week":
			while (remaining > weeksInYear(year)) {
				remaining -= weeksInYear(year);
				year++;
			}
			break;
		case "day":
			while (remaining > daysInYear(year)) {
				remaining -= daysInYear(year);
				year++;
			}
			break;
	}
	return year;
}

function absoluteToYearValue(
	lv: string,
	absValue: number,
	baseYear: number,
): {
	year: number;
	valueInYear: number;
} {
	let remaining = absValue;
	let year = baseYear;
	switch (lv) {
		case "quarter":
			while (remaining > 4) {
				remaining -= 4;
				year++;
			}
			break;
		case "month":
			while (remaining > 12) {
				remaining -= 12;
				year++;
			}
			break;
		case "week":
			while (remaining > weeksInYear(year)) {
				remaining -= weeksInYear(year);
				year++;
			}
			break;
		case "day":
			while (remaining > daysInYear(year)) {
				remaining -= daysInYear(year);
				year++;
			}
			break;
	}
	return { year, valueInYear: remaining };
}

// ========== 核心函数 ==========

export function getLevelValues(
	startDate: Date,
	endDate: Date,
	minYear?: number,
) {
	const startYear = startDate.getFullYear();
	const endYear = endDate.getFullYear();
	const baseYear = minYear ?? Math.min(startYear, endYear);

	for (let y = baseYear; y <= Math.max(startYear, endYear); y++)
		ensureYearCache(y);

	const isYearStart = startDate.getMonth() === 0 && startDate.getDate() === 1;
	const isYearEnd = endDate.getMonth() === 11 && endDate.getDate() === 31;

	const ws = isYearStart ? 1 : isoWeek(startDate);
	const we = isYearEnd ? weeksInYear(endYear) : isoWeek(endDate);
	const qs = isYearStart ? 1 : Math.floor(startDate.getMonth() / 3) + 1;
	const qe = isYearEnd ? 4 : Math.floor(endDate.getMonth() / 3) + 1;
	const ms = isYearStart ? 1 : startDate.getMonth() + 1;
	const me = isYearEnd ? 12 : endDate.getMonth() + 1;
	const ds = isYearStart ? 1 : dayOfYear(startDate);
	const de = isYearEnd ? daysInYear(endYear) : dayOfYear(endDate);

	const startOff = calcYearOffset(baseYear, startYear);
	const endOff = calcYearOffset(baseYear, endYear);

	return {
		yearStart: startYear,
		yearEnd: endYear,
		quarterStart: qs + startOff.quarter,
		quarterEnd: qe + endOff.quarter,
		monthStart: ms + startOff.month,
		monthEnd: me + endOff.month,
		weekStart: ws + startOff.week,
		weekEnd: we + endOff.week,
		dayStart: ds + startOff.day,
		dayEnd: de + endOff.day,
	};
}

export function datesFromLevel(
	lv: string,
	sv: number,
	ev: number,
	dynamicUnit?: string,
	baseYear?: number,
): { startDate: Date; endDate: Date } {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	let startDate: Date, endDate: Date;
	const minV = Math.min(sv, ev);
	const maxV = Math.max(sv, ev);

	const addOffset = (d: Date, o: number, u: string) => {
		const nd = new Date(d);
		if (u === "week") nd.setDate(nd.getDate() + o * 7);
		else if (u === "month") nd.setMonth(nd.getMonth() + o);
		else if (u === "quarter")
			nd.setMonth((Math.floor(d.getMonth() / 3) + o) * 3, 1);
		else if (u === "year") nd.setFullYear(nd.getFullYear() + o);
		else nd.setDate(nd.getDate() + o);
		return nd;
	};

	switch (lv) {
		case "year":
			startDate = getFirstDayOfYear(minV);
			endDate = getLastDayOfYear(maxV);
			break;
		case "quarter": {
			if (baseYear !== undefined) {
				const s = absoluteToYearValue("quarter", minV, baseYear);
				const e = absoluteToYearValue("quarter", maxV, baseYear);
				startDate = new Date(
					s.year,
					(s.valueInYear - 1) * 3,
					1,
					0,
					0,
					0,
					0,
				);
				endDate = new Date(
					e.year,
					e.valueInYear * 3,
					0,
					23,
					59,
					59,
					999,
				);
			} else {
				startDate = addOffset(today, minV, "quarter");
				endDate = addOffset(today, maxV, "quarter");
				endDate = new Date(
					endDate.getFullYear(),
					endDate.getMonth() + 3,
					0,
					23,
					59,
					59,
					999,
				);
			}
			break;
		}
		case "month": {
			if (baseYear !== undefined) {
				const s = absoluteToYearValue("month", minV, baseYear);
				const e = absoluteToYearValue("month", maxV, baseYear);
				startDate = new Date(s.year, s.valueInYear - 1, 1, 0, 0, 0, 0);
				endDate = new Date(e.year, e.valueInYear, 0, 23, 59, 59, 999);
			} else {
				startDate = addOffset(today, minV, "month");
				endDate = addOffset(today, maxV, "month");
				endDate = new Date(
					endDate.getFullYear(),
					endDate.getMonth() + 1,
					0,
					23,
					59,
					59,
					999,
				);
			}
			break;
		}
		case "week": {
			if (baseYear !== undefined) {
				const s = absoluteToYearValue("week", minV, baseYear);
				const e = absoluteToYearValue("week", maxV, baseYear);
				const mon = getFirstMondayOfYear(s.year);
				startDate = new Date(mon);
				startDate.setDate(
					startDate.getDate() + (s.valueInYear - 1) * 7,
				);
				startDate.setHours(0, 0, 0, 0);
				const mon2 = getFirstMondayOfYear(e.year);
				endDate = new Date(mon2);
				endDate.setDate(
					endDate.getDate() + (e.valueInYear - 1) * 7 + 6,
				);
				endDate.setHours(23, 59, 59, 999);
			} else {
				startDate = addOffset(today, minV, "week");
				endDate = addOffset(today, maxV, "week");
				endDate.setDate(endDate.getDate() + 6);
				endDate.setHours(23, 59, 59, 999);
			}
			break;
		}
		case "day": {
			if (baseYear !== undefined) {
				const s = absoluteToYearValue("day", minV, baseYear);
				const e = absoluteToYearValue("day", maxV, baseYear);
				startDate = dayToDate(s.year, s.valueInYear);
				startDate.setHours(0, 0, 0, 0);
				endDate = dayToDate(e.year, e.valueInYear);
				endDate.setHours(23, 59, 59, 999);
			} else {
				startDate = addOffset(today, minV, "day");
				endDate = addOffset(today, maxV, "day");
				endDate.setHours(23, 59, 59, 999);
			}
			break;
		}
		case "dynamic": {
			const unit = dynamicUnit || "day";
			startDate = addOffset(today, minV, unit);
			endDate = addOffset(today, maxV, unit);
			if (unit !== "year") {
				const ty = today.getFullYear();
				if (startDate.getFullYear() < ty)
					startDate = getFirstDayOfYear(ty);
				else if (startDate.getFullYear() > ty)
					startDate = getLastDayOfYear(ty);
				if (endDate.getFullYear() < ty) endDate = getFirstDayOfYear(ty);
				else if (endDate.getFullYear() > ty)
					endDate = getLastDayOfYear(ty);
			}
			if (startDate.getTime() > endDate.getTime())
				[startDate, endDate] = [endDate, startDate];
			if (unit === "week") {
				endDate.setDate(endDate.getDate() + 6);
				if (endDate.getFullYear() > today.getFullYear())
					endDate = getLastDayOfYear(today.getFullYear());
			} else if (unit === "month")
				endDate = new Date(
					endDate.getFullYear(),
					endDate.getMonth() + 1,
					0,
					23,
					59,
					59,
					999,
				);
			else if (unit === "quarter")
				endDate = new Date(
					endDate.getFullYear(),
					endDate.getMonth() + 3,
					0,
					23,
					59,
					59,
					999,
				);
			else if (unit === "year")
				endDate = getLastDayOfYear(endDate.getFullYear());
			break;
		}
	}

	if (startDate.getTime() > endDate.getTime())
		[startDate, endDate] = [endDate, startDate];
	startDate.setHours(0, 0, 0, 0);
	endDate.setHours(23, 59, 59, 999);
	return { startDate, endDate };
}

export function calcDynamicOffset(date: Date, unit: string): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const diffDays = (date.getTime() - today.getTime()) / 86400000;
	const floorDays = Math.floor(diffDays);
	if (unit === "week") return Math.floor(floorDays / 7);
	if (unit === "month")
		return (
			(date.getFullYear() - today.getFullYear()) * 12 +
			(date.getMonth() - today.getMonth())
		);
	if (unit === "quarter") {
		const md =
			(date.getFullYear() - today.getFullYear()) * 12 +
			(date.getMonth() - today.getMonth());
		return Math.floor(md / 3);
	}
	if (unit === "year") return date.getFullYear() - today.getFullYear();
	return floorDays;
}

export function maxDynamicRange(unit: string): number {
	const today = new Date();
	const y = today.getFullYear();
	const doy = dayOfYear(today);
	const total = daysInYear(y);
	if (unit === "day") return Math.max(doy - 1, total - doy);
	if (unit === "week")
		return Math.max(
			Math.floor((doy - 1) / 7),
			Math.floor((total - doy) / 7),
		);
	if (unit === "month")
		return Math.max(today.getMonth(), 11 - today.getMonth());
	if (unit === "quarter")
		return Math.max(
			Math.floor(today.getMonth() / 3),
			3 - Math.floor(today.getMonth() / 3),
		);
	if (unit === "year") return 5;
	return 365;
}

export function staticSliderRanges(
	startDate: Date,
	endDate: Date,
	taskMinYear: number,
	taskMaxYear: number,
) {
	const cy = new Date().getFullYear();
	const vals = getLevelValues(startDate, endDate);
	const sameYear = vals.yearStart === vals.yearEnd;

	if (sameYear) {
		ensureYearCache(cy);
		return {
			yearMin: cy - 10,
			yearMax: cy + 10,
			quarterMin: 1,
			quarterMax: 4,
			monthMin: 1,
			monthMax: 12,
			weekMin: 1,
			weekMax: WEEKS_IN_YEAR_CACHE[cy],
			dayMin: 1,
			dayMax: DAYS_IN_YEAR_CACHE[cy],
			minYear: vals.yearStart,
			maxYear: vals.yearEnd,
		};
	}

	const minY = Math.min(vals.yearStart, vals.yearEnd);
	const maxY = Math.max(vals.yearStart, vals.yearEnd);
	let totalQuarters = 0,
		totalMonths = 0,
		totalWeeks = 0,
		totalDays = 0;
	for (let y = minY; y <= maxY; y++) {
		ensureYearCache(y);
		totalQuarters += 4;
		totalMonths += 12;
		totalWeeks += WEEKS_IN_YEAR_CACHE[y];
		totalDays += DAYS_IN_YEAR_CACHE[y];
	}

	return {
		yearMin: cy - 10,
		yearMax: cy + 10,
		quarterMin: 1,
		quarterMax: totalQuarters,
		monthMin: 1,
		monthMax: totalMonths,
		weekMin: 1,
		weekMax: totalWeeks,
		dayMin: 1,
		dayMax: totalDays,
		minYear: minY,
		maxYear: maxY,
	};
}

export function filterTasks(
	tasks: any[],
	filter: GlobalFilter,
	intervalMode?: string,
): any[] {
	let result = tasks;
	if (
		!filter.dateRange.isAll &&
		filter.dateRange.start != null &&
		filter.dateRange.end != null
	) {
		const start = filter.dateRange.start,
			end = filter.dateRange.end;
		const mode = intervalMode || "scheduled-due";
		result = result.filter((t: any) => {
			let tStart: number | null = null,
				tEnd: number | null = null;
			if (mode === "starts-done") {
				tStart = t._starts ? new Date(t._starts).getTime() : null;
				tEnd = t._done
					? new Date(t._done).getTime()
					: t._due
						? new Date(t._due).getTime()
						: null;
			} else {
				tStart = t._scheduled ? new Date(t._scheduled).getTime() : null;
				tEnd = t._due
					? new Date(t._due).getTime()
					: t._done
						? new Date(t._done).getTime()
						: null;
			}
			if (!tStart || !tEnd) return false;
			return tStart <= end && tEnd >= start;
		});
	}
	if (filter.statuses && filter.statuses.length > 0)
		result = result.filter((t: any) => filter.statuses.includes(t._status));
	const allMarksList = [...ALL_MARKS];
	if (
		filter.includeMarks &&
		filter.includeMarks.length > 0 &&
		filter.includeMarks.length < allMarksList.length
	)
		result = result.filter((t: any) =>
			filter.includeMarks!.some((m: string) => t._marks?.[m]),
		);
	if (filter.hideRepeat) result = result.filter((t: any) => !t._repeat);
	if (filter.hideCompleted)
		result = result.filter((t: any) => t._status !== "completed");
	if (filter.hideCancelled)
		result = result.filter((t: any) => t._status !== "cancelled");
	if (filter.rootPath)
		result = result.filter((t: any) =>
			t.path?.startsWith(filter.rootPath!),
		);
	if (filter.searchText) {
		const kw = filter.searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		if (kw.length > 0)
			result = result.filter((t: any) => {
				const d = (t._cleanText || t.text || "").toLowerCase();
				return kw.every((k) => d.includes(k));
			});
	}
	const allPriorityIcons = [...PRIORITY_ORDER];
	if (
		filter.priorityValues &&
		filter.priorityValues.length > 0 &&
		filter.priorityValues.length < allPriorityIcons.length
	)
		result = result.filter(
			(t: any) =>
				t._priorityIcon &&
				filter.priorityValues!.includes(t._priorityIcon),
		);
	const allRepeatCycles = [...REPEAT_ORDER];
	if (
		filter.repeatCycles &&
		filter.repeatCycles.length > 0 &&
		filter.repeatCycles.length < allRepeatCycles.length
	)
		result = result.filter((t: any) => {
			if (!t._repeat) return false;
			return filter.repeatCycles!.some((c: string) =>
				t._repeat.toLowerCase().includes(c),
			);
		});
	return result;
}
