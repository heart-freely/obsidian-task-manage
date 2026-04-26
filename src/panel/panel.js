// src/panel/panel.js
import { ItemView, Notice } from 'obsidian';
import * as readTasks from '../tasks/read/read-tasks';
import { DateUtils } from '../tasks/process/common-process';
import { filterTasks } from '../tasks/process/filter-task-process';
import { drawCharts } from './views/data-tasks-view';
import { buildDateCascadePanel, getQueryRangeFromDateSelection, resetCascadeDateUI } from './bars/date-botton-bar';
import { buildQuickDatePanel, resetQuickDateUI } from './bars/quick-botton-bar';
import { buildMarkFilterPanel } from './bars/mark-botton-bar';
import { buildControlPanel } from './bars/control-botton-bar';
import { buildSortRow } from './bars/sort-botton-bar';
import { initChartInteractions } from './interacts/chart-interact';
import { TooltipManager } from './interacts/tooltip-interact';
import { createInitialState, getFilterFingerprint, getEffectiveDateRange, PersistenceManager } from '../storage/persist-storage';
import { CONFIG } from '../configs/plugin-configs';
import { startMatrixView } from './views/matrix-task-view';
import { buildViewSwitcher } from './bars/side-botton-bar';
import { buildHideButtons } from './bars/hide-botton-bar';
import { TaskTreeRenderer } from './components/tree-view-components';
import { BaseTaskView } from './views/base-task-view';

export const VIEW_TYPE_NAVIGATOR = 'navigator-view';

// -----------------------------
// 导航视图
// -----------------------------
export class NavigatorView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_NAVIGATOR; }
    getDisplayText() { return '任务导航中心'; }
    getIcon() { return 'compass'; }

    async onOpen() {
        const saved = this.getState();
        this._lastViewType = (saved && saved.subViewType) ? saved.subViewType : 'task-dataview-view';
        super.onOpen();
    }

    async _startCore(dv, app, storageAdapter, instanceId) {
        return await startNavigatorCore(dv, app, storageAdapter, instanceId, this._lastViewType, this);
    }

    getState() { return { subViewType: this._lastViewType || 'task-dataview-view' }; }
    setState(state) { if (state && state.subViewType) this._lastViewType = state.subViewType; }
}

