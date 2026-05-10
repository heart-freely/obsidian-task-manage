/**
 * 文件：src/panel/views/future-task-all-view.js
 * 描述：未来所有任务视图，展示截止日期或计划日期在当前时间之后的所有任务，使用通用列表视图渲染
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 基础视图类
 *   - startListBaseView: 通用列表渲染函数
 *   - fetchTasks (task-query-process): 获取所有任务数据
 * 对外导出：VIEW_TYPE_FUTURE_ALL, FutureAllTaskView
 * 注意事项：内部使用 fetchTasks 获取全部任务后过滤，仅保留有 dueDate 或 scheduledDate 且在未来时间点之后的项
 * @see .cline/skills/code/views/future-task-all-view.md
 */

/* <!-- SYNC_COMMENTS_START --> */

/* @skill-sig class FutureAllTaskView extends BaseTaskView - 未来所有任务视图，展示截止日期/计划日期在当前时间之后的所有任务列表 */

/* @skill-state 无（纯展示视图） */

/* @skill-api
  startListBaseView (base-list-view)
  fetchTasks (task-query-process)
*/

/* <!-- SYNC_COMMENTS_END --> */

import { fetchTasks } from "../../tasks/process/task-query-process";
import { startListBaseView } from "./base-list-view";
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_FUTURE_ALL = "future-all-task-view";

export class FutureAllTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_FUTURE_ALL;
	}
	getDisplayText() {
		return "未来所有任务";
	}
	getIcon() {
		return "calendar-plus";
	}

	/* @skill-sig async _startCore(dv, app, storageAdapter, instanceId) : function - 委托 startListBaseView 渲染未来所有任务列表（内部 fetch + filter） */
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startListBaseView(
			app,
			dv.container,
			async (app) => {
				const tasks = await fetchTasks(app);
				const now = window.moment();
				return tasks.filter((t) => {
					const date = t.dueDate || t.scheduledDate;
					return date && window.moment(date).isAfter(now);
				});
			},
			"未来所有任务",
			"rgba(100, 200, 200, 0.25)",
		);
	}
}
