/* <!-- SYNC_COMMENTS_START --> */
/**
 * 文件：src/panel/views/matrix-task-view.js
 * 描述：艾森豪威尔矩阵视图，按紧急/重要四象限展示任务，支持状态过滤、排序和路径筛选
 * 所属模块：panel/views
 * 依赖：
 *   - matrix-task-process: 任务获取(fetchRawTasks)、四象限分类(processTasks)、排序(sortTasks)
 *   - base-task-view: 标准任务卡片生成(createTaskCard)和数据标准化(normalizeTaskCardData)
 * 对外导出：startMatrixView
 * 注意事项：此视图依赖 Obsidian Tasks 插件获取原始数据，无 Tasks 时显示错误提示
 * @see .cline/skills/code/views/matrix-task-view.md
 */

/* @skill-sig function startMatrixView(app, container, leftSort, state) : ViewController - 启动艾森豪威尔矩阵视图 */

/* @skill-state
  hideRecurring          : boolean              // 是否隐藏重复任务
  cachedRawTasks         : Array|null            // 缓存原始任务数据
  cachedQuadrantsData    : Array<Array<Task>>    // 四象限分类后的数据缓存
  currentSort            : {type, order}         // 当前排序规则
  currentState           : Object|null           // 当前全局状态快照
  currentFilterRootPath  : string|null           // 路径过滤条件
*/

/* @skill-dom matrix 视图 DOM 结构
  .matrix-view (container)
    .control-bar
    .view-grid.cols-2
      .view-col (x4)
        .col-header
          span (象限名称)
          span.task-count
        ul.task-list
          li.empty-placeholder (或无任务提示)
          li.task-item (对每个任务)
            .task-check
            .task-desc
*/

/* @skill-flow
  数据加载 → fetchRawTasks(app) → processTasks() → cachedQuadrantsData → renderMatrix()
  排序变更 → updateSort(newSort) → renderMatrix()
  状态变更 → update({state}) → 更新过滤条件 → renderMatrix()
  路径过滤 → 检查 currentFilterRootPath → 过滤 quadrantsData → renderMatrix()
*/

/* @skill-condition
  若无缓存数据(cachedQuadrantsData为空) → 不渲染
  若设置了 currentFilterRootPath → 过滤任务路径前缀匹配
  若 quadrant 中无任务 → 显示空状态提示
*/

/* @skill-api
  fetchRawTasks(app)                 // 从 Obsidian Tasks 插件获取原始任务
  processTasks(rawTasks, hideRecurring)  // 将任务分类到四个象限
  sortTasks(tasks, currentSort)      // 按规则排序
  normalizeTaskCardData(taskData)    // 标准化任务数据为卡片格式
  createTaskCard(cardData, app)      // 生成任务卡片 DOM
*/
/* <!-- SYNC_COMMENTS_END --> */

import {
	fetchRawTasks,
	processTasks,
	sortTasks,
} from "../../tasks/process/matrix-task-process";
import { createTaskCard, normalizeTaskCardData } from "./base-task-view";

/**
 * 启动艾森豪威尔矩阵视图
 * @param {Object} app - Obsidian App 实例
 * @param {HTMLElement} container - 视图容器 DOM 元素
 * @param {Object} leftSort - 左侧栏排序配置（{type, order}）
 * @param {Object} state - 全局状态（可选）
 * @returns {Promise<{cleanup, updateSort}>} 视图控制接口
 */
