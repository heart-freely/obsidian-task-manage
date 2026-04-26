// src/configs/configs-persist.js
// 状态持久化：读写 localStorage，并包含降级处理

const STORAGE_KEY = 'taskDataViewState';

export function saveFilterState(state, collapsedNodes) {
    try {
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
    } catch (e) {
        console.error('保存筛选状态失败', e);
    }
}

export function loadFilterState(state, collapsedNodes, getDefaultDateRange, showWarning) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return false;

        const data = JSON.parse(saved);
        if (data.dateFilterState) {
            state.dateFilterState.isAll = data.dateFilterState.isAll;
            state.dateFilterState.start = data.dateFilterState.start ? new Date(data.dateFilterState.start) : null;
            state.dateFilterState.end = data.dateFilterState.end ? new Date(data.dateFilterState.end) : null;
            // 如果恢复后没有日期范围，且不是“所有任务”模式，则应用默认范围
            if (!state.dateFilterState.isAll && (!state.dateFilterState.start || !state.dateFilterState.end)) {
                const defaultRange = getDefaultDateRange();
                if (defaultRange) {
                    state.dateFilterState.start = defaultRange.start;
                    state.dateFilterState.end = defaultRange.end;
                }
            }
        } else {
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
        state.intervalMode = data.intervalMode || 'scheduled-due';
        state.leftSort = data.leftSort || { type: 'status', order: 'asc' };
        state.leftPanelWidth = data.leftPanelWidth || 300;

        for (const key in collapsedNodes) {
            delete collapsedNodes[key];
        }
        const nodes = data.collapsedNodes || [];
        nodes.forEach(n => collapsedNodes[n] = true);

        state.hideFolders = data.hideFolders ?? true;
        state.filterRootPath = data.filterRootPath || null;
        state.chartScale = data.chartScale || 1;
        return true;
    } catch (e) {
        console.error('恢复筛选状态失败，已使用默认设置', e);
        if (showWarning) {
            try {
                showWarning('筛选状态数据已损坏，已重置为默认设置');
            } catch (ignore) {}
        }
        return false;
    }
}