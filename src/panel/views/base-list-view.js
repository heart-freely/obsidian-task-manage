/**
 * 文件：src/panel/views/base-list-view.js
 * 描述：列表基础视图工具函数，提供通用列表渲染函数 startListBaseView，被多个列表类视图复用
 * 所属模块：panel/views
 * 依赖：
 *   - createTaskCard, normalizeTaskCardData, adaptTasksApiTask (base-task-view)
 * 对外导出：startListBaseView
 * 注意事项：通用函数，通过参数注入 fetchFn 实现不同数据源的列表渲染；内部使用 adaptTasksApiTask 适配 Tasks API 格式
 * @see .cline/skills/code/views/base-list-view.md
 */

import {
	adaptTasksApiTask,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

/* @skill-func async startListBaseView(app, container, fetchFn, title, color?) : { cleanup, updateSort } - 通用列表视图渲染函数，由各列表视图传入自定义 fetchFn 和数据源使用 */

/* @skill-flow
   startListBaseView(app, container, fetchFn, title, color) → container.innerHTML='' → fetchFn(app) → adaptTasksApiTask 适配 → normalizeTaskCardData 标准化 → createTaskCard 创建卡片 → 渲染列表 → 返回 { cleanup, updateSort }
*/

/* @skill-condition
   若 fetchFn 抛出异常 → 显示错误提示 "⚠️ 获取${title}失败，请确认 Tasks 插件已启用" 并返回空操作对象
   若 rawTasks 为空数组 → 显示 "📭 暂无${title}" 并返回空操作对象
*/

/* @skill-dom
  .view-col
    .col-header
      span (📋 {title})
      span ({count} 项)
    ul.task-list
      li.task-item[data-path][data-line]
        .task-desc
        .task-meta
*/

/* @skill-tool mapSymbolToStatus(symbol) - 将 Tasks 插件的状态符号映射为内部状态键 (todo/planned/in-progress/completed/cancelled) */

export async function startListBaseView(
	app,
	container,
	fetchFn,
	title,
	color = "var(--background-modifier-border)",
) {
	container.innerHTML = "";
	try {
		const rawTasks = await fetchFn(app);
		if (!rawTasks || !rawTasks.length) {
			container.innerHTML = `<div class="empty-placeholder">📭 暂无${title}</div>`;
			return {
				cleanup: () => {
					container.innerHTML = "";
				},
				updateSort: () => {},
			};
		}

		const wrapper = document.createElement("div");
		wrapper.className = "view-col";
		wrapper.style.setProperty("--quad-color", color);

		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>📋 ${title}</span><span>${rawTasks.length} 项</span>`;
		wrapper.appendChild(header);

		const ul = document.createElement("ul");
		ul.className = "task-list";

		rawTasks.forEach((task) => {
			const adapted = adaptTasksApiTask(task);

			const cardData = normalizeTaskCardData({
				description:
					adapted.description || adapted._cleanText || "（无描述）",
				priority: adapted.priority || "none",
				status: mapSymbolToStatus(adapted.status?.symbol),
				recurrenceLabel: adapted.recurrence
					? `🔁 ${adapted.recurrence.toText()}`
					: adapted._repeat
						? `🔁 ${adapted._repeat}`
						: "",
				scheduled: adapted.scheduledDate
					? window.moment(adapted.scheduledDate).format("YYYY-MM-DD")
					: null,
				start: adapted.startDate
					? window.moment(adapted.startDate).format("YYYY-MM-DD")
					: null,
				due: adapted.dueDate
					? window.moment(adapted.dueDate).format("YYYY-MM-DD")
					: null,
				tags: (adapted.tags || []).map((tag) => tag.replace(/^#/, "")),
				id: adapted._id || "",
				forbid: adapted._forbid || "",
				fileName: adapted.path.split("/").pop().replace(/\.md$/, ""),
				path: adapted.path,
				lineNumber: adapted.lineNumber || 0,
			});
			ul.appendChild(createTaskCard(cardData, app));
		});

		wrapper.appendChild(ul);
		container.appendChild(wrapper);
	} catch (e) {
		container.innerHTML = `<div class="empty-placeholder">⚠️ 获取${title}失败，请确认 Tasks 插件已启用</div>`;
	}

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {},
	};
}

function mapSymbolToStatus(symbol) {
	if (symbol === " ") return "todo";
	if (symbol === "?") return "planned";
	if (symbol === "/") return "in-progress";
	if (symbol === "x" || symbol === "X") return "completed";
	if (symbol === "-") return "cancelled";
	return "todo";
}
