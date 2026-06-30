// src/core/date/date-calc.ts
// 日期计算模块 — ISO 周数、年份缓存、格式化、滑动条联动

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

// ========== 格式化函数 ==========

export function formatYearValue(x: number): string {
	return `${x}年`;
}

export function formatQuarterValue(x: number, baseYear: number): string {
	const y = baseYear + Math.floor((x - 1) / 4);
	const q = ((x - 1) % 4) + 1;
	return `${y}/${q}季`;
}

export function formatMonthValue(x: number, baseYear: number): string {
	const y = baseYear + Math.floor((x - 1) / 12);
	const m = ((x - 1) % 12) + 1;
	return `${y}/${m}月`;
}

export function formatWeekValue(x: number, baseYear: number): string {
	let r = x,
		y = baseYear;
	while (r > weeksInYear(y)) {
		r -= weeksInYear(y);
		y++;
	}
	return `${y}/${r}周`;
}

export function formatDayValue(x: number, baseYear: number): string {
	let r = x,
		y = baseYear;
	while (r > daysInYear(y)) {
		r -= daysInYear(y);
		y++;
	}
	const d = dayToDate(y, Math.max(1, r));
	return `${y}/${d.getMonth() + 1}/${d.getDate()}日`;
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

// ========== 计算函数 ==========

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
	const minV = Math.min(sv, ev),
		maxV = Math.max(sv, ev);
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
		case "quarter":
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
		case "month":
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
		case "week":
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
		case "day":
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
	if (unit === "year") return 10;
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

// ========== 跨年偏移计算 ==========

function calcYearOffset(
	baseYear: number,
	targetYear: number,
): { quarter: number; month: number; week: number; day: number } {
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

function absoluteToYearValue(
	lv: string,
	absValue: number,
	baseYear: number,
): { year: number; valueInYear: number } {
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

// ========== 新增：TimePanel 抽离的纯函数 ==========

/**
 * 数值钳制
 */
export function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

/**
 * 年份滑动条范围（当前年±10）
 */
export function yearSliderRange(): { min: number; max: number } {
	const cy = new Date().getFullYear();
	return { min: cy - 10, max: cy + 10 };
}

/**
 * 计算今天在静态滑动条各级别的值
 */
export function getTodaySliderValue(
	lv: string,
	baseYear: number,
	getISOWeekNumber: (d: Date) => number,
	getWeeksInYear: (y: number) => number,
	getDaysInYear: (y: number) => number,
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
				offset += getWeeksInYear(y);
				break;
			case "day":
				offset += getDaysInYear(y);
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

/**
 * 单年模式下各级别的范围
 */
export function singleYearRanges(
	y: number,
	yearMin: number,
	yearMax: number,
): {
	yearMin: number;
	yearMax: number;
	quarterMin: number;
	quarterMax: number;
	monthMin: number;
	monthMax: number;
	weekMin: number;
	weekMax: number;
	dayMin: number;
	dayMax: number;
	minYear: number;
	maxYear: number;
} {
	return {
		yearMin,
		yearMax,
		quarterMin: 1,
		quarterMax: 4,
		monthMin: 1,
		monthMax: 12,
		weekMin: 1,
		weekMax: weeksInYear(y),
		dayMin: 1,
		dayMax: daysInYear(y),
		minYear: y,
		maxYear: y,
	};
}
