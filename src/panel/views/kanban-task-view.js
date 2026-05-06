/**
 * 文件：src/panel/views/kanban-task-view.js
 * 描述：看板任务视图，按状态（未开始/计划中/进行中）三列看板布局展示任务
 * 所属模块：panel/views
 * 依赖：
 *   - tasks/process/kanban-task-process: fetchKanbanTasks, processKanbanTasks
 *   - base-task-view: createTaskCard, normalizeTaskCardData
 * 对外导出：startKanbanView
 * 注意事项：首次渲染时动态注入 kanban-layout-style 样式；无独立视图类，作为函数式视图调用
 * @see .cline/skills/code/views/kanban-task-view.md
 */

// src/panel/views/kanban-task-view.js
import {
	fetchKanbanTasks,
	processKanbanTasks,
} from "../../tasks/process/kanban-task-process";
import { createTaskCard, normalizeTaskCardData } from "./base-task-view";

/* @skill-func async startKanbanView(dv, app, container) : { cleanup, updateSort } - 渲染看板三列视图，首次动态注入 kanban 样式 */

/* @skill-flow
   startKanbanView(dv, app, container) → 注入 .kanban 样式（仅首次） → renderKanban() → fetchKanbanTasks + processKanbanTasks → 三列看板渲染（未开始/计划中/进行中） → 返回 { cleanup, updateSort }
*/

/* @skill-condition
   若 fetchKanbanTasks/processKanbanTasks 抛出异常 → 显示 "❌ 未检测到 Tasks 插件"
   若某分组任务数为 0 → 显示 "暂无任务"
*/

/* @skill-dom
  .kanban (display:flex, overflow-x:auto)
    .view-col[style*="--quad-color"] (x3)
      .col-header
        span (分组名)
        span (任务数)
      ul.task-list
        li.task-item[data-path][data-line]
          .task-desc
          .task-meta
*/

/* @skill-api
  fetchKanbanTasks (kanban-task-process)
  processKanbanTasks (kanban-task-process)
  createTaskCard, normalizeTaskCardData (base-task-view)
*/

export async function startKanbanView(dv, app, container) {
	/* 首次渲染时注入看板布局样式 */
	if (!document.getElementById("kanban-layout-style")) {
		const style = document.createElement("style");
		style.id = "kanban-layout-style";
		style.textContent = `
            .kanban {
                display: flex;
                gap: 12px;
                padding: 8px 0;
                overflow-x: auto;
            }
            .kanban .view-col {
                flex: 1 1 0;
                min-width: 0;
            }
            .kanban .task-list {
                display: block !important;
                list-style: none;
                padding: 0;
                margin: 0;
            }
        `;
		document.head.appendChild(style);
	}

	/* @skill-flow renderKanban() → 清空容器 → 获取分组数据 → 统计栏 → 看板容器 → 三列渲染（按 symbol 分组） → 追加到容器 */
	async function renderKanban() {
		container.innerHTML = "";
		let data;
		try {
			const rawTasks = await fetchKanbanTasks(app);
			data = processKanbanTasks(rawTasks);
		} catch (e) {
			container.innerHTML =
				'<div class="empty-placeholder">❌ 未检测到 Tasks 插件，请安装并启用。</div>';
			return;
		}

		const statsBar = document.createElement("div");
		statsBar.style.cssText = "margin-bottom:12px; font-weight:600;";
		statsBar.textContent = `📋 任务总数：${data.total} (未开始 / 计划中 / 进行中)`;
		container.appendChild(statsBar);

		const board = document.createElement("div");
		board.className = "kanban";

		const groups = [
			{ name: "未开始", symbol: " ", color: "rgba(180, 180, 180, 0.25)" },
			{ name: "计划中", symbol: "?", color: "rgba(97, 175, 239, 0.25)" },
			{ name: "进行中", symbol: "/", color: "rgba(224, 108, 117, 0.25)" },
		];

		groups.forEach((group) => {
			const tasks = data.tasksBySymbol[group.symbol] || [];
			const colDiv = document.createElement("div");
			colDiv.className = "view-col";
			colDiv.style.setProperty("--quad-color", group.color);

			const header = document.createElement("div");
			header.className = "col-header";
			header.innerHTML = `<span>${group.name}</span><span>${tasks.length}</span>`;
			colDiv.appendChild(header);

			const list = document.createElement("ul");
			list.className = "task-list";

			if (tasks.length === 0) {
				list.innerHTML = '<li class="empty-placeholder">暂无任务</li>';
			} else {
				tasks.forEach((t) => {
					const cardData = normalizeTaskCardData({
						description: t.description,
						priority: t.priority,
						status: t.status,
						scheduled: null,
						start: null,
						due: null,
						tags: [],
						id: "",
						forbid: "",
						fileName: t.fileName,
						path: t.path,
						lineNumber: t.lineNumber,
					});
					list.appendChild(createTaskCard(cardData, app));
				});
			}
			colDiv.appendChild(list);
			board.appendChild(colDiv);
		});

		container.appendChild(board);
	}

	await renderKanban();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			renderKanban();
		},
	};
}
