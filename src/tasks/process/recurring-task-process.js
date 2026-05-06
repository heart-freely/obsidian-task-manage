/**
 * 文件：src/tasks/process/recurring-task-process.js
 * 描述：循环任务处理模块，从 Obsidian Tasks 插件查询并分组（每天/每周/每月）循环任务
 * 所属模块：tasks/process
 * 依赖：
 *   - plugin-configs: TASK_FOLDER_PATH / TASK_FILENAME_REGEX_TASKS / STATUS_SYMBOL_MAP / STATUS_ICONS / STATUS_NAMES
 * 对外导出：fetchRecurringTasksGrouped
 * 注意事项：依赖第三方 obsidian-tasks-plugin 插件，调用前需确保该插件已加载
 */
import {
	STATUS_ICONS,
	STATUS_NAMES,
	STATUS_SYMBOL_MAP,
	TASK_FILENAME_REGEX_TASKS,
	TASK_FOLDER_PATH,
} from "../../configs/plugin-configs";

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

	const groups = {
		每天: [],
		每周: [],
		每月: [],
	};

	recurringTasks.forEach((t) => {
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
			status: statusKey, // 供 createTaskCard 自动推导
			statusIcon, // 直接提供，跳过推导
			statusName, // 注意字段名
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
