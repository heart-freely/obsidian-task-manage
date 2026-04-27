// src/panel/views/pomodoro-task-view.js
import { BaseTaskView } from './base-task-view';

export const VIEW_TYPE_POMODORO = 'pomodoro-task-view';
export class PomodoroTaskView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_POMODORO; }
    getDisplayText() { return '番茄钟统计'; }
    getIcon() { return 'clock'; }
    async _startCore(dv, app, storageAdapter, instanceId) {
        dv.container.innerHTML = '<div class="empty-message">🍅 番茄钟统计即将上线</div>';
        return { cleanup: () => {}, updateSort: () => {} };
    }
}