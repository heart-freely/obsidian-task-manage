import { saveFilterState, loadFilterState } from '../configs/configs-persist';

const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('persistence', () => {
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    const state = {
        dateFilterState: { isAll: false, start: new Date(2025, 0, 1), end: new Date(2025, 0, 7) },
        markFilterState: { statuses: ['todo'], includeMarks: ['priority'], excludeMarks: [] },
        hideRepeatTasks: false,
        hideCompletedTasks: true,
        hideCancelledTasks: false,
        intervalMode: 'scheduled-due',
        leftSort: { type: 'status', order: 'asc' },
        leftPanelWidth: 300,
        hideFolders: true,
        filterRootPath: 'some/path',
        chartScale: 1.2,
    };

    const collapsedNodes = { 'path1': true, 'path2': true };

    test('saveFilterState stores data in localStorage', () => {
        saveFilterState(state, collapsedNodes);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
        expect(saved.dateFilterState.isAll).toBe(false);
        expect(saved.collapsedNodes).toContain('path1');
    });

    test('loadFilterState restores state correctly', () => {
        saveFilterState(state, collapsedNodes);

        // 创建完整结构的初始状态
        const newState = {
            dateFilterState: { isAll: false, start: null, end: null },
            markFilterState: { statuses: [], includeMarks: [], excludeMarks: [] },
            hideRepeatTasks: true,
            hideCompletedTasks: false,
            hideCancelledTasks: true,
            intervalMode: 'starts-done',
            leftSort: {},
            leftPanelWidth: 200,
            hideFolders: false,
            filterRootPath: null,
            chartScale: 1,
        };
        const newCollapsed = {};
        const func = jest.fn();
        const showWarning = jest.fn();
        const success = loadFilterState(newState, newCollapsed, () => ({ start: new Date(2025,0,1), end: new Date(2025,0,7) }), showWarning);
        expect(success).toBe(true);
        expect(newState.hideRepeatTasks).toBe(false);
        expect(newState.hideCompletedTasks).toBe(true);
        expect(newState.chartScale).toBe(1.2);
        expect(newCollapsed).toHaveProperty('path1');
    });

    test('loadFilterState returns false if no data', () => {
        const newState = { markFilterState: { statuses: [], includeMarks: [], excludeMarks: [] }, dateFilterState: {} };
        const newCollapsed = {};
        const success = loadFilterState(newState, newCollapsed, () => ({}));
        expect(success).toBe(false);
    });

    test('loadFilterState uses default date range if data missing', () => {
        // 保存一个没有日期范围的状态（isAll 为 false，但 start/end 为 null）
        saveFilterState({
            ...state,
            dateFilterState: { isAll: false, start: null, end: null }
        }, collapsedNodes);

        const newState = {
            dateFilterState: { isAll: false, start: null, end: null },
            markFilterState: { statuses: [], includeMarks: [], excludeMarks: [] },
            hideRepeatTasks: true,
            hideCompletedTasks: true,
            hideCancelledTasks: true,
            intervalMode: 'scheduled-due',
            leftSort: { type: 'status', order: 'asc' },
            leftPanelWidth: 300,
            hideFolders: true,
            filterRootPath: null,
            chartScale: 1,
        };
        const newCollapsed = {};
        const getDefault = jest.fn(() => ({ start: new Date(2025,5,1), end: new Date(2025,5,7) }));
        loadFilterState(newState, newCollapsed, getDefault);
        expect(newState.dateFilterState.start).toEqual(new Date(2025,5,1));
    });
});