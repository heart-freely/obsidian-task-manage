/**
 * 文件：src/panel/views/inbox-task-view.js
 * 描述：任务收集箱视图，按状态（未开始/计划中）分组展示未分配日期的任务，两列网格布局
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView, createTaskCard, normalizeTaskCardData: 基础视图和卡片工具
 *   - inbox-task-process.fetchInboxTasks, processInboxTasks: 获取和处理收件箱任务
 * 对外导出：VIEW_TYPE_INBOX, InboxTaskView, startInboxView
 * 注意事项：仅展示未分配日期的待处理任务，无日期限制
 * @see .cline/skills/code/views/inbox-task-view.md
 */

import {
	fetchInboxTasks,
	processInboxTasks,
} from "../../tasks/process/inbox-task-process";
import {
	BaseTaskView,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

export const VIEW_TYPE_INBOX = "inbox-task-view";

/* @skill-sig class InboxTaskView extends BaseTaskView - 收集箱视图，两列网格按状态分组展示待处理任务 */

/* @skill-state 无（纯展示视图） */

/* @skill-api
  fetchInboxTasks, processInboxTasks (inbox-task-process)
  BaseTaskView, createTaskCard, normalizeTaskCardData (base-task-view)
*/

export class InboxTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_INBOX;
	}
	getDisplayText() {
		return "任务收集箱";
	}
	getIcon() {
		return "inbox";
	}

	/* @skill-sig async _startCore(dv, app, storageAdapter, instanceId) : function - 调用 startInboxView 渲染收集箱视图 */
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startInboxView(dv, app, dv.container);
	}
}

/* @skill-func async startInboxView(dv, app, container) : { cleanup, updateSort } - 渲染收集箱两列网格视图 */

/* @skill-flow
   startInboxView(dv, app, container) → fetchInboxTasks(app) → processInboxTasks(raw) → 网格容器 → 两列分组渲染（未开始/计划中） → 返回 { cleanup, updateSort }
*/

/* @skill-condition
   若 fetchInboxTasks 抛出异常 → 显示错误提示 "❌ 未检测到 Tasks 插件，请安装并启用。"
   若某分组任务数为 0 → 显示 "暂无任务"
*/

/* @skill-dom
  .view-grid.cols-2
    .view-col (x2)
      .col-header
        span (分组名)
        span (任务数)
      ul.task-list
        li.task-item[data-path][data-line]
          .task-desc
          .task-meta
*/

export async function startInboxView(dv, app, container) {
	async function renderInbox() {
		container.innerHTML = "";
		let data;
		try {
			const raw = await fetchInboxTasks(app);
			data = processInboxTasks(raw);
		} catch (e) {
			container.innerHTML =
				'<div class="empty-placeholder">❌ 未检测到 Tasks 插件，请安装并启用。</div>';
			return;
		}

		const stats = document.createElement("div");
		stats.style.cssText = "margin-bottom:12px; font-weight:600;";
		stats.textContent = `📋 总任务：${data.total} (未开始 / 计划中)`;
		container.appendChild(stats);

		const grid = document.createElement("div");
		grid.className = "view-grid cols-2";

		const groups = [
			{
				name: "未开始",
				tasks: data.groups["未开始"] || [],
				statusKey: "todo",
				color: "rgba(130, 170, 255, 0.3)",
			},
			{
				name: "计划中",
				tasks: data.groups["计划中"] || [],
				statusKey: "planned",
				color: "rgba(255, 200, 100, 0.3)",
			},
		];

		groups.forEach((group) => {
			const col = document.createElement("div");
			col.className = "view-col";
			col.style.setProperty("--quad-color", group.color);

			const header = document.createElement("div");
			header.className = "col-header";
			header.innerHTML = `<span>${group.name}</span><span>${group.tasks.length}</span>`;
			col.appendChild(header);

			const list = document.createElement("ul");
			list.className = "task-list";

			if (group.tasks.length === 0) {
				list.innerHTML = '<li class="empty-placeholder">暂无任务</li>';
			} else {
				group.tasks.forEach((t) => {
					const cardData = normalizeTaskCardData({
						...t,
						status: group.statusKey,
					});
					list.appendChild(createTaskCard(cardData, app));
				});
			}
			col.appendChild(list);
			grid.appendChild(col);
		});
		container.appendChild(grid);
	}

	await renderInbox();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			renderInbox();
		},
	};
}
