import {
	TASK_FILENAME_REGEX_TASKS,
	TASK_FOLDER_PATH,
} from "../../configs/plugin-configs";
import { RX } from "../../tasks/read/read-tasks"; // 引入统一正则以提取自定义标记

/**
 * 构建基础的 Tasks 查询字符串
 * 包含文件路径、文件名正则匹配，以及附加的过滤条件
 *
 * @param {string} [extra=''] - 附加的查询条件片段（如 'is not recurring'）
 * @returns {string} 组装后的完整查询字符串
 *
 * @example
 * const q = baseQuery('is not recurring');
 * // "path includes "..." filename regex matches ... is not recurring"
 */
function baseQuery(extra = "") {
	return `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} ${extra}`.trim();
}

/**
 * 从 Tasks 插件获取任务（基础查询） @auto-sig
 * 所有具体查询函数均以此为基础进行二次过滤
 *
 * @param {App} app - Obsidian 应用实例
 * @param {string} [extraQuery=''] - 附加查询条件
 * @returns {Promise<Array>} 符合条件的所有任务对象数组
 * @throws {Error} 当 Tasks 插件未加载时抛出
 *
 * @example
 * const tasks = await fetchTasks(app, 'is not recurring');
 * @sync .cline/skills/code/views/views.md → 所有视图的基础数据来源
 */
export async function fetchTasks(app, extraQuery = "") {
	const plugin = app.plugins.plugins["obsidian-tasks-plugin"];
	if (!plugin) throw new Error("需要 Tasks 插件");
	return await plugin.getTasks(baseQuery(extraQuery));
}

/**
 * 获取重要任务（优先级非 none 且优先级值 <= 1） @auto-sig
 * 过滤出关键优先级（high/critical）的任务，同时排除重复任务
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<Array>} 重要任务对象数组
 *
 * @example
 * const important = await fetchImportantTasks(app);
 * @sync .cline/skills/code/views/views.md → important-task-view 数据源
 */
export async function fetchImportantTasks(app) {
	const all = await fetchTasks(app, "is not recurring");
	return all.filter(
		(t) => t.priority !== "none" && parseInt(t.priority) <= 1,
	);
}

/**
 * 获取所有重复任务（周期性任务） @auto-sig
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<Array>} 周期性任务对象数组
 *
 * @example
 * const recurring = await fetchRecurringTasks(app);
 * @sync .cline/skills/code/views/views.md → recurring-task-view 数据源
 */
export async function fetchRecurringTasks(app) {
	return await fetchTasks(app, "is recurring");
}

/**
 * 获取今天的任务 @auto-sig
 * 基于任务的到期日期（dueDate）或计划日期（scheduledDate）与今天匹配
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<Array>} 截止日期或计划日期为今天的任务数组
 *
 * @example
 * const todayTasks = await fetchTodayTasks(app);
 * @sync .cline/skills/code/views/views.md → today-task-view 数据源
 */
export async function fetchTodayTasks(app) {
	const all = await fetchTasks(app);
	const today = window.moment().format("YYYY-MM-DD");
	return all.filter((t) => {
		const due = t.dueDate
			? window.moment(t.dueDate).format("YYYY-MM-DD")
			: null;
		const sched = t.scheduledDate
			? window.moment(t.scheduledDate).format("YYYY-MM-DD")
			: null;
		return due === today || sched === today;
	});
}

/**
 * 获取未来指定天数内的任务 @auto-sig
 * 基于到期日期或计划日期判断是否在 [今天, 今天+days) 区间内
 *
 * @param {App} app - Obsidian 应用实例
 * @param {number} [days=15] - 未来天数范围
 * @returns {Promise<Array>} 未来指定天数内的任务数组
 *
 * @example
 * const futureTasks = await fetchFutureTasks(app, 7);
 * @sync .cline/skills/code/views/views.md → future-task-n-view / future-task-all-view 数据源
 */
export async function fetchFutureTasks(app, days = 15) {
	const all = await fetchTasks(app);
	const now = window.moment();
	const limit = window.moment().add(days, "days");
	return all.filter((t) => {
		const date = t.dueDate || t.scheduledDate;
		return date && window.moment(date).isBetween(now, limit, null, "[]");
	});
}

