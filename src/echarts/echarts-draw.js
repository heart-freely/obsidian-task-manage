// src/echarts/echarts-draw.js
// 图表渲染模块（含懒加载）
import logger from '../utils/logger';
import { CONFIG } from '../configs/configs-plugin';
import { ensureEcharts } from './echarts-utils';

// ---------- 数据计算 ----------
function computeTotalSpanDays(tasks, fieldStart, fieldEnd) {
    if (!tasks.length) return 0;
    let min = Infinity, max = -Infinity;
    tasks.forEach(t => {
        const s = t[fieldStart] ? new Date(t[fieldStart]).getTime() : null;
        const e = t[fieldEnd] ? new Date(t[fieldEnd]).getTime() : null;
        if (s && e && s <= e) { if (s < min) min = s; if (e > max) max = e; }
    });
    if (min === Infinity || max === -Infinity) return 0;
    return Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
}

function calcPlannedDuration(tasks) {
    let total = 0;
    tasks.forEach(t => {
        if (t._scheduled && t._due) total += Math.max(0, (new Date(t._due) - new Date(t._scheduled)) / 86400000);
    });
    return Math.round(total);
}

function calcActualDuration(tasks) {
    let total = 0;
    tasks.forEach(t => {
        if (t._starts && t._done) total += Math.max(0, (new Date(t._done) - new Date(t._starts)) / 86400000);
    });
    return Math.round(total);
}

function calcTotalSpanHours(tasks, fieldStart, fieldEnd) {
    const days = computeTotalSpanDays(tasks, fieldStart, fieldEnd);
    return days * CONFIG.WORK_HOURS_PER_DAY;
}

function prepareDailyStatusStack(tasks, dateRange, formatDate, setStart, setEnd) {
    const dayMap = {};
    function keyOf(d) { return formatDate(d); }
    function initDay() { return { todo: 0, planned: 0, 'in-progress': 0, completed: 0, cancelled: 0 }; }
    if (dateRange) {
        const cur = setStart(new Date(dateRange.start));
        const end = setStart(new Date(dateRange.end));
        while (cur <= end) {
            dayMap[keyOf(cur)] = initDay();
            cur.setDate(cur.getDate() + 1);
        }
    }
    tasks.forEach(t => {
        const range = t._cachedTimeRange;
        if (!range) return;
        const cur = setStart(new Date(range.start));
        const end = setStart(new Date(range.end));
        while (cur <= end) {
            const key = keyOf(cur);
            if (dateRange) {
                if (dayMap[key]) dayMap[key][t._status]++;
            } else {
                if (!dayMap[key]) dayMap[key] = initDay();
                dayMap[key][t._status]++;
            }
            cur.setDate(cur.getDate() + 1);
        }
    });
    const sorted = Object.keys(dayMap).sort().map(k => [k, dayMap[k]]);
    const dates = sorted.map(e => e[0]);
    const seriesData = {};
    CONFIG.ALLOWED_STATUSES.forEach(s => {
        seriesData[s] = sorted.map(e => e[1][s]);
    });
    return { dates, seriesData, statusOrder: CONFIG.ALLOWED_STATUSES };
}

