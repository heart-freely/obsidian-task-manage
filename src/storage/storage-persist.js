// src/storage/storage-persist.js
import { CONFIG } from '../configs/configs-plugin';

export function createInitialState(options = {}) {
    return {
        cachedAllTasks: null,
        filterCache: { fingerprint: '', tasks: null },
        quickBtns: [],
        yearBtns: [], quarterBtns: [], monthBtns: [], weekBtns: [], weekdayBtns: [],
        dateState: { selections: { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} } },
        dateFilterState: { start: null, end: null, isAll: false },
        markFilterState: {
            statuses: [...CONFIG.ALLOWED_STATUSES],
            includeMarks: [],
            excludeMarks: []
        },
        hideRepeatTasks: true,
        hideCompletedTasks: true,
        hideCancelledTasks: true,
        intervalMode: options.intervalMode || CONFIG.INTERVAL_MODES.SCHEDULED_DUE,
        leftSort: { type: 'status', order: 'asc' },
        collapsedNodes: {},
        leftPanelWidth: options.leftPanelWidth || 300,
        chartContainer: null,
        chartInstances: [],
        chartScale: options.chartScale || 1,
        flatDisplayNodes: [],
        tooltipDiv: null,
        resizeObserver: null,
        taskIdMap: {},
        hideFolders: options.hideFolders ?? true,
        filterRootPath: null,
        modalOpen: false,
        treeRenderer: null,
        activeQuickBtn: null,
        showTree: options.showTree ?? false,
        showFilters: options.showFilters ?? false,
        dataViewStatuses: [...CONFIG.ALLOWED_STATUSES]   // 数据视图的执行状态备份
    };
}

export function getFilterFingerprint(state) {
    return [
        state.dateFilterState.start ? state.dateFilterState.start.getTime() : null,
        state.dateFilterState.end ? state.dateFilterState.end.getTime() : null,
        state.dateFilterState.isAll,
        state.markFilterState.statuses.join(','),
        state.markFilterState.includeMarks.join(','),
        state.markFilterState.excludeMarks.join(','),
        state.hideRepeatTasks,
        state.hideCompletedTasks,
        state.hideCancelledTasks,
        state.filterRootPath
    ].join('|');
}

export function getEffectiveDateRange(state) {
    if (state.dateFilterState.isAll) return null;
    if (state.dateFilterState.start && state.dateFilterState.end) {
        return { start: state.dateFilterState.start, end: state.dateFilterState.end };
    }
    return null;
}

export class PersistenceManager {
    constructor(storage, instanceId = 'default') {
        this.storage = storage;
        this.key = `taskDataView_${instanceId}`;
    }

    async save(state, collapsedNodes) {
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
                chartScale: state.chartScale,
                activeQuickBtn: state.activeQuickBtn || null,
                showTree: state.showTree,
                showFilters: state.showFilters,
                dataViewStatuses: state.dataViewStatuses       // 新增
            };
            await this.storage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            console.error('保存筛选状态失败', e);
        }
    }

    async load(state, collapsedNodes, getDefaultDateRange, showWarning) {
        try {
            const raw = await this.storage.getItem(this.key);
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (data.dateFilterState) {
                state.dateFilterState.isAll = data.dateFilterState.isAll;
                state.dateFilterState.start = data.dateFilterState.start ? new Date(data.dateFilterState.start) : null;
                state.dateFilterState.end = data.dateFilterState.end ? new Date(data.dateFilterState.end) : null;
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

            for (const key in collapsedNodes) { delete collapsedNodes[key]; }
            const nodes = data.collapsedNodes || [];
            nodes.forEach(n => collapsedNodes[n] = true);

            state.hideFolders = data.hideFolders ?? true;
            state.filterRootPath = data.filterRootPath || null;
            state.chartScale = data.chartScale || 1;
            state.activeQuickBtn = data.activeQuickBtn || null;
            state.showTree = data.showTree ?? false;
            state.showFilters = data.showFilters ?? false;
            state.dataViewStatuses = data.dataViewStatuses || [...CONFIG.ALLOWED_STATUSES];   // 恢复备份

            return true;
        } catch (e) {
            console.error('恢复筛选状态失败，已使用默认设置', e);
            if (showWarning) try { showWarning('筛选状态数据已损坏，已重置为默认设置'); } catch (ignore) {}
            return false;
        }
    }
}