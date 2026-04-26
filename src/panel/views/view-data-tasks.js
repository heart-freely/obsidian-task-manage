// src/panel/views/view-data-tasks.js
import { BaseTaskView } from './view-base-tasks';
import { startDataViewCore } from '../panel';

export const VIEW_TYPE_TASK_DATAVIEW = 'task-dataview-view';

export class TaskDataViewView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_TASK_DATAVIEW; }
    getDisplayText() { return '任务面板'; }
    getIcon() { return 'bar-chart-3'; }

    async _startCore(dv, app, storageAdapter, instanceId) {
        return startDataViewCore(dv, app, storageAdapter, instanceId);
    }
}