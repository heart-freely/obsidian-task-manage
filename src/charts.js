// src/charts.js —— 图表数据计算、渲染、缩放、模态
var common = require('./common');
var taskEngine = require('./task-engine');

var state = common.state;
var CONFIG = common.CONFIG;
var ALLOWED_STATUSES = common.ALLOWED_STATUSES;
var STATUS_ICONS = common.STATUS_ICONS;
var STATUS_NAMES = common.STATUS_NAMES;
var DateUtils = common.DateUtils;
var ensureEcharts = common.ensureEcharts;
var throttleByFrame = common.throttleByFrame;

var formatDate = DateUtils.formatDate;
var setStart = DateUtils.setStart;
var setEnd = DateUtils.setEnd;

var getEffectiveDateRange = taskEngine.getEffectiveDateRange;

// ========== 图表数据计算 ==========
function computeTotalSpanDays(tasks, fieldStart, fieldEnd) {
    if (!tasks.length) return 0;
    var min = Infinity, max = -Infinity;
    tasks.forEach(function (t) {
        var s = t[fieldStart] ? new Date(t[fieldStart]).getTime() : null;
        var e = t[fieldEnd] ? new Date(t[fieldEnd]).getTime() : null;
        if (s && e && s <= e) {
            if (s < min) min = s;
            if (e > max) max = e;
        }
    });
    if (min === Infinity || max === -Infinity) return 0;
    return Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
}

function calcPlannedDuration(tasks) {
    var total = 0;
    tasks.forEach(function (t) {
        if (t._scheduled && t._due) total += Math.max(0, (new Date(t._due) - new Date(t._scheduled)) / 86400000);
    });
    return Math.round(total);
}

function calcActualDuration(tasks) {
    var total = 0;
    tasks.forEach(function (t) {
        if (t._starts && t._done) total += Math.max(0, (new Date(t._done) - new Date(t._starts)) / 86400000);
    });
    return Math.round(total);
}

function calcTotalSpanHours(tasks, fieldStart, fieldEnd) {
    var days = computeTotalSpanDays(tasks, fieldStart, fieldEnd);
    return days * (CONFIG.WORK_HOURS_PER_DAY || 12);
}

function prepareDailyStatusStack(tasks, dateRange) {
    var dayMap = {};
    function keyOf(d) { return formatDate(d); }
    function initDay() { return { todo: 0, planned: 0, 'in-progress': 0, completed: 0, cancelled: 0 }; }
    if (dateRange) {
        var cur = setStart(new Date(dateRange.start));
        var end = setStart(new Date(dateRange.end));
        while (cur <= end) {
            dayMap[keyOf(cur)] = initDay();
            cur.setDate(cur.getDate() + 1);
        }
    }
    tasks.forEach(function (t) {
        var range = t._cachedTimeRange;
        if (!range) return;
        var cur = setStart(new Date(range.start));
        var end = setStart(new Date(range.end));
        while (cur <= end) {
            var key = keyOf(cur);
            if (dateRange) {
                if (dayMap[key]) dayMap[key][t._status]++;
            } else {
                if (!dayMap[key]) dayMap[key] = initDay();
                dayMap[key][t._status]++;
            }
            cur.setDate(cur.getDate() + 1);
        }
    });
    var sorted = Object.keys(dayMap).sort().map(function (k) { return [k, dayMap[k]]; });
    var dates = sorted.map(function (e) { return e[0]; });
    var seriesData = {};
    ALLOWED_STATUSES.forEach(function (s) {
        seriesData[s] = sorted.map(function (e) { return e[1][s]; });
    });
    return { dates: dates, seriesData: seriesData, statusOrder: ALLOWED_STATUSES };
}

