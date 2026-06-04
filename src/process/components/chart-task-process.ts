// src/process/components/calcul-chart-process.ts
import { ALLOWED_STATUSES } from "../../configs/configs";

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
	return days * 12;
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
	ALLOWED_STATUSES.forEach((s) => {
		seriesData[s] = sorted.map((e) => (e[1] as any)[s]);
	});
	return { dates, seriesData, statusOrder: ALLOWED_STATUSES };
}
