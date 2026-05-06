/**
 * 文件：src/panel/views/timeline-task-view.js
 * 描述：时间线任务视图，按日期轴展示任务的时间分布，支持自定义过滤和缩放
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 基础视图类
 *   - task-query-process.fetchTasks: 获取任务数据
 * 对外导出：VIEW_TYPE_TIMELINE, TimelineTaskView, startTimelineView
 * 注意事项：时间线视图为自渲染视图，通过 startTimelineView 函数实例化，同时提供 TimelineTaskView 类供标准视图系统使用
 * @see .cline/skills/code/views/timeline-task-view.md
 */

import { fetchTasks } from "../../tasks/process/task-query-process";
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_TIMELINE = "timeline-task-view";

/**
 * TimelineTaskView - 时间线任务视图类，继承 BaseTaskView
 * 提供时间轴形式展示任务，按日期分布排列
 */
export class TimelineTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_TIMELINE;
	}
	getDisplayText() {
		return "时间线任务";
	}
	getIcon() {
		return "history";
	}

	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startTimelineView(dv, app, dv.container);
	}
}

/**
 * 启动时间线视图
 * 渲染一个按日期排序的时间轴，展示任务在时间线上的分布
 * @param {Object} dv - Dataview API 适配器
 * @param {Object} app - Obsidian App 实例
 * @param {HTMLElement} container - 容器元素
 * @returns {Promise<{cleanup: Function, updateSort: Function}>}
 *
 * @skill-flow
 *   startTimelineView(dv, app, container) → fetchTasks(app) → 按日期分组渲染时间轴 → 返回 { cleanup, updateSort }
 *
 * @skill-condition
 *   若 fetchTasks 抛出异常或返回空 → 显示 "暂无时间线数据"
 *
 * @skill-dom
 *   .timeline-container
 *     .timeline-header
 *     .timeline-axis (日期轴)
 *       .axis-item (每个日期节点)
 *         .date-label
 *         .task-dot (任务圆点)
 *     .timeline-body
 *       .task-item (具体任务卡片)
 */
export async function startTimelineView(dv, app, container) {
	async function renderTimeline() {
		container.innerHTML = "";

		let tasks;
		try {
			tasks = await fetchTasks(app);
		} catch (e) {
			container.innerHTML =
				'<div class="empty-placeholder">❌ 无法加载时间线数据</div>';
			return;
		}

		if (!tasks || tasks.length === 0) {
			container.innerHTML =
				'<div class="empty-placeholder">暂无时间线数据</div>';
			return;
		}

		const wrapper = document.createElement("div");
		wrapper.className = "timeline-container";

		const header = document.createElement("div");
		header.className = "timeline-header";
		header.textContent = `📅 时间线任务（${tasks.length} 项）`;
		wrapper.appendChild(header);

		const axis = document.createElement("div");
		axis.className = "timeline-axis";

		const body = document.createElement("div");
		body.className = "timeline-body";

		// 按日期分组
		const grouped = {};
		tasks.forEach((t) => {
			const dateKey = t.scheduled || t.due || t.start || "未排期";
			if (!grouped[dateKey]) grouped[dateKey] = [];
			grouped[dateKey].push(t);
		});

		// 排序日期键
		const sortedDates = Object.keys(grouped).sort((a, b) => {
			if (a === "未排期") return 1;
			if (b === "未排期") return -1;
			return a.localeCompare(b);
		});

		sortedDates.forEach((dateKey) => {
			const dateTasks = grouped[dateKey];

			// 日期轴节点
			const axisItem = document.createElement("div");
			axisItem.className = "axis-item";
			axisItem.innerHTML = `<span class="date-label">${dateKey}</span><span class="task-count">${dateTasks.length}</span>`;
			axis.appendChild(axisItem);

			// 任务列表
			const dayGroup = document.createElement("div");
			dayGroup.className = "timeline-day-group";

			const dayHeader = document.createElement("div");
			dayHeader.className = "day-header";
			dayHeader.textContent = `📌 ${dateKey}（${dateTasks.length} 项）`;
			dayGroup.appendChild(dayHeader);

			const taskList = document.createElement("ul");
			taskList.className = "task-list";

			dateTasks.forEach((t) => {
				const li = document.createElement("li");
				li.className = "task-item";
				li.setAttribute("data-path", t.path || "");
				li.setAttribute("data-line", t.lineNumber || 0);
				li.style.cssText =
					"margin:4px 0; padding:6px 10px; background:var(--background-primary); border-radius:6px; cursor:pointer; border-left:3px solid var(--interactive-accent);";

				const desc = document.createElement("div");
				desc.className = "task-desc";
				desc.textContent = t.description || "（无描述）";
				desc.style.fontWeight = "500";

				const meta = document.createElement("div");
				meta.className = "task-meta";
				meta.style.cssText =
					"font-size:0.8em; color:var(--text-muted); margin-top:2px;";
				meta.textContent = [
					t.statusText || "",
					t.priority ? `优先级: ${t.priority}` : "",
					t.tags ? `🏷️ ${t.tags.join(", ")}` : "",
				]
					.filter(Boolean)
					.join(" · ");

				li.appendChild(desc);
				li.appendChild(meta);

				li.addEventListener("click", async () => {
					if (!t.path) return;
					const file = app.vault.getAbstractFileByPath(t.path);
					if (file) {
						const leaf = app.workspace.getLeaf(false);
						await leaf.openFile(file);
						setTimeout(() => {
							if (leaf.view?.editor) {
								leaf.view.editor.setCursor({
									line: parseInt(t.lineNumber) || 0,
									ch: 0,
								});
							}
						}, 30);
					}
				});

				taskList.appendChild(li);
			});

			dayGroup.appendChild(taskList);
			body.appendChild(dayGroup);
		});

		wrapper.appendChild(axis);
		wrapper.appendChild(body);
		container.appendChild(wrapper);
	}

	await renderTimeline();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			renderTimeline();
		},
	};
}
