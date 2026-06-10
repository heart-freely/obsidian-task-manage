// src/util/date-utils.ts
// 日期工具集

export const DateUtils = {
	formatDate(d: Date): string {
		const pad = (n: number) => (n < 10 ? "0" + n : n);
		return (
			d.getFullYear() +
			"-" +
			pad(d.getMonth() + 1) +
			"-" +
			pad(d.getDate())
		);
	},

	setStart(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	},

	setEnd(d: Date): Date {
		return new Date(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			23,
			59,
			59,
			999,
		);
	},

	getDayRange(d: Date): { start: Date; end: Date } {
		return { start: DateUtils.setStart(d), end: DateUtils.setEnd(d) };
	},

	getISOWeekNumber(date: Date): number {
		const d = new Date(
			Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
		);
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil(
			((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
		);
	},

	getWeekRangeByYearWeek(
		year: number,
		week: number,
	): { start: Date; end: Date } {
		const jan4 = new Date(Date.UTC(year, 0, 4));
		const jan4Day = jan4.getUTCDay() || 7;
		const firstThursday = new Date(Date.UTC(year, 0, 4 - (jan4Day - 4)));
		const weekStart = new Date(firstThursday);
		weekStart.setUTCDate(firstThursday.getUTCDate() - 3 + (week - 1) * 7);
		const weekEnd = new Date(weekStart);
		weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
		return {
			start: DateUtils.setStart(new Date(weekStart)),
			end: DateUtils.setEnd(new Date(weekEnd)),
		};
	},

	getWeekRange(d: Date): { start: Date; end: Date } {
		return DateUtils.getWeekRangeByYearWeek(
			d.getFullYear(),
			DateUtils.getISOWeekNumber(d),
		);
	},

	getMonthRange(d: Date): { start: Date; end: Date } {
		return {
			start: DateUtils.setStart(
				new Date(d.getFullYear(), d.getMonth(), 1),
			),
			end: DateUtils.setEnd(
				new Date(d.getFullYear(), d.getMonth() + 1, 0),
			),
		};
	},

	getMonthRangeByYearMonth(y: number, m: number): { start: Date; end: Date } {
		return {
			start: DateUtils.setStart(new Date(y, m - 1, 1)),
			end: DateUtils.setEnd(new Date(y, m, 0)),
		};
	},

	getQuarterRangeByYearQuarter(
		y: number,
		q: number,
	): { start: Date; end: Date } {
		const sm = (q - 1) * 3 + 1;
		return {
			start: DateUtils.setStart(new Date(y, sm - 1, 1)),
			end: DateUtils.setEnd(new Date(y, sm + 2, 0)),
		};
	},

	getYearRangeByYear(y: number): { start: Date; end: Date } {
		return {
			start: DateUtils.setStart(new Date(y, 0, 1)),
			end: DateUtils.setEnd(new Date(y, 11, 31)),
		};
	},

	getWeekdayRange(date: Date, wd: number): { start: Date; end: Date } {
		const d = new Date(date);
		d.setDate(d.getDate() + (wd - (d.getDay() || 7)));
		return DateUtils.getDayRange(d);
	},
};
