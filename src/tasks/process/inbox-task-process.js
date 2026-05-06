/**
 * 文件：src/tasks/process/inbox-task-process.js
 * 描述：任务收件箱模块，提供收件箱任务的获取与分组处理能力
 * 所属模块：tasks/process
 * 依赖：plugin-configs（TASK_FOLDER_PATH, TASK_FILENAME_REGEX_TASKS）
 * 外部依赖：obsidian-tasks-plugin 中的 getTasks API
 * 对外导出：fetchInboxTasks, processInboxTasks
 * 注意事项：所有查询均依赖 Tasks 插件实例，调用前需确保插件已加载
 */

import {
	TASK_FILENAME_REGEX_TASKS,
	TASK_FOLDER_PATH,
} from "../../configs/plugin-configs";

/**
 * 获取收件箱任务
 * 筛选条件：未完成（not done）、非重复（is not recurring）、状态为待处理（空格）或计划中（?）
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<Array>} 收件箱任务对象数组
 * @throws {Error} 当 Tasks 插件未加载时抛出
 *
 * @example
 * const inboxTasks = await fetchInboxTasks(app);
 */
export async function fetchInboxTasks(app) {
	const tasksPlugin = app.plugins.plugins["obsidian-tasks-plugin"];
	if (!tasksPlugin) throw new Error("Tasks 插件未安装");
	const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
	const allTasks = await tasksPlugin.getTasks(query);
	return allTasks.filter(
		(t) => t.status.symbol === " " || t.status.symbol === "?",
	);
}

/**
 * 处理收件箱任务，按状态分组为"未开始"和"计划中"
 * 每个分组内按优先级（从高到低）排序
 *
 * @param {Array} allTasks - 收件箱任务对象数组
 * @returns {{groups: Object.<string, Array>, total: number}}
 *          - groups: 包含 "未开始"、"计划中" 两个分组的任务数组
 *          - total: 任务总数
 *
 * @example
 * const { groups, total } = processInboxTasks(allTasks);
 */
export function processInboxTasks(allTasks) {
	const groups = { 未开始: [], 计划中: [] };

	allTasks.forEach((t) => {
		const isPlanned = t.status.symbol === "?";
		const prio = t.priority || "none";
		const desc = t.description || "（无描述）";
		const taskItem = {
			description: desc,
			priority: prio,
			path: t.path,
			lineNumber: t.lineNumber,
			scheduled: t.scheduledDate
				? window.moment(t.scheduledDate).format("YYYY-MM-DD")
				: null,
			start: t.startDate
				? window.moment(t.startDate).format("YYYY-MM-DD")
				: null,
			due: t.dueDate
				? window.moment(t.dueDate).format("YYYY-MM-DD")
				: null,
			tags: (t.tags || []).map((tag) => tag.replace(/^#/, "")),
			fileName: t.path.split("/").pop().replace(/\.md$/, ""),
		};

		if (isPlanned) {
			groups["计划中"].push(taskItem);
		} else {
			groups["未开始"].push(taskItem);
		}
	});

	for (const groupName in groups) {
		groups[groupName].sort((a, b) => {
			const pa = a.priority === "none" ? 999 : parseInt(a.priority);
			const pb = b.priority === "none" ? 999 : parseInt(b.priority);
			return pa - pb;
		});
	}

	return { groups, total: allTasks.length };
}
