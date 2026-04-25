// src/common.js —— 全局状态、配置、工具、持久化、CSS
(function () {
    // ========== Set/Map 模拟 ==========
    var collapsedNodes = {};
    var taskIdMap = {};

    function collapsedAdd(path) { collapsedNodes[path] = true; }
    function collapsedRemove(path) { delete collapsedNodes[path]; }
    function collapsedHas(path) { return !!collapsedNodes[path]; }
    function collapsedKeys() { return Object.keys(collapsedNodes); }
    function taskIdMapGet(id) { return taskIdMap[id]; }
    function taskIdMapSet(id, task) { taskIdMap[id] = task; }
    function taskIdMapClear() { for (var k in taskIdMap) delete taskIdMap[k]; }

    // ========== 常量 ==========
    var INTERVAL_MODES = { SCHEDULED_DUE: 'scheduled-due', STARTS_DONE: 'starts-done' };
    var SORT_TYPES = { STATUS: 'status', PRIORITY: 'priority', TIME: 'time' };

    var ALLOWED_STATUSES = ['todo', 'planned', 'in-progress', 'completed', 'cancelled'];
    var STATUS_NAMES = {
        todo: '未开始', planned: '计划中', 'in-progress': '进行中',
        completed: '已完成', cancelled: '已放弃'
    };
    var STATUS_ICONS = {
        todo: '🔲', planned: '❔', 'in-progress': '⏩',
        completed: '✅', cancelled: '❎'
    };
    var MARK_NAMES = {
        priority: '优先级', repeat: '循环', created: '创建', scheduled: '计划',
        starts: '开始', due: '截止', done: '完成', cancel: '取消',
        tag: '标签', id: '唯一ID', forbid: '引用ID'
    };
    var ALL_MARKS = ['priority','repeat','created','scheduled','starts','due','done','cancel','tag','id','forbid'];
    var YEAR_LIST = [2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031];
    var REPEAT_TYPES = ['every day','every week','every month','every year'];

    // ========== 全局状态 ==========
    var state = {
        cachedAllTasks: null,
        filterCache: { fingerprint: '', tasks: null },
        quickBtns: [],
        yearBtns: [], quarterBtns: [], monthBtns: [], weekBtns: [], weekdayBtns: [],
        dateState: { selections: { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} } },
        dateFilterState: { start: null, end: null, isAll: false },
        markFilterState: {
            statuses: ['todo','planned','in-progress','completed','cancelled'],
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
        modalOpen: false
    };

    // 挂载到 window 供清理
    window.__taskGanttState = state;

    // ========== 配置 ==========
    var CONFIG = {
        TASK_FOLDERS: ['"pages/A 系统/A 任务系统"'],
        FILE_NAME_PATTERN: /任务$/,
        STATUS_COLORS: {
            'todo': '#2e333b',
            'planned': '#4b525b',
            'in-progress': '#7fb8f0',
            'completed': '#47852f',
            'cancelled': '#c3393e'
        },
        PRIORITY_ORDER: ['⏬','🔽','🔼','⏫','🔺'],
        PRIORITY_COLORS: ['#98c379','#61afef','#d19a66','#e06c75','#c3393e'],
        REPEAT_ORDER: ['every day','every week','every month','every year'],
        REPEAT_COLORS: ['#a0c4ff','#9bf6ff','#ffd6a5','#fdffb6'],
        DATE_MARK_ORDER: ['created','scheduled','starts','due','done','cancel'],
        DATE_MARK_NAMES: {
            created: '➕ 创建', scheduled: '⏳ 计划', starts: '🛫 开始',
            due: '📅 截止', done: '✅ 完成', cancel: '❌ 取消'
        },
        DATE_MARK_COLORS: ['#b7bdf8','#ed8796','#f5a97f','#eed49f','#a6da95','#8bd5ca'],
        ROOT_PATH: 'pages/A 系统/A 任务系统/',
        WORK_HOURS_PER_DAY: 12
    };

    // ========== 日期工具 ==========
    var DateUtils = {
        formatDate: function (d) {
            function pad(n) { return n < 10 ? '0' + n : n; }
            return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        },
        setStart: function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); },
        setEnd: function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); },
        getDayRange: function (d) { return { start: DateUtils.setStart(d), end: DateUtils.setEnd(d) }; },
        getISOWeekNumber: function (date) {
            var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            var dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        },
        getWeekRangeByYearWeek: function (year, week) {
            var jan4 = new Date(Date.UTC(year, 0, 4));
            var jan4Day = jan4.getUTCDay() || 7;
            var firstThursday = new Date(Date.UTC(year, 0, 4 - (jan4Day - 4)));
            var weekStart = new Date(firstThursday);
            weekStart.setUTCDate(firstThursday.getUTCDate() - 3 + (week - 1) * 7);
            var weekEnd = new Date(weekStart);
            weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
            return {
                start: DateUtils.setStart(new Date(weekStart)),
                end: DateUtils.setEnd(new Date(weekEnd))
            };
        },
        getWeekRange: function (d) {
            return DateUtils.getWeekRangeByYearWeek(d.getFullYear(), DateUtils.getISOWeekNumber(d));
        },
        getMonthRange: function (d) {
            return {
                start: DateUtils.setStart(new Date(d.getFullYear(), d.getMonth(), 1)),
                end: DateUtils.setEnd(new Date(d.getFullYear(), d.getMonth() + 1, 0))
            };
        },
        getMonthRangeByYearMonth: function (y, m) {
            return {
                start: DateUtils.setStart(new Date(y, m - 1, 1)),
                end: DateUtils.setEnd(new Date(y, m, 0))
            };
        },
        getQuarterRangeByYearQuarter: function (y, q) {
            var sm = (q - 1) * 3 + 1;
            return {
                start: DateUtils.setStart(new Date(y, sm - 1, 1)),
                end: DateUtils.setEnd(new Date(y, sm + 2, 0))
            };
        },
        getYearRangeByYear: function (y) {
            return {
                start: DateUtils.setStart(new Date(y, 0, 1)),
                end: DateUtils.setEnd(new Date(y, 11, 31))
            };
        },
        getWeekdayRange: function (date, wd) {
            var d = new Date(date);
            d.setDate(d.getDate() + (wd - (d.getDay() || 7)));
            return DateUtils.getDayRange(d);
        }
    };

    // ========== 图表加载 ==========
    function ensureEcharts(callback) {
        if (window.echarts) return callback(window.echarts);
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
        script.onload = function () { callback(window.echarts); };
        script.onerror = function () { console.warn('ECharts 加载失败'); callback(null); };
        document.head.appendChild(script);
    }

    // ========== 节流 ==========
    function throttleByFrame(fn) {
        var scheduled = false;
        return function () {
            var args = arguments, self = this;
            if (!scheduled) {
                scheduled = true;
                requestAnimationFrame(function () {
                    fn.apply(self, args);
                    scheduled = false;
                });
            }
        };
    }

    // ========== 持久化 ==========
    function saveFilterState() {
        var data = {
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
            collapsedNodes: collapsedKeys(),
            hideFolders: state.hideFolders,
            filterRootPath: state.filterRootPath,
            chartScale: state.chartScale
        };
        localStorage.setItem('taskGanttState', JSON.stringify(data));
    }

    function loadFilterState() {
        var saved = localStorage.getItem('taskGanttState');
        if (!saved) return false;
        try {
            var data = JSON.parse(saved);
            if (data.dateFilterState) {
                state.dateFilterState.isAll = data.dateFilterState.isAll;
                state.dateFilterState.start = data.dateFilterState.start ? new Date(data.dateFilterState.start) : null;
                state.dateFilterState.end = data.dateFilterState.end ? new Date(data.dateFilterState.end) : null;
            }
            if (data.markFilterState) {
                state.markFilterState.statuses = data.markFilterState.statuses || [];
                state.markFilterState.includeMarks = data.markFilterState.includeMarks || [];
                state.markFilterState.excludeMarks = data.markFilterState.excludeMarks || [];
            }
            state.hideRepeatTasks = data.hideRepeatTasks !== undefined ? data.hideRepeatTasks : true;
            state.hideCompletedTasks = data.hideCompletedTasks !== undefined ? data.hideCompletedTasks : true;
            state.hideCancelledTasks = data.hideCancelledTasks !== undefined ? data.hideCancelledTasks : true;
            state.intervalMode = data.intervalMode || INTERVAL_MODES.SCHEDULED_DUE;
            state.leftSort = data.leftSort || { type: SORT_TYPES.STATUS, order: 'asc' };
            state.leftPanelWidth = data.leftPanelWidth || 300;
            var nodes = data.collapsedNodes || [];
            for (var i = 0; i < nodes.length; i++) collapseAdd(nodes[i]);
            state.hideFolders = data.hideFolders !== undefined ? data.hideFolders : true;
            state.filterRootPath = data.filterRootPath || null;
            state.chartScale = data.chartScale || 1;
            return true;
        } catch (e) { return false; }
    }

    // ========== CSS 注入 ==========
    function injectStyles() {
        var styleEl = document.createElement('style');
        styleEl.id = 'task-gantt-style';
        styleEl.textContent = '\
            .cascade-btn, .quick-btn, .sort-btn { border:none; cursor:pointer; }\
            .cascade-btn, .quick-btn { padding:4px 14px; border-radius:20px; background:var(--interactive-normal); color:var(--text-normal); }\
            .cascade-btn-active, .quick-btn-active, .sort-btn-active { background:var(--interactive-accent)!important; color:white; font-weight:bold; }\
            .cascade-btn-disabled { background:var(--background-modifier-muted)!important; color:var(--text-muted); cursor:not-allowed; opacity:0.6; }\
            .sort-btn { padding:2px 12px; border-radius:12px; background:var(--interactive-normal); color:var(--text-normal); font-size:12px; }\
            .filter-section { margin-bottom:16px; padding:12px; background:var(--background-secondary); border-radius:12px; }\
            .filter-label { font-weight:bold; font-size:13px; min-width:70px; color:var(--text-accent); }\
            .main-layout { display:flex; flex-wrap:nowrap; gap:0; margin-top:16px; height:calc(100vh - 280px); max-height:80vh; overflow:hidden; }\
            .left-panel { width:300px; min-width:200px; border:1px solid var(--background-modifier-border); border-radius:8px; padding:8px; overflow-y:auto; height:100%; max-height:none; transition:width 0.2s; }\
            .chart-panel { flex:1; min-width:0; border:1px solid var(--background-modifier-border); border-radius:8px; padding:0; display:flex; flex-direction:column; overflow-y:auto; overflow-x:hidden; position:relative; }\
            .chart-grid { width:100%; display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:0; padding:8px; align-items:stretch; justify-items:stretch; }\
            .chart-item { background:var(--background-secondary); border-radius:8px; padding:4px; display:flex; flex-direction:column; height:250px; overflow:hidden; box-sizing:border-box; }\
            .chart-item .chart-header { display:flex; justify-content:space-between; align-items:center; height:24px; }\
            .chart-body { flex:1; min-height:0; width:100%; transform-origin:0 0; overflow:hidden; }\
            .resizer { width:6px; cursor:col-resize; background:var(--background-modifier-border); }\
            .resizer:hover { background:var(--interactive-accent); }\
            .gantt-tooltip { position:fixed!important; background:#2d2d2d; color:#f0f0f0; border:1px solid #555; border-radius:8px; padding:10px 14px; pointer-events:none; z-index:10000; max-width:450px; box-shadow:0 4px 12px rgba(0,0,0,0.3); font-size:13px; line-height:1.5; white-space:normal; display:none; }\
            .progress-bar { width:70px; height:6px; border-radius:3px; margin-left:8px; overflow:hidden; display:inline-flex; background:transparent; }\
            .progress-segment { height:100%; }\
            .progress-text { margin-left:4px; font-size:11px; color:var(--text-muted); }\
            .empty-message { padding:40px; text-align:center; color:var(--text-muted); font-style:italic; }\
            .zoom-btn { background:none; border:none; cursor:pointer; font-size:16px; margin-left:8px; }\
            .task-text { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:calc(100% - 60px); display:inline-block; vertical-align:middle; }\
            .today-marker { color:#ffaa00; margin-right:4px; }\
            .scale-hint { position:absolute; top:8px; right:12px; background:rgba(0,0,0,0.6); color:#ddd; padding:4px 12px; border-radius:12px; font-size:12px; pointer-events:none; z-index:10; opacity:0.9; transition:opacity 0.5s; }\
        ';
        document.head.appendChild(styleEl);
    }

    // ========== 创建安全的 dv 对象 ==========
    function createSafeDVObject(api, container) {
        return {
            pages: function (source) {
                return api.pages(source) || [];
            },
            page: function (path) {
                return api.page(path.replace(/\.md$/, '')) || null;
            },
            el: function (tag, textOrOpts, opts) {
                var el = document.createElement(tag);
                var realOpts = {};
                if (typeof textOrOpts === 'string') {
                    el.textContent = textOrOpts;
                    if (opts && typeof opts === 'object') realOpts = opts;
                } else if (textOrOpts && typeof textOrOpts === 'object') {
                    realOpts = textOrOpts;
                }
                if (realOpts.cls) el.className = realOpts.cls;
                if (realOpts.style) el.style.cssText = realOpts.style;
                if (realOpts.attr) {
                    for (var key in realOpts.attr) {
                        if (realOpts.attr.hasOwnProperty(key)) el.setAttribute(key, realOpts.attr[key]);
                    }
                }
                return el;
            },
            container: container
        };
    }

    // ========== 清洗旧状态 ==========
    function cleanupState() {
        var el = document.querySelector('.gantt-tooltip');
        if (el) el.remove();
        el = document.getElementById('task-gantt-style');
        if (el) el.remove();
        if (window.__taskGanttState) {
            window.__taskGanttState.cachedAllTasks = null;
            window.__taskGanttState.filterCache = null;
            window.__taskGanttState = null;
        }
    }

    // ========== 导出 ==========
    module.exports = {
        state, CONFIG,
        INTERVAL_MODES, SORT_TYPES,
        ALLOWED_STATUSES, STATUS_NAMES, STATUS_ICONS, MARK_NAMES, ALL_MARKS,
        YEAR_LIST, REPEAT_TYPES,
        collapsedNodes, taskIdMap,
        collapsedAdd, collapsedRemove, collapsedHas, collapsedKeys,
        taskIdMapGet, taskIdMapSet, taskIdMapClear,
        DateUtils,
        ensureEcharts, throttleByFrame,
        saveFilterState, loadFilterState,
        injectStyles,
        createSafeDVObject,
        cleanupState
    };
})();