/**
 * 获取已过期的任务 @auto-sig
 * 基于到期日期或计划日期判断是否早于今天
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<Array>} 已过期的任务数组
 *
 * @example
 * const overdue = await fetchOverdueTasks(app);
 * @sync .cline/skills/code/views/views.md → overdue-task-view 数据源
 */
export async function fetchOverdueTasks(app) {
	const all = await fetchTasks(app);
	const now = window.moment().format("YYYY-MM-DD");
	return all.filter((t) => {
		const date = t.dueDate || t.scheduledDate;
		return date && window.moment(date).isBefore(now);
	});
}

/**
 * 获取有依赖关系的任务 @auto-sig
 * 过滤出定义了 dependsOn 字段的任务
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<Array>} 存在依赖关系的任务数组
 *
 * @example
 * const depends = await fetchDependsTasks(app);
 * @sync .cline/skills/code/views/views.md → depends-task-view 数据源
 */
export async function fetchDependsTasks(app) {
	const all = await fetchTasks(app);
	return all.filter((t) => t.dependsOn && t.dependsOn.length > 0);
}

/**
 * 获取标签任务（同时兼容原生 #标签 和自定义 🏁 标记） @auto-sig
 *
 * @param {App} app - Obsidian 应用实例
 * @param {string} tag - 要筛选的标签名（不含 # 前缀）；传入空字符串则返回所有包含任意标签的任务
 * @returns {Promise<Array>} 匹配标签的任务数组
 *
 * @example
 * // 获取所有带 "urgent" 标签的任务
 * const urgentTasks = await fetchTagTasks(app, 'urgent');
 *
 * // 获取所有有标签的任务
 * const taggedTasks = await fetchTagTasks(app, '');
 * @sync .cline/skills/code/views/views.md → tag-task-view 数据源
 */
