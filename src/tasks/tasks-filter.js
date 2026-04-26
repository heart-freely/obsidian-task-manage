// src/tasks/tasks-filter.js
import { CONFIG } from '../configs/configs-plugin';

export function filterTasks(tasks, options) {
    const {
        dateFilterState = { start: null, end: null, isAll: false },
        markFilterState = {},
        hideRepeatTasks = true,
        hideCompletedTasks = true,
        hideCancelledTasks = true,
        filterRootPath = null
    } = options;

    // 防御：确保 markFilterState 的属性存在
    const statuses = markFilterState.statuses || CONFIG.ALLOWED_STATUSES;
    const includeMarks = markFilterState.includeMarks || [];
    const excludeMarks = markFilterState.excludeMarks || [];

    let result = tasks;

    if (!dateFilterState.isAll && dateFilterState.start && dateFilterState.end) {
        const qr = {
            start: dateFilterState.start.getTime(),
            end: dateFilterState.end.getTime()
        };
        result = result.filter(t => {
            const tr = t._cachedTimeRange;
            return tr && tr.start <= qr.end && tr.end >= qr.start;
        });
    }

    if (filterRootPath) {
        result = result.filter(t => t.path.startsWith(filterRootPath));
    }

    if (statuses.length < CONFIG.ALLOWED_STATUSES.length) {
        result = result.filter(t => statuses.includes(t._status));
    }

    if (hideRepeatTasks) {
        result = result.filter(t => !t._repeat);
    }

    if (hideCompletedTasks) {
        result = result.filter(t => t._status !== 'completed');
    }

    if (hideCancelledTasks) {
        result = result.filter(t => t._status !== 'cancelled');
    }

    if (includeMarks.length) {
        result = result.filter(t => includeMarks.every(m => t._marks && t._marks[m]));
    }

    if (excludeMarks.length) {
        result = result.filter(t => !excludeMarks.some(m => t._marks && t._marks[m]));
    }

    return result;
}