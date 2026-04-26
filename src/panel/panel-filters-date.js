// src/panel/panel-filters-date.js
// 日期筛选面板：快捷按钮 + 年/季/月/周/星期级联选择器

import { DateUtils } from '../common';
import { CONFIG } from '../configs/configs-plugin';

function clearQuickHighlights(state) {
    state.quickBtns.forEach(b => b.className = 'quick-btn');
}

function clearDateSelections(state) {
    state.dateState.selections = { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} };
    updateDateButtonStyles(state);
}

function updateDateButtonStyles(state) {
    const s = state.dateState.selections;
    state.yearBtns.forEach((btn, i) => {
        btn.className = s.years[CONFIG.YEAR_LIST[i]] ? 'cascade-btn cascade-btn-active' : 'cascade-btn';
    });
    const yearsSel = Object.keys(s.years).length > 0;
    const singleY = yearsSel && Object.keys(s.years).length === 1 ? Object.keys(s.years)[0] : null;
    state.quarterBtns.forEach((btn, q) => {
        const disabled = !singleY;
        btn.disabled = disabled;
        const key = singleY ? singleY + '-Q' + (q + 1) : '';
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
            const sm = (qn - 1) * 3 + 1;
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
        const key = singleM ? singleM + '-W' + (w + 1) : '';
        const active = !disabled && s.weeks[key];
        btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
    });
    const weeksSel = Object.keys(s.weeks).length > 0;
    const singleW = weeksSel && Object.keys(s.weeks).length === 1 ? Object.keys(s.weeks)[0] : null;
    state.weekdayBtns.forEach((btn, d) => {
        const disabled = !singleW;
        btn.disabled = disabled;
        const key = singleW ? singleW + '-D' + (d + 1) : '';
        const active = !disabled && s.weekdays[key];
        btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
    });
}

export function getQueryRangeFromDateSelection(state) {
    const s = state.dateState.selections;
    const years = Object.keys(s.years);
    if (!years.length) return null;
    years.sort();
    const wdKeys = Object.keys(s.weekdays);
    if (wdKeys.length) {
        const ranges = wdKeys.map(k => {
            const m = k.match(/(\d+)-Q(\d+)-M(\d+)-W(\d+)-D(\d+)/);
            const y = +m[1], mo = +m[3], w = +m[4], wd = +m[5];
            const monStart = new Date(y, mo - 1, 1);
            const firstW = DateUtils.getISOWeekNumber(monStart);
            const targetW = firstW + w - 1;
            const wr = DateUtils.getWeekRangeByYearWeek(y, targetW);
            return DateUtils.getWeekdayRange(wr.start, wd);
        });
        return {
            start: DateUtils.setStart(new Date(Math.min(...ranges.map(r => r.start)))),
            end: DateUtils.setEnd(new Date(Math.max(...ranges.map(r => r.end))))
        };
    }
    const wKeys = Object.keys(s.weeks);
    if (wKeys.length) {
        const ranges = wKeys.map(k => {
            const m = k.match(/(\d+)-Q(\d+)-M(\d+)-W(\d+)/);
            const y = +m[1], mo = +m[3], w = +m[4];
            const monStart = new Date(y, mo - 1, 1);
            const firstW = DateUtils.getISOWeekNumber(monStart);
            const targetW = firstW + w - 1;
            return DateUtils.getWeekRangeByYearWeek(y, targetW);
        });
        return {
            start: DateUtils.setStart(new Date(Math.min(...ranges.map(r => r.start)))),
            end: DateUtils.setEnd(new Date(Math.max(...ranges.map(r => r.end))))
        };
    }
    const mKeys = Object.keys(s.months);
    if (mKeys.length) {
        const ranges = mKeys.map(k => {
            const m = k.match(/(\d+)-Q(\d+)-M(\d+)/);
            return DateUtils.getMonthRangeByYearMonth(+m[1], +m[3]);
        });
        return {
            start: DateUtils.setStart(new Date(Math.min(...ranges.map(r => r.start)))),
            end: DateUtils.setEnd(new Date(Math.max(...ranges.map(r => r.end))))
        };
    }
    const qKeys = Object.keys(s.quarters);
    if (qKeys.length) {
        const ranges = qKeys.map(k => {
            const m = k.match(/(\d+)-Q(\d+)/);
            return DateUtils.getQuarterRangeByYearQuarter(+m[1], +m[2]);
        });
        return {
            start: DateUtils.setStart(new Date(Math.min(...ranges.map(r => r.start)))),
            end: DateUtils.setEnd(new Date(Math.max(...ranges.map(r => r.end))))
        };
    }
    const ranges = years.map(y => DateUtils.getYearRangeByYear(+y));
    return {
        start: DateUtils.setStart(new Date(Math.min(...ranges.map(r => r.start)))),
        end: DateUtils.setEnd(new Date(Math.max(...ranges.map(r => r.end))))
    };
}

