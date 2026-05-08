//  <!-- SYNC_COMMENTS_START -->
/**
 * 文件：src/panel/views/future-task-n-view.js
 * 描述：未来N天任务视图，展示未来15天内的任务，使用通用列表视图渲染
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 基础视图类
 *   - startListBaseView: 通用列表渲染函数
 *   - fetchFutureTasks (task-query-process): 获取未来任务数据
 * 对外导出：VIEW_TYPE_FUTURE_N, FutureNTaskView
 * 注意事项：固定显示未来15天的任务
 * @see .cline/skills/code/views/future-task-n-view.md
 */

/* @skill-sig class FutureNTaskView extends BaseTaskView - 未来N天任务视图，展示未来15天内的任务列表 */

/* @skill-sig async _startCore(dv, app, storageAdapter, instanceId) : function - 委托 startListBaseView 渲染未来15天任务列表 */

/* @skill-state 无（纯展示视图） */

/* @skill-api
  startListBaseView (base-list-view)
  fetchFutureTasks (task-query-process)
*/
//  <!-- SYNC_COMMENTS_END -->

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

	/* @skill-sig async _startCore(dv, app, storageAdapter, instanceId) : function - 委托 startListBaseView 渲染未来15天任务列表 */
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
