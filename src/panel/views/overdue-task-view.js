/**
 * 文件：src/panel/views/overdue-task-view.js
 * 描述：逾期任务视图，展示截止日期已过的任务，使用通用列表视图渲染
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 基础视图类
 *   - startListBaseView: 通用列表渲染函数
 *   - fetchOverdueTasks (task-query-process): 获取逾期任务数据
 * 对外导出：VIEW_TYPE_OVERDUE, OverdueTaskView
 * 注意事项：无内部状态，委托 startListBaseView 渲染
 * @see .cline/skills/code/views/overdue-task-view.md
 */

/* <!-- SYNC_COMMENTS_START --> */

/* @skill-sig class OverdueTaskView extends BaseTaskView - 逾期任务视图，展示已过截止日期的任务列表 */

/* @skill-state 无（纯展示视图） */

/* @skill-api
  startListBaseView (base-list-view)
  fetchOverdueTasks (task-query-process)
*/

/* @skill-flow
   OverdueTaskView._startCore → startListBaseView(app, container, fetchOverdueTasks, "逾期任务", "rgba(255, 130, 130, 0.25)") → fetchOverdueTasks(app) → 通用列表渲染
*/

/* @skill-condition
   fetchOverdueTasks 返回空数组 → startListBaseView 内部处理空状态显示
*/

/* <!-- SYNC_COMMENTS_END --> */

import { fetchOverdueTasks } from "../../tasks/process/task-query-process";
import { startListBaseView } from "./base-list-view";
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_OVERDUE = "overdue-task-view";

export class OverdueTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_OVERDUE;
	}
	getDisplayText() {
		return "逾期任务";
	}
	getIcon() {
		return "alert-triangle";
	}

	/* @skill-sig async _startCore(dv, app, storageAdapter, instanceId) : function - 委托 startListBaseView 渲染逾期任务列表 */
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startListBaseView(
			app,
			dv.container,
			fetchOverdueTasks,
			"逾期任务",
			"rgba(255, 130, 130, 0.25)",
		);
	}
}
