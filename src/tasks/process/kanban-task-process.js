/* <!-- SYNC_COMMENTS_START --> */
/* @skill-sig file src/tasks/process/kanban-task-process.js - 看板任务处理模块，提供看板视图所需的任务获取、分组与列定义，颜色使用半透明配色与矩阵视图风格统一 */
/* @skill-func
   KANBAN_COLUMNS : Array - 看板三列定义(🔲未开始/❔计划中/⏩进行中)，每列包含 symbol/label/color 属性
   fetchKanbanTasks(app) : Array - 获取看板任务，筛选未完成 + 非循环任务
   processKanbanTasks(allTasks) : {columns, tasksBySymbol, total} - 按状态符号分三列，每列按优先级排序
*/
/* @skill-flow
   KANBAN_COLUMNS → 静态定义 → 供 processKanbanTasks 和视图渲染使用
   fetchKanbanTasks → tasksPlugin.getTasks(not done + is not recurring) → 返回原始任务数组
   processKanbanTasks → 遍历 allTasks → 按 status.symbol 分入 " "/"?/"/" 三组 → 每组按优先级排序 → 附加 status 字段
*/
/* @skill-param
   app: Obsidian.App - Obsidian 应用实例，用于访问 plugins 获取 Tasks 插件
   allTasks: Array - 看板任务对象数组，由 fetchKanbanTasks 返回
*/
/* @skill-condition
   依赖 obsidian-tasks-plugin 实例，插件未加载时抛出 Error
   筛选条件："not done" + "is not recurring"
   状态符号映射：空格→todo, ?→in_progress, /→in_progress（通过 STATUS_SYMBOL_MAP）
   优先级排序权重：none→999, actual priority 值越小优先级越高
   颜色使用半透明配色(rgba)，与矩阵视图风格统一
   sync: .cline/skills/code/views/views.md → kanban-task-view 数据源
*/
/* <!-- SYNC_COMMENTS_END --> */

import {
	STATUS_SYMBOL_MAP,
	TASK_FILENAME_REGEX_TASKS,
	TASK_FOLDER_PATH,
} from "../../configs/plugin-configs";

/**
 * 看板列定义数组
 * 包含三列：未开始（空格）、计划中（?）、进行中（/）
 * 每列配有半透明背景色，与矩阵视图配色风格统一
 * @skill-rule 看板列定义: 三列(🔲未开始/❔计划中/⏩进行中) + 半透明配色
 *
 * @type {Array<{symbol: string, label: string, color: string}>}
 *
 * @example
 * // 遍历列定义渲染看板
 * KANBAN_COLUMNS.forEach(col => renderColumn(col));
 */
export const KANBAN_COLUMNS = [
	{ symbol: " ", label: "未开始", color: "rgba(180, 180, 180, 0.25)" },
	{ symbol: "?", label: "计划中", color: "rgba( 97, 175, 239, 0.25)" },
	{ symbol: "/", label: "进行中", color: "rgba(224, 108, 117, 0.25)" },
];

/**
 * 获取看板任务
 * 筛选条件：未完成（not done）、非重复（is not recurring）
 * @skill-rule 看板任务筛选: 条件为 "not done" + "is not recurring"
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<Array>} 看板任务对象数组
 * @throws {Error} 当 Tasks 插件未加载时抛出
 *
 * @example
 * const allTasks = await fetchKanbanTasks(app);
 */
export async function fetchKanbanTasks(app) {
	const tasksPlugin = app.plugins.plugins["obsidian-tasks-plugin"];
	if (!tasksPlugin) throw new Error("需要 Tasks 插件");
	const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
	return await tasksPlugin.getTasks(query);
}

/**
 * 处理看板任务，按状态符号分组为三列
 * 每列内按优先级（从高到低）排序
 * 为每个任务附加 createTaskCard 所需的 status 字段
 * @skill-rule 看板分组排序: 按状态符号分三列 + 列内优先级排序权重: 1(🔺)→2(⏫)→3(🔼)→4(🔽)→5(⏬)→999(无)
 *
 * @param {Array} allTasks - 看板任务对象数组
 * @returns {{columns: Array, tasksBySymbol: Object.<string, Array>, total: number}}
 *          - columns: KANBAN_COLUMNS 列定义
 *          - tasksBySymbol: 按状态符号分组的任务字典（键为空格/?//）
 *          - total: 任务总数
 *
 * @example
 * const { columns, tasksBySymbol, total } = processKanbanTasks(allTasks);
 */
export function processKanbanTasks(allTasks) {
	const tasksBySymbol = { " ": [], "?": [], "/": [] };

	allTasks.forEach((task) => {
		const symbol = task.status.symbol;
		if (!tasksBySymbol.hasOwnProperty(symbol)) return;

		const statusKey = STATUS_SYMBOL_MAP[symbol] || "todo";
		const description = task.description || "（无描述）";
		const fileName = task.path.split("/").pop().replace(/\.md$/, "");

		tasksBySymbol[symbol].push({
			description,
			priority: task.priority || "none",
			status: statusKey, // 供 createTaskCard 自动推导
			path: task.path,
			lineNumber: task.lineNumber,
			fileName,
			rawTask: task,
		});
	});

	// 每列按优先级排序（优先级数字小的在前）
	for (const symbol in tasksBySymbol) {
		tasksBySymbol[symbol].sort((a, b) => {
			const pa = a.priority === "none" ? 999 : parseInt(a.priority);
			const pb = b.priority === "none" ? 999 : parseInt(b.priority);
			return pa - pb;
		});
	}

	return {
		columns: KANBAN_COLUMNS,
		tasksBySymbol,
		total: Object.values(tasksBySymbol).flat().length,
	};
}
