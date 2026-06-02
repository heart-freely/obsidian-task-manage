// src/tasks/process/kanban-task-process.js
import {
	STATUS_SYMBOL_MAP,
	TASK_FILENAME_REGEX_TASKS,
	TASK_FOLDER_PATH,
} from "../../configs/configs";

// 看板列定义（包含新符号 >）
export const KANBAN_COLUMNS = [
	{ symbol: " ", label: "未开始", color: "rgba(180, 180, 180, 0.25)" },
	{ symbol: "?", label: "计划中", color: "rgba( 97, 175, 239, 0.25)" },
	{ symbol: "/", label: "进行中", color: "rgba(224, 108, 117, 0.25)" },
	{ symbol: ">", label: "进行中", color: "rgba(224, 108, 117, 0.25)" }, // 新增列
];

export async function fetchKanbanTasks(app) {
	const tasksPlugin = app.plugins.plugins["obsidian-tasks-plugin"];
	if (!tasksPlugin) throw new Error("需要 Tasks 插件");
	const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
	return await tasksPlugin.getTasks(query);
}

export function processKanbanTasks(allTasks) {
	const tasksBySymbol: Record<string, any[]> = {
		" ": [],
		"?": [],
		"/": [],
		">": [],
	};
	allTasks.forEach((task) => {
		const symbol = task.status.symbol;
		if (!tasksBySymbol.hasOwnProperty(symbol)) return;

		const statusKey = STATUS_SYMBOL_MAP[symbol] || "todo";
		const description = task.description || "（无描述）";
		const fileName = task.path.split("/").pop().replace(/\.md$/, "");

		tasksBySymbol[symbol].push({
			description,
			priority: task.priority || "none",
			status: statusKey,
			path: task.path,
			lineNumber: task.lineNumber,
			fileName,
			rawTask: task,
		});
	});

	// 每列按优先级排序
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
