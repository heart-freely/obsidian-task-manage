/**
 * 文件：src/panel/views/depends-task-view.js
 * 描述：依赖任务视图 - 展示所有设置了 forbid（引用/依赖）标记的任务
 * 所属模块：panel/views
 * 依赖：
 *   - panel/views/base-task-view: BaseTaskView, createTaskCard, normalizeTaskCardData
 *   - tasks/read/read-tasks: getAllTasks
 *   - configs/plugin-configs: CONFIG
 * 对外导出：DependsTaskView, startDependsView, VIEW_TYPE_DEPENDS
 * 注意事项：依赖于 readTasks.getAllTasks 的缓存机制；使用临时状态对象以避免干扰主状态
 * @see .cline/skills/code/views/depends-task-view.md
 */

// src/panel/views/depends-task-view.js
import { CONFIG } from "../../configs/plugin-configs";
import * as readTasks from "../../tasks/read/read-tasks";
import {
	BaseTaskView,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

export const VIEW_TYPE_DEPENDS = "depends-task-view";

export class DependsTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_DEPENDS;
	}
	getDisplayText() {
		return "依赖任务";
	}
	getIcon() {
		return "link";
	}
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startDependsView(dv, app, dv.container);
	}
}

export async function startDependsView(dv, app, container) {
	async function render() {
		container.innerHTML = "";
		try {
			// 使用临时状态对象以兼容 getAllTasks 的缓存机制
			const state = {};
			const allTasks = readTasks.getAllTasks(false, dv, state);
			const dependsTasks = allTasks.filter(
				(t) => t._forbid && t._forbid.trim(),
			);

			if (!dependsTasks.length) {
				container.innerHTML =
					'<div class="empty-placeholder">🔗 暂无依赖任务</div>';
				return;
			}

			const wrapper = document.createElement("div");
			wrapper.className = "view-col";
			wrapper.style.setProperty(
				"--quad-color",
				"rgba(255, 200, 100, 0.25)",
			);

			const header = document.createElement("div");
			header.className = "col-header";
			header.innerHTML = `<span>📋 依赖任务</span><span>${dependsTasks.length} 项</span>`;
			wrapper.appendChild(header);

			const ul = document.createElement("ul");
			ul.className = "task-list";

			dependsTasks.forEach((task) => {
				// 安全获取优先级字符串（同时兼容优先级图标和数字）
				let priority = "none";
				if (task._priorityIcon) {
					// 从 PRIORITY_ICONS 反查键
					const found = Object.entries(CONFIG.PRIORITY_ICONS).find(
						([, icon]) => icon === task._priorityIcon,
					);
					if (found) priority = found[0];
				} else if (task.priority && task.priority !== "none") {
					priority = task.priority;
				}

				const cardData = normalizeTaskCardData({
					description: task._cleanText || task.text || "（无描述）",
					priority: priority,
					status: task._status,
					recurrenceLabel: task._repeat ? `🔁 ${task._repeat}` : "",
					scheduled: task._scheduled || null,
					start: task._starts || null,
					due: task._due || null,
					tags: task._tag ? [task._tag] : [],
					id: task._id || "",
					forbid: task._forbid || "",
					fileName: task.path
						? task.path.split("/").pop().replace(/\.md$/, "")
						: "",
					path: task.path || "",
					lineNumber: task.line || 0,
				});
				ul.appendChild(createTaskCard(cardData, app));
			});

			wrapper.appendChild(ul);
			container.appendChild(wrapper);
		} catch (e) {
			console.error("依赖任务视图渲染失败", e);
			container.innerHTML = `<div class="empty-placeholder">⚠️ 获取依赖任务失败：${e.message}</div>`;
		}
	}

	await render();
	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			render();
		},
	};
}
