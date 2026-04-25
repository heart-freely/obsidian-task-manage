// src/tasks/filter-tasks.js
// 纯筛选函数，不依赖 Obsidian 或外部状态

import { ALLOWED_STATUSES } from '../configs/configs-plugin';

/**
 * 对任务数组进行过滤
 * @param {Array} tasks - 原始任务数组
 * @param {Object} options - 筛选选项
 * @param {Object} options.dateFilterState - { start: Date|null, end: Date|null, isAll: boolean }
 * @param {Object} options.markFilterState - { statuses: string[], includeMarks: string[], excludeMarks: string[] }
 * @param {boolean} options.hideRepeatTasks
 * @param {boolean} options.hideCompletedTasks
 * @param {boolean} options.hideCancelledTasks
 * @param {string|null} options.filterRootPath
 * @returns {Array} 过滤后的新数组
 */
export function filterTasks(tasks, options) {
    // 解构选项，提供默认值防止 undefined
    const {
        dateFilterState = { start: null, end: null, isAll: false },
        markFilterState = { statuses: [...ALLOWED_STATUSES], includeMarks: [], excludeMarks: [] },
        hideRepeatTasks = true,
        hideCompletedTasks = true,
        hideCancelledTasks = true,
        filterRootPath = null
    } = options;

    let result = tasks;

    // 日期范围过滤
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

    // 路径聚焦
    if (filterRootPath) {
        result = result.filter(t => t.path.startsWith(filterRootPath));
    }

    // 状态过滤（仅当未全选时）
    const selectedStatuses = markFilterState.statuses;
    if (selectedStatuses.length < ALLOWED_STATUSES.length) {
        result = result.filter(t => selectedStatuses.includes(t._status));
    }

    // 隐藏循环任务
    if (hideRepeatTasks) {
        result = result.filter(t => !t._repeat);
    }

    // 隐藏已完成
    if (hideCompletedTasks) {
        result = result.filter(t => t._status !== 'completed');
    }

    // 隐藏已取消
    if (hideCancelledTasks) {
        result = result.filter(t => t._status !== 'cancelled');
    }

    // 包含标记（全部满足）
    const includeMarks = markFilterState.includeMarks;
    if (includeMarks.length) {
        result = result.filter(t => includeMarks.every(m => t._marks && t._marks[m]));
    }

    // 排除标记（任一满足即排除）
    const excludeMarks = markFilterState.excludeMarks;
    if (excludeMarks.length) {
        result = result.filter(t => !excludeMarks.some(m => t._marks && t._marks[m]));
    }

    return result;
}