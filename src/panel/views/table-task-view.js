// src/panel/views/table-task-view.js
import { BaseTaskView } from './base-task-view';

export const VIEW_TYPE_TABLE = 'table-task-view';
export class TableTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_TABLE; }
    getDisplayText() { return '任务表'; }
    getIcon() { return 'layout'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        dv.container.innerHTML = '<div class="empty-message">📑 任务表视图即将上线</div>';
        return { cleanup: () => {}, updateSort: () => {} };
    }
}