import { DateUtils, throttleByFrame } from '../common';

// 为 throttleByFrame 测试提供 requestAnimationFrame 的 polyfill
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

describe('DateUtils', () => {
    test('formatDate formats correctly', () => {
        const d = new Date(2025, 0, 15);
        expect(DateUtils.formatDate(d)).toBe('2025-01-15');
    });

    test('setStart returns start of day', () => {
        const d = new Date(2025, 5, 22, 12, 30, 45, 123);
        const start = DateUtils.setStart(d);
        expect(start.getHours()).toBe(0);
        expect(start.getMinutes()).toBe(0);
        expect(start.getSeconds()).toBe(0);
        expect(start.getMilliseconds()).toBe(0);
    });

    test('setEnd returns end of day', () => {
        const d = new Date(2025, 5, 22);
        const end = DateUtils.setEnd(d);
        expect(end.getHours()).toBe(23);
        expect(end.getMinutes()).toBe(59);
        expect(end.getSeconds()).toBe(59);
        expect(end.getMilliseconds()).toBe(999);
    });

    test('getDayRange returns correct start and end', () => {
        const d = new Date(2025, 3, 10);
        const { start, end } = DateUtils.getDayRange(d);
        expect(start.getTime()).toBe(new Date(2025, 3, 10).getTime());
        expect(end.getTime()).toBe(new Date(2025, 3, 10, 23, 59, 59, 999).getTime());
    });

    test('getISOWeekNumber works for known date', () => {
        const d = new Date(2025, 0, 1);
        const week = DateUtils.getISOWeekNumber(d);
        expect(week).toBe(1);
    });

    test('getWeekRange for a date returns 7-day span', () => {
        const d = new Date(2025, 0, 15);
        const { start, end } = DateUtils.getWeekRange(d);
        const diffMs = end - start;
        // 6 days + 23:59:59.999 ~ 7 days
        expect(diffMs).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
        expect(diffMs).toBeLessThan(7 * 24 * 60 * 60 * 1000);
        expect(start.getDay()).toBe(1); // Monday
    });

    test('getMonthRange returns full month', () => {
        const d = new Date(2025, 1, 15);
        const { start, end } = DateUtils.getMonthRange(d);
        expect(start.getDate()).toBe(1);
        expect(start.getMonth()).toBe(1);
        expect(end.getMonth()).toBe(1);
        expect(end.getDate()).toBe(28);
    });

    test('getQuarterRangeByYearQuarter', () => {
        const { start, end } = DateUtils.getQuarterRangeByYearQuarter(2025, 2);
        expect(start.getMonth()).toBe(3);
        expect(start.getDate()).toBe(1);
        expect(end.getMonth()).toBe(5);
        expect(end.getDate()).toBe(30);
    });

    test('getYearRangeByYear', () => {
        const { start, end } = DateUtils.getYearRangeByYear(2025);
        expect(start.getTime()).toBe(new Date(2025, 0, 1).getTime());
        expect(end.getTime()).toBe(new Date(2025, 11, 31, 23, 59, 59, 999).getTime());
    });

    test('getWeekdayRange', () => {
        const base = new Date(2025, 5, 10); // Tuesday
        const { start, end } = DateUtils.getWeekdayRange(base, 3); // Wednesday
        expect(start.getDay()).toBe(3);
        expect(end.getDay()).toBe(3);
        expect(start.getTime()).toBe(new Date(2025, 5, 11).getTime());
    });
});

describe('throttleByFrame', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    test('calls function only once per animation frame', () => {
        const mockFn = jest.fn();
        const throttled = throttleByFrame(mockFn);
        throttled();
        throttled();
        throttled();
        // 推进定时器到下一个帧
        jest.runAllTimers();
        expect(mockFn).toHaveBeenCalledTimes(1);
    });
});