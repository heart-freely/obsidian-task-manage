// src/task-engine.js —— 任务解析、筛选、树构建与排序

var common = require('./common');

var state = common.state;
var CONFIG = common.CONFIG;
var ALLOWED_STATUSES = common.ALLOWED_STATUSES;
var STATUS_ICONS = common.STATUS_ICONS;
var DateUtils = common.DateUtils;
var collapsedHas = common.collapsedHas;

var formatDate = DateUtils.formatDate;
var setStart = DateUtils.setStart;
var setEnd = DateUtils.setEnd;

// ========== 任务解析正则 ==========
var RX = {
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

// ========== 状态识别 ==========
function getTaskStatus(line) {
    var m = line.match(/^\s*- \[(.)\]\s*/);
    return m ? ({ x: 'completed', X: 'completed', '-': 'cancelled', '/': 'in-progress', '?': 'planned' })[m[1]] || 'todo' : 'todo';
}

function getStatusIcon(task) {
    if (task._status === 'completed' || task.completed) return '✅';
    if (task._status === 'in-progress') return '⏩';
    if (task._status === 'planned') return '❔';
    if (task._status === 'cancelled') return '❎';
    return '🔲';
}

function isTaskToday(task) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    function check(d) { return d ? (new Date(d) >= today && new Date(d) < tomorrow) : false; }
    return check(task._scheduled) || check(task._due) || check(task._starts) || check(task._created);
}

// ========== 任务属性填充 ==========
function computeTaskTimeRange(task) {
    var min = Infinity, max = -Infinity;
    function add(d) {
        if (d) { var ts = new Date(d).getTime(); if (ts < min) min = ts; if (ts > max) max = ts; }
    }
    add(task._scheduled); add(task._due); add(task._starts);
    if (task._done) add(task._done);
    return min === Infinity ? null : { start: setStart(new Date(min)).getTime(), end: setEnd(new Date(max)).getTime() };
}

