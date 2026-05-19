// src/panel/views/organize-task-view.js
import { BaseTaskView } from './base-task-view';

export const VIEW_TYPE_ORGANIZE = 'organize-task-view';
export class OrganizeTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_ORGANIZE; }
    getDisplayText() { return '任务整理处'; }
    getIcon() { return 'folder-open'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        dv.container.innerHTML = '<div class="empty-message">🛠️ 整理功能即将上线</div>';
        return { cleanup: () => {}, updateSort: () => {} };
    }
}