/**
 * 文件：src/panel/views/tag-task-view.js
 * 描述：标签任务视图，以标签为维度筛选和展示任务，支持任务卡片点击跳转
 * 所属模块：panel/views
 * 依赖：
 *   - base-task-view: 基础视图类、任务卡片创建工具
 *   - read-tasks: 任务读取接口
 *   - plugin-configs: 全局配置
 * 对外导出：TagTaskView 类、startTagView 函数
 * 注意事项：
 *   - 筛选条件为自定义标签 _tag 字段非空
 *   - 优先级处理逻辑与依赖任务视图一致
 * @see .cline/skills/code/views/tag-task-view.md
 */

// src/panel/views/tag-task-view.js
import { CONFIG } from "../../configs/plugin-configs";
import * as readTasks from "../../tasks/read/read-tasks";
import {
	BaseTaskView,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

export const VIEW_TYPE_TAG = "tag-task-view";

/* @skill-segment class TagTaskView - 标签任务视图类，继承 BaseTaskView */

export class TagTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_TAG;
	}
	getDisplayText() {
		return "标签任务";
	}
	getIcon() {
		return "tag";
	}
	/* @skill-route _startCore -> startTagView - 核心启动路由 */
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startTagView(dv, app, dv.container);
	}
}

/* @skill-sig function startTagView(dv, app, container) : ViewController - 启动标签任务视图 */

/**
 * 启动标签任务视图
 * @param {Object} dv - Dataview 实例
 * @param {Object} app - Obsidian App 实例
 * @param {HTMLElement} container - 视图容器 DOM 元素
 * @returns {Promise<{cleanup, updateSort}>} 视图控制接口
 */
export async function startTagView(dv, app, container) {
	/* @skill-flow
      初始化 → render()
      获取任务 → getAllTasks() → filter(_tag)
      渲染卡片 → createTaskCard(normalizeTaskCardData)
      任务点击 → 打开文件并跳转到对应行
    */

	/* @skill-condition
      getAllTasks 返回空数组 → 显示 "暂无标签任务"
      _tag 字段为空或纯空白 → 筛除
      优先级匹配失败 → 回退为 "none"
    */

	/* @skill-api
      readTasks.getAllTasks(false, dv, state) // 获取所有任务
      createTaskCard(cardData, app)            // 创建可点击的任务卡片
      normalizeTaskCardData(data)              // 标准化任务卡片数据
    */

	async function render() {
		container.innerHTML = "";
		try {
			const state = {};
			/* @skill-query getAllTasks(false, dv, state) - 获取所有任务数据 */
			const allTasks = readTasks.getAllTasks(false, dv, state);
			// 筛选含有自定义标签 _tag 的任务
			const tagTasks = allTasks.filter((t) => t._tag && t._tag.trim());

			if (!tagTasks.length) {
				container.innerHTML =
					'<div class="empty-placeholder">🏷️ 暂无标签任务</div>';
				return;
			}

			const wrapper = document.createElement("div");
			wrapper.className = "view-col";
			wrapper.style.setProperty(
				"--quad-color",
				"rgba(160, 200, 120, 0.25)",
			);

			const header = document.createElement("div");
			header.className = "col-header";
			header.innerHTML = `<span>📋 标签任务</span><span>${tagTasks.length} 项</span>`;
			wrapper.appendChild(header);

			const ul = document.createElement("ul");
			ul.className = "task-list";

			tagTasks.forEach((task) => {
				// 优先级处理（与依赖任务一致）
				/* @skill-condition
                  优先级来源优先级：_priorityIcon > priority
                  未知 _priorityIcon → 反向查找 CONFIG.PRIORITY_ICONS
                  均无法匹配 → 回退为 "none"
                */
				let priority = "none";
				if (task._priorityIcon) {
					const found = Object.entries(CONFIG.PRIORITY_ICONS).find(
						([, icon]) => icon === task._priorityIcon,
					);
					if (found) priority = found[0];
				} else if (task.priority && task.priority !== "none") {
					priority = task.priority;
				}

				/* @skill-query normalizeTaskCardData - 标准化卡片数据结构 */
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
			console.error("标签任务视图渲染失败", e);
			container.innerHTML = `<div class="empty-placeholder">⚠️ 获取标签任务失败：${e.message}</div>`;
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