export async function fetchTagTasks(app, tag) {
	const allTasks = await fetchTasks(app);
	const result = [];

	for (const task of allTasks) {
		const nativeTags = (task.tags || []).map((t) => t.replace(/^#/, ""));

		const fullText = task.description || task.text || "";
		const match = RX.tag.exec(fullText);
		const customTag = match ? match[1] : null;

		const allTags = [...nativeTags];
		if (customTag && !allTags.includes(customTag)) {
			allTags.push(customTag);
		}

		if (!tag || tag.trim() === "") {
			if (allTags.length > 0) result.push(task);
		} else {
			if (allTags.some((t) => t.toLowerCase() === tag.toLowerCase()))
				result.push(task);
		}
	}

	return result;
}

/**
 * 获取今日任务并按状态分组（未开始/计划中/进行中） @auto-sig
 * 分组依据：status.symbol — 空格=未开始，?=计划中，/=进行中
 * 每个分组内按优先级（从高到低）和计划日期（从早到晚）排序
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<{groups: Object.<string, Array>, total: number}>}
 *          - groups: 包含 "未开始"、"计划中"、"进行中" 三个分组的任务数组
 *          - total: 任务总数
 *
 * @example
 * const { groups, total } = await fetchTodayTasksGrouped(app);
 * @sync .cline/skills/code/views/views.md → 今日任务分组展示
 */
export async function fetchTodayTasksGrouped(app) {
	const tasksPlugin = app.plugins.plugins["obsidian-tasks-plugin"];
	if (!tasksPlugin) throw new Error("需要 Tasks 插件");
	const query = `not done path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS} is not recurring`;
	const allTasks = await tasksPlugin.getTasks(query);

	const today = window.moment().format("YYYY-MM-DD");
	const isDateValid = (d) =>
		d && window.moment(d).format("YYYY-MM-DD") === today;
	const isBetween = (start, end) => {
		if (!start || !end) return false;
		return (
			window.moment(start).format("YYYY-MM-DD") <= today &&
			today <= window.moment(end).format("YYYY-MM-DD")
		);
	};

	const filtered = allTasks.filter((t) => {
		const sym = t.status.symbol;
		const validStatus = sym === " " || sym === "?" || sym === "/";
		if (!validStatus || t.recurrence) return false;

		if (
			[
				t.createdDate,
				t.scheduledDate,
				t.startDate,
				t.dueDate,
				t.doneDate,
				t.cancelledDate,
			].some(isDateValid)
		)
			return true;
		if (isBetween(t.scheduledDate, t.dueDate)) return true;
		if (isBetween(t.startDate, t.doneDate)) return true;
		if (isBetween(t.startDate, t.cancelledDate)) return true;
		return false;
	});

	const groups = { 未开始: [], 计划中: [], 进行中: [] };

	filtered.forEach((t) => {
		const sym = t.status.symbol;
		const groupName =
			sym === " " ? "未开始" : sym === "?" ? "计划中" : "进行中";
		const prio = t.priority || "none";
		const desc = t.description || "（无描述）";
		const taskItem = {
			description: desc,
			priority: prio,
			statusText: groupName,
			path: t.path,
			lineNumber: t.lineNumber,
			scheduled: t.scheduledDate
				? window.moment(t.scheduledDate).format("YYYY-MM-DD")
				: null,
			due: t.dueDate
				? window.moment(t.dueDate).format("YYYY-MM-DD")
				: null,
			start: t.startDate
				? window.moment(t.startDate).format("YYYY-MM-DD")
				: null,
			tags: (t.tags || []).map((tag) => tag.replace(/^#/, "")),
			fileName: t.path.split("/").pop().replace(/\.md$/, ""),
			recurrenceLabel: "",
		};
		groups[groupName].push(taskItem);
	});

	for (const g in groups) {
		groups[g].sort((a, b) => {
			const pa = a.priority === "none" ? 999 : parseInt(a.priority);
			const pb = b.priority === "none" ? 999 : parseInt(b.priority);
			if (pa !== pb) return pa - pb;
			if (!a.scheduled && !b.scheduled) return 0;
			if (!a.scheduled) return 1;
			if (!b.scheduled) return -1;
			return a.scheduled.localeCompare(b.scheduled);
		});
	}

	const total = Object.values(groups).reduce(
		(sum, arr) => sum + arr.length,
		0,
	);
	return { groups, total };
}

/**
 * 获取重要任务并按状态分组（未开始/计划中/进行中） @auto-sig
 * 筛选条件：优先级 >= 1 且 <= 3（即高、中、低优先级），且状态为未开始/计划中/进行中
 * 每个分组内按到期日期（从早到晚）排序
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<{groups: Object.<string, Array>, total: number}>}
 *          - groups: 包含 "未开始"、"计划中"、"进行中" 三个分组的任务数组
 *          - total: 任务总数
 *
 * @example
 * const { groups, total } = await fetchImportantTasksByStatus(app);
 * @sync .cline/skills/code/views/views.md → 重要任务分组展示
 */
export async function fetchImportantTasksByStatus(app) {
	const tasksPlugin = app.plugins.plugins["obsidian-tasks-plugin"];
	if (!tasksPlugin) throw new Error("需要 Tasks 插件");
	const query = `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS}`;
	const allTasks = await tasksPlugin.getTasks(query);

	const filtered = allTasks.filter((t) => {
		const sym = t.status.symbol;
		const validStatus = sym === " " || sym === "?" || sym === "/";
		const prioNum =
			t.priority === "none" || t.priority == null
				? 5
				: parseInt(t.priority);
		return validStatus && prioNum >= 1 && prioNum <= 3;
	});

	const groups = { 未开始: [], 计划中: [], 进行中: [] };

	filtered.forEach((t) => {
		const sym = t.status.symbol;
		const groupName =
			sym === " " ? "未开始" : sym === "?" ? "计划中" : "进行中";
		const prio = t.priority || "none";
		const desc = t.description || "（无描述）";
		const taskItem = {
			description: desc,
			priority: prio,
			statusText: groupName,
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
			fileName: t.path.split("/").pop().replace(/\.md$/, ""),
			recurrenceLabel: t.recurrence ? `🔁 ${t.recurrence.toText()}` : "",
		};
		groups[groupName].push(taskItem);
	});

	for (const g in groups) {
		groups[g].sort((a, b) => {
			if (!a.due && !b.due) return 0;
			if (!a.due) return 1;
			if (!b.due) return -1;
			return new Date(a.due) - new Date(b.due);
		});
	}

	const total = Object.values(groups).reduce(
		(sum, arr) => sum + arr.length,
		0,
	);
	return { groups, total };
}
