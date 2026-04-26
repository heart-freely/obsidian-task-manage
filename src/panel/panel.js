// src/panel/panel.js
import { ItemView, Notice } from 'obsidian';
import * as readTasks from '../tasks/tasks-read';
import { DateUtils } from '../common';
import { filterTasks } from '../tasks/tasks-filter';
import { drawCharts } from './views/view-data-tasks';
import { buildDateCascadePanel, getQueryRangeFromDateSelection, resetCascadeDateUI } from './panel-date-bottons';
import { buildQuickDatePanel, resetQuickDateUI } from './panel-quick-bottons';
import { buildMarkFilterPanel } from './panel-mark-bottons';
import { buildControlPanel } from './panel-control-bottons';
import { buildSortRow } from './panel-sort-bottons';
import { initChartInteractions } from './interact/interact-chart';
import { TooltipManager } from './interact/interact-tooltip';
import { createInitialState, getFilterFingerprint, getEffectiveDateRange, PersistenceManager } from '../storage/storage-persist';
import { CONFIG } from '../configs/configs-plugin';
import { startMatrixView } from './views/view-matrix-tasks';
import { buildViewSwitcher } from './panel-sidebar-bottons';
import { buildHideButtons } from './panel-hide-bottons';
import { TaskTreeRenderer } from './panel-tree-view';

export const VIEW_TYPE_NAVIGATOR = 'navigator-view';

// -----------------------------
// 视图基类
// -----------------------------
export class BaseTaskView extends ItemView {
    constructor(leaf, storageAdapter, instanceId) {
        super(leaf);
        this._cleanupFn = null;
        this._storageAdapter = storageAdapter;
        this._instanceId = instanceId;
    }
    getViewType() { throw new Error('Must override getViewType()'); }
    getDisplayText() { return 'Task View'; }
    getIcon() { return 'bar-chart-3'; }

    async onOpen() {
        const dvPlugin = this.app.plugins.plugins.dataview;
        if (!dvPlugin || !dvPlugin.api) {
            this.contentEl.createEl('div', { text: '⚠️ 请先安装并启用 Dataview 插件。' });
            return;
        }
        const dv = {
            pages: (source) => dvPlugin.api.pages(source) || [],
            page: (path) => {
                const cleanPath = path.replace(/\.md$/, '');
                return dvPlugin.api.page(cleanPath) || null;
            },
            el: (tag, textOrOpts, opts) => {
                const el = document.createElement(tag);
                let realOpts = {};
                if (typeof textOrOpts === 'string') {
                    el.textContent = textOrOpts;
                    if (opts && typeof opts === 'object') realOpts = opts;
                } else if (textOrOpts && typeof textOrOpts === 'object') {
                    realOpts = textOrOpts;
                }
                if (realOpts.cls) el.className = realOpts.cls;
                if (realOpts.style) el.style.cssText = realOpts.style;
                if (realOpts.attr) {
                    for (const key in realOpts.attr) {
                        if (Object.hasOwn(realOpts.attr, key)) el.setAttribute(key, realOpts.attr[key]);
                    }
                }
                return el;
            },
            container: this.contentEl
        };
        this.contentEl.empty();
        this._cleanupFn = await this._startCore(dv, this.app, this._storageAdapter, this._instanceId);
    }

    async onClose() {
        if (typeof this._cleanupFn === 'function') {
            this._cleanupFn();
            this._cleanupFn = null;
        }
        document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());
    }

    async _startCore(dv, app, storageAdapter, instanceId) {
        throw new Error('Must override _startCore');
    }
}

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

    const sharedSortState = { type: 'status', order: 'asc' };
    const tooltipManager = new TooltipManager(); tooltipManager.ensureDiv();
    const state = createInitialState();
    state.leftSort = sharedSortState;
    const collapsedNodes = {};
    state.collapsedNodes = collapsedNodes;
    const persistence = new PersistenceManager(storageAdapter, 'nav');

    let currentSubViewType = null;
    let matrixInstance = null;
    let dataViewStatuses = [...CONFIG.ALLOWED_STATUSES];   // 数据视图状态备份

    // 布局：侧边栏 + 主区域
    const outerWithSidebar = dv.el('div', '', { cls: 'navigator-outer-with-sidebar' });
    const sidebar = dv.el('div', '', { cls: 'navigator-sidebar' });
    const mainArea = dv.el('div', '', { cls: 'navigator-main' });
    mainArea.style.cssText = 'flex:1; overflow:hidden; display:flex; flex-direction:column;';

    // 滚动容器
    const scrollArea = dv.el('div', '', { cls: 'navigator-scroll-area' });

    // 固定头部（sticky）
    const stickyHeader = dv.el('div', '', { cls: 'header-sticky' });
    scrollArea.appendChild(stickyHeader);

    // 筛选面板（正常流）
    const filterWrapper = dv.el('div', '', { cls: 'filter-area' });
    scrollArea.appendChild(filterWrapper);

    // 下方左右分栏
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

    // ---------- 构建头部 ----------
    function buildHeader() {
        // 清空固定头
        stickyHeader.innerHTML = '';

        // 快捷日期行
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

        // 控制栏
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

        // 排序栏
        const sortContainer = dv.el('div', '', { cls: 'sort-row-wrapper' });
        buildSortRow(sortContainer, dv, state, { onRenderAll: () => refreshCurrentView() });
        stickyHeader.appendChild(sortContainer);

        // 构建筛选面板
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

    // ---------- 刷新逻辑 ----------
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
            if (matrixInstance && matrixInstance.update) {
                await matrixInstance.update({ state, leftSort: sharedSortState });
            }
        }
    }

    async function activateSubView(viewType, force = false) {
        if (!force && currentSubViewType === viewType) return;
        // 保存数据视图状态
        if (currentSubViewType === 'task-dataview-view') {
            dataViewStatuses = [...state.markFilterState.statuses];
        }
        // 清理矩阵实例
        if (matrixInstance && matrixInstance.cleanup) {
            await matrixInstance.cleanup();
            matrixInstance = null;
        }
        currentSubViewType = viewType;
        if (viewType === 'matrix-tasks-view') {
            // 设置矩阵视图默认状态
            state.markFilterState.statuses = ['todo', 'planned', 'in-progress'];
            buildHeader();
            try { matrixInstance = await startMatrixView(app, viewPanel); } catch (e) { viewPanel.innerHTML = '<div class="empty-message">矩阵视图加载失败</div>'; return; }
        } else {
            // 恢复数据视图状态
            state.markFilterState.statuses = [...dataViewStatuses];
            buildHeader();
        }
        await refreshCurrentView();
        buildViewSwitcher(sidebar, dv, app, viewType, activateSubView);
        if (navigatorView) {
            navigatorView._lastViewType = viewType;
            navigatorView.app.workspace.requestSaveLayout();
        }
    }

    // ---------- 初始化 ----------
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
        try { matrixInstance = await startMatrixView(app, viewPanel); } catch (e) { viewPanel.innerHTML = '<div class="empty-message">矩阵视图加载失败</div>'; }
    }
    currentSubViewType = initialSubView;
    const filtered = applyNavFilters();
    treeRenderer.render(filtered);
    if (matrixInstance && currentSubViewType === 'matrix-tasks-view') {
        await matrixInstance.update({ state, leftSort: sharedSortState });
    } else {
        await renderContent(filtered);
    }

    // ---------- 清理 ----------
    return async () => {
        state.chartInstances.forEach(c => { try { c.dispose(); } catch(e) {} });
        if (matrixInstance && matrixInstance.cleanup) await matrixInstance.cleanup();
        dv.container.empty();
    };
}