function ensureTaskProperties(task) {
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

// ========== 获取所有任务 ==========
function getAllTasks(dv, force) {
    if (!state.cachedAllTasks || force) {
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
        common.taskIdMapClear();
        tasks.forEach(function (t) { if (t._id) common.taskIdMapSet(t._id, t); });
    }
    return state.cachedAllTasks;
}

// ========== 筛选 ==========
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

function applyAllFilters(dv) {
    var fp = getFilterFingerprint();
    if (state.filterCache.fingerprint === fp) return state.filterCache.tasks.slice();
    var tasks = getAllTasks(dv, false).slice();
    if (!state.dateFilterState.isAll && state.dateFilterState.start && state.dateFilterState.end) {
        var qr = { start: state.dateFilterState.start.getTime(), end: state.dateFilterState.end.getTime() };
        tasks = tasks.filter(function (t) {
            var tr = t._cachedTimeRange;
            return tr && tr.start <= qr.end && tr.end >= qr.start;
        });
    }
    if (state.filterRootPath) tasks = tasks.filter(function (t) { return t.path.startsWith(state.filterRootPath); });
    var statusFilter = state.markFilterState.statuses.length < ALLOWED_STATUSES.length;
    if (statusFilter) tasks = tasks.filter(function (t) { return state.markFilterState.statuses.indexOf(t._status) !== -1; });
    if (state.hideRepeatTasks) tasks = tasks.filter(function (t) { return !t._repeat; });
    if (state.hideCompletedTasks) tasks = tasks.filter(function (t) { return t._status !== 'completed'; });
    if (state.hideCancelledTasks) tasks = tasks.filter(function (t) { return t._status !== 'cancelled'; });
    if (state.markFilterState.includeMarks.length) {
        tasks = tasks.filter(function (t) {
            return state.markFilterState.includeMarks.every(function (m) { return t._marks[m]; });
        });
    }
    if (state.markFilterState.excludeMarks.length) {
        tasks = tasks.filter(function (t) {
            return !state.markFilterState.excludeMarks.some(function (m) { return t._marks[m]; });
        });
    }
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

// ========== 树构建 ==========
function buildTree(tasks, dv) {
    var rootPrefix = CONFIG.ROOT_PATH;
    var fileMap = {};
    tasks.forEach(function (t) {
        var list = fileMap[t.path] || [];
        list.push(t);
        fileMap[t.path] = list;
    });
    var rootNodes = [], folderMap = {};
    for (var filePath in fileMap) {
        if (!fileMap.hasOwnProperty(filePath)) continue;
        var fileTasks = fileMap[filePath];
        var fileName = filePath.split('/').pop().replace(/\.md$/, '');
        var relPath = filePath.startsWith(rootPrefix) ? filePath.slice(rootPrefix.length) : filePath;
        var parts = relPath.split('/');
        var curPath = '', parent = null;
        for (var i = 0; i < parts.length; i++) {
            curPath += (i ? '/' : '') + parts[i];
            var fullPath = rootPrefix + curPath;
            if (i === parts.length - 1) {
                var node = {
                    type: 'file', path: filePath, name: fileName, tasks: fileTasks,
                    fullPath: fullPath, parent: parent, children: [],
                    completedCount: fileTasks.filter(function (t) { return t._status === 'completed'; }).length,
                    totalCount: fileTasks.length
                };
                if (parent) parent.children.push(node);
                else rootNodes.push(node);
                folderMap[fullPath] = node;
            } else {
                var folder = folderMap[fullPath];
                if (!folder) {
                    folder = { type: 'folder', path: fullPath, name: parts[i], children: [], parent: parent, fullPath: fullPath };
                    if (parent) parent.children.push(folder);
                    else rootNodes.push(folder);
                    folderMap[fullPath] = folder;
                }
                parent = folder;
            }
        }
    }
    return rootNodes;
}

function calcNodeStats(node) {
    var stats = { todo: 0, planned: 0, 'in-progress': 0, completed: 0, cancelled: 0, total: 0 };
    if (node.type === 'task') { stats[node.task._status]++; stats.total++; return stats; }
    if (node.tasks) node.tasks.forEach(function (t) { stats[t._status]++; stats.total++; });
    if (node.children) node.children.forEach(function (ch) {
        var cs = calcNodeStats(ch);
        for (var k in cs) { if (cs.hasOwnProperty(k)) stats[k] += cs[k]; }
    });
    return stats;
}

function sortTreeNodes(nodes) {
    nodes.sort(function (a, b) {
        return a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name);
    });
    nodes.forEach(function (node) {
        if (node.type === 'file') {
            node.tasks.sort(function (a, b) {
                var order = state.leftSort.order === 'asc' ? 1 : -1;
                if (state.leftSort.type === 'status') {
                    var map = { todo: 0, planned: 1, 'in-progress': 2, cancelled: 3, completed: 4 };
                    var va = map[a._status] !== undefined ? map[a._status] : 5;
                    var vb = map[b._status] !== undefined ? map[b._status] : 5;
                    return (va - vb) * order;
                }
                if (state.leftSort.type === 'priority') {
                    var prio = { '🔺': 0, '⏫': 1, '🔼': 2, '🔽': 3, '⏬': 4 };
                    var pa = prio[a._priorityIcon] !== undefined ? prio[a._priorityIcon] : 5;
                    var pb = prio[b._priorityIcon] !== undefined ? prio[b._priorityIcon] : 5;
                    return (pa - pb) * order;
                }
                var getTime = function (task) {
                    var fields = ['_created', '_starts', '_scheduled', '_due', '_cancel', '_done'];
                    for (var i = 0; i < fields.length; i++) {
                        if (task[fields[i]]) return new Date(task[fields[i]]).getTime();
                    }
                    return null;
                };
                var da = getTime(a), db = getTime(b);
                if (!da && !db) return 0;
                if (!da) return 1;
                if (!db) return -1;
                return (da - db) * order;
            });
        }
        if (node.children) sortTreeNodes(node.children);
    });
}

function flattenTreeForDisplay(nodes, level, result) {
    nodes.forEach(function (node) {
        if (state.hideFolders && node.type === 'folder') {
            if (node.children && node.children.length) {
                flattenTreeForDisplay(node.children, level, result);
            }
        } else {
            node.level = level;
            result.push(node);
            var expanded = !collapsedHas(node.fullPath);
            if (expanded) {
                if (node.children && node.children.length) {
                    flattenTreeForDisplay(node.children, level + 1, result);
                } else if (node.type === 'file' && node.tasks) {
                    node.tasks.forEach(function (t) {
                        result.push({ type: 'task', task: t, parentFile: node, level: level + 1 });
                    });
                }
            }
        }
    });
}

module.exports = {
    RX, getTaskStatus, getStatusIcon, isTaskToday,
    getAllTasks, applyAllFilters, getEffectiveDateRange,
    buildTree, calcNodeStats, sortTreeNodes, flattenTreeForDisplay
};