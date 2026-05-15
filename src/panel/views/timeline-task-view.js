// src/panel/views/timeline-task-view.js
import { BaseTaskView, createTaskCard, normalizeTaskCardData } from './base-task-view';
import { fetchTasks } from '../../tasks/process/task-query-process';

export const VIEW_TYPE_TIMELINE = 'timeline-task-view';

export class TimelineTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_TIMELINE; }
    getDisplayText() { return '所有任务时间轴'; }
    getIcon() { return 'clock'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        return await startTimelineView(dv, app, dv.container);
    }
}

export async function startTimelineView(dv, app, container) {
    async function render() {
        container.innerHTML = '';
        let rawTasks;
        try {
            // 数据源：Tasks 插件 API（不包含循环任务，可按需调整）
            rawTasks = await fetchTasks(app, 'is not recurring');
        } catch (e) {
            container.innerHTML = '<div class="empty-placeholder">❌ 获取任务失败，请确认 Tasks 插件已启用</div>';
            return;
        }

        const validSymbols = [' ', '?', '/'];
        const filtered = rawTasks.filter(t => validSymbols.includes(t.status.symbol));

        const total = filtered.length;
        const statsBar = document.createElement('div');
        statsBar.style.cssText = 'margin-bottom:12px; font-weight:600;';
        statsBar.textContent = `📅 时间线视图：${total} 项任务`;
        container.appendChild(statsBar);

        if (total === 0) {
            const msg = document.createElement('div');
            msg.className = 'empty-placeholder';
            msg.textContent = '📅 没有符合条件的任务';
            container.appendChild(msg);
            return;
        }

        // 按 dueDate 分组，无截止日期的归入 "无截止日期"
        const groups = {};
        const noDateKey = '__no_date__';
        filtered.forEach(t => {
            const due = t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : noDateKey;
            if (!groups[due]) groups[due] = [];
            groups[due].push(t);
        });

        const orderedDates = Object.keys(groups).sort((a, b) => {
            if (a === noDateKey) return 1;
            if (b === noDateKey) return -1;
            return a.localeCompare(b);
        });

        const statusOrder = { ' ': 0, '?': 1, '/': 2 };

        for (const due of orderedDates) {
            const tasks = groups[due];
            if (tasks.length === 0) continue;

            const dateLabel = due === noDateKey ? '📅 无截止日期' : `📅 ${due}`;

            const col = document.createElement('div');
            col.className = 'view-col';
            col.style.setProperty('--quad-color', 'rgba(100, 149, 237, 0.25)');
            col.style.marginBottom = '16px';

            const header = document.createElement('div');
            header.className = 'col-header';
            header.innerHTML = `<span>${dateLabel}</span><span>${tasks.length} 项</span>`;
            col.appendChild(header);

            // 排序：先按状态，再按优先级
            tasks.sort((a, b) => {
                const soA = statusOrder[a.status.symbol] ?? 3;
                const soB = statusOrder[b.status.symbol] ?? 3;
                if (soA !== soB) return soA - soB;
                const pa = a.priority === 'none' ? 999 : parseInt(a.priority);
                const pb = b.priority === 'none' ? 999 : parseInt(b.priority);
                return pa - pb;
            });

            const list = document.createElement('ul');
            list.className = 'task-list';

            tasks.forEach(t => {
                const cardData = normalizeTaskCardData({
                    description: t.description || '（无描述）',
                    priority: t.priority || 'none',
                    status: mapSymbolToStatus(t.status.symbol),
                    recurrenceLabel: t.recurrence ? `🔁 ${t.recurrence.toText()}` : '',
                    scheduled: t.scheduledDate ? window.moment(t.scheduledDate).format('YYYY-MM-DD') : null,
                    start: t.startDate ? window.moment(t.startDate).format('YYYY-MM-DD') : null,
                    due: t.dueDate ? window.moment(t.dueDate).format('YYYY-MM-DD') : null,
                    tags: (t.tags || []).map(tag => tag.replace(/^#/, '')),
                    fileName: t.path.split('/').pop().replace(/\.md$/, ''),
                    path: t.path,
                    lineNumber: t.lineNumber
                });
                list.appendChild(createTaskCard(cardData, app));
            });

            col.appendChild(list);
            container.appendChild(col);
        }
    }

    function mapSymbolToStatus(symbol) {
        if (symbol === ' ') return 'todo';
        if (symbol === '?') return 'planned';
        if (symbol === '/') return 'in-progress';
        return 'todo';
    }

    await render();

    return {
        cleanup: () => { container.innerHTML = ''; },
        updateSort: () => { render(); }
    };
}