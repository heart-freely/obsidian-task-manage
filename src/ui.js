// src/ui.js —— 左侧面板、筛选面板、控制面板、排序按钮
var common = require('./common');
var taskEngine = require('./task-engine');

var state = common.state;
var CONFIG = common.CONFIG;
var ALLOWED_STATUSES = common.ALLOWED_STATUSES;
var STATUS_NAMES = common.STATUS_NAMES;
var STATUS_ICONS = common.STATUS_ICONS;
var MARK_NAMES = common.MARK_NAMES;
var ALL_MARKS = common.ALL_MARKS;
var YEAR_LIST = common.YEAR_LIST;
var DateUtils = common.DateUtils;
var collapsedAdd = common.collapsedAdd;
var collapsedRemove = common.collapsedRemove;
var collapsedHas = common.collapsedHas;
var SORT_TYPES = common.SORT_TYPES;

var formatDate = DateUtils.formatDate;
var setStart = DateUtils.setStart;
var setEnd = DateUtils.setEnd;
var getDayRange = DateUtils.getDayRange;
var getWeekRange = DateUtils.getWeekRange;
var getMonthRange = DateUtils.getMonthRange;
var getMonthRangeByYearMonth = DateUtils.getMonthRangeByYearMonth;
var getQuarterRangeByYearQuarter = DateUtils.getQuarterRangeByYearQuarter;
var getYearRangeByYear = DateUtils.getYearRangeByYear;
var getWeekdayRange = DateUtils.getWeekdayRange;
var getWeekRangeByYearWeek = DateUtils.getWeekRangeByYearWeek;
var getISOWeekNumber = DateUtils.getISOWeekNumber;

var getStatusIcon = taskEngine.getStatusIcon;
var isTaskToday = taskEngine.isTaskToday;
var calcNodeStats = taskEngine.calcNodeStats;
var applyAllFilters = taskEngine.applyAllFilters;
var buildTree = taskEngine.buildTree;
var sortTreeNodes = taskEngine.sortTreeNodes;
var flattenTreeForDisplay = taskEngine.flattenTreeForDisplay;

// ========== UI 辅助函数 ==========
function clearQuickHighlights() {
    state.quickBtns.forEach(function (b) { b.className = 'quick-btn'; });
}

function clearDateSelections() {
    state.dateState.selections = { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} };
    updateDateButtonStyles();
}

function updateDateButtonStyles() {
    var s = state.dateState.selections;
    state.yearBtns.forEach(function (btn, i) {
        btn.className = s.years[YEAR_LIST[i]] ? 'cascade-btn cascade-btn-active' : 'cascade-btn';
    });
    var yearsSel = Object.keys(s.years).length > 0;
    var singleY = yearsSel && Object.keys(s.years).length === 1 ? Object.keys(s.years)[0] : null;
    state.quarterBtns.forEach(function (btn, q) {
        var disabled = !singleY;
        btn.disabled = disabled;
        var key = singleY ? singleY + '-Q' + (q + 1) : '';
        var active = !disabled && s.quarters[key];
        btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
    });
    var quartersSel = Object.keys(s.quarters).length > 0;
    var singleQ = quartersSel && Object.keys(s.quarters).length === 1 ? Object.keys(s.quarters)[0] : null;
    state.monthBtns.forEach(function (btn, m) {
        var month = m + 1;
        var disabled = true;
        if (singleQ) {
            var parts = singleQ.split('-Q');
            var y = parseInt(parts[0], 10);
            var qn = parseInt(parts[1], 10);
            var sm = (qn - 1) * 3 + 1;
            var em = sm + 2;
            disabled = (month < sm || month > em);
        } else if (quartersSel) disabled = true;
        btn.disabled = disabled;
        var key = singleQ ? singleQ + '-M' + month : '';
        var active = !disabled && s.months[key];
        btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
    });
    var monthsSel = Object.keys(s.months).length > 0;
    var singleM = monthsSel && Object.keys(s.months).length === 1 ? Object.keys(s.months)[0] : null;
    state.weekBtns.forEach(function (btn, w) {
        var disabled = !singleM;
        btn.disabled = disabled;
        var key = singleM ? singleM + '-W' + (w + 1) : '';
        var active = !disabled && s.weeks[key];
        btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
    });
    var weeksSel = Object.keys(s.weeks).length > 0;
    var singleW = weeksSel && Object.keys(s.weeks).length === 1 ? Object.keys(s.weeks)[0] : null;
    state.weekdayBtns.forEach(function (btn, d) {
        var disabled = !singleW;
        btn.disabled = disabled;
        var key = singleW ? singleW + '-D' + (d + 1) : '';
        var active = !disabled && s.weekdays[key];
        btn.className = disabled ? 'cascade-btn cascade-btn-disabled' : (active ? 'cascade-btn cascade-btn-active' : 'cascade-btn');
    });
}