export async function startMatrixView(app, container, leftSort, state = {}) {
	let hideRecurring = state.hideRecurring || false;
	let cachedRawTasks = null;
	let cachedQuadrantsData = null;
	let currentSort = leftSort || { type: "status", order: "asc" };
	let currentState = null;
	let currentFilterRootPath = null;

	// 四象限配置：名称、背景颜色、空状态提示文案
	const QUADRANTS = [
		{
			name: "🔺 紧急与重要",
			color: "rgba(255, 130, 130, 0.25)",
			emptyMsg: "🎯 暂无紧急重要任务，保持专注！",
		},
		{
			name: "⏫ 不紧急且重要",
			color: "rgba(255, 180, 100, 0.25)",
			emptyMsg: "📌 暂无重要不紧急任务，可以规划长期目标",
		},
		{
			name: "🔼 紧急且不重要",
			color: "rgba(200, 200, 200, 0.15)",
			emptyMsg: "⚡ 暂无紧急不重要任务，试着减少干扰",
		},
		{
			name: "🔽⏬️ 不紧急也不重要",
			color: "rgba(100, 180, 255, 0.2)",
			emptyMsg: "📎 暂无不重要不紧急任务，合理放松",
		},
	];

	/**
	 * 标准化路径：移除 .md 后缀，统一格式以支持路径前缀匹配
	 * @param {string} p - 原始路径
	 * @returns {string} 标准化后的路径
	 */
	function normalizePath(p) {
		return (p || "").replace(/\.md$/, "");
	}

	/**
	 * 渲染矩阵视图
	 * 1. 应用路径过滤
	 * 2. 对每个象限的任务排序
	 * 3. 构建控制栏和 2x2 网格
	 */
	function renderMatrix() {
		if (!cachedQuadrantsData) return;
		let quadrantsData = cachedQuadrantsData;
		if (currentFilterRootPath) {
			const normalizedFilter = normalizePath(currentFilterRootPath);
			quadrantsData = quadrantsData.map((tasks) =>
				tasks.filter((t) =>
					normalizePath(t.path).startsWith(normalizedFilter),
				),
			);
		}
		const sortedData = quadrantsData.map((tasks) =>
			sortTasks(tasks, currentSort),
		);
		container.innerHTML = "";

		// 顶部控制栏：显示总任务数和当前状态过滤信息
		const controlBar = document.createElement("div");
		controlBar.className = "control-bar";
		const total = sortedData.flat().length;
		const statusText = currentState
			? currentState.markFilterState.statuses.join(" / ")
			: "未开始 / 计划中 / 进行中";
		controlBar.innerHTML = `<strong>📋 总任务: ${total}</strong> (仅${statusText})`;
		container.appendChild(controlBar);

		const grid = document.createElement("div");
		grid.className = "view-grid cols-2";

		QUADRANTS.forEach((quad, idx) => {
			const tasks = sortedData[idx];
			const col = document.createElement("div");
			col.className = "view-col";
			col.style.setProperty("--quad-color", quad.color);
			col.style.maxHeight = "400px"; // 恢复高度限制

			const header = document.createElement("div");
			header.className = "col-header";
			header.innerHTML = `
                <span>${quad.name}</span>
                <span class="task-count">${tasks.length}</span>
            `;
			col.appendChild(header);

			const list = document.createElement("ul");
			list.className = "task-list";

			if (!tasks.length) {
				list.innerHTML = `<li class="empty-placeholder">${quad.emptyMsg}</li>`;
			} else {
				tasks.forEach((t) => {
					const cardData = normalizeTaskCardData({
						description: t.desc,
						priority: String(
							t.priorityNum === 5 ? "none" : t.priorityNum,
						),
						status: t._status,
						scheduled: t.scheduled,
						start: t.start,
						due: t.due,
						tags: t.tags,
						fileName: t.fileName,
						path: t.path,
						lineNumber: t.line,
					});
					const card = createTaskCard(cardData, app);
					list.appendChild(card);
				});
			}
			col.appendChild(list);
			grid.appendChild(col);
		});
		container.appendChild(grid);
	}

	/**
	 * 初始化视图：获取 Tasks 插件数据，分类到四象限，首次渲染
	 */
	async function init() {
		try {
			cachedRawTasks = await fetchRawTasks(app);
			cachedQuadrantsData = processTasks(cachedRawTasks, hideRecurring);
			renderMatrix();
		} catch (e) {
			container.innerHTML =
				'<div class="empty-placeholder">❌ 未检测到 Tasks 插件</div>';
		}
	}

	/**
	 * 更新视图（响应状态变化或排序变化）
	 * @param {Object} params
	 * @param {Object} params.state - 新的全局状态
	 * @param {Object} params.leftSort - 新的排序规则
	 */
	async function update(params) {
		const { state: newState, leftSort: newSort } = params;
		if (newState) {
			currentState = newState;
			hideRecurring = newState.hideRepeatTasks;
			currentFilterRootPath = newState.filterRootPath;
		}
		if (newSort) currentSort = newSort;
		if (cachedRawTasks) {
			cachedQuadrantsData = processTasks(cachedRawTasks, hideRecurring);
		} else {
			try {
				cachedRawTasks = await fetchRawTasks(app);
				cachedQuadrantsData = processTasks(
					cachedRawTasks,
					hideRecurring,
				);
			} catch (e) {}
		}
		renderMatrix();
	}

	await init();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: (newSort) => {
			currentSort = newSort || currentSort;
			renderMatrix();
		},
	};
}
