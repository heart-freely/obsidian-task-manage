import { PersistenceManager } from '../storage/storage-persist';

// 模拟异步存储
class MockStorage {
    constructor() { this.store = {}; }
    async getItem(key) { return this.store[key] || null; }
    async setItem(key, value) { this.store[key] = value; }
}

describe('PersistenceManager', () => {
    let storage, persistence, state, collapsedNodes;

    beforeEach(() => {
        storage = new MockStorage();
        persistence = new PersistenceManager(storage, 'test');
        state = {
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
        collapsedNodes = { 'path1': true, 'path2': true };
    });

    test('save and load works correctly', async () => {
        await persistence.save(state, collapsedNodes);

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
        const success = await persistence.load(newState, newCollapsed, () => ({}), jest.fn());
        expect(success).toBe(true);
        expect(newState.hideRepeatTasks).toBe(false);
        expect(newState.hideCompletedTasks).toBe(true);
        expect(newState.chartScale).toBe(1.2);
        expect(newCollapsed).toHaveProperty('path1');
    });

    test('load returns false if no data', async () => {
        const newState = { markFilterState: {}, dateFilterState: {} };
        const newCollapsed = {};
        const success = await persistence.load(newState, newCollapsed, () => ({}));
        expect(success).toBe(false);
    });

    test('default date range is used if missing', async () => {
        await persistence.save({ ...state, dateFilterState: { isAll: false, start: null, end: null } }, collapsedNodes);
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
        await persistence.load(newState, newCollapsed, getDefault);
        expect(newState.dateFilterState.start).toEqual(new Date(2025,5,1));
    });
});