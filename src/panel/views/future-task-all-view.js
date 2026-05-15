// src/panel/views/future-task-all-view.js
import { BaseTaskView } from './base-task-view';
import { startListBaseView } from './base-list-view';
import { fetchTasks } from '../../tasks/process/task-query-process';

export const VIEW_TYPE_FUTURE_ALL = 'future-all-task-view';
export class FutureAllTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_FUTURE_ALL; }
    getDisplayText() { return '未来所有任务'; }
    getIcon() { return 'calendar-plus'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        return await startListBaseView(
            app, dv.container,
            async (app) => {
                const tasks = await fetchTasks(app);
                const now = window.moment();
                return tasks.filter(t => {
                    const date = t.dueDate || t.scheduledDate;
                    return date && window.moment(date).isAfter(now);
                });
            },
            '未来所有任务',
            'rgba(100, 200, 200, 0.25)'
        );
    }
}