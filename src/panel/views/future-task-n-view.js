import { fetchFutureTasks } from "../../tasks/process/task-query-process";
import { startListBaseView } from "./base-list-view";
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_FUTURE_N = "future-n-task-view";

export class FutureNTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_FUTURE_N;
	}
	getDisplayText() {
		return "未来 n 天任务";
	}
	getIcon() {
		return "calendar-plus";
	}

	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startListBaseView(
			app,
			dv.container,
			(app) => fetchFutureTasks(app, 15),
			"未来15天",
			"rgba(97, 175, 239, 0.25)",
		);
	}
}
