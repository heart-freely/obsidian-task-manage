// src/__tests__/filter-task-process.test.js
import { filterTasks } from '../tasks/process/filter-task-process';

function makeTask(overrides = {}) {
    return {
        _status: 'todo',
        _cachedTimeRange: null,
        path: 'pages/A 系统/task.md',
        _repeat: null,
        _marks: {
            priority: false, repeat: false, created: false,
            scheduled: false, starts: false, due: false,
            done: false, cancel: false, tag: false, id: false, forbid: false
        },
        ...overrides
    };
}

describe('filterTasks', () => {
    test('returns all tasks if no filters', () => {
        const tasks = [makeTask(), makeTask()];
        const result = filterTasks(tasks, {});
        expect(result).toHaveLength(2);
    });

    test('filters by date range', () => {
        const tasks = [
            makeTask({ _cachedTimeRange: { start: new Date(2025, 0, 1).getTime(), end: new Date(2025, 0, 5).getTime() } }),
            makeTask({ _cachedTimeRange: { start: new Date(2025, 1, 1).getTime(), end: new Date(2025, 1, 5).getTime() } }),
        ];
        const result = filterTasks(tasks, {
            dateFilterState: { start: new Date(2025, 0, 3), end: new Date(2025, 0, 10), isAll: false }
        });
        expect(result).toHaveLength(1);
    });

    test('filters by root path', () => {
        const tasks = [makeTask({ path: 'pages/A 系统/task.md' }), makeTask({ path: 'pages/B 系统/task.md' })];
        const result = filterTasks(tasks, { filterRootPath: 'pages/A 系统' });
        expect(result).toHaveLength(1);
    });

    test('filters by status', () => {
        const tasks = [makeTask({ _status: 'todo' }), makeTask({ _status: 'completed' })];
        const result = filterTasks(tasks, { markFilterState: { statuses: ['todo'] } });
        expect(result).toHaveLength(1);
    });

    test('hides repeat tasks', () => {
        const tasks = [makeTask({ _repeat: 'every day' }), makeTask({ _repeat: null })];
        const result = filterTasks(tasks, { hideRepeatTasks: true });
        expect(result).toHaveLength(1);
    });

    test('hides completed tasks', () => {
        const tasks = [makeTask({ _status: 'completed' }), makeTask({ _status: 'in-progress' })];
        const result = filterTasks(tasks, { hideCompletedTasks: true });
        expect(result).toHaveLength(1);
    });

    test('hides cancelled tasks', () => {
        const tasks = [makeTask({ _status: 'cancelled' }), makeTask({ _status: 'todo' })];
        const result = filterTasks(tasks, { hideCancelledTasks: true });
        expect(result).toHaveLength(1);
    });

    test('include marks filter works', () => {
        const tasks = [
            makeTask({ _marks: { priority: true, tag: true } }),
            makeTask({ _marks: { priority: false, tag: true } }),
        ];
        const result = filterTasks(tasks, {
            markFilterState: { includeMarks: ['priority', 'tag'], statuses: ['todo', 'planned', 'in-progress', 'completed', 'cancelled'] }
        });
        expect(result).toHaveLength(1);
    });

    test('exclude marks filter works', () => {
        const tasks = [
            makeTask({ _marks: { tag: true } }),
            makeTask({ _marks: { tag: false } }),
        ];
        const result = filterTasks(tasks, {
            markFilterState: { excludeMarks: ['tag'], statuses: ['todo', 'planned', 'in-progress', 'completed', 'cancelled'] }
        });
        expect(result).toHaveLength(1);
    });
});