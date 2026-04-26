// src/panel/panel.js
import logger from '../utils/logger';

import { Notice } from 'obsidian';
import * as readTasks from '../tasks/tasks-read';
import { DateUtils } from '../common';
import { filterTasks } from '../tasks/tasks-filter';
import { drawCharts } from '../echarts/echarts-draw';
import { TaskTreeRenderer } from './panel-tree';
import {
    buildDateFilterPanel,
    getQueryRangeFromDateSelection,
    resetDateFilterUI
} from './panel-filters-date';
import { buildMarkFilterPanel } from './panel-filters-mark';
import {
    buildControlPanel,
    buildSortRow,
    updateSortButtons
} from './panel-controls';
import { initChartInteractions } from './interact/interact-chart';
import { TooltipManager } from './interact/interact-tooltip';
import { buildLayout } from './panel-layout';
import {
    createInitialState,
    getFilterFingerprint,
    getEffectiveDateRange
} from './state/state-manage';
import { PersistenceManager } from '../storage/storage-persistence';
import { CONFIG } from '../configs/configs-plugin';

export async function startDataViewCore(dv, app, storageAdapter, instanceId = 'default') {
    document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());

    const state = createInitialState();
    const collapsedNodes = {};
    state.collapsedNodes = collapsedNodes;

    const tooltipManager = new TooltipManager();
    tooltipManager.ensureDiv();
    state.tooltipDiv = tooltipManager.div;

    const persistence = new PersistenceManager(storageAdapter, instanceId);

    const formatDate = DateUtils.formatDate;
    const setStart = DateUtils.setStart;
    const setEnd = DateUtils.setEnd;
    const getWeekRange = DateUtils.getWeekRange;

    function applyAllFilters() {
        const fp = getFilterFingerprint(state);
        if (state.filterCache.fingerprint === fp) return state.filterCache.tasks.slice();

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

    let chartInteractionCleanup = null;

    async function renderAll() {
        state.filterCache.fingerprint = '';
        const filtered = applyAllFilters();
        if (state.treeRenderer) {
            state.treeRenderer.render(filtered);
        }
        if (state.chartContainer) {
            drawCharts(state.chartContainer, filtered, {
                dv,
                state,
                formatDate,
                setStart,
                setEnd,
                getEffectiveDateRange: () => getEffectiveDateRange(state)
            });
            setTimeout(() => {
                document.querySelectorAll('.chart-body').forEach(b => {
                    b.style.transform = 'scale(' + state.chartScale + ')';
                });
            }, 60);
        }
        await persistence.save(state, collapsedNodes);
    }

    async function renderFullUI() {
        tooltipManager.hide();
        dv.container.innerHTML = '';

        const main = dv.el('div', '');
        main.style.cssText = 'padding:16px 0 16px 2px;';

        buildDateFilterPanel(main, dv, state);

        buildMarkFilterPanel(main, dv, state, {
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
                renderAll();
            },
            onResetAll: () => {
                resetDateFilterUI(state);
                state.markFilterState.statuses = [...CONFIG.ALLOWED_STATUSES];
                state.markFilterState.includeMarks = [];
                state.markFilterState.excludeMarks = [];
                state.hideRepeatTasks = true;
                state.hideCompletedTasks = true;
                state.hideCancelledTasks = true;
                state.hideFolders = true;
                const thisWeek = getWeekRange(new Date());
                state.dateFilterState.isAll = false;
                state.dateFilterState.start = thisWeek.start;
                state.dateFilterState.end = thisWeek.end;
                state.leftSort = { type: 'status', order: 'asc' };
                state.filterCache.fingerprint = '';
                renderFullUI();
            }
        });

        buildControlPanel(main, dv, state, {
            onRenderAll: renderAll,
            onToggleFolders: () => {
                if (state.treeRenderer) state.treeRenderer.renderFromCurrentFilter();
            },
            onClearCache: () => {
                state.cachedAllTasks = null;
                state.filterCache = { fingerprint: '', tasks: null };
                readTasks.getAllTasks(true, dv, state);
                renderAll();
            }
        });

        buildSortRow(main, dv, state, {
            onRenderAll: renderAll
        });

        const { leftDiv, resizer, chartDiv, layout } = buildLayout(dv);
        main.appendChild(layout);
        dv.container.appendChild(main);
        state.chartContainer = chartDiv;

        if (!state.treeRenderer) {
            state.treeRenderer = new TaskTreeRenderer({
                container: leftDiv,
                dv: dv,
                app: app,
                state: state,
                collapsedNodes: collapsedNodes,
                tooltip: tooltipManager,
                onFilterRootPathChange: (path) => {
                    state.filterRootPath = path;
                    state.filterCache.fingerprint = '';
                    persistence.save(state, collapsedNodes);
                    renderAll();
                },
                onCollapseChange: () => {
                    persistence.save(state, collapsedNodes);
                }
            });
            state.treeRenderer.setFilteredTasksProvider(() => {
                return state.filterCache.tasks || applyAllFilters();
            });
        } else {
            state.treeRenderer.container = leftDiv;
        }

        chartInteractionCleanup = initChartInteractions(
            chartDiv,
            resizer,
            leftDiv,
            state,
            collapsedNodes,
            persistence.save.bind(persistence)
        );

        await renderAll();
    }

    // 启动
    logger.info('任务面板视图启动');
    readTasks.getAllTasks(true, dv, state);
    await persistence.load(state, collapsedNodes, () => {
        const thisWeek = getWeekRange(new Date());
        return { start: thisWeek.start, end: thisWeek.end };
    }, (msg) => new Notice(msg));
    await renderFullUI();

    return function cleanup() {
        logger.info('任务面板视图清理');
        if (chartInteractionCleanup) chartInteractionCleanup();
        state.chartInstances.forEach(c => { try { c.dispose(); } catch (e) {} });
        state.chartInstances = [];
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }
        tooltipManager.remove();
        if (state.treeRenderer) {
            state.treeRenderer.container = null;
            state.treeRenderer = null;
        }
        document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());
    };
}