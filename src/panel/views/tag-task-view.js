// src/panel/views/tag-task-view.js
import { BaseTaskView, createTaskCard, normalizeTaskCardData } from './base-task-view';
import * as readTasks from '../../tasks/read/read-tasks';
import { CONFIG } from '../../configs/plugin-configs';

export const VIEW_TYPE_TAG = 'tag-task-view';

export class TagTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_TAG; }
    getDisplayText() { return '标签任务'; }
    getIcon() { return 'tag'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        return await startTagView(dv, app, dv.container);
    }
}

export async function startTagView(dv, app, container) {
    async function render() {
        container.innerHTML = '';
        try {
            const state = {};
            const allTasks = readTasks.getAllTasks(false, dv, state);
            // 筛选含有自定义标签 _tag 的任务
            const tagTasks = allTasks.filter(t => t._tag && t._tag.trim());

            if (!tagTasks.length) {
                container.innerHTML = '<div class="empty-placeholder">🏷️ 暂无标签任务</div>';
                return;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'view-col';
            wrapper.style.setProperty('--quad-color', 'rgba(160, 200, 120, 0.25)');

            const header = document.createElement('div');
            header.className = 'col-header';
            header.innerHTML = `<span>📋 标签任务</span><span>${tagTasks.length} 项</span>`;
            wrapper.appendChild(header);

            const ul = document.createElement('ul');
            ul.className = 'task-list';

            tagTasks.forEach(task => {
                // 优先级处理（与依赖任务一致）
                let priority = 'none';
                if (task._priorityIcon) {
                    const found = Object.entries(CONFIG.PRIORITY_ICONS).find(([, icon]) => icon === task._priorityIcon);
                    if (found) priority = found[0];
                } else if (task.priority && task.priority !== 'none') {
                    priority = task.priority;
                }

                const cardData = normalizeTaskCardData({
                    description: task._cleanText || task.text || '（无描述）',
                    priority: priority,
                    status: task._status,
                    recurrenceLabel: task._repeat ? `🔁 ${task._repeat}` : '',
                    scheduled: task._scheduled || null,
                    start: task._starts || null,
                    due: task._due || null,
                    tags: task._tag ? [task._tag] : [],
                    id: task._id || '',
                    forbid: task._forbid || '',
                    fileName: task.path ? task.path.split('/').pop().replace(/\.md$/, '') : '',
                    path: task.path || '',
                    lineNumber: task.line || 0
                });
                ul.appendChild(createTaskCard(cardData, app));
            });

            wrapper.appendChild(ul);
            container.appendChild(wrapper);
        } catch (e) {
            console.error('标签任务视图渲染失败', e);
            container.innerHTML = `<div class="empty-placeholder">⚠️ 获取标签任务失败：${e.message}</div>`;
        }
    }

    await render();
    return { cleanup: () => { container.innerHTML = ''; }, updateSort: () => { render(); } };
}