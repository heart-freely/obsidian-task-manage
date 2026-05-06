/**
 * 文件：src/panel/views/recurring-task-view.js
 * 描述：循环任务视图，按频率（每天/每周/每月）分组展示循环任务，三列网格布局
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView, createTaskCard, normalizeTaskCardData: 基础视图和卡片工具
 *   - fetchRecurringTasksGrouped (recurring-task-process): 获取按频率分组的循环任务
 * 对外导出：VIEW_TYPE_RECURRING, RecurringTaskView, startRecurringView
 * 注意事项：依赖于 Tasks 插件的重复规则解析
 * @see .cline/skills/code/views/recurring-task-view.md
 */

import { fetchRecurringTasksGrouped } from "../../tasks/process/recurring-task-process";
import {
	BaseTaskView,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

export const VIEW_TYPE_RECURRING = "recurring-task-view";

/* @skill-sig class RecurringTaskView extends BaseTaskView - 循环任务视图，三列网格按频率分组展示循环任务 */

/* @skill-state 无（纯展示视图） */

/* @skill-api
  fetchRecurringTasksGrouped (recurring-task-process)
  BaseTaskView, createTaskCard, normalizeTaskCardData (base-task-view)
*/

export class RecurringTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_RECURRING;
	}
	getDisplayText() {
		return "循环任务";
	}
	getIcon() {
		return "refresh-cw";
	}

	/* @skill-sig async _startCore(dv, app, storageAdapter, instanceId) : function - 调用 startRecurringView 渲染循环任务视图 */
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startRecurringView(dv, app, dv.container);
	}
}

/* @skill-func async startRecurringView(dv, app, container) : { cleanup, updateSort } - 渲染循环任务三列网格视图（每天/每周/每月） */

/* @skill-flow
   startRecurringView(dv, app, container) → fetchRecurringTasksGrouped(app) → 网格容器 → 三列分组渲染（每天/每周/每月） → 返回 { cleanup, updateSort }
*/

/* @skill-condition
   若 fetchRecurringTasksGrouped 抛出异常 → 显示错误提示 "❌ 未检测到 Tasks 插件"
   若某分组任务数为 0 → 显示 "暂无任务"
*/

/* @skill-dom
  .view-grid.cols-3
    .view-col (x3)
      .col-header
        span (分组名)
        span (任务数)
      ul.task-list
        li.task-item
          .task-desc
          .task-meta
*/

export async function startRecurringView(dv, app, container) {
	async function renderRecurring() {
		container.innerHTML = "";
		let groups;
		try {
			groups = await fetchRecurringTasksGrouped(app);
		} catch (e) {
			container.innerHTML =
				'<div class="empty-placeholder">❌ 未检测到 Tasks 插件，请安装并启用。</div>';
			return;
		}

		const total = Object.values(groups).reduce(
			(sum, arr) => sum + arr.length,
			0,
		);
		const stats = document.createElement("div");
		stats.style.cssText = "margin-bottom:12px; font-weight:600;";
		stats.textContent = `📋 循环任务：${total} 项`;
		container.appendChild(stats);

		const grid = document.createElement("div");
		grid.className = "view-grid cols-3";

		const columns = [
			{ name: "每天", color: "rgba(130, 170, 255, 0.3)" },
			{ name: "每周", color: "rgba(255, 200, 100, 0.3)" },
			{ name: "每月", color: "rgba(255, 130, 130, 0.3)" },
		];

		columns.forEach((col) => {
			const tasks = groups[col.name] || [];
			const colDiv = document.createElement("div");
			colDiv.className = "view-col";
			colDiv.style.setProperty("--quad-color", col.color);

			const header = document.createElement("div");
			header.className = "col-header";
			header.innerHTML = `<span>${col.name}</span><span>${tasks.length}</span>`;
			colDiv.appendChild(header);

			const list = document.createElement("ul");
			list.className = "task-list";

			if (!tasks.length) {
				list.innerHTML = '<li class="empty-placeholder">暂无任务</li>';
			} else {
				tasks.forEach((t) => {
					const cardData = normalizeTaskCardData(t);
					list.appendChild(createTaskCard(cardData, app));
				});
			}
			colDiv.appendChild(list);
			grid.appendChild(colDiv);
		});

		container.appendChild(grid);
	}

	await renderRecurring();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			renderRecurring();
		},
	};
}