function getQueryRangeFromDateSelection() {
    var s = state.dateState.selections;
    var years = Object.keys(s.years);
    if (!years.length) return null;
    years.sort();
    var wdKeys = Object.keys(s.weekdays);
    if (wdKeys.length) {
        var ranges = wdKeys.map(function (k) {
            var m = k.match(/(\d+)-Q(\d+)-M(\d+)-W(\d+)-D(\d+)/);
            var y = +m[1], mo = +m[3], w = +m[4], wd = +m[5];
            var monStart = new Date(y, mo - 1, 1);
            var firstW = getISOWeekNumber(monStart);
            var targetW = firstW + w - 1;
            var wr = getWeekRangeByYearWeek(y, targetW);
            return getWeekdayRange(wr.start, wd);
        });
        return {
            start: setStart(new Date(Math.min.apply(null, ranges.map(function (r) { return r.start; })))),
            end: setEnd(new Date(Math.max.apply(null, ranges.map(function (r) { return r.end; }))))
        };
    }
    var wKeys = Object.keys(s.weeks);
    if (wKeys.length) {
        var ranges = wKeys.map(function (k) {
            var m = k.match(/(\d+)-Q(\d+)-M(\d+)-W(\d+)/);
            var y = +m[1], mo = +m[3], w = +m[4];
            var monStart = new Date(y, mo - 1, 1);
            var firstW = getISOWeekNumber(monStart);
            var targetW = firstW + w - 1;
            return getWeekRangeByYearWeek(y, targetW);
        });
        return {
            start: setStart(new Date(Math.min.apply(null, ranges.map(function (r) { return r.start; })))),
            end: setEnd(new Date(Math.max.apply(null, ranges.map(function (r) { return r.end; }))))
        };
    }
    var mKeys = Object.keys(s.months);
    if (mKeys.length) {
        var ranges = mKeys.map(function (k) {
            var m = k.match(/(\d+)-Q(\d+)-M(\d+)/);
            return getMonthRangeByYearMonth(+m[1], +m[3]);
        });
        return {
            start: setStart(new Date(Math.min.apply(null, ranges.map(function (r) { return r.start; })))),
            end: setEnd(new Date(Math.max.apply(null, ranges.map(function (r) { return r.end; }))))
        };
    }
    var qKeys = Object.keys(s.quarters);
    if (qKeys.length) {
        var ranges = qKeys.map(function (k) {
            var m = k.match(/(\d+)-Q(\d+)/);
            return getQuarterRangeByYearQuarter(+m[1], +m[2]);
        });
        return {
            start: setStart(new Date(Math.min.apply(null, ranges.map(function (r) { return r.start; })))),
            end: setEnd(new Date(Math.max.apply(null, ranges.map(function (r) { return r.end; }))))
        };
    }
    var ranges = years.map(function (y) { return getYearRangeByYear(+y); });
    return {
        start: setStart(new Date(Math.min.apply(null, ranges.map(function (r) { return r.start; })))),
        end: setEnd(new Date(Math.max.apply(null, ranges.map(function (r) { return r.end; }))))
    };
}

