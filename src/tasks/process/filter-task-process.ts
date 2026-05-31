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
	const dayOfYear = (d: Date) =>
		Math.ceil(
			(d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) /
				86400000,
		);

	const sameYear = startDate.getFullYear() === endDate.getFullYear();
	const ws = isoWeek(startDate),
		we = isoWeek(endDate);
	const qs = Math.floor(startDate.getMonth() / 3) + 1,
		qe = Math.floor(endDate.getMonth() / 3) + 1;
	const ms = startDate.getMonth() + 1,
		me = endDate.getMonth() + 1;
	const ds = dayOfYear(startDate),
		de = dayOfYear(endDate);

	let weekStart = ws,
		weekEnd = we;
	let quarterStart = qs,
		quarterEnd = qe;
	let monthStart = ms,
		monthEnd = me;
	let dayStart = ds,
		dayEnd = de;

	if (!sameYear) {
		const startYear = startDate.getFullYear();
		const endYear = endDate.getFullYear();
		if (startYear < endYear) {
			weekEnd = we + 53;
			quarterEnd = qe + 4;
			monthEnd = me + 12;
			dayEnd = de + 366;
		} else {
			weekStart = ws + 53;
			quarterStart = qs + 4;
			monthStart = ms + 12;
			dayStart = ds + 366;
		}
	}

	return {
		yearStart: startDate.getFullYear(),
		yearEnd: endDate.getFullYear(),
		quarterStart,
		quarterEnd,
		monthStart,
		monthEnd,
		weekStart,
		weekEnd,
		dayStart,
		dayEnd,
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
	let startDate = new Date();
	let endDate = new Date();

	const addOffset = (d: Date, o: number, u: string) => {
		const nd = new Date(d);
		if (u === "week") nd.setDate(nd.getDate() + o * 7);
		else if (u === "month") nd.setMonth(nd.getMonth() + o);
		else if (u === "quarter") {
			const currentQuarter = Math.floor(d.getMonth() / 3);
			const targetQuarter = currentQuarter + o;
			nd.setMonth(targetQuarter * 3, 1);
		} else if (u === "year") nd.setFullYear(nd.getFullYear() + o);
		else nd.setDate(nd.getDate() + o);
		return nd;
	};

	const real = (lv: string, v: number) => {
		if (lv === "quarter" && v > 4) return Math.max(1, v - 4);
		if (lv === "month" && v > 12) return Math.max(1, v - 12);
		if (lv === "week" && v > 52) return Math.max(1, v - 53);
		if (lv === "day" && v > 365) return Math.max(1, v - 366);
		return v;
	};

	switch (lv) {
		case "year":
			startDate = new Date(sv, 0, 1);
			endDate = new Date(ev, 11, 31);
			break;
		case "quarter":
			startDate = new Date(y, (real(lv, sv) - 1) * 3, 1);
			endDate = new Date(y, real(lv, ev) * 3, 0);
			break;
		case "month":
			startDate = new Date(y, real(lv, sv) - 1, 1);
			endDate = new Date(y, real(lv, ev), 0);
			break;
		case "week": {
			const rsv = real(lv, sv),
				rev = real(lv, ev);
			const fd = new Date(y, 0, 1);
			const dow = fd.getDay() || 7;
			const mon = new Date(y, 0, 1 - (dow === 1 ? 0 : dow - 1));
			startDate = new Date(mon);
			startDate.setDate(startDate.getDate() + (rsv - 1) * 7);
			endDate = new Date(startDate);
			endDate.setDate(endDate.getDate() + (rev - rsv) * 7 + 6);
			break;
		}
		case "day": {
			const rsv = real(lv, sv),
				rev = real(lv, ev);
			startDate = dayToDate(y, rsv);
			endDate = dayToDate(y, rev);
			break;
		}
		case "dynamic": {
			const unit = dynamicUnit || "day";
			startDate = addOffset(today, sv, unit);
			endDate = addOffset(today, ev, unit);

			if (unit !== "year") {
				const thisYear = today.getFullYear();
				if (startDate.getFullYear() < thisYear)
					startDate = new Date(thisYear, 0, 1);
				else if (startDate.getFullYear() > thisYear)
					startDate = new Date(thisYear, 11, 31);
				if (endDate.getFullYear() < thisYear)
					endDate = new Date(thisYear, 0, 1);
				else if (endDate.getFullYear() > thisYear)
					endDate = new Date(thisYear, 11, 31);
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
			} else if (unit === "month") {
				endDate = new Date(
					endDate.getFullYear(),
					endDate.getMonth() + 1,
					0,
				);
			} else if (unit === "quarter") {
				endDate = new Date(
					endDate.getFullYear(),
					endDate.getMonth() + 3,
					0,
				);
			} else if (unit === "year") {
				endDate = new Date(endDate.getFullYear(), 11, 31);
			}
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
	const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
	if (unit === "week") return Math.floor(diffDays / 7);
	if (unit === "month")
		return (
			(date.getFullYear() - today.getFullYear()) * 12 +
			(date.getMonth() - today.getMonth())
		);
	if (unit === "quarter") {
		const monthDiff =
			(date.getFullYear() - today.getFullYear()) * 12 +
			(date.getMonth() - today.getMonth());
		return Math.floor(monthDiff / 3);
	}
	if (unit === "year") return date.getFullYear() - today.getFullYear();
	return diffDays;
}

export function maxDynamicRange(unit: string): number {
	const today = new Date();
	const y = today.getFullYear();
	const doy = Math.ceil(
		(today.getTime() - new Date(y, 0, 0).getTime()) / 86400000,
	);
	const total = daysInYear(y);

	if (unit === "day") {
		const before = doy - 1;
		const after = total - doy;
		return Math.max(before, after);
	}
	if (unit === "week") {
		const before = Math.floor((doy - 1) / 7);
		const after = Math.floor((total - doy) / 7);
		return Math.max(before, after);
	}
	if (unit === "month") {
		const currentMonth = today.getMonth();
		const monthsBefore = currentMonth;
		const monthsAfter = 11 - currentMonth;
		return Math.max(monthsBefore, monthsAfter);
	}
	if (unit === "quarter") {
		const currentQuarter = Math.floor(today.getMonth() / 3);
		const quartersBefore = currentQuarter;
		const quartersAfter = 3 - currentQuarter;
		return Math.max(quartersBefore, quartersAfter);
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
	const tw = weeksInYear(cy);
	const td = daysInYear(cy);
	const vals = getLevelValues(startDate, endDate);
	const sameYear = vals.yearStart === vals.yearEnd;

	return {
		yearMin: cy - 5,
		yearMax: cy + 5,
		quarterMin: 1,
		quarterMax: sameYear ? 4 : Math.max(vals.quarterStart, vals.quarterEnd),
		monthMin: 1,
		monthMax: sameYear ? 12 : Math.max(vals.monthStart, vals.monthEnd),
		weekMin: 1,
		weekMax: sameYear ? tw : Math.max(vals.weekStart, vals.weekEnd),
		dayMin: 1,
		dayMax: sameYear ? td : Math.max(vals.dayStart, vals.dayEnd),
		tw,
		td,
	};
}

export function filterTasks(
	tasks: any[],
	filter: GlobalFilter,
	intervalMode?: string,
): any[] {
	let result = tasks;

	// 1. 日期范围筛选
	if (
		!filter.dateRange.isAll &&
		filter.dateRange.start != null &&
		filter.dateRange.end != null
	) {
		const start = filter.dateRange.start;
		const end = filter.dateRange.end;
		const mode = intervalMode || "scheduled-due";

		result = result.filter((t: any) => {
			let tStart: number | null = null;
			let tEnd: number | null = null;

			if (mode === "starts-done") {
				tStart = t._starts ? new Date(t._starts).getTime() : null;
				if (t._done) {
					tEnd = new Date(t._done).getTime();
				} else if (t._due) {
					tEnd = new Date(t._due).getTime();
				}
			} else {
				tStart = t._scheduled ? new Date(t._scheduled).getTime() : null;
				if (t._due) {
					tEnd = new Date(t._due).getTime();
				} else if (t._done) {
					tEnd = new Date(t._done).getTime();
				}
			}

			if (!tStart || !tEnd) return false;
			return tStart <= end && tEnd >= start;
		});
	}

	// 2. 状态筛选
	if (filter.statuses && filter.statuses.length > 0) {
		result = result.filter((t: any) => filter.statuses.includes(t._status));
	}

	// 3. 标记筛选（"或"逻辑）
	const allMarksList = [...ALL_MARKS];
	if (
		filter.includeMarks &&
		filter.includeMarks.length > 0 &&
		filter.includeMarks.length < allMarksList.length
	) {
		result = result.filter((t: any) =>
			filter.includeMarks!.some((m: string) => t._marks?.[m]),
		);
	}

	// 4. 显示/隐藏切换
	if (filter.hideRepeat) result = result.filter((t: any) => !t._repeat);
	if (filter.hideCompleted)
		result = result.filter((t: any) => t._status !== "completed");
	if (filter.hideCancelled)
		result = result.filter((t: any) => t._status !== "cancelled");

	// 5. 文件夹路径过滤
	if (filter.rootPath)
		result = result.filter((t: any) =>
			t.path?.startsWith(filter.rootPath!),
		);

	// 6. 搜索文本过滤
	if (filter.searchText) {
		const keywords = filter.searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((k) => k.length > 0);
		if (keywords.length > 0) {
			result = result.filter((t: any) => {
				const desc = (t._cleanText || t.text || "").toLowerCase();
				return keywords.every((kw) => desc.includes(kw));
			});
		}
	}

	// 7. 优先级具体值过滤
	const allPriorityIcons = [...PRIORITY_ORDER];
	if (
		filter.priorityValues &&
		filter.priorityValues.length > 0 &&
		filter.priorityValues.length < allPriorityIcons.length
	) {
		result = result.filter(
			(t: any) =>
				t._priorityIcon &&
				filter.priorityValues!.includes(t._priorityIcon),
		);
	}

	// 8. 循环周期具体值过滤
	const allRepeatCycles = [...REPEAT_ORDER];
	if (
		filter.repeatCycles &&
		filter.repeatCycles.length > 0 &&
		filter.repeatCycles.length < allRepeatCycles.length
	) {
		result = result.filter((t: any) => {
			if (!t._repeat) return false;
			return filter.repeatCycles!.some((cycle: string) =>
				t._repeat.toLowerCase().includes(cycle),
			);
		});
	}

	return result;
}
