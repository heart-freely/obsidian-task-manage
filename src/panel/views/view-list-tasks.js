/**
 * 文件：src/panel/views/view-list-tasks.js
 * 描述：通用列表视图，用于任何基于 Tasks 插件的列表展示，支持自定义获取函数和标题
 * 所属模块：panel/views
 * 依赖：
 *   - base-task-view: BaseTaskView
 * 对外导出：startTaskListView
 * 注意事项：作为函数式通用视图被其他视图复用；不直接继承 BaseTaskView，而是独立渲染 DOM
 * @see .cline/skills/code/views/view-list-tasks.md
 */

// src/panel/views/view-list-tasks.js
// 通用列表视图 - 用于任何基于 Tasks 插件的列表展示

/* @skill-func async startTaskListView(app, container, fetchFn, title) : { cleanup, updateSort } - 启动通用列表视图，渲染任务列表 */

/* @skill-flow
   startTaskListView(app, container, fetchFn, title) → 清空容器 → fetchFn(app) 获取任务数组 → 统计栏 → 列表渲染（优先级图标 + 描述 + 到期日期） → 绑定点击跳转事件 → 返回 { cleanup, updateSort }
*/

/* @skill-condition
   若 fetchFn 抛出异常 → 显示 "⚠️ 获取任务失败，请确认 Tasks 插件已启用"
   若 tasks 数组为空 → 显示 "📭 暂无{title}"
*/

/* @skill-dom
  ul.task-list
    li.task-list-item (点击跳转到任务行)
      span: 优先级图标 + 描述
      span: 到期日期（muted 样式）
*/

/* @skill-api
  BaseTaskView (base-task-view)
  app.vault.getAbstractFileByPath
  app.workspace.getLeaf
  window.moment (日期格式化)
*/

/**
 * 启动通用列表视图
 * @param {Function} fetchFn - 接收 app，返回任务数组的异步函数
 */
export async function startTaskListView(
	app,
	container,
	fetchFn,
	title = "任务列表",
) {
	container.innerHTML = "";

	try {
		const tasks = await fetchFn(app);
		if (!tasks.length) {
			container.innerHTML = `<div class="empty-message">📭 暂无${title}</div>`;
			return {
				cleanup: () => {
					container.innerHTML = "";
				},
				updateSort: () => {},
			};
		}

		const stats = document.createElement("div");
		stats.style.cssText = "margin-bottom:12px; font-weight:600;";
		stats.textContent = `📋 ${title}：${tasks.length} 项`;
		container.appendChild(stats);

		const ul = document.createElement("ul");
		ul.className = "task-list";
		ul.style.cssText = "list-style:none; padding:0;";

		tasks.forEach((task) => {
			const li = document.createElement("li");
			li.className = "task-list-item";
			li.style.cssText =
				"padding:6px 10px; margin-bottom:4px; background:var(--background-primary); border-radius:6px; cursor:pointer; border-left:3px solid var(--interactive-accent);";

			const prioIcon =
				{
					0: "🔺",
					1: "⏫",
					2: "🔼",
					3: "🔽",
					4: "⏬",
				}[task.priority] || "";
			const desc = task.description || "无描述";
			const dueDate = task.dueDate
				? ` 📅 ${window.moment(task.dueDate).format("MM-DD")}`
				: "";

			li.innerHTML = `<span style="font-weight:500;">${prioIcon} ${desc}</span><span style="color:var(--text-muted); font-size:0.8em; margin-left:8px;">${dueDate}</span>`;

			li.addEventListener("click", async () => {
				const file = app.vault.getAbstractFileByPath(task.path);
				if (file) {
					const leaf = app.workspace.getLeaf(false);
					await leaf.openFile(file);
					setTimeout(
						() =>
							leaf.view?.editor?.setCursor({
								line: task.lineNumber,
								ch: 0,
							}),
						30,
					);
				}
			});
			ul.appendChild(li);
		});
		container.appendChild(ul);
	} catch (e) {
		container.innerHTML =
			'<div class="empty-message">⚠️ 获取任务失败，请确认 Tasks 插件已启用</div>';
	}

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {}, // 列表视图暂不参与排序
	};
}
