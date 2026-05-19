// src/storage/persist-storage.js
import { CONFIG } from '../configs/plugin-configs';

export function createInitialState() {
    return {
        cachedAllTasks: null,
        filterCache: { fingerprint: '', tasks: null },
        dateTaskMapCache: null,
        dateFilterState: {
            start: null,
            end: null,
            isAll: false
        },
        markFilterState: {
            statuses: [...CONFIG.ALLOWED_STATUSES],
            includeMarks: [],
            excludeMarks: []
        },
        hideRepeatTasks: true,
        hideCompletedTasks: true,
        hideCancelledTasks: true,
        hideFolders: true,
        showFilters: false,
        showTree: false,
        leftSort: { type: 'status', order: 'asc' },
        quickBtns: [],
        activeQuickBtn: null,
        dateState: {
            selections: { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} }
        },
        yearBtns: [],
        quarterBtns: [],
        monthBtns: [],
        weekBtns: [],
        weekdayBtns: [],
        collapsedNodes: {},
        filterRootPath: null,
        chartInstances: [],       // 图表实例列表，必须初始化为空数组
        chartScale: 1,
        leftPanelWidth: 300,
        intervalMode: 'scheduled-due',
        dataViewStatuses: null,
        taskIdMap: {}
    };
}

export function getFilterFingerprint(state) {
    const s = state.dateFilterState;
    return [
        s.start ? s.start.getTime() : null,
        s.end ? s.end.getTime() : null,
        s.isAll,
        state.markFilterState.statuses.join(','),
        state.markFilterState.includeMarks.join(','),
        state.markFilterState.excludeMarks.join(','),
        state.hideRepeatTasks,
        state.hideCompletedTasks,
        state.hideCancelledTasks,
        state.filterRootPath || ''
    ].join('|');
}

export function getEffectiveDateRange(state) {
    if (state.dateFilterState.isAll || !state.dateFilterState.start || !state.dateFilterState.end) return null;
    return { start: state.dateFilterState.start, end: state.dateFilterState.end };
}

export class PersistenceManager {
    constructor(storage, scope) {
        this.storage = storage;
        this.scope = scope;
    }

    async save(state, collapsedNodes) {
        try {
            const data = {
                showFilters: state.showFilters,
                showTree: state.showTree,
                hideRepeatTasks: state.hideRepeatTasks,
                hideCompletedTasks: state.hideCompletedTasks,
                hideCancelledTasks: state.hideCancelledTasks,
                hideFolders: state.hideFolders,
                leftSort: state.leftSort,
                markFilterState: state.markFilterState,
                collapsedNodes: collapsedNodes || state.collapsedNodes,
                chartScale: state.chartScale,
                leftPanelWidth: state.leftPanelWidth,
                intervalMode: state.intervalMode,
                dataViewStatuses: state.dataViewStatuses,
            };
            await this.storage.setItem(this.scope, JSON.stringify(data));
        } catch (e) {
            console.error('持久化失败', e);
        }
    }

    async load(state, collapsedNodes, defaultDateRangeFn, noticeFn) {
        try {
            const raw = await this.storage.getItem(this.scope);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved) {
                state.showFilters = saved.showFilters ?? false;
                state.showTree = saved.showTree ?? false;
                state.hideRepeatTasks = saved.hideRepeatTasks ?? true;
                state.hideCompletedTasks = saved.hideCompletedTasks ?? true;
                state.hideCancelledTasks = saved.hideCancelledTasks ?? true;
                state.hideFolders = saved.hideFolders ?? true;
                state.leftSort = saved.leftSort || { type: 'status', order: 'asc' };
                state.markFilterState = saved.markFilterState || { statuses: [...CONFIG.ALLOWED_STATUSES], includeMarks: [], excludeMarks: [] };
                Object.assign(collapsedNodes, saved.collapsedNodes || {});
                state.chartScale = saved.chartScale || 1;
                state.leftPanelWidth = saved.leftPanelWidth || 300;
                state.intervalMode = saved.intervalMode || 'scheduled-due';
                state.dataViewStatuses = saved.dataViewStatuses || [...CONFIG.ALLOWED_STATUSES];
                // 确保 chartInstances 仍存在
                if (!Array.isArray(state.chartInstances)) state.chartInstances = [];
            }
        } catch (e) {
            if (noticeFn) noticeFn('⚠️ 加载上次视图状态失败，已重置默认设置');
            console.error('加载持久化数据失败', e);
        }
    }
}