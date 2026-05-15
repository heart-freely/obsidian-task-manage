// src/panel/views/kanban-task-view.js
import { fetchKanbanTasks, processKanbanTasks } from '../../tasks/process/kanban-task-process';
import { createTaskCard, normalizeTaskCardData } from './base-task-view';

export async function startKanbanView(dv, app, container) {
    if (!document.getElementById('kanban-layout-style')) {
        const style = document.createElement('style');
        style.id = 'kanban-layout-style';
        style.textContent = `
            .kanban {
                display: flex;
                gap: 12px;
                padding: 8px 0;
                overflow-x: auto;
            }
            .kanban .view-col {
                flex: 1 1 0;
                min-width: 0;
            }
            .kanban .task-list {
                display: block !important;
                list-style: none;
                padding: 0;
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }

    async function renderKanban() {
        container.innerHTML = '';
        let data;
        try {
            const rawTasks = await fetchKanbanTasks(app);
            data = processKanbanTasks(rawTasks);
        } catch (e) {
            container.innerHTML = '<div class="empty-placeholder">❌ 未检测到 Tasks 插件，请安装并启用。</div>';
            return;
        }

        const statsBar = document.createElement('div');
        statsBar.style.cssText = 'margin-bottom:12px; font-weight:600;';
        statsBar.textContent = `📋 任务总数：${data.total} (未开始 / 计划中 / 进行中)`;
        container.appendChild(statsBar);

        const board = document.createElement('div');
        board.className = 'kanban';

        const groups = [
            { name: '未开始', symbol: ' ', color: 'rgba(180, 180, 180, 0.25)' },
            { name: '计划中', symbol: '?', color: 'rgba(97, 175, 239, 0.25)' },
            { name: '进行中', symbol: '/', color: 'rgba(224, 108, 117, 0.25)' }
        ];

        groups.forEach(group => {
            const tasks = data.tasksBySymbol[group.symbol] || [];
            const colDiv = document.createElement('div');
            colDiv.className = 'view-col';
            colDiv.style.setProperty('--quad-color', group.color);

            const header = document.createElement('div');
            header.className = 'col-header';
            header.innerHTML = `<span>${group.name}</span><span>${tasks.length}</span>`;
            colDiv.appendChild(header);

            const list = document.createElement('ul');
            list.className = 'task-list';

            if (tasks.length === 0) {
                list.innerHTML = '<li class="empty-placeholder">暂无任务</li>';
            } else {
                tasks.forEach(t => {
                    const cardData = normalizeTaskCardData({
                        description: t.description,
                        priority: t.priority,
                        status: t.status,
                        scheduled: null,
                        start: null,
                        due: null,
                        tags: [],
                        id: '',
                        forbid: '',
                        fileName: t.fileName,
                        path: t.path,
                        lineNumber: t.lineNumber
                    });
                    list.appendChild(createTaskCard(cardData, app));
                });
            }
            colDiv.appendChild(list);
            board.appendChild(colDiv);
        });

        container.appendChild(board);
    }

    await renderKanban();

    return {
        cleanup: () => { container.innerHTML = ''; },
        updateSort: () => { renderKanban(); }
    };
}