// -----------------------------
// 导航核心逻辑
// -----------------------------
export async function startNavigatorCore(dv, app, storageAdapter, instanceId, initialSubView, navigatorView) {
    document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());

    // 共享排序对象，矩阵视图直接引用，确保排序同步
    const sharedSortState = { type: 'status', order: 'asc' };
    const tooltipManager = new TooltipManager(); tooltipManager.ensureDiv();
    const state = createInitialState();
    state.leftSort = sharedSortState;          // 头部排序栏也使用此对象
    const collapsedNodes = {};
    state.collapsedNodes = collapsedNodes;
    const persistence = new PersistenceManager(storageAdapter, 'nav');

    let currentSubViewType = null;
    let currentSubView = null;          // 当前子视图控制对象 (cleanup, updateSort)
    let dataViewStatuses = [...CONFIG.ALLOWED_STATUSES];

    // 布局
    const outerWithSidebar = dv.el('div', '', { cls: 'navigator-outer-with-sidebar' });
    const sidebar = dv.el('div', '', { cls: 'navigator-sidebar' });
    const mainArea = dv.el('div', '', { cls: 'navigator-main' });
    mainArea.style.cssText = 'flex:1; display:flex; flex-direction:column;';

    const scrollArea = dv.el('div', '', { cls: 'navigator-scroll-area' });
    const stickyHeader = dv.el('div', '', { cls: 'header-sticky' });
    scrollArea.appendChild(stickyHeader);
    const filterWrapper = dv.el('div', '', { cls: 'filter-area' });
    scrollArea.appendChild(filterWrapper);
    const contentLayout = dv.el('div', '', { cls: 'navigator-content-layout' });
    const treePanel = dv.el('div', '', { cls: 'navigator-tree-panel' });
    const viewPanel = dv.el('div', '', { cls: 'navigator-view-panel' });
    contentLayout.appendChild(treePanel); contentLayout.appendChild(viewPanel);
    scrollArea.appendChild(contentLayout);

    mainArea.appendChild(scrollArea);
    outerWithSidebar.appendChild(sidebar);
    outerWithSidebar.appendChild(mainArea);
    dv.container.appendChild(outerWithSidebar);

    // 任务树
    const treeRenderer = new TaskTreeRenderer({
        container: treePanel, dv, app, state, collapsedNodes, tooltip: tooltipManager,
        onFilterRootPathChange: (path) => {
            state.filterRootPath = path;
            state.filterCache.fingerprint = '';
            persistence.save(state, collapsedNodes);
            refreshCurrentView();
        },
        onCollapseChange: () => persistence.save(state, collapsedNodes)
    });
    treeRenderer.setFilteredTasksProvider(() => state.filterCache.tasks || []);

    // 构建头部（固定栏 + 筛选区）
    function buildHeader() {
        stickyHeader.innerHTML = '';
        const quickRow = dv.el('div', '', { cls: 'quick-row' });
        quickRow.appendChild(dv.el('span', '快捷', { cls: 'filter-label', style: 'margin-right:8px;' }));
        buildQuickDatePanel(quickRow, dv, state, {
            onQuery: () => {
                const isAllActive = state.quickBtns.some(b => b.classList.contains('quick-btn-active') && b.textContent === '所有任务');
                if (isAllActive) {
                    state.dateFilterState.isAll = true;
                    state.dateFilterState.start = state.dateFilterState.end = null;
                } else {
                    const dr = getQueryRangeFromDateSelection(state);
                    if (dr) {
                        state.dateFilterState.isAll = false;
                        state.dateFilterState.start = dr.start;
                        state.dateFilterState.end = dr.end;
                    }
                }
                state.filterCache.fingerprint = '';
                refreshCurrentView();
            }
        });
        stickyHeader.appendChild(quickRow);
        stickyHeader.appendChild(dv.el('div', '', { cls: 'section-divider' }));

        const ctrlRow = buildControlPanel(stickyHeader, dv, state, {
            onRenderAll: () => refreshCurrentView(),
            onToggleFolders: () => treeRenderer.renderFromCurrentFilter(),
            onResetAndClear: () => {
                resetQuickDateUI(state); resetCascadeDateUI(state);
                state.markFilterState.statuses = [...CONFIG.ALLOWED_STATUSES];
                state.markFilterState.includeMarks = []; state.markFilterState.excludeMarks = [];
                state.hideRepeatTasks = true; state.hideCompletedTasks = true; state.hideCancelledTasks = true; state.hideFolders = true;
                const thisWeek = DateUtils.getWeekRange(new Date());
                state.dateFilterState.isAll = false;
                state.dateFilterState.start = thisWeek.start;
                state.dateFilterState.end = thisWeek.end;
                state.leftSort.type = 'status'; state.leftSort.order = 'asc';
                state.activeQuickBtn = null;
                state.cachedAllTasks = null;
                state.filterCache = { fingerprint: '', tasks: null };
                readTasks.getAllTasks(true, dv, state);
                buildHeader(); refreshCurrentView();
            }
        });
        buildHideButtons(ctrlRow, dv, state, {
            onToggleFilters: () => buildHeader(),
            onToggleTree: () => { treePanel.style.display = state.showTree ? '' : 'none'; refreshCurrentView(); }
        });
        stickyHeader.appendChild(dv.el('div', '', { cls: 'section-divider' }));
        const sortContainer = dv.el('div', '', { cls: 'sort-row-wrapper' });
        buildSortRow(sortContainer, dv, state, { onRenderAll: () => refreshCurrentView() });
        stickyHeader.appendChild(sortContainer);

        filterWrapper.innerHTML = '';
        if (state.showFilters) {
            buildDateCascadePanel(filterWrapper, dv, state);
            filterWrapper.appendChild(dv.el('div', '', { cls: 'section-divider' }));
            buildMarkFilterPanel(filterWrapper, dv, state, currentSubViewType);
            filterWrapper.style.display = '';
        } else {
            filterWrapper.style.display = 'none';
        }
    }

    // 刷新任务树和视图内容
    async function refreshCurrentView() {
        const filtered = applyNavFilters();
        treeRenderer.render(filtered);
        await renderContent(filtered);
        await persistence.save(state, collapsedNodes);
    }

    function applyNavFilters() {
        const fp = getFilterFingerprint(state);
        if (state.filterCache.fingerprint === fp && state.filterCache.tasks) return state.filterCache.tasks.slice();
        let tasks = readTasks.getAllTasks(false, dv, state).slice();
        tasks = filterTasks(tasks, {
            dateFilterState: state.dateFilterState,
            markFilterState: state.markFilterState,
            hideRepeatTasks: state.hideRepeatTasks,
            hideCompletedTasks: state.hideCompletedTasks,
            hideCancelledTasks: state.hideCancelledTasks,
            filterRootPath: state.filterRootPath
        });
        state.filterCache.fingerprint = fp;
        state.filterCache.tasks = tasks.slice();
        return tasks;
    }

    async function renderContent(filteredTasks) {
        viewPanel.innerHTML = '';
        if (!currentSubViewType) return;
        if (currentSubViewType === 'task-dataview-view') {
            drawCharts(viewPanel, filteredTasks, {
                dv, state,
                formatDate: DateUtils.formatDate,
                setStart: DateUtils.setStart,
                setEnd: DateUtils.setEnd,
                getEffectiveDateRange: () => getEffectiveDateRange(state)
            });
        } else if (currentSubViewType === 'matrix-tasks-view') {
            // 矩阵视图：直接调用 updateSort 即可，因为它内部使用 sharedSortState
            if (currentSubView && currentSubView.updateSort) {
                await currentSubView.updateSort();
            }
        }
    }

    async function activateSubView(viewType, force = false) {
        if (!force && currentSubViewType === viewType) return;
        if (currentSubViewType === 'task-dataview-view') dataViewStatuses = [...state.markFilterState.statuses];
        if (currentSubView && currentSubView.cleanup) {
            try { await currentSubView.cleanup(); } catch (e) { console.error(e); }
            currentSubView = null;
        }
        currentSubViewType = viewType;

        if (viewType === 'matrix-tasks-view') {
            state.markFilterState.statuses = ['todo', 'planned', 'in-progress'];
            buildHeader();
            try {
                currentSubView = await startMatrixView(app, viewPanel, sharedSortState);
                // 立即应用当前排序
                if (currentSubView.updateSort) await currentSubView.updateSort();
            } catch (e) { viewPanel.innerHTML = '<div class="empty-message">矩阵视图加载失败</div>'; return; }
        } else {
            // 数据视图恢复状态
            state.markFilterState.statuses = [...dataViewStatuses];
            buildHeader();
            currentSubView = null;
        }

        await refreshCurrentView();
        buildViewSwitcher(sidebar, dv, app, viewType, activateSubView);
        if (navigatorView) { navigatorView._lastViewType = viewType; navigatorView.app.workspace.requestSaveLayout(); }
    }

    // 初始化
    buildViewSwitcher(sidebar, dv, app, initialSubView, activateSubView);
    state.showTree = state.showTree ?? false;
    state.showFilters = state.showFilters ?? false;
    buildHeader();
    treePanel.style.display = state.showTree ? '' : 'none';

    await persistence.load(state, collapsedNodes, () => {
        const thisWeek = DateUtils.getWeekRange(new Date());
        return { start: thisWeek.start, end: thisWeek.end };
    }, (msg) => new Notice(msg));

    dataViewStatuses = [...state.dataViewStatuses || CONFIG.ALLOWED_STATUSES];
    if (initialSubView === 'matrix-tasks-view') {
        state.markFilterState.statuses = ['todo', 'planned', 'in-progress'];
    } else {
        state.markFilterState.statuses = [...dataViewStatuses];
    }

    if (initialSubView === 'matrix-tasks-view') {
        try {
            currentSubView = await startMatrixView(app, viewPanel, sharedSortState);
            if (currentSubView.updateSort) await currentSubView.updateSort();
        } catch (e) { viewPanel.innerHTML = '<div class="empty-message">矩阵视图加载失败</div>'; }
    }

    currentSubViewType = initialSubView;
    const filtered = applyNavFilters();
    treeRenderer.render(filtered);

    // 首次渲染内容
    if (currentSubViewType === 'matrix-tasks-view' && currentSubView && currentSubView.updateSort) {
        await currentSubView.updateSort();
    } else {
        await renderContent(filtered);
    }

    return async () => {
        state.chartInstances.forEach(c => { try { c.dispose(); } catch(e) {} });
        if (currentSubView && currentSubView.cleanup) await currentSubView.cleanup();
        dv.container.empty();
    };
}