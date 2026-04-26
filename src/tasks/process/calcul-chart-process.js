// src/tasks/process/calcul-chart-process.js
// 图表数据计算及任务计算（纯函数）

import { CONFIG } from '../../configs/plugin-configs';

// ========== 原 calcul-echarts 计算 ==========
export function computeTotalSpanDays(tasks, fieldStart, fieldEnd) {
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

export function calcPlannedDuration(tasks) {
    let total = 0;
    tasks.forEach(t => {
        if (t._scheduled && t._due) total += Math.max(0, (new Date(t._due) - new Date(t._scheduled)) / 86400000);
    });
    return Math.round(total);
}

export function calcActualDuration(tasks) {
    let total = 0;
    tasks.forEach(t => {
        if (t._starts && t._done) total += Math.max(0, (new Date(t._done) - new Date(t._starts)) / 86400000);
    });
    return Math.round(total);
}

export function calcTotalSpanHours(tasks, fieldStart, fieldEnd) {
    const days = computeTotalSpanDays(tasks, fieldStart, fieldEnd);
    return days * CONFIG.WORK_HOURS_PER_DAY;
}

export function prepareDailyStatusStack(tasks, dateRange, formatDate, setStart, setEnd) {
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

// ========== 原 calcul-task-process 中的函数（如有）直接追加此处 ==========
// 若原文件为空，则无需添加。如果已有一些任务级别计算，请直接粘贴于此。
// 为了安全，检查是否有被其他模块引用的符号，若无则忽略。