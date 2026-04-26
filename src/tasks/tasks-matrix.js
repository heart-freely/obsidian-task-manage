// src/tasks/tasks-matrix.js
// 四象限任务矩阵数据逻辑（不渲染任何 DOM）

const FOLDER = "pages/A 系统/A 任务系统";
const FILENAME_REGEX = /任务\.md$/;
const STATUS_SYMBOLS = [" ", "?", "/"];

const PRIORITY_ICONS = { 0: '🔺', 1: '⏫', 2: '🔼', 3: '🔽', 4: '⏬' };

const dateCache = new Map();
const formatDate = (date) => {
    if (!date) return null;
    const key = String(date);
    if (dateCache.has(key)) return dateCache.get(key);
    const formatted = window.moment ? window.moment(date).format("YYYY-MM-DD") : new Date(date).toISOString().slice(0, 10);
    dateCache.set(key, formatted);
    return formatted;
};

export function fetchRawTasks(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) return Promise.reject('obsidian-tasks-plugin not found');
    const query = `path includes "${FOLDER}" filename regex matches "${FILENAME_REGEX.source}"`;
    return tasksPlugin.getTasks(query);
}

export function processTasks(allTasks, hideRecurring = false) {
    const quadrantsData = [[], [], [], []];
    allTasks.forEach(t => {
        const fileName = t.path.split('/').pop();
        if (!FILENAME_REGEX.test(fileName)) return;
        const sym = t.status.symbol;
        if (!STATUS_SYMBOLS.includes(sym)) return;
        if (hideRecurring && t.recurrence) return;

        const priorityNum = (t.priority === "none" || t.priority == null) ? 5 : parseInt(t.priority);
        const priorityIcon = PRIORITY_ICONS[priorityNum] || '';
        const statusText = sym === '/' ? '进行中' : (t.scheduledDate || t.startDate ? '计划中' : '未开始');
        const tags = (t.tags || []).map(tag => tag.replace(/^#/, ''));
        const sortDate = t.scheduledDate || t.startDate || t.dueDate;
        const sortTimestamp = sortDate ? new Date(sortDate).getTime() : null;

        const taskItem = {
            desc: t.description || "（无描述）",
            priorityNum,
            priorityIcon,
            statusText,
            tags,
            created: formatDate(t.createdDate),
            scheduled: formatDate(t.scheduledDate),
            start: formatDate(t.startDate),
            due: formatDate(t.dueDate),
            done: formatDate(t.doneDate),
            cancelled: formatDate(t.cancelledDate),
            path: t.path,
            line: t.lineNumber,
            fileName: fileName.replace(/\.md$/, ''),
            isRecurring: !!t.recurrence,
            sortTimestamp
        };

        const eff = priorityNum === 5 ? 3 : priorityNum;
        const idx = [0,1,2,3].find(i => i === eff) ?? 3;
        quadrantsData[idx].push(taskItem);
    });
    return quadrantsData;
}

export function sortTasks(tasks, sortConfig) {
    const { type, order } = sortConfig;
    const asc = order === 'asc';
    const copy = tasks.slice();
    copy.sort((a, b) => {
        if (type === 'status') {
            const orderA = a.statusText === '进行中' ? 0 : (a.statusText === '计划中' ? 1 : 2);
            const orderB = b.statusText === '进行中' ? 0 : (b.statusText === '计划中' ? 1 : 2);
            if (orderA !== orderB) return orderA - orderB;
            if (a.priorityNum !== b.priorityNum) return a.priorityNum - b.priorityNum;
            const tsA = a.sortTimestamp || Number.MAX_SAFE_INTEGER;
            const tsB = b.sortTimestamp || Number.MAX_SAFE_INTEGER;
            return tsA - tsB;
        }
        if (type === 'priority') return a.priorityNum - b.priorityNum;
        if (type === 'filename') {
            const cmp = a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase());
            return asc ? cmp : -cmp;
        }
        const dateField = type;
        const dateA = a[dateField] ? new Date(a[dateField] + 'T00:00:00') : null;
        const dateB = b[dateField] ? new Date(b[dateField] + 'T00:00:00') : null;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return asc ? dateA - dateB : dateB - dateA;
    });
    return copy;
}