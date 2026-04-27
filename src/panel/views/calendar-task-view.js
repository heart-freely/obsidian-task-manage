// src/panel/views/calendar-task-view.js
import { BaseTaskView } from './base-task-view';

export const VIEW_TYPE_CALENDAR = 'calendar-task-view';
export class CalendarTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_CALENDAR; }
    getDisplayText() { return '任务日历'; }
    getIcon() { return 'calendar'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        dv.container.innerHTML = '<div class="empty-message">📅 日历视图即将上线</div>';
        return { cleanup: () => {}, updateSort: () => {} };
    }
}