// ========== 筛选面板 ==========
function buildDateFilterPanel(container, dv) {
    var dateSection = dv.el('div', '', { cls: 'filter-section' });
    var quickRow = dv.el('div', '');
    quickRow.style.cssText = 'margin-bottom:12px; display:flex; flex-wrap:wrap; gap:8px;';
    var quickDefs = [
        { label: '今天', range: function () { return getDayRange(new Date()); } },
        { label: '昨天', range: function () { var d = new Date(); d.setDate(d.getDate() - 1); return getDayRange(d); } },
        { label: '明天', range: function () { var d = new Date(); d.setDate(d.getDate() + 1); return getDayRange(d); } },
        { label: '本周', range: function () { return getWeekRange(new Date()); } },
        { label: '本月', range: function () { return getMonthRange(new Date()); } },
        { label: '所有任务', range: null }
    ];
    state.quickBtns = [];
    quickDefs.forEach(function (def) {
        var btn = dv.el('button', def.label, { cls: 'quick-btn' });
        btn.onclick = function () {
            clearQuickHighlights();
            btn.classList.add('quick-btn-active');
            clearDateSelections();
            if (def.label === '所有任务') {
                state.dateFilterState.isAll = true;
                state.dateFilterState.start = state.dateFilterState.end = null;
            } else {
                state.dateFilterState.isAll = false;
                var r = def.range();
                state.dateFilterState.start = r.start;
                state.dateFilterState.end = r.end;
            }
            state.filterCache.fingerprint = '';
        };
        quickRow.appendChild(btn);
        state.quickBtns.push(btn);
        if (def.label === '本周') {
            var prevBtn = dv.el('button', '上周', { cls: 'quick-btn' });
            prevBtn.onclick = function () {
                clearQuickHighlights(); clearDateSelections();
                var now = new Date(); now.setDate(now.getDate() - 7);
                var r = getWeekRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; prevBtn.classList.add('quick-btn-active');
            };
            quickRow.appendChild(prevBtn); state.quickBtns.push(prevBtn);
            var nextBtn = dv.el('button', '下周', { cls: 'quick-btn' });
            nextBtn.onclick = function () {
                clearQuickHighlights(); clearDateSelections();
                var now = new Date(); now.setDate(now.getDate() + 7);
                var r = getWeekRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; nextBtn.classList.add('quick-btn-active');
            };
            quickRow.appendChild(nextBtn); state.quickBtns.push(nextBtn);
        }
        if (def.label === '本月') {
            var prevBtn = dv.el('button', '上月', { cls: 'quick-btn' });
            prevBtn.onclick = function () {
                clearQuickHighlights(); clearDateSelections();
                var now = new Date(); now.setMonth(now.getMonth() - 1);
                var r = getMonthRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; prevBtn.classList.add('quick-btn-active');
            };
            quickRow.appendChild(prevBtn); state.quickBtns.push(prevBtn);
            var nextBtn = dv.el('button', '下月', { cls: 'quick-btn' });
            nextBtn.onclick = function () {
                clearQuickHighlights(); clearDateSelections();
                var now = new Date(); now.setMonth(now.getMonth() + 1);
                var r = getMonthRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; nextBtn.classList.add('quick-btn-active');
            };
            quickRow.appendChild(nextBtn); state.quickBtns.push(nextBtn);
        }
    });
    dateSection.appendChild(quickRow);

    var rows = [dv.el('div', ''), dv.el('div', ''), dv.el('div', ''), dv.el('div', ''), dv.el('div', '')];
    var labels = ['年份', '季度', '月份', '周数', '周几'];
    rows.forEach(function (row, r) {
        row.style.cssText = 'margin-bottom:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;';
        row.appendChild(dv.el('span', labels[r], { cls: 'filter-label' }));
        dateSection.appendChild(row);
    });

    state.yearBtns = [];
    YEAR_LIST.forEach(function (y) {
        var btn = dv.el('button', y.toString(), { cls: 'cascade-btn' });
        btn.onclick = function () {
            clearQuickHighlights();
            if (state.dateState.selections.years[y]) {
                delete state.dateState.selections.years[y];
            } else {
                state.dateState.selections.years[y] = true;
            }
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
    for (var q = 1; q <= 4; q++) {
        (function (qq) {
            var btn = dv.el('button', '第' + qq + '季度', { cls: 'cascade-btn cascade-btn-disabled' });
            btn.disabled = true;
            btn.onclick = function () {
                if (Object.keys(state.dateState.selections.years).length !== 1) return;
                var y = Object.keys(state.dateState.selections.years)[0];
                var key = y + '-Q' + qq;
                if (state.dateState.selections.quarters[key]) {
                    delete state.dateState.selections.quarters[key];
                } else {
                    state.dateState.selections.quarters[key] = true;
                }
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
    for (var m = 1; m <= 12; m++) {
        (function (mm) {
            var btn = dv.el('button', mm + '月', { cls: 'cascade-btn cascade-btn-disabled' });
            btn.disabled = true;
            btn.onclick = function () {
                if (Object.keys(state.dateState.selections.quarters).length !== 1) return;
                var qKey = Object.keys(state.dateState.selections.quarters)[0];
                var key = qKey + '-M' + mm;
                if (state.dateState.selections.months[key]) {
                    delete state.dateState.selections.months[key];
                } else {
                    state.dateState.selections.months[key] = true;
                }
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
    for (var w = 1; w <= 4; w++) {
        (function (ww) {
            var btn = dv.el('button', '第' + ww + '周', { cls: 'cascade-btn cascade-btn-disabled' });
            btn.disabled = true;
            btn.onclick = function () {
                if (Object.keys(state.dateState.selections.months).length !== 1) return;
                var mKey = Object.keys(state.dateState.selections.months)[0];
                var key = mKey + '-W' + ww;
                if (state.dateState.selections.weeks[key]) {
                    delete state.dateState.selections.weeks[key];
                } else {
                    state.dateState.selections.weeks[key] = true;
                }
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
    ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].forEach(function (wd, d) {
        (function (idx) {
            var btn = dv.el('button', wd, { cls: 'cascade-btn cascade-btn-disabled' });
            btn.disabled = true;
            btn.onclick = function () {
                if (Object.keys(state.dateState.selections.weeks).length !== 1) return;
                var wKey = Object.keys(state.dateState.selections.weeks)[0];
                var key = wKey + '-D' + (idx + 1);
                if (state.dateState.selections.weekdays[key]) {
                    delete state.dateState.selections.weekdays[key];
                } else {
                    state.dateState.selections.weekdays[key] = true;
                }
                updateDateButtonStyles();
                state.filterCache.fingerprint = '';
            };
            rows[4].appendChild(btn);
            state.weekdayBtns.push(btn);
        })(d);
    });
    container.appendChild(dateSection);
}

function buildMarkFilterPanel(container, dv) {
    var wrapper = dv.el('div', '', { cls: 'filter-section' });
    var statusDiv = dv.el('div', '');
    statusDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px;';
    statusDiv.appendChild(dv.el('span', '执行状态', { cls: 'filter-label' }));
    ALLOWED_STATUSES.forEach(function (st) {
        var active = state.markFilterState.statuses.indexOf(st) !== -1;
        var btn = dv.el('button', STATUS_NAMES[st]);
        btn.style.cssText = 'padding:2px 10px; border-radius:16px; background:' +
            (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
            '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
        btn.onclick = function () {
            var idx = state.markFilterState.statuses.indexOf(st);
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

    var incDiv = dv.el('div', '');
    incDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px;';
    incDiv.appendChild(dv.el('span', '包含标记', { cls: 'filter-label' }));
    ALL_MARKS.forEach(function (mk) {
        var active = state.markFilterState.includeMarks.indexOf(mk) !== -1;
        var btn = dv.el('button', MARK_NAMES[mk]);
        btn.style.cssText = 'padding:2px 8px; border-radius:16px; background:' +
            (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
            '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
        btn.dataset.mark = mk;
        btn.dataset.type = 'include';
        btn.onclick = function () {
            var incIdx = state.markFilterState.includeMarks.indexOf(mk);
            var excIdx = state.markFilterState.excludeMarks.indexOf(mk);
            if (incIdx === -1) {
                state.markFilterState.includeMarks.push(mk);
                if (excIdx !== -1) state.markFilterState.excludeMarks.splice(excIdx, 1);
                btn.style.background = 'var(--interactive-accent)';
                btn.style.color = 'white';
                document.querySelectorAll('button[data-mark="' + mk + '"][data-type="exclude"]').forEach(function (b) {
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

    var excDiv = dv.el('div', '');
    excDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px;';
    excDiv.appendChild(dv.el('span', '排除标记', { cls: 'filter-label' }));
    ALL_MARKS.forEach(function (mk) {
        var active = state.markFilterState.excludeMarks.indexOf(mk) !== -1;
        var btn = dv.el('button', MARK_NAMES[mk]);
        btn.style.cssText = 'padding:2px 8px; border-radius:16px; background:' +
            (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
            '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
        btn.dataset.mark = mk;
        btn.dataset.type = 'exclude';
        btn.onclick = function () {
            var excIdx = state.markFilterState.excludeMarks.indexOf(mk);
            var incIdx = state.markFilterState.includeMarks.indexOf(mk);
            if (excIdx === -1) {
                state.markFilterState.excludeMarks.push(mk);
                if (incIdx !== -1) state.markFilterState.includeMarks.splice(incIdx, 1);
                btn.style.background = 'var(--interactive-accent)';
                btn.style.color = 'white';
                document.querySelectorAll('button[data-mark="' + mk + '"][data-type="include"]').forEach(function (b) {
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

    var queryRow = dv.el('div', '');
    queryRow.style.cssText = 'margin-top:16px; display:flex; gap:12px; justify-content:flex-end;';
    var queryBtn = dv.el('button', '🔍 执行查询', {
        style: 'padding:8px 24px; border-radius:24px; background:var(--interactive-accent); color:white; font-weight:bold;'
    });
    var resetAllBtn = dv.el('button', '🔄 重置所有筛选', {
        style: 'padding:8px 24px; border-radius:24px; background:var(--interactive-normal);'
    });
    queryBtn.onclick = function () {
        var isAllActive = state.quickBtns.some(function (b) {
            return b.classList.contains('quick-btn-active') && b.textContent === '所有任务';
        });
        if (isAllActive) {
            state.dateFilterState.isAll = true;
            state.dateFilterState.start = state.dateFilterState.end = null;
        } else {
            var dr = getQueryRangeFromDateSelection();
            if (dr) {
                state.dateFilterState.isAll = false;
                state.dateFilterState.start = dr.start;
                state.dateFilterState.end = dr.end;
            }
        }
        state.filterCache.fingerprint = '';
        // 注意：此处 renderAll 是在外部 core.js 中定义的，需要通过参数传入或全局引用
        if (window._taskPanelRenderAll) window._taskPanelRenderAll();
    };
    resetAllBtn.onclick = function () {
        clearDateSelections();
        clearQuickHighlights();
        state.markFilterState.statuses = ALLOWED_STATUSES.slice();
        state.markFilterState.includeMarks = [];
        state.markFilterState.excludeMarks = [];
        state.hideRepeatTasks = true;
        state.hideCompletedTasks = true;
        state.hideCancelledTasks = true;
        state.hideFolders = true;
        var thisWeek = getWeekRange(new Date());
        state.dateFilterState.isAll = false;
        state.dateFilterState.start = thisWeek.start;
        state.dateFilterState.end = thisWeek.end;
        state.leftSort = { type: SORT_TYPES.STATUS, order: 'asc' };
        state.filterCache.fingerprint = '';
        if (window._taskPanelRenderFullUI) window._taskPanelRenderFullUI();
    };
    queryRow.appendChild(queryBtn);
    queryRow.appendChild(resetAllBtn);
    wrapper.appendChild(queryRow);
    container.appendChild(wrapper);
}

// ========== 控制面板 ==========
function buildControlPanel(container, dv) {
    var ctrlRow = dv.el('div', '');
    ctrlRow.style.cssText = 'display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;';
    var intervalBtn = dv.el('button', state.intervalMode === 'scheduled-due' ? '⏱️ 计划-截止' : '⏱️ 开始-完成', { cls: 'quick-btn' });
    intervalBtn.onclick = function () {
        state.intervalMode = state.intervalMode === 'scheduled-due' ? 'starts-done' : 'scheduled-due';
        intervalBtn.textContent = state.intervalMode === 'scheduled-due' ? '⏱️ 计划-截止' : '⏱️ 开始-完成';
        state.filterCache.fingerprint = '';
        if (window._taskPanelRenderAll) window._taskPanelRenderAll();
    };
    ctrlRow.appendChild(intervalBtn);

    var repeatBtn = dv.el('button', state.hideRepeatTasks ? '🔄 显示循环' : '🔄 隐藏循环', { cls: 'quick-btn' });
    repeatBtn.onclick = function () {
        state.hideRepeatTasks = !state.hideRepeatTasks;
        repeatBtn.textContent = state.hideRepeatTasks ? '🔄 显示循环' : '🔄 隐藏循环';
        state.filterCache.fingerprint = '';
        if (window._taskPanelRenderAll) window._taskPanelRenderAll();
    };
    ctrlRow.appendChild(repeatBtn);

    var completedBtn = dv.el('button', state.hideCompletedTasks ? '✅ 显示已完成' : '✅ 隐藏已完成', { cls: 'quick-btn' });
    completedBtn.onclick = function () {
        state.hideCompletedTasks = !state.hideCompletedTasks;
        completedBtn.textContent = state.hideCompletedTasks ? '✅ 显示已完成' : '✅ 隐藏已完成';
        state.filterCache.fingerprint = '';
        if (window._taskPanelRenderAll) window._taskPanelRenderAll();
    };
    ctrlRow.appendChild(completedBtn);

    var cancelledBtn = dv.el('button', state.hideCancelledTasks ? '❎ 显示已取消' : '❎ 隐藏已取消', { cls: 'quick-btn' });
    cancelledBtn.onclick = function () {
        state.hideCancelledTasks = !state.hideCancelledTasks;
        cancelledBtn.textContent = state.hideCancelledTasks ? '❎ 显示已取消' : '❎ 隐藏已取消';
        state.filterCache.fingerprint = '';
        if (window._taskPanelRenderAll) window._taskPanelRenderAll();
    };
    ctrlRow.appendChild(cancelledBtn);

    var folderBtn = dv.el('button', state.hideFolders ? '📂 显示文件夹' : '📁 隐藏文件夹', { cls: 'quick-btn' });
    folderBtn.onclick = function () {
        state.hideFolders = !state.hideFolders;
        folderBtn.textContent = state.hideFolders ? '📂 显示文件夹' : '📁 隐藏文件夹';
        if (window._taskPanelRenderLeftOnly) window._taskPanelRenderLeftOnly();
    };
    ctrlRow.appendChild(folderBtn);

    var clearCacheBtn = dv.el('button', '🗑️ 清除缓存', { cls: 'quick-btn' });
    clearCacheBtn.onclick = function () {
        state.cachedAllTasks = null;
        state.filterCache = { fingerprint: '', tasks: null };
        common.taskIdMapClear();
        // getAllTasks 需要 dv 参数，这里暂不传，实际应在 core 中绑定
        if (window._taskPanelRefreshAll) window._taskPanelRefreshAll();
    };
    ctrlRow.appendChild(clearCacheBtn);

    container.appendChild(ctrlRow);
}

function buildSortRow(container, dv) {
    var row = dv.el('div', '', { cls: 'sort-row' });
    row.appendChild(dv.el('span', '排序:', { style: 'font-weight:bold;' }));
    var makeSortBtn = function (label, type) {
        var btn = dv.el('button', label, { cls: 'sort-btn' });
        btn.onclick = function () {
            if (state.leftSort.type === type) {
                state.leftSort.order = state.leftSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                state.leftSort.type = type;
                state.leftSort.order = 'asc';
            }
            if (window._taskPanelRenderAll) window._taskPanelRenderAll();
            updateSortButtons();
        };
        return btn;
    };
    row.appendChild(makeSortBtn('状态', 'status'));
    row.appendChild(makeSortBtn('优先级', 'priority'));
    row.appendChild(makeSortBtn('时间', 'time'));
    container.appendChild(row);
}

function updateSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(function (btn) {
        var text = btn.textContent;
        var type = text.indexOf('状态') !== -1 ? 'status' : text.indexOf('优先级') !== -1 ? 'priority' : 'time';
        if (type === state.leftSort.type) {
            var label = type === 'status' ? '状态' : type === 'priority' ? '优先级' : '时间';
            btn.textContent = label + (state.leftSort.order === 'asc' ? '↑' : '↓');
            btn.classList.add('sort-btn-active');
        } else {
            btn.classList.remove('sort-btn-active');
        }
    });
}

// ========== 左侧任务树 ==========
function renderLeftPanelOnly(dv, app) {
    var leftPanel = document.querySelector('.left-panel');
    if (!leftPanel) return;
    var filtered = state.filterCache.tasks || applyAllFilters(dv);
    var rootNodes = buildTree(filtered, dv);
    sortTreeNodes(rootNodes);
    var flat = [];
    flattenTreeForDisplay(rootNodes, 0, flat);
    state.flatDisplayNodes = flat;
    renderLeftPanel(leftPanel, flat, dv, app);
    common.saveFilterState();
}

function renderLeftPanel(container, flatNodes, dv, app) {
    if (!container) return;
    container.innerHTML = '';
    if (state.filterRootPath) {
        var ind = document.createElement('div');
        ind.innerHTML = '📌 已聚焦：' + state.filterRootPath + ' <span style="cursor:pointer;margin-left:8px;">❌ 清除</span>';
        ind.querySelector('span').onclick = function () {
            state.filterRootPath = null;
            state.filterCache.fingerprint = '';
            common.saveFilterState();
            if (window._taskPanelRenderAll) window._taskPanelRenderAll();
        };
        container.appendChild(ind);
    }
    if (!flatNodes || flatNodes.length === 0) {
        container.appendChild(dv.el('div', '📭 无匹配任务', { cls: 'empty-message' }));
        return;
    }
    var ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.paddingLeft = '0';
    ul.style.cssText = 'content-visibility: auto; contain-intrinsic-size: 1px 28px;';
    ul.addEventListener('mouseover', function (e) {
        if (state.modalOpen) return;
        var target = e.target.closest('[data-tooltip-html]');
        if (target && state.tooltipDiv) {
            state.tooltipDiv.innerHTML = target.getAttribute('data-tooltip-html');
            state.tooltipDiv.style.display = 'block';
        }
    });
    ul.addEventListener('mousemove', function (e) {
        if (state.modalOpen || !state.tooltipDiv || state.tooltipDiv.style.display === 'none') return;
        state.tooltipDiv.style.left = (e.clientX + 15) + 'px';
        state.tooltipDiv.style.top = (e.clientY + 15) + 'px';
    });
    ul.addEventListener('mouseleave', function () {
        if (!state.modalOpen && state.tooltipDiv) state.tooltipDiv.style.display = 'none';
    });
    ul.addEventListener('click', function (e) {
        var target = e.target.closest('[data-task-link]');
        if (!target) return;
        var link = target.getAttribute('data-task-link');
        app.workspace.openLinkText(link, '', { active: true });
    });

    function renderNode(node) {
        var li = document.createElement('li');
        li.style.margin = '0';
        var header = document.createElement('div');
        header.style.cssText = 'display:flex; align-items:center; cursor:pointer; padding:2px 0; height:28px;';
        header.style.paddingLeft = (node.level * 16) + 'px';
        var toggle = document.createElement('span');
        toggle.style.cssText = 'width:16px; text-align:center; font-size:12px;';

        if (node.type === 'task') {
            toggle.style.visibility = 'hidden';
            header.appendChild(toggle);
            var task = node.task;
            if (isTaskToday(task)) {
                var mk = document.createElement('span');
                mk.className = 'today-marker';
                mk.textContent = '🔹';
                header.appendChild(mk);
            }
            var statusIcon = document.createElement('span');
            statusIcon.textContent = getStatusIcon(task) + ' ';
            statusIcon.style.marginLeft = '4px';
            header.appendChild(statusIcon);
            var descSpan = document.createElement('span');
            descSpan.className = 'task-text';
            descSpan.textContent = task._cleanText;
            header.appendChild(descSpan);
            header.setAttribute('data-tooltip-html', task._tooltipHtml);
            header.setAttribute('data-task-link', task.path + '#' + (task.line + 1));
            li.appendChild(header);
            return li;
        }

        var expanded = !collapsedHas(node.fullPath);
        toggle.textContent = expanded ? '▼' : '▶';
        toggle.onclick = function (e) {
            e.stopPropagation();
            if (collapsedHas(node.fullPath)) {
                collapsedRemove(node.fullPath);
            } else {
                collapsedAdd(node.fullPath);
            }
            renderLeftPanelOnly(dv, app);
        };
        header.appendChild(toggle);

        var iconSpan = document.createElement('span');
        iconSpan.style.marginLeft = '4px';
        iconSpan.style.fontWeight = 'bold';
        iconSpan.style.color = 'var(--text-accent)';
        iconSpan.style.whiteSpace = 'nowrap';
        iconSpan.style.overflow = 'hidden';
        iconSpan.style.textOverflow = 'ellipsis';
        iconSpan.style.flex = '1 1 auto';
        if (node.type === 'folder') {
            iconSpan.textContent = '📁 ' + node.name;
        } else {
            iconSpan.textContent = '📄 ' + node.name + ' (' + node.tasks.length + ')';
        }
        header.appendChild(iconSpan);

        var stats = calcNodeStats(node);
        if (stats.total > 0) {
            var prog = document.createElement('span');
            prog.className = 'progress-bar';
            prog.style.cssText = 'display:inline-flex; width:70px; height:6px; border-radius:3px; ' +
                                 'margin-left:8px; overflow:hidden; flex-shrink:0; font-size:0; background:transparent;';
            ALLOWED_STATUSES.forEach(function (st) {
                if (stats[st] > 0) {
                    var seg = document.createElement('span');
                    var percent = (stats[st] / stats.total * 100).toFixed(2);
                    seg.style.cssText = 'display:inline-block; height:100%; width:' + percent + '%;' +
                                        'background-color:' + CONFIG.STATUS_COLORS[st] + '; min-width:1px;';
                    seg.title = STATUS_NAMES[st] + ': ' + stats[st];
                    prog.appendChild(seg);
                }
            });
            header.appendChild(prog);
            var pct = document.createElement('span');
            pct.className = 'progress-text';
            pct.textContent = Math.round(stats.completed / stats.total * 100) + '%';
            header.appendChild(pct);
        }

        header.onclick = function (e) {
            e.stopPropagation();
            if (state.filterRootPath === node.fullPath) {
                state.filterRootPath = null;
            } else {
                state.filterRootPath = node.fullPath;
            }
            state.filterCache.fingerprint = '';
            common.saveFilterState();
            if (window._taskPanelRenderAll) window._taskPanelRenderAll();
        };
        li.appendChild(header);
        return li;
    }

    flatNodes.forEach(function (n) {
        ul.appendChild(renderNode(n));
    });
    container.appendChild(ul);
}

module.exports = {
    clearQuickHighlights,
    clearDateSelections,
    updateDateButtonStyles,
    getQueryRangeFromDateSelection,
    buildDateFilterPanel,
    buildMarkFilterPanel,
    buildControlPanel,
    buildSortRow,
    updateSortButtons,
    renderLeftPanelOnly,
    renderLeftPanel
};