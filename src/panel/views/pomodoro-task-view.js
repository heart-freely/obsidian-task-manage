/**
 * 文件：src/panel/views/pomodoro-task-view.js
 * 描述：番茄钟统计视图（占位），继承 BaseTaskView，展示 "即将上线" 提示
 * 所属模块：panel/views
 * 依赖：
 *   - base-task-view: BaseTaskView
 * 对外导出：VIEW_TYPE_POMODORO, PomodoroTaskView
 * 注意事项：当前为占位视图，功能尚未实现；番茄钟统计功能将在后续版本上线
 * @see .cline/skills/code/views/pomodoro-task-view.md
 */

// src/panel/views/pomodoro-task-view.js
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_POMODORO = "pomodoro-task-view";

/* @skill-sig class PomodoroTaskView extends BaseTaskView - 番茄钟统计视图（占位），展示即将上线提示 */

/* @skill-state 无（纯占位视图） */

/* @skill-api
  BaseTaskView (base-task-view)
*/

/* @skill-condition
   始终显示 "🍅 番茄钟统计即将上线" 占位信息
*/

export class PomodoroTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_POMODORO;
	}
	getDisplayText() {
		return "番茄钟统计";
	}
	getIcon() {
		return "clock";
	}

	/* @skill-sig async _startCore(dv, app, storageAdapter, instanceId) : { cleanup, updateSort } - 渲染占位内容，返回空操作接口 */
	async _startCore(dv, app, storageAdapter, instanceId) {
		dv.container.innerHTML =
			'<div class="empty-message">🍅 番茄钟统计即将上线</div>';
		return {
			cleanup: () => {},
			updateSort: () => {},
		};
	}
}