// ========== 图表渲染 ==========
function renderCharts(container, tasks, dv) {
    container.innerHTML = '';
    if (!tasks.length) {
        container.appendChild(dv.el('div', '📭 无任务数据', { cls: 'empty-message' }));
        return;
    }
    var grid = dv.el('div', '', { cls: 'chart-grid' });
    container.appendChild(grid);

    var theme = getComputedStyle(document.body);
    var textColor = theme.getPropertyValue('--text-normal') || '#333';
    var bgColor = theme.getPropertyValue('--background-primary') || '#fff';

    function createChartItem(title, showZoom, spanCols) {
        if (showZoom === undefined) showZoom = false;
        if (spanCols === undefined) spanCols = 1;
        var item = dv.el('div', '', { cls: 'chart-item' });
        if (spanCols > 1) item.style.gridColumn = 'span ' + spanCols;
        var header = dv.el('div', '', { cls: 'chart-header' });
        header.appendChild(dv.el('span', title, { style: 'font-weight:bold;color:' + textColor }));
        if (showZoom) {
            var zoomBtn = dv.el('button', '🔍', { cls: 'zoom-btn' });
            header.appendChild(zoomBtn);
            item._zoomBtn = zoomBtn;
        }
        item.appendChild(header);
        var chartDiv = dv.el('div', '', { cls: 'chart-body' });
        item.appendChild(chartDiv);
        grid.appendChild(item);
        return { chartDiv: chartDiv, item: item };
    }

    ensureEcharts(function (echarts) {
        if (!echarts) return;
        state.chartInstances.forEach(function (c) { try { c.dispose(); } catch (e) {} });
        state.chartInstances = [];

        // 统计数据
        var statusCounts = {}; ALLOWED_STATUSES.forEach(function (s) { statusCounts[s] = 0; });
        var prioCounts = {}; CONFIG.PRIORITY_ORDER.forEach(function (p) { prioCounts[p] = 0; });
        var repeatCounts = {}; common.REPEAT_TYPES.forEach(function (r) { repeatCounts[r] = 0; });
        var dateCounts = {}; CONFIG.DATE_MARK_ORDER.forEach(function (m) { dateCounts[m] = 0; });
        var idCnt = 0, forbidCnt = 0, bothCnt = 0;
        var tagMap = {};
        tasks.forEach(function (t) {
            statusCounts[t._status]++;
            if (t._priorityIcon) prioCounts[t._priorityIcon]++;
            if (t._repeat) {
                common.REPEAT_TYPES.forEach(function (r) {
                    if (t._repeat.toLowerCase().indexOf(r) !== -1) repeatCounts[r]++;
                });
            }
            CONFIG.DATE_MARK_ORDER.forEach(function (m) { if (t['_' + m]) dateCounts[m]++; });
            var hi = !!t._id, hf = !!t._forbid;
            if (hi && hf) bothCnt++;
            else if (hi) idCnt++;
            else if (hf) forbidCnt++;
            if (t._tag) tagMap[t._tag] = (tagMap[t._tag] || 0) + 1;
        });

        function makePieOption(data) {
            return {
                backgroundColor: bgColor,
                textStyle: { color: textColor },
                tooltip: { trigger: 'item' },
                legend: { orient: 'horizontal', bottom: 0, textStyle: { color: textColor, fontSize: 10 } },
                series: [{
                    type: 'pie',
                    data: data.length ? data : [{ name: '无数据', value: 1, itemStyle: { color: '#ccc' } }],
                    radius: ['40%', '65%'],
                    label: { show: true, color: textColor, fontSize: 10, formatter: '{b}\n{d}%' },
                    itemStyle: { borderRadius: 4 }
                }]
            };
        }

        // ---- 第1行：执行状态、优先级、循环周期 ----
        var ch1 = createChartItem('📊 执行状态');
        var i1 = echarts.init(ch1.chartDiv);
        i1.setOption(makePieOption(ALLOWED_STATUSES.map(function (s) {
            return { name: STATUS_ICONS[s] + ' ' + STATUS_NAMES[s], value: statusCounts[s], itemStyle: { color: CONFIG.STATUS_COLORS[s] } };
        }).filter(function (d) { return d.value > 0; })));
        state.chartInstances.push(i1);

        var ch2 = createChartItem('🎯 优先级');
        var i2 = echarts.init(ch2.chartDiv);
        i2.setOption(makePieOption(CONFIG.PRIORITY_ORDER.map(function (p, i) {
            return { name: p, value: prioCounts[p] || 0, itemStyle: { color: CONFIG.PRIORITY_COLORS[i] } };
        }).filter(function (d) { return d.value > 0; })));
        state.chartInstances.push(i2);

        var ch3 = createChartItem('🔄 循环周期');
        var i3 = echarts.init(ch3.chartDiv);
        i3.setOption(makePieOption(common.REPEAT_TYPES.map(function (r, i) {
            return { name: '🔁 ' + r, value: repeatCounts[r], itemStyle: { color: CONFIG.REPEAT_COLORS[i] } };
        }).filter(function (d) { return d.value > 0; })));
        state.chartInstances.push(i3);

        // ---- 第2行：日期标记、依赖关系、标签 ----
        var ch4 = createChartItem('📅 日期标记');
        var i4 = echarts.init(ch4.chartDiv);
        i4.setOption(makePieOption(CONFIG.DATE_MARK_ORDER.map(function (m, i) {
            return { name: CONFIG.DATE_MARK_NAMES[m], value: dateCounts[m], itemStyle: { color: CONFIG.DATE_MARK_COLORS[i] } };
        }).filter(function (d) { return d.value > 0; })));
        state.chartInstances.push(i4);

        var ch5 = createChartItem('🔗 依赖关系');
        var i5 = echarts.init(ch5.chartDiv);
        i5.setOption(makePieOption([
            { name: '🆔 唯一ID', value: idCnt }, { name: '⛔ 依赖', value: forbidCnt }, { name: '🆔+⛔ 两者', value: bothCnt }
        ].filter(function (d) { return d.value > 0; })));
        state.chartInstances.push(i5);

        var ch6 = createChartItem('🏷️ 标签');
        var i6 = echarts.init(ch6.chartDiv);
        i6.setOption(makePieOption(Object.keys(tagMap).map(function (k) {
            return { name: '🏁 ' + k, value: tagMap[k] };
        })));
        state.chartInstances.push(i6);

        // ---- 第3行：计划时长、执行时长、计划执行对比（无放大） ----
        var plannedDays = calcPlannedDuration(tasks);
        var plannedSpanHours = calcTotalSpanHours(tasks, '_scheduled', '_due');
        var actualDays = calcActualDuration(tasks);
        var actualSpanHours = calcTotalSpanHours(tasks, '_starts', '_done');

        var ch7 = createChartItem('⏳ 计划时长', false);
        var i7 = echarts.init(ch7.chartDiv);
        i7.setOption(makePieOption([
            { name: '计划时长(天)', value: plannedDays }, { name: '总跨度(时)', value: plannedSpanHours }
        ]));
        state.chartInstances.push(i7);

        var ch8 = createChartItem('✅ 执行时长', false);
        var i8 = echarts.init(ch8.chartDiv);
        i8.setOption(makePieOption([
            { name: '执行时长(天)', value: actualDays }, { name: '总跨度(时)', value: actualSpanHours }
        ]));
        state.chartInstances.push(i8);

        var ch9 = createChartItem('⚖️ 计划执行对比', false);
        var i9 = echarts.init(ch9.chartDiv);
        i9.setOption(makePieOption([
            { name: '计划时长(天)', value: plannedDays }, { name: '执行时长(天)', value: actualDays }
        ]));
        state.chartInstances.push(i9);

        // ---- 第4行：状态详细（堆叠柱状图，有放大） ----
        var dateRange = getEffectiveDateRange();
        var chartTitle = '📊 状态详细（日）';
        if (dateRange) chartTitle += ' [' + formatDate(dateRange.start) + ' ~ ' + formatDate(dateRange.end) + ']';
        var ch10 = createChartItem(chartTitle, true, 3);
        var i10 = echarts.init(ch10.chartDiv);
        var stackData = prepareDailyStatusStack(tasks, dateRange);
        i10.setOption({
            backgroundColor: bgColor,
            textStyle: { color: textColor },
            tooltip: { trigger: 'axis' },
            legend: {
                data: stackData.statusOrder.map(function (s) { return STATUS_ICONS[s] + STATUS_NAMES[s]; }),
                bottom: 0,
                textStyle: { color: textColor }
            },
            xAxis: { type: 'category', data: stackData.dates, axisLabel: { rotate: 30, color: textColor } },
            yAxis: { type: 'value', min: 0, axisLabel: { color: textColor } },
            series: stackData.statusOrder.map(function (s) {
                return {
                    name: STATUS_ICONS[s] + STATUS_NAMES[s],
                    type: 'bar',
                    stack: 'total',
                    data: stackData.seriesData[s],
                    itemStyle: { color: CONFIG.STATUS_COLORS[s] }
                };
            }),
            grid: { left: '10%', right: '5%', top: '15%', bottom: '25%' }
        });
        state.chartInstances.push(i10);
        if (ch10.item._zoomBtn) ch10.item._zoomBtn.onclick = function () { openChartModal(i10); };

        setTimeout(function () {
            state.chartInstances.forEach(function (c) { try { c.resize(); } catch (e) {} });
        }, 50);
        updateChartScale();
    });
}

