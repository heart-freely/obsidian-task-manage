// src/tasks/process/inbox-task-process.js
import { TASK_FOLDER_PATH, TASK_FILENAME_REGEX_TASKS } from '../../configs/plugin-configs';

export async function fetchInboxTasks(app) {
    const tasksPlugin = app.plugins.plugins['obsidian-tasks-plugin'];
    if (!tasksPlugin) throw new Error('Tasks 插件未安装');
    const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
    const allTasks = await tasksPlugin.getTasks(query);
    return allTasks.filter(t => t.status.symbol === ' ' || t.status.symbol === '?');
}

export function processInboxTasks(allTasks) {
    const groups = { "未开始": [], "计划中": [] };

    allTasks.forEach(t => {
        const isPlanned = t.status.symbol === '?';
        const prio = t.priority || 'none';
        const desc = t.description || '（无描述）';
        const taskItem = {
            description: desc,
            priority: prio,
            path: t.path,
            lineNumber: t.lineNumber,
            scheduled: t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null,
            start: t.startDate ? window.moment(t.startDate).format('YYYY-MM-DD') : null,
            due: t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null,
            tags: (t.tags || []).map(tag => tag.replace(/^#/, '')),
            fileName: t.path.split('/').pop().replace(/\.md$/, '')
        };

        if (isPlanned) {
            groups["计划中"].push(taskItem);
        } else {
            groups["未开始"].push(taskItem);
        }
    });

    for (const groupName in groups) {
        groups[groupName].sort((a, b) => {
            const pa = a.priority === 'none' ? 999 : parseInt(a.priority);
            const pb = b.priority === 'none' ? 999 : parseInt(b.priority);
            return pa - pb;
        });
    }

    return { groups, total: allTasks.length };
}