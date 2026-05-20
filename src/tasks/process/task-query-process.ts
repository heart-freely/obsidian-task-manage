// src/tasks/process/task-query-process.js
import { TASK_FOLDER_PATH, TASK_FILENAME_REGEX_TASKS } from '../../configs/configs';
import { RX } from '../../tasks/read/read-tasks';   // 引入统一正则以提取自定义标记

function baseQuery(extra = '') {
    return `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} ${extra}`.trim();
}

export async function fetchTasks(app, extraQuery = '') {
    const plugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!plugin) throw new Error('需要 Tasks 插件');
    return await plugin.getTasks(baseQuery(extraQuery));
}

export async function fetchImportantTasks(app) {
    const all = await fetchTasks(app, 'is not recurring');
    return all.filter(t => t.priority !== 'none' && parseInt(t.priority) <= 1);
}

export async function fetchRecurringTasks(app) {
    return await fetchTasks(app, 'is recurring');
}

export async function fetchTodayTasks(app) {
    const all = await fetchTasks(app);
    const today = window.moment().format('YYYY-MM-DD');
    return all.filter(t => {
        const due = t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null;
        const sched = t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null;
        return due === today || sched === today;
    });
}

export async function fetchFutureTasks(app, days = 15) {
    const all = await fetchTasks(app);
    const now = window.moment();
    const limit = window.moment().add(days, 'days');
    return all.filter(t => {
        const date = t.dueDate || t.scheduledDate;
        return date && window.moment(date).isBetween(now, limit, null, '[]');
    });
}

export async function fetchOverdueTasks(app) {
    const all = await fetchTasks(app);
    const now = window.moment().format('YYYY-MM-DD');
    return all.filter(t => {
        const date = t.dueDate || t.scheduledDate;
        return date && window.moment(date).isBefore(now);
    });
}

export async function fetchDependsTasks(app) {
    const all = await fetchTasks(app);
    return all.filter(t => t.dependsOn && t.dependsOn.length > 0);
}

/**
 * 获取标签任务（同时兼容原生 #标签 和 自定义 🏁 标记）
 * @param {App} app
 * @param {string} tag - 要筛选的标签（不含 #），传入空字符串则返回所有包含任意标签的任务
 */
export async function fetchTagTasks(app, tag) {
    const allTasks = await fetchTasks(app);
    const result = [];

    for (const task of allTasks) {
        // 原生 tags（Tasks 插件自动解析的 #标签）
        const nativeTags = (task.tags || []).map(t => t.replace(/^#/, ''));

        // 自定义标签：从任务文本中提取，使用与系统统一的 RX 正则
        const fullText = task.description || task.text || '';
        const match = RX.tag.exec(fullText);
        const customTag = match ? match[1] : null;

        const allTags = [...nativeTags];
        if (customTag && !allTags.includes(customTag)) {
            allTags.push(customTag);
        }

        if (!tag || tag.trim() === '') {
            if (allTags.length > 0) result.push(task);
        } else {
            if (allTags.some(t => t.toLowerCase() === tag.toLowerCase())) result.push(task);
        }
    }

    return result;
}

// ========== 今天任务（状态分组） ==========
export async function fetchTodayTasksGrouped(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) throw new Error('需要 Tasks 插件');
    const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
    const allTasks = await tasksPlugin.getTasks(query);

    const today = window.moment().format('YYYY-MM-DD');
    const isDateValid = (d) => d && window.moment(d).format('YYYY-MM-DD') === today;
    const isBetween = (start, end) => {
        if (!start || !end) return false;
        return window.moment(start).format('YYYY-MM-DD') <= today &&
               today <= window.moment(end).format('YYYY-MM-DD');
    };

    const filtered = allTasks.filter(t => {
        const sym = t.status.symbol;
        const validStatus = sym === ' ' || sym === '?' || sym === '/';
        if (!validStatus || t.recurrence) return false;

        if ([t.createdDate, t.scheduledDate, t.startDate, t.dueDate, t.doneDate, t.cancelledDate].some(isDateValid)) return true;
        if (isBetween(t.scheduledDate, t.dueDate)) return true;
        if (isBetween(t.startDate, t.doneDate)) return true;
        if (isBetween(t.startDate, t.cancelledDate)) return true;
        return false;
    });

    const groups = { "未开始": [], "计划中": [], "进行中": [] };

    filtered.forEach(t => {
        const sym = t.status.symbol;
        const groupName = sym === ' ' ? '未开始' : sym === '?' ? '计划中' : '进行中';
        const prio = t.priority || 'none';
        const desc = t.description || '（无描述）';
        const taskItem = {
            description: desc,
            priority: prio,
            statusText: groupName,
            path: t.path,
            lineNumber: t.lineNumber,
            scheduled: t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null,
            due: t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null,
            start: t.startDate ? window.moment(t.startDate).format('YYYY-MM-DD') : null,
            tags: (t.tags || []).map(tag => tag.replace(/^#/, '')),
            fileName: t.path.split('/').pop().replace(/\.md$/, ''),
            recurrenceLabel: ''
        };
        groups[groupName].push(taskItem);
    });

    for (const g in groups) {
        groups[g].sort((a, b) => {
            const pa = a.priority === 'none' ? 999 : parseInt(a.priority);
            const pb = b.priority === 'none' ? 999 : parseInt(b.priority);
            if (pa !== pb) return pa - pb;
            if (!a.scheduled && !b.scheduled) return 0;
            if (!a.scheduled) return 1;
            if (!b.scheduled) return -1;
            return a.scheduled.localeCompare(b.scheduled);
        });
    }

    const total = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);
    return { groups, total };
}

// ========== 重要任务（状态分组） ==========
export async function fetchImportantTasksByStatus(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) throw new Error('需要 Tasks 插件');
    const query = `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS}`;
    const allTasks = await tasksPlugin.getTasks(query);

    const filtered = allTasks.filter(t => {
        const sym = t.status.symbol;
        const validStatus = sym === ' ' || sym === '?' || sym === '/';
        const prioNum = (t.priority === "none" || t.priority == null) ? 5 : parseInt(t.priority);
        return validStatus && prioNum >= 1 && prioNum <= 3;
    });

    const groups = { "未开始": [], "计划中": [], "进行中": [] };

    filtered.forEach(t => {
        const sym = t.status.symbol;
        const groupName = sym === ' ' ? '未开始' : sym === '?' ? '计划中' : '进行中';
        const prio = t.priority || 'none';
        const desc = t.description || '（无描述）';
        const taskItem = {
            description: desc,
            priority: prio,
            statusText: groupName,
            path: t.path,
            lineNumber: t.lineNumber,
            due: t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null,
            scheduled: t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null,
            start: t.startDate ? window.moment(t.startDate).format('YYYY-MM-DD') : null,
            tags: (t.tags || []).map(tag => tag.replace(/^#/, '')),
            fileName: t.path.split('/').pop().replace(/\.md$/, ''),
            recurrenceLabel: t.recurrence ? `🔁 ${t.recurrence.toText()}` : ''
        };
        groups[groupName].push(taskItem);
    });

    for (const g in groups) {
        groups[g].sort((a, b) => {
            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;
            return new Date(a.due) - new Date(b.due);
        });
    }

    const total = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);
    return { groups, total };
}