// ---------- 主渲染函数（含懒加载） ----------
export function drawCharts(container, tasks, context) {
    const {
        dv,
        state,
        formatDate,
        setStart,
        setEnd,
        getEffectiveDateRange
    } = context;

    container.innerHTML = '';
    if (!tasks.length) {
        container.appendChild(dv.el('div', '📭 无任务数据', { cls: 'empty-message' }));
        return;
    }

    // 使用 IntersectionObserver 实现懒加载
    if (window.IntersectionObserver) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                observer.disconnect();
                doRender();
            }
        }, { threshold: 0.1 });
        observer.observe(container);
        // 显示占位符
        container.appendChild(dv.el('div', '⏳ 图表加载中...', { cls: 'empty-message' }));
    } else {
        // 不支持 IntersectionObserver，直接渲染
        doRender();
    }

    function doRender() {
        container.innerHTML = '';
        ensureEcharts(echarts => {
            if (!echarts) {
                container.innerHTML = '';
                container.appendChild(dv.el('div', '⚠️ 图表组件加载失败，请检查网络连接', { cls: 'empty-message' }));
                logger.error('ECharts 加载失败');
                return;
            }

            state.chartInstances.forEach(c => { try { c.dispose(); } catch (e) {} });
            state.chartInstances = [];

            const grid = dv.el('div', '', { cls: 'chart-grid' });
            container.appendChild(grid);
            const theme = getComputedStyle(document.body);
            const textColor = theme.getPropertyValue('--text-normal') || '#333';
            const bgColor = theme.getPropertyValue('--background-primary') || '#fff';

            function createChartItem(title, showZoom, spanCols) {
                if (showZoom === undefined) showZoom = false;
                if (spanCols === undefined) spanCols = 1;
                const item = dv.el('div', '', { cls: 'chart-item' });
                if (spanCols > 1) item.style.gridColumn = 'span ' + spanCols;
                const header = dv.el('div', '', { cls: 'chart-header' });
                header.appendChild(dv.el('span', title, { style: 'font-weight:bold;color:' + textColor }));
                if (showZoom) {
                    const zoomBtn = dv.el('button', '🔍', { cls: 'zoom-btn' });
                    header.appendChild(zoomBtn);
                    item._zoomBtn = zoomBtn;
                }
                item.appendChild(header);
                const chartDiv = dv.el('div', '', { cls: 'chart-body' });
                item.appendChild(chartDiv);
                grid.appendChild(item);
                return { chartDiv, item };
            }

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

            function openChartModal(chartInst) {
                if (!window.echarts || state.modalOpen) return;
                state.modalOpen = true;
                if (state.tooltipDiv) state.tooltipDiv.style.display = 'none';
                const modal = document.createElement('div');
                modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;';
                const closeBtn = document.createElement('button');
                closeBtn.textContent = '✖';
                closeBtn.style.cssText = 'position:absolute;top:20px;right:30px;font-size:24px;background:transparent;border:none;color:white;cursor:pointer;';
                const chartDiv = document.createElement('div');
                chartDiv.style.width = '90vw'; chartDiv.style.height = '90vh';
                modal.appendChild(chartDiv); modal.appendChild(closeBtn);
                function closeModal() { modal.remove(); newInst.dispose(); state.modalOpen = false; }
                closeBtn.onclick = closeModal;
                modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
                document.body.appendChild(modal);
                const newInst = window.echarts.init(chartDiv);
                const opt = chartInst.getOption();
                opt.tooltip = { show: false };
                newInst.setOption(opt);
            }

            // ---- 数据统计 ----
            const statusCounts = {}; CONFIG.ALLOWED_STATUSES.forEach(s => statusCounts[s] = 0);
            const prioCounts = {}; CONFIG.PRIORITY_ORDER.forEach(p => prioCounts[p] = 0);
            const repeatCounts = {}; CONFIG.REPEAT_TYPES.forEach(r => repeatCounts[r] = 0);
            const dateCounts = {}; CONFIG.DATE_MARK_ORDER.forEach(m => dateCounts[m] = 0);
            let idCnt = 0, forbidCnt = 0, bothCnt = 0;
            const tagMap = {};
            tasks.forEach(t => {
                statusCounts[t._status]++;
                if (t._priorityIcon) prioCounts[t._priorityIcon]++;
                if (t._repeat) {
                    CONFIG.REPEAT_TYPES.forEach(r => {
                        if (t._repeat.toLowerCase().includes(r)) repeatCounts[r]++;
                    });
                }
                CONFIG.DATE_MARK_ORDER.forEach(m => { if (t['_' + m]) dateCounts[m]++; });
                const hi = !!t._id, hf = !!t._forbid;
                if (hi && hf) bothCnt++;
                else if (hi) idCnt++;
                else if (hf) forbidCnt++;
                if (t._tag) tagMap[t._tag] = (tagMap[t._tag] || 0) + 1;
            });

            // ---- 创建图表 ----
            const ch1 = createChartItem('📊 执行状态');
            const i1 = echarts.init(ch1.chartDiv);
            i1.setOption(makePieOption(CONFIG.ALLOWED_STATUSES.map(s => ({
                name: CONFIG.STATUS_ICONS[s] + ' ' + CONFIG.STATUS_NAMES[s],
                value: statusCounts[s],
                itemStyle: { color: CONFIG.STATUS_COLORS[s] }
            })).filter(d => d.value > 0)));
            state.chartInstances.push(i1);

            const ch2 = createChartItem('🎯 优先级');
            const i2 = echarts.init(ch2.chartDiv);
            i2.setOption(makePieOption(CONFIG.PRIORITY_ORDER.map((p, i) => ({
                name: p,
                value: prioCounts[p] || 0,
                itemStyle: { color: CONFIG.PRIORITY_COLORS[i] }
            })).filter(d => d.value > 0)));
            state.chartInstances.push(i2);

            const ch3 = createChartItem('🔄 循环周期');
            const i3 = echarts.init(ch3.chartDiv);
            i3.setOption(makePieOption(CONFIG.REPEAT_TYPES.map((r, i) => ({
                name: '🔁 ' + r,
                value: repeatCounts[r],
                itemStyle: { color: CONFIG.REPEAT_COLORS[i] }
            })).filter(d => d.value > 0)));
            state.chartInstances.push(i3);

            const ch4 = createChartItem('📅 日期标记');
            const i4 = echarts.init(ch4.chartDiv);
            i4.setOption(makePieOption(CONFIG.DATE_MARK_ORDER.map((m, i) => ({
                name: CONFIG.DATE_MARK_NAMES[m],
                value: dateCounts[m],
                itemStyle: { color: CONFIG.DATE_MARK_COLORS[i] }
            })).filter(d => d.value > 0)));
            state.chartInstances.push(i4);

            const ch5 = createChartItem('🔗 依赖关系');
            const i5 = echarts.init(ch5.chartDiv);
            i5.setOption(makePieOption([
                { name: '🆔 唯一ID', value: idCnt },
                { name: '⛔ 依赖', value: forbidCnt },
                { name: '🆔+⛔ 两者', value: bothCnt }
            ].filter(d => d.value > 0)));
            state.chartInstances.push(i5);

            const ch6 = createChartItem('🏷️ 标签');
            const i6 = echarts.init(ch6.chartDiv);
            i6.setOption(makePieOption(Object.keys(tagMap).map(k => ({
                name: '🏁 ' + k,
                value: tagMap[k]
            }))));
            state.chartInstances.push(i6);

            const plannedDays = calcPlannedDuration(tasks);
            const plannedSpanHours = calcTotalSpanHours(tasks, '_scheduled', '_due');
            const actualDays = calcActualDuration(tasks);
            const actualSpanHours = calcTotalSpanHours(tasks, '_starts', '_done');

            const ch7 = createChartItem('⏳ 计划时长', false);
            const i7 = echarts.init(ch7.chartDiv);
            i7.setOption(makePieOption([
                { name: '计划时长(天)', value: plannedDays },
                { name: '总跨度(时)', value: plannedSpanHours }
            ]));
            state.chartInstances.push(i7);

            const ch8 = createChartItem('✅ 执行时长', false);
            const i8 = echarts.init(ch8.chartDiv);
            i8.setOption(makePieOption([
                { name: '执行时长(天)', value: actualDays },
                { name: '总跨度(时)', value: actualSpanHours }
            ]));
            state.chartInstances.push(i8);

            const ch9 = createChartItem('⚖️ 计划执行对比', false);
            const i9 = echarts.init(ch9.chartDiv);
            i9.setOption(makePieOption([
                { name: '计划时长(天)', value: plannedDays },
                { name: '执行时长(天)', value: actualDays }
            ]));
            state.chartInstances.push(i9);

            const dateRange = getEffectiveDateRange();
            let chartTitle = '📊 状态详细（日）';
            if (dateRange) chartTitle += ' [' + formatDate(dateRange.start) + ' ~ ' + formatDate(dateRange.end) + ']';
            const ch10 = createChartItem(chartTitle, true, 3);
            const i10 = echarts.init(ch10.chartDiv);
            const stackData = prepareDailyStatusStack(tasks, dateRange, formatDate, setStart, setEnd);
            i10.setOption({
                backgroundColor: bgColor,
                textStyle: { color: textColor },
                tooltip: { trigger: 'axis' },
                legend: {
                    data: stackData.statusOrder.map(s => CONFIG.STATUS_ICONS[s] + CONFIG.STATUS_NAMES[s]),
                    bottom: 0,
                    textStyle: { color: textColor }
                },
                xAxis: { type: 'category', data: stackData.dates, axisLabel: { rotate: 30, color: textColor } },
                yAxis: { type: 'value', min: 0, axisLabel: { color: textColor } },
                series: stackData.statusOrder.map(s => ({
                    name: CONFIG.STATUS_ICONS[s] + CONFIG.STATUS_NAMES[s],
                    type: 'bar',
                    stack: 'total',
                    data: stackData.seriesData[s],
                    itemStyle: { color: CONFIG.STATUS_COLORS[s] }
                })),
                grid: { left: '10%', right: '5%', top: '15%', bottom: '25%' }
            });
            state.chartInstances.push(i10);
            if (ch10.item._zoomBtn) ch10.item._zoomBtn.onclick = () => openChartModal(i10);

            setTimeout(() => {
                state.chartInstances.forEach(c => { try { c.resize(); } catch (e) {} });
            }, 50);
        });
    }
}