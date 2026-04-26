// src/panel/views/view-data-core.js
// 任务面板核心逻辑

import * as readTasks from '../../tasks/tasks-read';
import {
    ROOT_PATH,
    ALLOWED_STATUSES,
    STATUS_NAMES,
    STATUS_ICONS,
    STATUS_COLORS,
    MARK_NAMES,
    ALL_MARKS,
    PRIORITY_ORDER,
    PRIORITY_COLORS,
    REPEAT_ORDER,
    REPEAT_COLORS,
    REPEAT_TYPES,
    DATE_MARK_ORDER,
    DATE_MARK_NAMES,
    DATE_MARK_COLORS,
    YEAR_LIST,
    WORK_HOURS_PER_DAY
} from '../../configs/configs-plugin';
import { DateUtils, throttleByFrame } from '../../common';
import { filterTasks } from '../../tasks/tasks-filter';
import { drawCharts } from '../../echarts/echarts-draw';
import { TaskTreeRenderer } from '../panel-tree';
import { saveFilterState, loadFilterState } from '../../storage/storage-persistence';

export function startDataViewCore(dv, app) {
    const INTERVAL_MODES = { SCHEDULED_DUE: 'scheduled-due', STARTS_DONE: 'starts-done' };
    const SORT_TYPES = { STATUS: 'status', PRIORITY: 'priority', TIME: 'time' };

    document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());

    let collapsedNodes = {};
    let taskIdMap = {};

    const state = {
        cachedAllTasks: null,
        filterCache: { fingerprint: '', tasks: null },
        quickBtns: [],
        yearBtns: [], quarterBtns: [], monthBtns: [], weekBtns: [], weekdayBtns: [],
        dateState: { selections: { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} } },
        dateFilterState: { start: null, end: null, isAll: false },
        markFilterState: {
            statuses: [...ALLOWED_STATUSES],
            includeMarks: [],
            excludeMarks: []
        },
        hideRepeatTasks: true,
        hideCompletedTasks: true,
        hideCancelledTasks: true,
        intervalMode: INTERVAL_MODES.SCHEDULED_DUE,
        leftSort: { type: SORT_TYPES.STATUS, order: 'asc' },
        collapsedNodes: collapsedNodes,
        leftPanelWidth: 300,
        chartContainer: null,
        chartInstances: [],
        chartScale: 1,
        flatDisplayNodes: [],
        tooltipDiv: null,
        resizeObserver: null,
        taskIdMap: taskIdMap,
        hideFolders: true,
        filterRootPath: null,
        modalOpen: false,
        treeRenderer: null
    };

    function ensureEcharts(callback) {
        if (window.echarts) return callback(window.echarts);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
        script.onload = () => { callback(window.echarts); };
        script.onerror = () => { console.warn('ECharts 加载失败'); callback(null); };
        document.head.appendChild(script);
    }

    const formatDate = DateUtils.formatDate;
    const setStart = DateUtils.setStart;
    const setEnd = DateUtils.setEnd;
    const getDayRange = DateUtils.getDayRange;
    const getWeekRange = DateUtils.getWeekRange;
    const getMonthRange = DateUtils.getMonthRange;
    const getMonthRangeByYearMonth = DateUtils.getMonthRangeByYearMonth;
    const getQuarterRangeByYearQuarter = DateUtils.getQuarterRangeByYearQuarter;
    const getYearRangeByYear = DateUtils.getYearRangeByYear;
    const getWeekdayRange = DateUtils.getWeekdayRange;
    const getWeekRangeByYearWeek = DateUtils.getWeekRangeByYearWeek;
    const getISOWeekNumber = DateUtils.getISOWeekNumber;

    function clearQuickHighlights() {
        state.quickBtns.forEach(b => b.className = 'quick-btn');
    }

    function clearDateSelections() {
        state.dateState.selections = { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} };
        updateDateButtonStyles();
    }

    function updateDateButtonStyles() {
        const s = state.dateState.selections;
        state.yearBtns.forEach((btn, i) => {
            btn.className = s.years[YEAR_LIST[i]] ? 'cascade-btn cascade-btn-active' : 'cascade-btn';
        });
        const yearsSel = Object.keys(s.years).length > 0;
        const singleY = yearsSel && Object.keys(s.years).length === 1 ? Object.keys(s.years)[0] : null;
        state.quarterBtns.forEach((btn, q) => {
            const disabled = !singleY;
            btn.disabled = disabled;
            const key = singleY ? singleY + '-Q' + (q+1) : '';
            const active = !disabled && s.quarters[key];
            btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
        });
        const quartersSel = Object.keys(s.quarters).length > 0;
        const singleQ = quartersSel && Object.keys(s.quarters).length === 1 ? Object.keys(s.quarters)[0] : null;
        state.monthBtns.forEach((btn, m) => {
            const month = m + 1;
            let disabled = true;
            if (singleQ) {
                const parts = singleQ.split('-Q');
                const y = parseInt(parts[0], 10);
                const qn = parseInt(parts[1], 10);
                const sm = (qn-1)*3 + 1;
                const em = sm + 2;
                disabled = (month < sm || month > em);
            } else if (quartersSel) disabled = true;
            btn.disabled = disabled;
            const key = singleQ ? singleQ + '-M' + month : '';
            const active = !disabled && s.months[key];
            btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
        });
        const monthsSel = Object.keys(s.months).length > 0;
        const singleM = monthsSel && Object.keys(s.months).length === 1 ? Object.keys(s.months)[0] : null;
        state.weekBtns.forEach((btn, w) => {
            const disabled = !singleM;
            btn.disabled = disabled;
            const key = singleM ? singleM + '-W' + (w+1) : '';
            const active = !disabled && s.weeks[key];
            btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
        });
        const weeksSel = Object.keys(s.weeks).length > 0;
        const singleW = weeksSel && Object.keys(s.weeks).length === 1 ? Object.keys(s.weeks)[0] : null;
        state.weekdayBtns.forEach((btn, d) => {
            const disabled = !singleW;
            btn.disabled = disabled;
            const key = singleW ? singleW + '-D' + (d+1) : '';
            const active = !disabled && s.weekdays[key];
            btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
        });
    }

    function getQueryRangeFromDateSelection() {
        const s = state.dateState.selections;
        const years = Object.keys(s.years);
        if (!years.length) return null;
        years.sort();
        const wdKeys = Object.keys(s.weekdays);
        if (wdKeys.length) {
            const ranges = wdKeys.map(k => {
                const m = k.match(/(\d+)-Q(\d+)-M(\d+)-W(\d+)-D(\d+)/);
                const y = +m[1], mo = +m[3], w = +m[4], wd = +m[5];
                const monStart = new Date(y, mo-1, 1);
                const firstW = getISOWeekNumber(monStart);
                const targetW = firstW + w - 1;
                const wr = getWeekRangeByYearWeek(y, targetW);
                return getWeekdayRange(wr.start, wd);
            });
            return {
                start: setStart(new Date(Math.min(...ranges.map(r => r.start)))),
                end: setEnd(new Date(Math.max(...ranges.map(r => r.end))))
            };
        }
        const wKeys = Object.keys(s.weeks);
        if (wKeys.length) {
            const ranges = wKeys.map(k => {
                const m = k.match(/(\d+)-Q(\d+)-M(\d+)-W(\d+)/);
                const y = +m[1], mo = +m[3], w = +m[4];
                const monStart = new Date(y, mo-1, 1);
                const firstW = getISOWeekNumber(monStart);
                const targetW = firstW + w - 1;
                return getWeekRangeByYearWeek(y, targetW);
            });
            return {
                start: setStart(new Date(Math.min(...ranges.map(r => r.start)))),
                end: setEnd(new Date(Math.max(...ranges.map(r => r.end))))
            };
        }
        const mKeys = Object.keys(s.months);
        if (mKeys.length) {
            const ranges = mKeys.map(k => {
                const m = k.match(/(\d+)-Q(\d+)-M(\d+)/);
                return getMonthRangeByYearMonth(+m[1], +m[3]);
            });
            return {
                start: setStart(new Date(Math.min(...ranges.map(r => r.start)))),
                end: setEnd(new Date(Math.max(...ranges.map(r => r.end))))
            };
        }
        const qKeys = Object.keys(s.quarters);
        if (qKeys.length) {
            const ranges = qKeys.map(k => {
                const m = k.match(/(\d+)-Q(\d+)/);
                return getQuarterRangeByYearQuarter(+m[1], +m[2]);
            });
            return {
                start: setStart(new Date(Math.min(...ranges.map(r => r.start)))),
                end: setEnd(new Date(Math.max(...ranges.map(r => r.end))))
            };
        }
        const ranges = years.map(y => getYearRangeByYear(+y));
        return {
            start: setStart(new Date(Math.min(...ranges.map(r => r.start)))),
            end: setEnd(new Date(Math.max(...ranges.map(r => r.end))))
        };
    }

    function buildDateFilterPanel(container) {
        const dateSection = dv.el('div', '', { cls: 'filter-section' });
        const quickRow = dv.el('div', '');
        quickRow.style.cssText = 'margin-bottom:12px; display:flex; flex-wrap:wrap; gap:8px;';
        const quickDefs = [
            { label: '今天', range: () => getDayRange(new Date()) },
            { label: '昨天', range: () => { const d = new Date(); d.setDate(d.getDate()-1); return getDayRange(d); } },
            { label: '明天', range: () => { const d = new Date(); d.setDate(d.getDate()+1); return getDayRange(d); } },
            { label: '本周', range: () => getWeekRange(new Date()) },
            { label: '本月', range: () => getMonthRange(new Date()) },
            { label: '所有任务', range: null }
        ];
        state.quickBtns = [];
        quickDefs.forEach(def => {
            const btn = dv.el('button', def.label, { cls: 'quick-btn' });
            btn.onclick = () => {
                clearQuickHighlights();
                btn.classList.add('quick-btn-active');
                clearDateSelections();
                if (def.label === '所有任务') {
                    state.dateFilterState.isAll = true;
                    state.dateFilterState.start = state.dateFilterState.end = null;
                } else {
                    state.dateFilterState.isAll = false;
                    const r = def.range();
                    state.dateFilterState.start = r.start;
                    state.dateFilterState.end = r.end;
                }
                state.filterCache.fingerprint = '';
            };
            quickRow.appendChild(btn);
            state.quickBtns.push(btn);
            if (def.label === '本周') {
                const prevBtn = dv.el('button', '上周', { cls: 'quick-btn' });
                prevBtn.onclick = () => {
                    clearQuickHighlights(); clearDateSelections();
                    const now = new Date(); now.setDate(now.getDate()-7);
                    const r = getWeekRange(now);
                    state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                    state.filterCache.fingerprint = ''; prevBtn.classList.add('quick-btn-active');
                };
                quickRow.appendChild(prevBtn); state.quickBtns.push(prevBtn);
                const nextBtn = dv.el('button', '下周', { cls: 'quick-btn' });
                nextBtn.onclick = () => {
                    clearQuickHighlights(); clearDateSelections();
                    const now = new Date(); now.setDate(now.getDate()+7);
                    const r = getWeekRange(now);
                    state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                    state.filterCache.fingerprint = ''; nextBtn.classList.add('quick-btn-active');
                };
                quickRow.appendChild(nextBtn); state.quickBtns.push(nextBtn);
            }
            if (def.label === '本月') {
                const prevBtn = dv.el('button', '上月', { cls: 'quick-btn' });
                prevBtn.onclick = () => {
                    clearQuickHighlights(); clearDateSelections();
                    const now = new Date(); now.setMonth(now.getMonth()-1);
                    const r = getMonthRange(now);
                    state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                    state.filterCache.fingerprint = ''; prevBtn.classList.add('quick-btn-active');
                };
                quickRow.appendChild(prevBtn); state.quickBtns.push(prevBtn);
                const nextBtn = dv.el('button', '下月', { cls: 'quick-btn' });
                nextBtn.onclick = () => {
                    clearQuickHighlights(); clearDateSelections();
                    const now = new Date(); now.setMonth(now.getMonth()+1);
                    const r = getMonthRange(now);
                    state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                    state.filterCache.fingerprint = ''; nextBtn.classList.add('quick-btn-active');
                };
                quickRow.appendChild(nextBtn); state.quickBtns.push(nextBtn);
            }
        });
        dateSection.appendChild(quickRow);

        const rows = [dv.el('div', ''), dv.el('div', ''), dv.el('div', ''), dv.el('div', ''), dv.el('div', '')];
        const labels = ['年份', '季度', '月份', '周数', '周几'];
        rows.forEach((row, r) => {
            row.style.cssText = 'margin-bottom:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;';
            row.appendChild(dv.el('span', labels[r], { cls: 'filter-label' }));
            dateSection.appendChild(row);
        });

        state.yearBtns = [];
        YEAR_LIST.forEach(y => {
            const btn = dv.el('button', y.toString(), { cls: 'cascade-btn' });
            btn.onclick = () => {
                clearQuickHighlights();
                if (state.dateState.selections.years[y]) delete state.dateState.selections.years[y];
                else state.dateState.selections.years[y] = true;
                if (Object.keys(state.dateState.selections.years).length !== 1) {
                    state.dateState.selections.quarters = {};
                    state.dateState.selections.months = {};
                    state.dateState.selections.weeks = {};
                    state.dateState.selections.weekdays = {};
                }
                updateDateButtonStyles();
                state.filterCache.fingerprint = '';
            };
            rows[0].appendChild(btn);
            state.yearBtns.push(btn);
        });

        state.quarterBtns = [];
        for (let q = 1; q <= 4; q++) {
            (function(qq) {
                const btn = dv.el('button', '第' + qq + '季度', { cls: 'cascade-btn cascade-btn-disabled' });
                btn.disabled = true;
                btn.onclick = () => {
                    if (Object.keys(state.dateState.selections.years).length !== 1) return;
                    const y = Object.keys(state.dateState.selections.years)[0];
                    const key = y + '-Q' + qq;
                    if (state.dateState.selections.quarters[key]) delete state.dateState.selections.quarters[key];
                    else state.dateState.selections.quarters[key] = true;
                    if (Object.keys(state.dateState.selections.quarters).length !== 1) {
                        state.dateState.selections.months = {};
                        state.dateState.selections.weeks = {};
                        state.dateState.selections.weekdays = {};
                    }
                    updateDateButtonStyles();
                    state.filterCache.fingerprint = '';
                };
                rows[1].appendChild(btn);
                state.quarterBtns.push(btn);
            })(q);
        }

        state.monthBtns = [];
        for (let m = 1; m <= 12; m++) {
            (function(mm) {
                const btn = dv.el('button', mm + '月', { cls: 'cascade-btn cascade-btn-disabled' });
                btn.disabled = true;
                btn.onclick = () => {
                    if (Object.keys(state.dateState.selections.quarters).length !== 1) return;
                    const qKey = Object.keys(state.dateState.selections.quarters)[0];
                    const key = qKey + '-M' + mm;
                    if (state.dateState.selections.months[key]) delete state.dateState.selections.months[key];
                    else state.dateState.selections.months[key] = true;
                    if (Object.keys(state.dateState.selections.months).length !== 1) {
                        state.dateState.selections.weeks = {};
                        state.dateState.selections.weekdays = {};
                    }
                    updateDateButtonStyles();
                    state.filterCache.fingerprint = '';
                };
                rows[2].appendChild(btn);
                state.monthBtns.push(btn);
            })(m);
        }

        state.weekBtns = [];
        for (let w = 1; w <= 4; w++) {
            (function(ww) {
                const btn = dv.el('button', '第' + ww + '周', { cls: 'cascade-btn cascade-btn-disabled' });
                btn.disabled = true;
                btn.onclick = () => {
                    if (Object.keys(state.dateState.selections.months).length !== 1) return;
                    const mKey = Object.keys(state.dateState.selections.months)[0];
                    const key = mKey + '-W' + ww;
                    if (state.dateState.selections.weeks[key]) delete state.dateState.selections.weeks[key];
                    else state.dateState.selections.weeks[key] = true;
                    if (Object.keys(state.dateState.selections.weeks).length !== 1) {
                        state.dateState.selections.weekdays = {};
                    }
                    updateDateButtonStyles();
                    state.filterCache.fingerprint = '';
                };
                rows[3].appendChild(btn);
                state.weekBtns.push(btn);
            })(w);
        }

        state.weekdayBtns = [];
        ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].forEach((wd, d) => {
            (function(idx) {
                const btn = dv.el('button', wd, { cls: 'cascade-btn cascade-btn-disabled' });
                btn.disabled = true;
                btn.onclick = () => {
                    if (Object.keys(state.dateState.selections.weeks).length !== 1) return;
                    const wKey = Object.keys(state.dateState.selections.weeks)[0];
                    const key = wKey + '-D' + (idx+1);
                    if (state.dateState.selections.weekdays[key]) delete state.dateState.selections.weekdays[key];
                    else state.dateState.selections.weekdays[key] = true;
                    updateDateButtonStyles();
                    state.filterCache.fingerprint = '';
                };
                rows[4].appendChild(btn);
                state.weekdayBtns.push(btn);
            })(d);
        });
        container.appendChild(dateSection);
    }

    function buildMarkFilterPanel(container) {
        const wrapper = dv.el('div', '', { cls: 'filter-section' });
        const statusDiv = dv.el('div', '');
        statusDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px;';
        statusDiv.appendChild(dv.el('span', '执行状态', { cls: 'filter-label' }));
        ALLOWED_STATUSES.forEach(st => {
            const active = state.markFilterState.statuses.includes(st);
            const btn = dv.el('button', STATUS_NAMES[st]);
            btn.style.cssText = 'padding:2px 10px; border-radius:16px; background:' +
                (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
                '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
            btn.onclick = () => {
                const idx = state.markFilterState.statuses.indexOf(st);
                if (idx === -1) {
                    state.markFilterState.statuses.push(st);
                    btn.style.background = 'var(--interactive-accent)';
                    btn.style.color = 'white';
                } else {
                    state.markFilterState.statuses.splice(idx, 1);
                    btn.style.background = 'var(--interactive-normal)';
                    btn.style.color = 'var(--text-normal)';
                }
                state.filterCache.fingerprint = '';
            };
            statusDiv.appendChild(btn);
        });
        wrapper.appendChild(statusDiv);

        const incDiv = dv.el('div', '');
        incDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px;';
        incDiv.appendChild(dv.el('span', '包含标记', { cls: 'filter-label' }));
        ALL_MARKS.forEach(mk => {
            const active = state.markFilterState.includeMarks.includes(mk);
            const btn = dv.el('button', MARK_NAMES[mk]);
            btn.style.cssText = 'padding:2px 8px; border-radius:16px; background:' +
                (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
                '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
            btn.dataset.mark = mk;
            btn.dataset.type = 'include';
            btn.onclick = () => {
                const incIdx = state.markFilterState.includeMarks.indexOf(mk);
                const excIdx = state.markFilterState.excludeMarks.indexOf(mk);
                if (incIdx === -1) {
                    state.markFilterState.includeMarks.push(mk);
                    if (excIdx !== -1) state.markFilterState.excludeMarks.splice(excIdx, 1);
                    btn.style.background = 'var(--interactive-accent)';
                    btn.style.color = 'white';
                    document.querySelectorAll(`button[data-mark="${mk}"][data-type="exclude"]`).forEach(b => {
                        b.style.background = 'var(--interactive-normal)';
                        b.style.color = 'var(--text-normal)';
                    });
                } else {
                    state.markFilterState.includeMarks.splice(incIdx, 1);
                    btn.style.background = 'var(--interactive-normal)';
                    btn.style.color = 'var(--text-normal)';
                }
                state.filterCache.fingerprint = '';
            };
            incDiv.appendChild(btn);
        });
        wrapper.appendChild(incDiv);

        const excDiv = dv.el('div', '');
        excDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px;';
        excDiv.appendChild(dv.el('span', '排除标记', { cls: 'filter-label' }));
        ALL_MARKS.forEach(mk => {
            const active = state.markFilterState.excludeMarks.includes(mk);
            const btn = dv.el('button', MARK_NAMES[mk]);
            btn.style.cssText = 'padding:2px 8px; border-radius:16px; background:' +
                (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
                '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
            btn.dataset.mark = mk;
            btn.dataset.type = 'exclude';
            btn.onclick = () => {
                const excIdx = state.markFilterState.excludeMarks.indexOf(mk);
                const incIdx = state.markFilterState.includeMarks.indexOf(mk);
                if (excIdx === -1) {
                    state.markFilterState.excludeMarks.push(mk);
                    if (incIdx !== -1) state.markFilterState.includeMarks.splice(incIdx, 1);
                    btn.style.background = 'var(--interactive-accent)';
                    btn.style.color = 'white';
                    document.querySelectorAll(`button[data-mark="${mk}"][data-type="include"]`).forEach(b => {
                        b.style.background = 'var(--interactive-normal)';
                        b.style.color = 'var(--text-normal)';
                    });
                } else {
                    state.markFilterState.excludeMarks.splice(excIdx, 1);
                    btn.style.background = 'var(--interactive-normal)';
                    btn.style.color = 'var(--text-normal)';
                }
                state.filterCache.fingerprint = '';
            };
            excDiv.appendChild(btn);
        });
        wrapper.appendChild(excDiv);

        const queryRow = dv.el('div', '');
        queryRow.style.cssText = 'margin-top:16px; display:flex; gap:12px; justify-content:flex-end;';
        const queryBtn = dv.el('button', '🔍 执行查询', {
            style: 'padding:8px 24px; border-radius:24px; background:var(--interactive-accent); color:white; font-weight:bold;'
        });
        const resetAllBtn = dv.el('button', '🔄 重置所有筛选', {
            style: 'padding:8px 24px; border-radius:24px; background:var(--interactive-normal);'
        });
        queryBtn.onclick = () => {
            const isAllActive = state.quickBtns.some(b => b.classList.contains('quick-btn-active') && b.textContent === '所有任务');
            if (isAllActive) {
                state.dateFilterState.isAll = true;
                state.dateFilterState.start = state.dateFilterState.end = null;
            } else {
                const dr = getQueryRangeFromDateSelection();
                if (dr) {
                    state.dateFilterState.isAll = false;
                    state.dateFilterState.start = dr.start;
                    state.dateFilterState.end = dr.end;
                }
            }
            state.filterCache.fingerprint = '';
            renderAll();
        };
        resetAllBtn.onclick = () => {
            clearDateSelections();
            clearQuickHighlights();
            state.markFilterState.statuses = [...ALLOWED_STATUSES];
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
            state.leftSort = { type: SORT_TYPES.STATUS, order: 'asc' };
            state.filterCache.fingerprint = '';
            renderFullUI();
        };
        queryRow.appendChild(queryBtn);
        queryRow.appendChild(resetAllBtn);
        wrapper.appendChild(queryRow);
        container.appendChild(wrapper);
    }

    function buildControlPanel(container) {
        const ctrlRow = dv.el('div', '');
        ctrlRow.style.cssText = 'display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;';

        const intervalBtn = dv.el('button', state.intervalMode === INTERVAL_MODES.SCHEDULED_DUE ? '⏱️ 计划-截止' : '⏱️ 开始-完成', { cls: 'quick-btn' });
        intervalBtn.onclick = () => {
            state.intervalMode = state.intervalMode === INTERVAL_MODES.SCHEDULED_DUE ? INTERVAL_MODES.STARTS_DONE : INTERVAL_MODES.SCHEDULED_DUE;
            intervalBtn.textContent = state.intervalMode === INTERVAL_MODES.SCHEDULED_DUE ? '⏱️ 计划-截止' : '⏱️ 开始-完成';
            state.filterCache.fingerprint = '';
            renderAll();
        };
        ctrlRow.appendChild(intervalBtn);

        const repeatBtn = dv.el('button', state.hideRepeatTasks ? '🔄 显示循环' : '🔄 隐藏循环', { cls: 'quick-btn' });
        repeatBtn.onclick = () => {
            state.hideRepeatTasks = !state.hideRepeatTasks;
            repeatBtn.textContent = state.hideRepeatTasks ? '🔄 显示循环' : '🔄 隐藏循环';
            state.filterCache.fingerprint = '';
            renderAll();
        };
        ctrlRow.appendChild(repeatBtn);

        const completedBtn = dv.el('button', state.hideCompletedTasks ? '✅ 显示已完成' : '✅ 隐藏已完成', { cls: 'quick-btn' });
        completedBtn.onclick = () => {
            state.hideCompletedTasks = !state.hideCompletedTasks;
            completedBtn.textContent = state.hideCompletedTasks ? '✅ 显示已完成' : '✅ 隐藏已完成';
            state.filterCache.fingerprint = '';
            renderAll();
        };
        ctrlRow.appendChild(completedBtn);

        const cancelledBtn = dv.el('button', state.hideCancelledTasks ? '❎ 显示已取消' : '❎ 隐藏已取消', { cls: 'quick-btn' });
        cancelledBtn.onclick = () => {
            state.hideCancelledTasks = !state.hideCancelledTasks;
            cancelledBtn.textContent = state.hideCancelledTasks ? '❎ 显示已取消' : '❎ 隐藏已取消';
            state.filterCache.fingerprint = '';
            renderAll();
        };
        ctrlRow.appendChild(cancelledBtn);

        const folderBtn = dv.el('button', state.hideFolders ? '📂 显示文件夹' : '📁 隐藏文件夹', { cls: 'quick-btn' });
        folderBtn.onclick = () => {
            state.hideFolders = !state.hideFolders;
            folderBtn.textContent = state.hideFolders ? '📂 显示文件夹' : '📁 隐藏文件夹';
            if (state.treeRenderer) state.treeRenderer.renderFromCurrentFilter();
        };
        ctrlRow.appendChild(folderBtn);

        const clearCacheBtn = dv.el('button', '🗑️ 清除缓存', { cls: 'quick-btn' });
        clearCacheBtn.onclick = () => {
            state.cachedAllTasks = null;
            state.filterCache = { fingerprint: '', tasks: null };
            readTasks.getAllTasks(true, dv, state);
            renderAll();
        };
        ctrlRow.appendChild(clearCacheBtn);
        container.appendChild(ctrlRow);
    }

    function buildSortRow(container) {
        const row = dv.el('div', '', { cls: 'sort-row' });
        row.appendChild(dv.el('span', '排序:', { style: 'font-weight:bold;' }));
        const makeSortBtn = (label, type) => {
            const btn = dv.el('button', label, { cls: 'sort-btn' });
            btn.onclick = () => {
                if (state.leftSort.type === type) {
                    state.leftSort.order = state.leftSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    state.leftSort.type = type;
                    state.leftSort.order = 'asc';
                }
                renderAll();
                updateSortButtons();
            };
            return btn;
        };
        row.appendChild(makeSortBtn('状态', SORT_TYPES.STATUS));
        row.appendChild(makeSortBtn('优先级', SORT_TYPES.PRIORITY));
        row.appendChild(makeSortBtn('时间', SORT_TYPES.TIME));
        container.appendChild(row);
    }

    function updateSortButtons() {
        document.querySelectorAll('.sort-btn').forEach(btn => {
            const text = btn.textContent;
            const type = text.includes('状态') ? SORT_TYPES.STATUS : text.includes('优先级') ? SORT_TYPES.PRIORITY : SORT_TYPES.TIME;
            if (type === state.leftSort.type) {
                const label = type === SORT_TYPES.STATUS ? '状态' : type === SORT_TYPES.PRIORITY ? '优先级' : '时间';
                btn.textContent = label + (state.leftSort.order === 'asc' ? '↑' : '↓');
                btn.classList.add('sort-btn-active');
            } else {
                btn.classList.remove('sort-btn-active');
            }
        });
    }

    function getFilterFingerprint() {
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

    function applyAllFilters() {
        const fp = getFilterFingerprint();
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

    function getEffectiveDateRange() {
        if (state.dateFilterState.isAll) return null;
        if (state.dateFilterState.start && state.dateFilterState.end) {
            return { start: state.dateFilterState.start, end: state.dateFilterState.end };
        }
        return null;
    }

    // ========== 缩放控制 ==========
    function updateChartScale() {
        document.querySelectorAll('.chart-body').forEach(b => {
            b.style.transform = 'scale(' + state.chartScale + ')';
        });
    }
    let chartResizeTimer = null;
    function debouncedResize() {
        if (chartResizeTimer) clearTimeout(chartResizeTimer);
        chartResizeTimer = setTimeout(() => {
            state.chartInstances.forEach(c => { try { c.resize(); } catch (e) {} });
        }, 150);
    }
    const handleScale = throttleByFrame((e) => {
        if (!e.altKey) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        state.chartScale = Math.max(0.5, Math.min(3, state.chartScale + delta));
        updateChartScale();
        debouncedResize();
        saveFilterState(state, collapsedNodes);
    });
    function bindScaleEvents(container) { container.addEventListener('wheel', handleScale, { passive: false }); }
    function showScaleHint(container) {
        const hint = document.createElement('div');
        hint.className = 'scale-hint';
        hint.textContent = 'Alt+滚轮缩放';
        container.appendChild(hint);
        setTimeout(() => { hint.style.opacity = '0'; setTimeout(() => hint.remove(), 500); }, 5000);
    }

    function renderAll() {
        state.filterCache.fingerprint = '';
        const filtered = applyAllFilters();
        if (state.treeRenderer) {
            state.treeRenderer.render(filtered);
        }
        if (state.chartContainer) {
            drawCharts(state.chartContainer, filtered, {
                dv,
                state,
                ensureEcharts,
                formatDate,
                setStart,
                setEnd,
                getEffectiveDateRange
            });
            setTimeout(() => updateChartScale(), 60);
        }
        saveFilterState(state, collapsedNodes);
    }

    function renderFullUI() {
        document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());
        if (state.tooltipDiv) { state.tooltipDiv.remove(); state.tooltipDiv = null; }
        dv.container.innerHTML = '';

        const main = dv.el('div', '');
        main.style.cssText = 'padding:16px 0 16px 2px;';
        buildDateFilterPanel(main);
        buildMarkFilterPanel(main);
        buildControlPanel(main);
        buildSortRow(main);

        const layout = dv.el('div', '', { cls: 'main-layout' });
        const leftDiv = dv.el('div', '', { cls: 'left-panel' });
        const resizer = dv.el('div', '', { cls: 'resizer' });
        const chartDiv = dv.el('div', '', { cls: 'chart-panel' });
        layout.append(leftDiv, resizer, chartDiv);
        main.appendChild(layout);
        dv.container.appendChild(main);
        state.chartContainer = chartDiv;

        state.tooltipDiv = dv.el('div', '', { cls: 'dataview-tooltip' });
        document.body.appendChild(state.tooltipDiv);

        if (!state.treeRenderer) {
            state.treeRenderer = new TaskTreeRenderer({
                container: leftDiv,
                dv: dv,
                app: app,
                state: state,
                collapsedNodes: collapsedNodes,
                onFilterRootPathChange: (path) => {
                    state.filterRootPath = path;
                    state.filterCache.fingerprint = '';
                    saveFilterState(state, collapsedNodes);
                    renderAll();
                },
                onCollapseChange: () => {
                    saveFilterState(state, collapsedNodes);
                }
            });
            state.treeRenderer.setFilteredTasksProvider(() => {
                return state.filterCache.tasks || applyAllFilters();
            });
        } else {
            state.treeRenderer.container = leftDiv;
        }

        let startX, startWidth;
        resizer.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startWidth = leftDiv.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            const onMove = (e) => {
                const dx = e.clientX - startX;
                const newW = Math.max(200, Math.min(600, startWidth + dx));
                leftDiv.style.width = newW + 'px';
                state.leftPanelWidth = newW;
                debouncedResize();
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', () => {
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMove);
                saveFilterState(state, collapsedNodes);
            }, { once: true });
        });

        bindScaleEvents(chartDiv);
        showScaleHint(chartDiv);

        if (state.resizeObserver) state.resizeObserver.disconnect();
        state.resizeObserver = new ResizeObserver(() => { debouncedResize(); });
        state.resizeObserver.observe(chartDiv);

        renderAll();
    }

    readTasks.getAllTasks(true, dv, state);
    loadFilterState(state, collapsedNodes, () => {
        const thisWeek = getWeekRange(new Date());
        return { start: thisWeek.start, end: thisWeek.end };
    });
    renderFullUI();

    return function cleanup() {
        state.chartInstances.forEach(c => { try { c.dispose(); } catch(e) {} });
        state.chartInstances = [];
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }
        if (state.tooltipDiv) {
            state.tooltipDiv.remove();
            state.tooltipDiv = null;
        }
        if (state.treeRenderer) {
            state.treeRenderer.container = null;
            state.treeRenderer = null;
        }
        document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());
    };
}