export function buildDateFilterPanel(container, dv, state) {
    const dateSection = dv.el('div', '', { cls: 'filter-section' });
    const quickRow = dv.el('div', '');
    quickRow.style.cssText = 'margin-bottom:12px; display:flex; flex-wrap:wrap; gap:8px;';
    const quickDefs = [
        { label: '今天', range: () => DateUtils.getDayRange(new Date()) },
        { label: '昨天', range: () => { const d = new Date(); d.setDate(d.getDate() - 1); return DateUtils.getDayRange(d); } },
        { label: '明天', range: () => { const d = new Date(); d.setDate(d.getDate() + 1); return DateUtils.getDayRange(d); } },
        { label: '本周', range: () => DateUtils.getWeekRange(new Date()) },
        { label: '本月', range: () => DateUtils.getMonthRange(new Date()) },
        { label: '所有任务', range: null }
    ];
    state.quickBtns = [];
    quickDefs.forEach(def => {
        const btn = dv.el('button', def.label, { cls: 'quick-btn' });
        btn.onclick = () => {
            clearQuickHighlights(state);
            btn.classList.add('quick-btn-active');
            clearDateSelections(state);
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
                clearQuickHighlights(state); clearDateSelections(state);
                const now = new Date(); now.setDate(now.getDate() - 7);
                const r = DateUtils.getWeekRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; prevBtn.classList.add('quick-btn-active');
            };
            quickRow.appendChild(prevBtn); state.quickBtns.push(prevBtn);
            const nextBtn = dv.el('button', '下周', { cls: 'quick-btn' });
            nextBtn.onclick = () => {
                clearQuickHighlights(state); clearDateSelections(state);
                const now = new Date(); now.setDate(now.getDate() + 7);
                const r = DateUtils.getWeekRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; nextBtn.classList.add('quick-btn-active');
            };
            quickRow.appendChild(nextBtn); state.quickBtns.push(nextBtn);
        }
        if (def.label === '本月') {
            const prevBtn = dv.el('button', '上月', { cls: 'quick-btn' });
            prevBtn.onclick = () => {
                clearQuickHighlights(state); clearDateSelections(state);
                const now = new Date(); now.setMonth(now.getMonth() - 1);
                const r = DateUtils.getMonthRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; prevBtn.classList.add('quick-btn-active');
            };
            quickRow.appendChild(prevBtn); state.quickBtns.push(prevBtn);
            const nextBtn = dv.el('button', '下月', { cls: 'quick-btn' });
            nextBtn.onclick = () => {
                clearQuickHighlights(state); clearDateSelections(state);
                const now = new Date(); now.setMonth(now.getMonth() + 1);
                const r = DateUtils.getMonthRange(now);
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
    CONFIG.YEAR_LIST.forEach(y => {
        const btn = dv.el('button', y.toString(), { cls: 'cascade-btn' });
        btn.onclick = () => {
            clearQuickHighlights(state);
            if (state.dateState.selections.years[y]) delete state.dateState.selections.years[y];
            else state.dateState.selections.years[y] = true;
            if (Object.keys(state.dateState.selections.years).length !== 1) {
                state.dateState.selections.quarters = {};
                state.dateState.selections.months = {};
                state.dateState.selections.weeks = {};
                state.dateState.selections.weekdays = {};
            }
            updateDateButtonStyles(state);
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
                updateDateButtonStyles(state);
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
                updateDateButtonStyles(state);
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
                updateDateButtonStyles(state);
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
                const key = wKey + '-D' + (idx + 1);
                if (state.dateState.selections.weekdays[key]) delete state.dateState.selections.weekdays[key];
                else state.dateState.selections.weekdays[key] = true;
                updateDateButtonStyles(state);
                state.filterCache.fingerprint = '';
            };
            rows[4].appendChild(btn);
            state.weekdayBtns.push(btn);
        })(d);
    });
    container.appendChild(dateSection);
}

export function resetDateFilterUI(state) {
    clearQuickHighlights(state);
    clearDateSelections(state);
}