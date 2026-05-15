// src/tasks/process/matrix-task-process.js
import {
    TASK_FOLDER_PATH,
    TASK_FILENAME_REGEX_TASKS,
    TASK_FILENAME_REGEXP,
    PRIORITY_ICONS
} from '../../configs/plugin-configs';

const STATUS_SYMBOLS = [" ", "?", "/"];

// 优先级 -> 四象限索引（局部常量，不再放进全局配置）
const PRIORITY_TO_QUADRANT = {
    1: 0,  // 最高优先级 → 紧急重要
    2: 1,  // 高        → 不紧急但重要
    3: 2,  // 中        → 紧急但不重要
    4: 3,  // 低        → 不紧急不重要
    // 无优先级（'none'）在逻辑中默认归入象限3
};

const dateCache = new Map();
function formatDate(date) {
    if (!date) return null;
    const key = String(date);
    if (dateCache.has(key)) return dateCache.get(key);
    const formatted = window.moment
        ? window.moment(date).format("YYYY-MM-DD")
        : new Date(date).toISOString().slice(0, 10);
    dateCache.set(key, formatted);
    return formatted;
}

export function fetchRawTasks(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) return Promise.reject('需要 Tasks 插件');
    const query = `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS}`;
    return tasksPlugin.getTasks(query);
}

export function processTasks(allTasks, hideRecurring = false) {
    const quadrantsData = [[], [], [], []];
    allTasks.forEach(t => {
        const fileName = t.path.split('/').pop();
        if (!TASK_FILENAME_REGEXP.test(fileName)) return;
        const sym = t.status.symbol;
        if (!STATUS_SYMBOLS.includes(sym)) return;
        if (hideRecurring && t.recurrence) return;

        const priorityNum = (t.priority === "none" || t.priority == null) ? 5 : parseInt(t.priority);
        const priorityIcon = PRIORITY_ICONS[t.priority] || '';
        const statusText = sym === '/' ? '进行中' : (sym === '?' ? '计划中' : '未开始');
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
            sortTimestamp,
            _status: t.status?.symbol === '/' ? 'in-progress' : (t.status?.symbol === '?' ? 'planned' : 'todo')
        };

        // 使用显式映射，无优先级默认象限3（不紧急不重要）
        const quadIndex = PRIORITY_TO_QUADRANT[priorityNum] ?? 3;
        quadrantsData[quadIndex].push(taskItem);
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