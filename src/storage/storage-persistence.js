// src/storage/storage-persistence.js
// 筛选状态持久化 —— 读写 localStorage，不依赖 Obsidian

const STORAGE_KEY = 'taskDataViewState';

/**
 * 保存筛选状态到 localStorage
 * @param {Object} state - 主状态对象（包含筛选相关字段）
 * @param {Object} collapsedNodes - 折叠节点对象
 */
export function saveFilterState(state, collapsedNodes) {
    const data = {
        dateFilterState: {
            isAll: state.dateFilterState.isAll,
            start: state.dateFilterState.start ? state.dateFilterState.start.getTime() : null,
            end: state.dateFilterState.end ? state.dateFilterState.end.getTime() : null
        },
        markFilterState: state.markFilterState,
        hideRepeatTasks: state.hideRepeatTasks,
        hideCompletedTasks: state.hideCompletedTasks,
        hideCancelledTasks: state.hideCancelledTasks,
        intervalMode: state.intervalMode,
        leftSort: state.leftSort,
        leftPanelWidth: state.leftPanelWidth,
        collapsedNodes: Object.keys(collapsedNodes),
        hideFolders: state.hideFolders,
        filterRootPath: state.filterRootPath || null,
        chartScale: state.chartScale
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 从 localStorage 恢复筛选状态
 * @param {Object} state - 主状态对象（将被修改）
 * @param {Object} collapsedNodes - 折叠节点对象（将被重置并填充）
 * @param {Function} getDefaultDateRange - 返回默认日期范围 { start, end }，用于初始未保存状态时
 * @returns {boolean} 是否成功恢复
 */
export function loadFilterState(state, collapsedNodes, getDefaultDateRange) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    try {
        const data = JSON.parse(saved);
        if (data.dateFilterState) {
            state.dateFilterState.isAll = data.dateFilterState.isAll;
            state.dateFilterState.start = data.dateFilterState.start ? new Date(data.dateFilterState.start) : null;
            state.dateFilterState.end = data.dateFilterState.end ? new Date(data.dateFilterState.end) : null;
        } else {
            // 如果没有保存日期状态，使用传入的默认值
            const defaultRange = getDefaultDateRange();
            if (defaultRange) {
                state.dateFilterState.isAll = false;
                state.dateFilterState.start = defaultRange.start;
                state.dateFilterState.end = defaultRange.end;
            }
        }
        if (data.markFilterState) {
            state.markFilterState.statuses = data.markFilterState.statuses || [];
            state.markFilterState.includeMarks = data.markFilterState.includeMarks || [];
            state.markFilterState.excludeMarks = data.markFilterState.excludeMarks || [];
        }
        state.hideRepeatTasks = data.hideRepeatTasks ?? true;
        state.hideCompletedTasks = data.hideCompletedTasks ?? true;
        state.hideCancelledTasks = data.hideCancelledTasks ?? true;
        state.intervalMode = data.intervalMode || 'scheduled-due'; // 默认值
        state.leftSort = data.leftSort || { type: 'status', order: 'asc' };
        state.leftPanelWidth = data.leftPanelWidth || 300;
        
        // 恢复折叠节点
        const nodes = data.collapsedNodes || [];
        // 清空并重建
        for (const key in collapsedNodes) {
            delete collapsedNodes[key];
        }
        nodes.forEach(n => collapsedNodes[n] = true);
        
        state.hideFolders = data.hideFolders ?? true;
        state.filterRootPath = data.filterRootPath || null;
        state.chartScale = data.chartScale || 1;
        return true;
    } catch (e) {
        return false;
    }
}