/* <!-- SYNC_COMMENTS_START --> */
// src/tasks/process/recurring-task-process.js

/* @skill-sig file src/tasks/process/recurring-task-process.js - 循环任务处理模块，从 Obsidian Tasks 插件查询并分组(每天/每周/每月)循环任务 */
/* @skill-func
   classifyRecurrence(recurrence) : string - 根据循环规则文本映射周期类别(daily/weekly/monthly/yearly/custom)
   groupRecurringTasks(tasks) : GroupedTasks - 按每天/每周/每月分组循环任务
   sortGroups(groups) : Object - 对每组任务按优先级和计划时间排序
   fetchRecurringTasksGrouped(app) : Promise.Object - 从 Tasks 插件获取循环任务并分组(对外导出)
*/
/* @skill-flow
   fetchRecurringTasksGrouped(app) → 获取 Tasks 插件实例 → path includes 过滤 → 过滤未完成 → classifyRecurrence → groupRecurringTasks → sortGroups → 返回分组结果
   classifyRecurrence → 取 recurrence.toText().toLowerCase() → 包含 day/week/month/year 返回对应分类 → 否则 custom
   groupRecurringTasks → 按 cycle text 分组为 每天/每周/每月 → 提取 status/priority/description/recurrenceLabel/due/scheduled/start/tags/fileName → 返回 groups
   sortGroups → 按优先级排序(无优先级排最后) → 按 scheduled 日期排序
*/
/* @skill-param
   recurrence: Object - Tasks 插件的 recurrence 对象(需含 toText() 方法)
   tasks: Array - 循环任务列表(每项含 recurrence/status/description/priority/path/lineNumber/dueDate/scheduledDate/startDate/tags)
   groups: Object - 按 cycle 分组的任务对象({每天:[], 每周:[], 每月:[]})
   app: Obsidian.App - Obsidian 应用实例
*/
/* @skill-condition
   依赖第三方 obsidian-tasks-plugin 插件，调用前需确保该插件已加载
   循环规则文本包含 day/week/month/year 关键字来分类
   过滤条件排除已完成任务(status symbol 为 x/X/-)
   排序规则：优先级数字升序(无优先级 = 999) → scheduled 日期升序
   导入常量来自 plugin-configs: TASK_FOLDER_PATH/TASK_FILENAME_REGEX_TASKS/STATUS_SYMBOL_MAP/STATUS_ICONS/STATUS_NAMES
   关联视图 sync: src/panel/views/recurring-task-view.js
   关联 Skill sync: .cline/skills/code/views/recurring-task-view.md
*/
/* <!-- SYNC_COMMENTS_END --> */
import {
	STATUS_ICONS,
	STATUS_NAMES,
	STATUS_SYMBOL_MAP,
	TASK_FILENAME_REGEX_TASKS,
	TASK_FOLDER_PATH,
} from "../../configs/plugin-configs";

/**
 * 根据循环规则文本映射周期类别 @skill-sig
 * @param {object} recurrence - Tasks 插件的 recurrence 对象
 * @returns {string} 'daily'|'weekly'|'monthly'|'yearly'|'custom'
 * @sync .cline/skills/code/views/recurring-task-view.md → classifyRecurrence
 */
function classifyRecurrence(recurrence) {
	const cycleText = recurrence.toText().toLowerCase();
	if (cycleText.includes("day")) return "daily";
	if (cycleText.includes("week")) return "weekly";
	if (cycleText.includes("month")) return "monthly";
	if (cycleText.includes("year")) return "yearly";
	return "custom";
}

/**
 * 分组循环任务 @skill-sig
 * @param {Array} tasks - 循环任务列表
 * @returns {Object} GroupedTasks - 按每天/每周/每月分组后的任务对象
 * @sync .cline/skills/code/views/recurring-task-view.md → groupRecurringTasks
 */
function groupRecurringTasks(tasks) {
	const groups = { 每天: [], 每周: [], 每月: [] };
	tasks.forEach((t) => {
		const cycleText = t.recurrence.toText().toLowerCase();
		let cycle;
		if (cycleText.includes("day")) cycle = "每天";
		else if (cycleText.includes("week")) cycle = "每周";
		else if (cycleText.includes("month")) cycle = "每月";
		else return;

		const sym = t.status.symbol;
		const statusKey = STATUS_SYMBOL_MAP[sym] || "todo";
		const statusIcon = STATUS_ICONS[statusKey] || "🔲";
		const statusName = STATUS_NAMES[statusKey] || "未开始";

		const desc = t.description || "（无描述）";
		const prio = t.priority || "none";
		const fileName = t.path.split("/").pop().replace(/\.md$/, "");
		const recurrenceLabel = `🔁 ${t.recurrence.toText()}`;

		groups[cycle].push({
			description: desc,
			priority: prio,
			status: statusKey,
			statusIcon,
			statusName,
			recurrenceLabel,
			path: t.path,
			lineNumber: t.lineNumber,
			due: t.dueDate
				? window.moment(t.dueDate).format("YYYY-MM-DD")
				: null,
			scheduled: t.scheduledDate
				? window.moment(t.scheduledDate).format("YYYY-MM-DD")
				: null,
			start: t.startDate
				? window.moment(t.startDate).format("YYYY-MM-DD")
				: null,
			tags: (t.tags || []).map((tag) => tag.replace(/^#/, "")),
			fileName,
		});
	});
	return groups;
}

/**
 * 对每组任务按优先级和计划时间排序 @manual
 * @param {Object} groups - 按周期分组的任务对象
 * @returns {Object} 排序后的分组任务对象
 * @complexity O(n log n) 每组排序
 */
function sortGroups(groups) {
	for (const cycle in groups) {
		groups[cycle].sort((a, b) => {
			const pa = a.priority === "none" ? 999 : parseInt(a.priority);
			const pb = b.priority === "none" ? 999 : parseInt(b.priority);
			if (pa !== pb) return pa - pb;
			if (!a.scheduled && !b.scheduled) return 0;
			if (!a.scheduled) return 1;
			if (!b.scheduled) return -1;
			return a.scheduled.localeCompare(b.scheduled);
		});
	}
	return groups;
}

/**
 * 从 Tasks 插件获取循环任务并分组 @manual
 * @param {object} app - Obsidian 应用实例
 * @returns {Promise<Object>} 按每天/每周/每月分组排序的任务对象
 * @throws {Error} 当 Tasks 插件未加载时抛出
 * @sync .cline/skills/code/views/recurring-task-view.md → 加载 → 过滤 → 分组 → 渲染
 * @public 供 RecurringTaskView 调用
 */
export async function fetchRecurringTasksGrouped(app) {
	const tasksPlugin = app.plugins.plugins["obsidian-tasks-plugin"];
	if (!tasksPlugin) throw new Error("需要 Tasks 插件");

	const query = `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS}`;
	const allTasks = await tasksPlugin.getTasks(query);

	/* @skill O(n) 过滤循环任务 */
	const recurringTasks = allTasks.filter((t) => {
		if (!t.recurrence) return false;
		const sym = t.status.symbol;
		return sym !== "x" && sym !== "X" && sym !== "-";
	});

	const groups = groupRecurringTasks(recurringTasks);
	return sortGroups(groups);
}
