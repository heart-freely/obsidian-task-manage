/**
 * 文件：src/panel/views/important-task-view.js
 * 描述：重要任务视图，按状态（未开始/计划中/进行中）分组展示标记为重要的任务，三列网格布局
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView, createTaskCard, normalizeTaskCardData: 基础视图和卡片工具
 *   - task-query-process.fetchImportantTasksByStatus: 获取按状态分组的重要任务数据
 * 对外导出：VIEW_TYPE_IMPORTANT, ImportantTaskView, startImportantView
 * 注意事项：依赖于 Tasks 插件的优先级/重要性标记
 * @see .cline/skills/code/views/important-task-view.md
 */

import { fetchImportantTasksByStatus } from "../../tasks/process/task-query-process";
import {
	BaseTaskView,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

export const VIEW_TYPE_IMPORTANT = "important-task-view";

/* @skill-sig class ImportantTaskView extends BaseTaskView - 重要任务视图，三列网格按状态分组展示标记为重要的任务 */

/* @skill-state 无（纯展示视图） */

/* @skill-api
  fetchImportantTasksByStatus (task-query-process)
  BaseTaskView, createTaskCard, normalizeTaskCardData (base-task-view)
*/

export class ImportantTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_IMPORTANT;
	}
	getDisplayText() {
		return "重要任务";
	}
	getIcon() {
		return "star";
	}

	/* @skill-sig async _startCore(dv, app, storageAdapter, instanceId) : function - 调用 startImportantView 渲染重要任务视图 */
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startImportantView(dv, app, dv.container);
	}
}

/* @skill-func async startImportantView(dv, app, container) : { cleanup, updateSort } - 渲染重要任务三列网格视图 */

/* @skill-flow
   startImportantView(dv, app, container) → fetchImportantTasksByStatus(app) → 网格容器 → 三列分组渲染（未开始/计划中/进行中） → 返回 { cleanup, updateSort }
*/

/* @skill-condition
   若 fetchImportantTasksByStatus 抛出异常 → 显示错误提示 "❌ 未检测到 Tasks 插件"
   若某分组任务数为 0 → 显示 "暂无任务"
*/

/* @skill-dom
  .view-grid.cols-3
    .view-col (x3)
      .col-header
        span (分组名)
        span (任务数)
      ul.task-list
        li.task-item[data-path][data-line]
          .task-desc
          .task-meta
*/

export async function startImportantView(dv, app, container) {
	async function renderImportant() {
		container.innerHTML = "";
		let data;
		try {
			data = await fetchImportantTasksByStatus(app);
		} catch (e) {
			container.innerHTML =
				'<div class="empty-placeholder">❌ 未检测到 Tasks 插件</div>';
			return;
		}

		const stats = document.createElement("div");
		stats.style.cssText = "margin-bottom:12px; font-weight:600;";
		stats.textContent = `📋 重要任务：${data.total} 项`;
		container.appendChild(stats);

		const grid = document.createElement("div");
		grid.className = "view-grid cols-3";

		const groups = [
			{
				name: "未开始",
				tasks: data.groups["未开始"] || [],
				statusKey: "todo",
				color: "rgba(130,170,255,0.3)",
			},
			{
				name: "计划中",
				tasks: data.groups["计划中"] || [],
				statusKey: "planned",
				color: "rgba(255,200,100,0.3)",
			},
			{
				name: "进行中",
				tasks: data.groups["进行中"] || [],
				statusKey: "in-progress",
				color: "rgba(255,130,130,0.3)",
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

	await renderImportant();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			renderImportant();
		},
	};
}
