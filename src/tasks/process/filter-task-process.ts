// src/tasks/process/filter-task-process.ts
import { ALL_MARKS, PRIORITY_ORDER, REPEAT_ORDER } from "../../configs/configs";
import { GlobalFilter } from "../../types";

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

export function daysInYear(y: number): number {
	return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
}

export function weeksInYear(y: number): number {
	const d = new Date(y, 0, 1);
	const dow = d.getDay() || 7;
	const mon = new Date(y, 0, 1 - (dow === 1 ? 0 : dow - 1));
	return Math.ceil(
		(new Date(y, 11, 31).getTime() - mon.getTime()) / 604800000,
	);
}

export function dayToDate(y: number, d: number): Date {
	const dt = new Date(y, 0, 1);
	dt.setDate(dt.getDate() + d - 1);
	return dt;
}

export function getLevelValues(startDate: Date, endDate: Date) {
	const isoWeek = (d: Date) => {
		const tmp = new Date(
			Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
		);
		const dayNum = tmp.getUTCDay() || 7;
		tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
		return Math.ceil(
			((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
		);
	};

	const dayOfYear = (d: Date) => {
		const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		return Math.ceil(
			(start.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) /
				86400000,
		);
	};

	const ws = isoWeek(startDate),
		we = isoWeek(endDate);
	const qs = Math.floor(startDate.getMonth() / 3) + 1,
		qe = Math.floor(endDate.getMonth() / 3) + 1;
	const ms = startDate.getMonth() + 1,
		me = endDate.getMonth() + 1;
	const ds = dayOfYear(startDate),
		de = dayOfYear(endDate);

	const sameYear = startDate.getFullYear() === endDate.getFullYear();

	if (sameYear) {
		return {
			yearStart: startDate.getFullYear(),
			yearEnd: endDate.getFullYear(),
			quarterStart: qs,
			quarterEnd: qe,
			monthStart: ms,
			monthEnd: me,
			weekStart: ws,
			weekEnd: we,
			dayStart: ds,
			dayEnd: de,
		};
	}

	const minYear = Math.min(startDate.getFullYear(), endDate.getFullYear());
	const maxYear = Math.max(startDate.getFullYear(), endDate.getFullYear());

	let quarterOffset = 0,
		monthOffset = 0,
		weekOffset = 0,
		dayOffset = 0;
	for (let y = minYear; y < maxYear; y++) {
		quarterOffset += 4;
		monthOffset += 12;
		weekOffset += weeksInYear(y);
		dayOffset += daysInYear(y);
	}

	const startIsMin = startDate.getFullYear() === minYear;

	return {
		yearStart: startDate.getFullYear(),
		yearEnd: endDate.getFullYear(),
		quarterStart: startIsMin ? qs : qs + quarterOffset,
		quarterEnd: startIsMin ? qe + quarterOffset : qe,
		monthStart: startIsMin ? ms : ms + monthOffset,
		monthEnd: startIsMin ? me + monthOffset : me,
		weekStart: startIsMin ? ws : ws + weekOffset,
		weekEnd: startIsMin ? we + weekOffset : we,
		dayStart: startIsMin ? ds : ds + dayOffset,
		dayEnd: startIsMin ? de + dayOffset : de,
	};
}

export function datesFromLevel(
	lv: string,
	sv: number,
	ev: number,
	dynamicUnit?: string,
): { startDate: Date; endDate: Date } {
	const y = new Date().getFullYear();
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	let startDate = new Date(),
		endDate = new Date();

	const addOffset = (d: Date, o: number, u: string) => {
		const nd = new Date(d);
		if (u === "week") nd.setDate(nd.getDate() + o * 7);
		else if (u === "month") nd.setMonth(nd.getMonth() + o);
		else if (u === "quarter") {
			const cq = Math.floor(d.getMonth() / 3);
			nd.setMonth((cq + o) * 3, 1);
		} else if (u === "year") nd.setFullYear(nd.getFullYear() + o);
		else nd.setDate(nd.getDate() + o);
		return nd;
	};

	const determineYear = (v: number): number => {
		if (lv === "quarter" && v > 4) return y + 1;
		if (lv === "month" && v > 12) return y + 1;
		if (lv === "week" && v > weeksInYear(y)) return y + 1;
		if (lv === "day" && v > daysInYear(y)) return y + 1;
		return y;
	};

	const real = (v: number, year: number): number => {
		if (lv === "quarter" && v > 4) return Math.max(1, v - 4);
		if (lv === "month" && v > 12) return Math.max(1, v - 12);
		if (lv === "week" && v > weeksInYear(year))
			return Math.max(1, v - weeksInYear(year));
		if (lv === "day" && v > daysInYear(year))
			return Math.max(1, v - daysInYear(year));
		return v;
	};

	switch (lv) {
		case "year":
			startDate = new Date(sv, 0, 1);
			endDate = new Date(ev, 11, 31);
			break;
		case "quarter": {
			const sy = determineYear(sv),
				ey = determineYear(ev);
			startDate = new Date(sy, (real(sv, sy) - 1) * 3, 1);
			endDate = new Date(ey, real(ev, ey) * 3, 0);
			break;
		}
		case "month": {
			const sy = determineYear(sv),
				ey = determineYear(ev);
			startDate = new Date(sy, real(sv, sy) - 1, 1);
			endDate = new Date(ey, real(ev, ey), 0);
			break;
		}
		case "week": {
			const sy = determineYear(sv),
				ey = determineYear(ev);
			const rsv = real(sv, sy),
				rev = real(ev, ey);
			const fd = new Date(sy, 0, 1);
			const dow = fd.getDay() || 7;
			const mon = new Date(sy, 0, 1 - (dow === 1 ? 0 : dow - 1));
			startDate = new Date(mon);
			startDate.setDate(startDate.getDate() + (rsv - 1) * 7);
			if (sy === ey) {
				endDate = new Date(startDate);
				endDate.setDate(endDate.getDate() + (rev - rsv) * 7 + 6);
			} else {
				const fd2 = new Date(ey, 0, 1);
				const dow2 = fd2.getDay() || 7;
				const mon2 = new Date(ey, 0, 1 - (dow2 === 1 ? 0 : dow2 - 1));
				endDate = new Date(mon2);
				endDate.setDate(endDate.getDate() + (rev - 1) * 7 + 6);
			}
			break;
		}
		case "day": {
			const sy = determineYear(sv),
				ey = determineYear(ev);
			startDate = dayToDate(sy, real(sv, sy));
			endDate = dayToDate(ey, real(ev, ey));
			break;
		}
		case "dynamic": {
			const unit = dynamicUnit || "day";
			startDate = addOffset(today, sv, unit);
			endDate = addOffset(today, ev, unit);
			if (unit !== "year") {
				const ty = today.getFullYear();
				if (startDate.getFullYear() < ty)
					startDate = new Date(ty, 0, 1);
				else if (startDate.getFullYear() > ty)
					startDate = new Date(ty, 11, 31);
				if (endDate.getFullYear() < ty) endDate = new Date(ty, 0, 1);
				else if (endDate.getFullYear() > ty)
					endDate = new Date(ty, 11, 31);
			}
			if (startDate.getTime() > endDate.getTime())
				[startDate, endDate] = [endDate, startDate];
			if (unit === "week") {
				endDate.setDate(endDate.getDate() + 6);
				if (
					unit !== "year" &&
					endDate.getFullYear() > today.getFullYear()
				)
					endDate = new Date(today.getFullYear(), 11, 31);
			} else if (unit === "month")
				endDate = new Date(
					endDate.getFullYear(),
					endDate.getMonth() + 1,
					0,
				);
			else if (unit === "quarter")
				endDate = new Date(
					endDate.getFullYear(),
					endDate.getMonth() + 3,
					0,
				);
			else if (unit === "year")
				endDate = new Date(endDate.getFullYear(), 11, 31);
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
	const doy = Math.ceil(
		(today.getTime() - new Date(y, 0, 0).getTime()) / 86400000,
	);
	const total = daysInYear(y);
	if (unit === "day") {
		const b = doy - 1,
			a = total - doy;
		return Math.max(b, a);
	}
	if (unit === "week") {
		const b = Math.floor((doy - 1) / 7),
			a = Math.floor((total - doy) / 7);
		return Math.max(b, a);
	}
	if (unit === "month") {
		const cm = today.getMonth();
		return Math.max(cm, 11 - cm);
	}
	if (unit === "quarter") {
		const cq = Math.floor(today.getMonth() / 3);
		return Math.max(cq, 3 - cq);
	}
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
		return {
			yearMin: cy - 5,
			yearMax: cy + 5,
			quarterMin: 1,
			quarterMax: 4,
			monthMin: 1,
			monthMax: 12,
			weekMin: 1,
			weekMax: weeksInYear(cy),
			dayMin: 1,
			dayMax: daysInYear(cy),
			tw: weeksInYear(cy),
			td: daysInYear(cy),
		};
	}

	const minY = Math.min(vals.yearStart, vals.yearEnd);
	const maxY = Math.max(vals.yearStart, vals.yearEnd);
	let totalQuarters = 0,
		totalMonths = 0,
		totalWeeks = 0,
		totalDays = 0;
	for (let y = minY; y <= maxY; y++) {
		totalQuarters += 4;
		totalMonths += 12;
		totalWeeks += weeksInYear(y);
		totalDays += daysInYear(y);
	}

	return {
		yearMin: cy - 5,
		yearMax: cy + 5,
		quarterMin: 1,
		quarterMax: totalQuarters,
		monthMin: 1,
		monthMax: totalMonths,
		weekMin: 1,
		weekMax: totalWeeks,
		dayMin: 1,
		dayMax: totalDays,
		tw: weeksInYear(cy),
		td: daysInYear(cy),
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
