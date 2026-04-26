// src/panel/state/state-manage.js
import { CONFIG } from '../../configs/configs-plugin';

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
        treeRenderer: null
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