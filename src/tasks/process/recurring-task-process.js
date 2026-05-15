import {
	STATUS_ICONS,
	STATUS_NAMES,
	STATUS_SYMBOL_MAP,
	TASK_FILENAME_REGEX_TASKS,
	TASK_FOLDER_PATH,
} from "../../configs/plugin-configs";

/**
 * 根据循环规则文本映射周期类别 @auto-sig
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
 * 分组循环任务 @auto-sig
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

	const recurringTasks = allTasks.filter((t) => {
		if (!t.recurrence) return false;
		const sym = t.status.symbol;
		return sym !== "x" && sym !== "X" && sym !== "-";
	});

	const groups = groupRecurringTasks(recurringTasks);
	return sortGroups(groups);
}
