// src/__tests__/common-process.test.js
import { DateUtils, throttleByFrame } from '../tasks/process/common-process';

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

    test('getWeekRange for a date returns 7-day span', () => {
        const d = new Date(2025, 0, 15);
        const { start, end } = DateUtils.getWeekRange(d);
        const diffMs = end - start;
        expect(diffMs).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
        expect(diffMs).toBeLessThan(7 * 24 * 60 * 60 * 1000);
        expect(start.getDay()).toBe(1);
    });
});

describe('throttleByFrame', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('calls function only once per animation frame', () => {
        const mockFn = jest.fn();
        const throttled = throttleByFrame(mockFn);
        throttled(); throttled(); throttled();
        jest.runAllTimers();
        expect(mockFn).toHaveBeenCalledTimes(1);
    });
});