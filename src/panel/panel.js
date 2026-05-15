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
import { startKanbanView } from './views/kanban-task-view';
import { buildViewSwitcher } from './bars/side-botton-bar';
import { buildHideButtons } from './bars/hide-botton-bar';
import { TaskTreeRenderer } from './components/tree-view-components';
import { BaseTaskView } from './views/base-task-view';
import { startListBaseView } from './views/base-list-view';
import {
    fetchImportantTasks,
    fetchRecurringTasks,
    fetchTodayTasks,
    fetchFutureTasks,
    fetchOverdueTasks,
    fetchDependsTasks,
    fetchTagTasks,
    fetchTasks
} from '../tasks/process/task-query-process';

export const VIEW_TYPE_NAVIGATOR = 'navigator-view';

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

export async function startNavigatorCore(dv, app, storageAdapter, instanceId, initialSubView, navigatorView) {
    document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());

    const sharedSortState = { type: 'status', order: 'asc' };
    const tooltipManager = new TooltipManager(); tooltipManager.ensureDiv();
    const state = createInitialState();
    state.leftSort = sharedSortState;
    const collapsedNodes = {};
    state.collapsedNodes = collapsedNodes;
    const persistence = new PersistenceManager(storageAdapter, 'nav');

    let currentSubViewType = null;
    let currentSubView = null;
    let dataViewStatuses = [...CONFIG.ALLOWED_STATUSES];

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

    async function refreshCurrentView() {
        const filtered = applyNavFilters();
        treeRenderer.render(filtered);
        await renderContent(filtered);
        await persistence.save(state, collapsedNodes);

        // 刷新甘特图/日历等需要同步的视图
        if (['calendar-task-view', 'gantt-task-view'].includes(currentSubViewType) && currentSubView?.updateSort) {
            await currentSubView.updateSort();
        }
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
        const selfRenderedViews = [
            'inbox-task-view',
            'important-task-view', 'recurring-task-view', 'today-task-view',
            'future-n-task-view', 'future-all-task-view', 'overdue-task-view',
            'depends-task-view', 'tag-task-view',
            'organize-task-view', 'timeline-task-view', 'table-task-view',
            'tree-task-view', 'calendar-task-view', 'gantt-task-view', 'pomodoro-task-view'
        ];

        if (selfRenderedViews.includes(currentSubViewType)) {
            return;
        }

        viewPanel.innerHTML = '';
        if (!currentSubViewType) return;
        if (currentSubViewType === 'task-dataview-view') {
            drawCharts(viewPanel, filteredTasks, {
                dv, state, formatDate: DateUtils.formatDate, setStart: DateUtils.setStart, setEnd: DateUtils.setEnd,
                getEffectiveDateRange: () => getEffectiveDateRange(state)
            });
        } else if (currentSubViewType === 'matrix-tasks-view' || currentSubViewType === 'kanban-task-view') {
            if (currentSubView && currentSubView.updateSort) await currentSubView.updateSort();
        }
    }

    async function activateSubView(viewType, force = false) {
        if (!force && currentSubViewType === viewType) return;
        if (currentSubViewType === 'task-dataview-view') dataViewStatuses = [...state.markFilterState.statuses];
        if (currentSubView && currentSubView.cleanup) { try { await currentSubView.cleanup(); } catch (e) { console.error(e); } currentSubView = null; }
        currentSubViewType = viewType;

        if (['matrix-tasks-view', 'kanban-task-view', 'inbox-task-view', 'organize-task-view'].includes(viewType)) {
            state.markFilterState.statuses = ['todo', 'planned', 'in-progress'];
        } else {
            state.markFilterState.statuses = [...dataViewStatuses];
        }
        buildHeader();

        try {
            if (viewType === 'matrix-tasks-view') {
                currentSubView = await startMatrixView(app, viewPanel, sharedSortState);
            } else if (viewType === 'kanban-task-view') {
                currentSubView = await startKanbanView(dv, app, viewPanel);
            } else if (viewType === 'important-task-view') {
                const { startImportantView } = await import('./views/important-task-view');
                currentSubView = await startImportantView(dv, app, viewPanel);
            } else if (viewType === 'recurring-task-view') {
                const { startRecurringView } = await import('./views/recurring-task-view');
                currentSubView = await startRecurringView(dv, app, viewPanel);
            } else if (viewType === 'today-task-view') {
                const { startTodayView } = await import('./views/today-task-view');
                currentSubView = await startTodayView(dv, app, viewPanel);
            } else if (viewType === 'future-n-task-view') {
                currentSubView = await startListBaseView(app, viewPanel, (app) => fetchFutureTasks(app, 15), '未来15天', 'rgba(97, 175, 239, 0.25)');
            } else if (viewType === 'future-all-task-view') {
                currentSubView = await startListBaseView(app, viewPanel, async (app) => {
                    const tasks = await fetchTasks(app);
                    const now = window.moment();
                    return tasks.filter(t => {
                        const date = t.dueDate || t.scheduledDate;
                        return date && window.moment(date).isAfter(now);
                    });
                }, '未来所有任务', 'rgba(100, 200, 200, 0.25)');
            } else if (viewType === 'overdue-task-view') {
                currentSubView = await startListBaseView(app, viewPanel, fetchOverdueTasks, '逾期任务', 'rgba(255, 130, 130, 0.25)');
            } else if (viewType === 'depends-task-view') {
                const { startDependsView } = await import('./views/depends-task-view');
                currentSubView = await startDependsView(dv, app, viewPanel);
            } else if (viewType === 'tag-task-view') {
                const { startTagView } = await import('./views/tag-task-view');
                currentSubView = await startTagView(dv, app, viewPanel);
            } else if (viewType === 'inbox-task-view') {
                const { startInboxView } = await import('./views/inbox-task-view');
                currentSubView = await startInboxView(dv, app, viewPanel);
            } else if (viewType === 'timeline-task-view') {
                const { startTimelineView } = await import('./views/timeline-task-view');
                currentSubView = await startTimelineView(dv, app, viewPanel);
            } else if (viewType === 'table-task-view') {
                const { startTableTaskView } = await import('./views/table-task-view');
                currentSubView = await startTableTaskView(dv, app, viewPanel);
            } else if (viewType === 'calendar-task-view') {
                const { startCalendarView } = await import('./views/calendar-task-view');
                currentSubView = await startCalendarView(dv, app, viewPanel, state);
            } else if (viewType === 'gantt-task-view') {
                const { startGanttView } = await import('./views/gantt-task-view');
                currentSubView = await startGanttView(dv, app, viewPanel, state);
            } else {
                currentSubView = { cleanup: () => {}, updateSort: () => {} };
                viewPanel.innerHTML = '<div class="empty-message">🛠️ 此视图即将上线</div>';
            }
        } catch (e) {
            viewPanel.innerHTML = '<div class="empty-message">视图加载失败</div>';
            return;
        }

        await refreshCurrentView();
        buildViewSwitcher(sidebar, dv, app, viewType, activateSubView);
        if (navigatorView) { navigatorView._lastViewType = viewType; navigatorView.app.workspace.requestSaveLayout(); }
    }

    buildViewSwitcher(sidebar, dv, app, initialSubView, activateSubView);
    state.showTree = state.showTree ?? false;
    state.showFilters = state.showFilters ?? false;
    buildHeader();
    treePanel.style.display = state.showTree ? '' : 'none';

    await persistence.load(state, collapsedNodes, () => { const tw = DateUtils.getWeekRange(new Date()); return { start: tw.start, end: tw.end }; }, (msg) => new Notice(msg));

    dataViewStatuses = [...state.dataViewStatuses || CONFIG.ALLOWED_STATUSES];
    if (['matrix-tasks-view', 'kanban-task-view'].includes(initialSubView)) {
        state.markFilterState.statuses = ['todo', 'planned', 'in-progress'];
    } else {
        state.markFilterState.statuses = [...dataViewStatuses];
    }

    try {
        if (initialSubView === 'matrix-tasks-view') {
            currentSubView = await startMatrixView(app, viewPanel, sharedSortState);
        } else if (initialSubView === 'kanban-task-view') {
            currentSubView = await startKanbanView(dv, app, viewPanel);
        } else if (initialSubView === 'important-task-view') {
            const { startImportantView } = await import('./views/important-task-view');
            currentSubView = await startImportantView(dv, app, viewPanel);
        } else if (initialSubView === 'recurring-task-view') {
            const { startRecurringView } = await import('./views/recurring-task-view');
            currentSubView = await startRecurringView(dv, app, viewPanel);
        } else if (initialSubView === 'today-task-view') {
            const { startTodayView } = await import('./views/today-task-view');
            currentSubView = await startTodayView(dv, app, viewPanel);
        } else if (initialSubView === 'future-n-task-view') {
            currentSubView = await startListBaseView(app, viewPanel, (app) => fetchFutureTasks(app, 15), '未来15天', 'rgba(97, 175, 239, 0.25)');
        } else if (initialSubView === 'future-all-task-view') {
            currentSubView = await startListBaseView(app, viewPanel, async (app) => {
                const tasks = await fetchTasks(app);
                const now = window.moment();
                return tasks.filter(t => {
                    const date = t.dueDate || t.scheduledDate;
                    return date && window.moment(date).isAfter(now);
                });
            }, '未来所有任务', 'rgba(100, 200, 200, 0.25)');
        } else if (initialSubView === 'overdue-task-view') {
            currentSubView = await startListBaseView(app, viewPanel, fetchOverdueTasks, '逾期任务', 'rgba(255, 130, 130, 0.25)');
        } else if (initialSubView === 'depends-task-view') {
            const { startDependsView } = await import('./views/depends-task-view');
            currentSubView = await startDependsView(dv, app, viewPanel);
        } else if (initialSubView === 'tag-task-view') {
            const { startTagView } = await import('./views/tag-task-view');
            currentSubView = await startTagView(dv, app, viewPanel);
        } else if (initialSubView === 'inbox-task-view') {
            const { startInboxView } = await import('./views/inbox-task-view');
            currentSubView = await startInboxView(dv, app, viewPanel);
        } else if (initialSubView === 'timeline-task-view') {
            const { startTimelineView } = await import('./views/timeline-task-view');
            currentSubView = await startTimelineView(dv, app, viewPanel);
        } else if (initialSubView === 'table-task-view') {
            const { startTableTaskView } = await import('./views/table-task-view');
            currentSubView = await startTableTaskView(dv, app, viewPanel);
        } else if (initialSubView === 'calendar-task-view') {
            const { startCalendarView } = await import('./views/calendar-task-view');
            currentSubView = await startCalendarView(dv, app, viewPanel, state);
        } else if (initialSubView === 'gantt-task-view') {
            const { startGanttView } = await import('./views/gantt-task-view');
            currentSubView = await startGanttView(dv, app, viewPanel, state);
        }
    } catch (e) { viewPanel.innerHTML = '<div class="empty-message">视图加载失败</div>'; }

    currentSubViewType = initialSubView;
    const filtered = applyNavFilters();
    treeRenderer.render(filtered);

    if (currentSubViewType === 'matrix-tasks-view' || currentSubViewType === 'kanban-task-view') {
        if (currentSubView && currentSubView.updateSort) await currentSubView.updateSort();
    } else if (currentSubViewType === 'task-dataview-view') {
        await renderContent(filtered);
    }

    return async () => {
        state.chartInstances.forEach(c => { try { c.dispose(); } catch(e) {} });
        if (currentSubView && currentSubView.cleanup) await currentSubView.cleanup();
        dv.container.empty();
    };
}