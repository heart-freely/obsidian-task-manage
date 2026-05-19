// src/panel/views/overdue-task-view.js
import { BaseTaskView } from './base-task-view';
import { startListBaseView } from './base-list-view';
import { fetchOverdueTasks } from '../../tasks/process/task-query-process';

export const VIEW_TYPE_OVERDUE = 'overdue-task-view';
export class OverdueTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_OVERDUE; }
    getDisplayText() { return '逾期任务'; }
    getIcon() { return 'alert-triangle'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        return await startListBaseView(
            app, dv.container,
            fetchOverdueTasks,
            '逾期任务',
            'rgba(255, 130, 130, 0.25)'
        );
    }
}