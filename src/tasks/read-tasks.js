// src/tasks/read-tasks.js
// 任务解析与缓存模块 —— ES6 版本

// ========== 任务解析专属配置 ==========
export const CONFIG = {
    TASK_FOLDERS: ['"pages/A 系统/A 任务系统"'],
    FILE_NAME_PATTERN: /任务$/,
    ROOT_PATH: 'pages/A 系统/A 任务系统/'
};

export const ALLOWED_STATUSES = ['todo', 'planned', 'in-progress', 'completed', 'cancelled'];

// 匹配正则
export const RX = {
    priority: /⏬|🔽|🔼|⏫|🔺/g,
    repeat: /🔁\s*(every\s+(day|week|month|year))/i,
    created: /➕\s*(\d{4}-\d{2}-\d{2})/,
    scheduled: /⏳\s*(\d{4}-\d{2}-\d{2})/,
    starts: /🛫\s*(\d{4}-\d{2}-\d{2})/,
    due: /📅\s*(\d{4}-\d{2}-\d{2})/,
    done: /✅\s*(\d{4}-\d{2}-\d{2})/,
    cancel: /❌\s*(\d{4}-\d{2}-\d{2})?/,
    tag: /🏁\s*(\S+)/,
    id: /🆔\s*(\S+)/,
    forbid: /⛔\s*([^\s,]+(?:\s*,\s*[^\s,]+)*)/
};

// 简单的日期工具（避免循环依赖）
function setStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function setEnd(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }

// ========== 任务状态提取 ==========
export function getTaskStatus(line) {
    var m = line.match(/^\s*- \[(.)\]\s*/);
    return m ? ({ x: 'completed', X: 'completed', '-': 'cancelled', '/': 'in-progress', '?': 'planned' })[m[1]] || 'todo' : 'todo';
}

// ========== 状态图标 ==========
export function getStatusIcon(task) {
    if (task._status === 'completed' || task.completed) return '✅';
    if (task._status === 'in-progress') return '⏩';
    if (task._status === 'planned') return '❔';
    if (task._status === 'cancelled') return '❎';
    return '🔲';
}

// ========== 今日任务判断 ==========
export function isTaskToday(task) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    function check(d) { return d ? (new Date(d) >= today && new Date(d) < tomorrow) : false; }
    return check(task._scheduled) || check(task._due) || check(task._starts) || check(task._created);
}

// ========== 计算任务时间范围 ==========
export function computeTaskTimeRange(task) {
    var min = Infinity, max = -Infinity;
    function add(d) {
        if (d) { var ts = new Date(d).getTime(); if (ts < min) min = ts; if (ts > max) max = ts; }
    }
    add(task._scheduled); add(task._due); add(task._starts);
    if (task._done) add(task._done);
    return min === Infinity ? null : {
        start: setStart(new Date(min)).getTime(),
        end: setEnd(new Date(max)).getTime()
    };
}

// ========== 补全任务属性 ==========
export function ensureTaskProperties(task) {
    if (!task.hasOwnProperty('_cleanText')) {
        task._cleanText = task.text
            .replace(/⏬|🔽|🔼|⏫|🔺/g, '')
            .replace(/🔁\s*every\s+(day|week|month|year)/gi, '')
            .replace(/➕\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, '')
            .replace(/❌\s*\d{4}-\d{2}-\d{2}?/g, '')
            .replace(/❌/g, '')
            .replace(/🏁\s*\S+/g, '')
            .replace(/🆔\s*\S+/g, '')
            .replace(/⛔\s*[^\s,]+(?:\s*,\s*[^\s,]+)*/g, '')
            .replace(/⛔[\s\S]*?(?=\s*$|🏁|🆔|🔁|➕|⏳|🛫|📅|✅|❌|$)/g, '')
            .trim() || task.text;
    }
    if (!task.hasOwnProperty('_tooltip')) {
        var parts = [];
        parts.push(getStatusIcon(task) + ' ' + task._cleanText);
        if (task._priorityIcon) parts.push(task._priorityIcon);
        if (task._repeat) parts.push('🔁 ' + task._repeat);
        if (task._created) parts.push('➕ ' + task._created);
        if (task._scheduled) parts.push('⏳ ' + task._scheduled);
        if (task._starts) parts.push('🛫 ' + task._starts);
        if (task._due) parts.push('📅 ' + task._due);
        if (task._done) parts.push('✅ ' + task._done);
        if (task._cancel) parts.push('❌ ' + task._cancel);
        if (task._tag) parts.push('🏁 ' + task._tag);
        if (task._id) parts.push('🆔 ' + task._id);
        if (task._forbid) parts.push('⛔ ' + task._forbid);
        task._tooltip = parts.join('\n');
        task._tooltipHtml = task._tooltip.replace(/\n/g, '<br>');
    }
}

// ========== 加载所有任务（使用 Dataview 页面） ==========
export function getAllTasks(force, dv) {
    var state = window.__taskDataViewState;
    if (!state) throw new Error('Global state __taskDataViewState not found');
    if (state.cachedAllTasks && !force) return state.cachedAllTasks;

    var tasks = [];
    for (var k = 0; k < CONFIG.TASK_FOLDERS.length; k++) {
        var folder = CONFIG.TASK_FOLDERS[k];
        var pages = dv.pages(folder);
        if (!pages || !pages.length) continue;
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            if (!CONFIG.FILE_NAME_PATTERN.test(page.file.name)) continue;
            if (!page.file.tasks) continue;
            for (var j = 0; j < page.file.tasks.length; j++) {
                var task = page.file.tasks[j];
                var fullLine = (task.completed ? '- [x] ' : '- [ ] ') + task.text;
                task._fullLine = fullLine;
                task._status = task.status ? ({ '/': 'in-progress', '?': 'planned', '-': 'cancelled', x: 'completed', X: 'completed' })[task.status] || 'todo' : getTaskStatus(fullLine);
                function m(rx, idx) { return fullLine.match(rx) ? fullLine.match(rx)[idx !== undefined ? idx : 1] || null : null; }
                task._created = m(RX.created); task._scheduled = m(RX.scheduled); task._starts = m(RX.starts);
                task._due = m(RX.due); task._done = m(RX.done); task._cancel = m(RX.cancel) || '';
                task._tag = m(RX.tag); task._id = m(RX.id); task._forbid = m(RX.forbid) ? m(RX.forbid).replace(/\s/g, '') : '';
                task._repeat = m(RX.repeat); task._priorityIcon = (fullLine.match(RX.priority) || [null])[0];
                task._marks = {
                    priority: !!task._priorityIcon, repeat: !!task._repeat, created: !!task._created,
                    scheduled: !!task._scheduled, starts: !!task._starts, due: !!task._due, done: !!task._done,
                    cancel: !!task._cancel, tag: !!task._tag, id: !!task._id, forbid: !!task._forbid
                };
                task._cachedTimeRange = computeTaskTimeRange(task);
                ensureTaskProperties(task);
                tasks.push(task);
            }
        }
    }
    state.cachedAllTasks = tasks;
    // 清空并重建 ID 映射
    for (var key in state.taskIdMap) {
        if (state.taskIdMap.hasOwnProperty(key)) delete state.taskIdMap[key];
    }
    for (var i = 0; i < tasks.length; i++) {
        if (tasks[i]._id) state.taskIdMap[tasks[i]._id] = tasks[i];
    }
    return tasks;
}