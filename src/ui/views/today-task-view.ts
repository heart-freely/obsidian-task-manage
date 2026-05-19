// src/panel/views/today-task-view.js
import { BaseTaskView, createTaskCard, normalizeTaskCardData } from './base-task-view';
import { fetchTodayTasksGrouped } from '../../tasks/process/task-query-process';

export const VIEW_TYPE_TODAY = 'today-task-view';

export class TodayTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_TODAY; }
    getDisplayText() { return '今天任务'; }
    getIcon() { return 'calendar-check'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        return await startTodayView(dv, app, dv.container);
    }
}

export async function startTodayView(dv, app, container) {
    async function renderToday() {
        container.innerHTML = '';
        let data;
        try { data = await fetchTodayTasksGrouped(app); } catch (e) {
            container.innerHTML = '<div class="empty-placeholder">❌ 未检测到 Tasks 插件</div>';
            return;
        }

        const stats = document.createElement('div');
        stats.style.cssText = 'margin-bottom:12px; font-weight:600;';
        stats.textContent = `📋 今天任务：${data.total} 项`;
        container.appendChild(stats);

        const grid = document.createElement('div');
        grid.className = 'view-grid cols-3';

        const groups = [
            { name: '未开始', tasks: data.groups['未开始'] || [], statusKey: 'todo', color: 'rgba(130,170,255,0.3)' },
            { name: '计划中', tasks: data.groups['计划中'] || [], statusKey: 'planned', color: 'rgba(255,200,100,0.3)' },
            { name: '进行中', tasks: data.groups['进行中'] || [], statusKey: 'in-progress', color: 'rgba(255,130,130,0.3)' }
        ];

        groups.forEach(group => {
            const col = document.createElement('div');
            col.className = 'view-col';
            col.style.setProperty('--quad-color', group.color);

            const header = document.createElement('div');
            header.className = 'col-header';
            header.innerHTML = `<span>${group.name}</span><span>${group.tasks.length}</span>`;
            col.appendChild(header);

            const list = document.createElement('ul');
            list.className = 'task-list';

            if (group.tasks.length === 0) {
                list.innerHTML = '<li class="empty-placeholder">暂无任务</li>';
            } else {
                group.tasks.forEach(t => {
                    const cardData = normalizeTaskCardData({
                        ...t,
                        status: group.statusKey
                    });
                    list.appendChild(createTaskCard(cardData, app));
                });
            }
            col.appendChild(list);
            grid.appendChild(col);
        });
        container.appendChild(grid);
    }

    await renderToday();

    return { cleanup: () => { container.innerHTML = ''; }, updateSort: () => { renderToday(); } };
}