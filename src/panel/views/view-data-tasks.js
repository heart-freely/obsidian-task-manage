// src/panel/views/view-data-tasks.js
import { BaseTaskView } from './view-base-tasks';
import { startDataViewCore } from '../panel';   // 新路径

export const VIEW_TYPE_TASK_DATAVIEW = 'task-dataview-view';

export class TaskDataViewView extends BaseTaskView {
    getViewType() { return VIEW_TYPE_TASK_DATAVIEW; }
    getDisplayText() { return '任务面板'; }
    getIcon() { return 'bar-chart-3'; }

    async _startCore(dv, app) {
        return startDataViewCore(dv, app);
    }
}