function openChartModal(chartInst) {
    if (!window.echarts || state.modalOpen) return;
    state.modalOpen = true;
    if (state.tooltipDiv) state.tooltipDiv.style.display = 'none';
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✖';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:30px;font-size:24px;background:transparent;border:none;color:white;cursor:pointer;';
    var chartDiv = document.createElement('div');
    chartDiv.style.width = '90vw'; chartDiv.style.height = '90vh';
    modal.appendChild(chartDiv); modal.appendChild(closeBtn);
    var newInst = null;
    function closeModal() { modal.remove(); newInst.dispose(); state.modalOpen = false; }
    closeBtn.onclick = closeModal;
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.body.appendChild(modal);
    newInst = window.echarts.init(chartDiv);
    var opt = chartInst.getOption();
    opt.tooltip = { show: false };   // 禁用放大后图表的提示
    newInst.setOption(opt);
}

// ========== 缩放控制 ==========
function updateChartScale() {
    document.querySelectorAll('.chart-body').forEach(function (b) {
        b.style.transform = 'scale(' + state.chartScale + ')';
    });
}

var chartResizeTimer = null;
function debouncedResize() {
    if (chartResizeTimer) clearTimeout(chartResizeTimer);
    chartResizeTimer = setTimeout(function () {
        state.chartInstances.forEach(function (c) { try { c.resize(); } catch (e) {} });
    }, 150);
}

var handleScale = throttleByFrame(function (e) {
    if (!e.altKey) return;
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.1 : 0.1;
    state.chartScale = Math.max(0.5, Math.min(3, state.chartScale + delta));
    updateChartScale();
    debouncedResize();
    common.saveFilterState();
});

function bindScaleEvents(container) {
    container.addEventListener('wheel', handleScale, { passive: false });
}

function showScaleHint(container) {
    var hint = document.createElement('div');
    hint.className = 'scale-hint';
    hint.textContent = 'Alt+滚轮缩放';
    container.appendChild(hint);
    setTimeout(function () { hint.style.opacity = '0'; setTimeout(function () { hint.remove(); }, 500); }, 5000);
}

module.exports = {
    renderCharts,
    openChartModal,
    updateChartScale,
    debouncedResize,
    bindScaleEvents,
    showScaleHint,
    calcPlannedDuration,
    calcActualDuration,
    calcTotalSpanHours
};