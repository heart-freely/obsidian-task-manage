//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file src/tasks/process/task-query-process.js - 任务查询入口模块，基于 Obsidian Tasks 插件 API，提供按标签/日期/状态/优先级等维度的任务查询能力，所有查询依赖 Tasks 插件实例，调用前需确保插件已加载 */
/* @skill-func
   fetchTasks(app, extraQuery) : Array - 基础查询，从 Tasks 插件获取符合条件的所有任务
   fetchImportantTasks(app) : Array - 获取重要任务（优先级 non-none 且 <= 1），排除重复
   fetchRecurringTasks(app) : Array - 获取所有周期性/重复任务
   fetchTodayTasks(app) : Array - 获取今天到期的任务（dueDate 或 scheduledDate 匹配今天）
   fetchFutureTasks(app, days) : Array - 获取未来指定天数内的任务
   fetchOverdueTasks(app) : Array - 获取已过期任务
   fetchDependsTasks(app) : Array - 获取有依赖关系的任务
   fetchTagTasks(app, tag) : Array - 按 #标签 或自定义 🏁 标记筛选任务
   fetchTodayTasksGrouped(app) : {groups, total} - 获取今日任务并按状态分组（未开始/计划中/进行中）
   fetchImportantTasksByStatus(app) : {groups, total} - 获取重要任务并按状态分组
*/
/* @skill-flow
   fetchTasks → plugins["obsidian-tasks-plugin"].getTasks(baseQuery + extraQuery) → 返回原始任务数组
   fetchXxxTasks → fetchTasks + 特定过滤条件（优先级/重复/日期/依赖/标签）
   fetchTodayTasks → fetchTasks → 按 moment 格式化的今天日期匹配 dueDate/scheduledDate
   fetchFutureTasks → fetchTasks → 按 moment.isBetween 判断日期是否在 [now, now+days) 内
   fetchOverdueTasks → fetchTasks → 按 moment.isBefore 判断日期是否早于今天
   fetchDependsTasks → fetchTasks → 按 dependsOn 数组非空过滤
   fetchTagTasks → fetchTasks → 兼容原生 #tags + 自定义 RX.tag 正则提取 🏁 标记
   fetchTodayTasksGrouped → fetchTasks('not done ...') → 按 status.symbol 分三组（空格/?//）→ 按优先级+日期排序
   fetchImportantTasksByStatus → fetchTasks → 按 priority 1-3 + 有效状态过滤 → 分三组 → 按到期日期排序
*/
/* @skill-param
   app: Obsidian.App - Obsidian 应用实例，用于访问 plugins 获取 Tasks 插件
   extraQuery: string - 附加 Tasks 查询语句片段
   days: number - 未来天数（默认 15）
   tag: string - 标签名（不含 # 前缀），空字符串表示所有有标签的任务
*/
/* @skill-condition
   所有查询依赖 obsidian-tasks-plugin 实例，插件未加载时抛出 Error
   内部 baseQuery() 拼接 path + filename regex 定位到任务文件目录
   日期比较均使用 window.moment（Obsidian 内置）
   RX.tag 正则来自 read-tasks 模块
   分组查询中的 status.symbol 约定：空格=未开始 / ?=计划中 / /=进行中
   sync: .cline/skills/code/views/views.md → 所有视图的基础数据来源
*/
//  <!-- SYNC_COMMENTS_END -->

import {
	TASK_FILENAME_REGEX_TASKS,
	TASK_FOLDER_PATH,
} from "../../configs/plugin-configs";
import { RX } from "../../tasks/read/read-tasks"; // 引入统一正则以提取自定义标记

// ========== 内部工具函数 ==========

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
 * 从 Tasks 插件获取任务（基础查询） @skill-sig
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
 * 获取重要任务（优先级非 none 且优先级值 <= 1） @skill-sig
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
 * 获取所有重复任务（周期性任务） @skill-sig
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
 * 获取今天的任务 @skill-sig
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
 * 获取未来指定天数内的任务 @skill-sig
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
 * 获取已过期的任务 @skill-sig
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
 * 获取有依赖关系的任务 @skill-sig
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
 * 获取标签任务（同时兼容原生 #标签 和自定义 🏁 标记） @skill-sig
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
		// 原生 tags（Tasks 插件自动解析的 #标签）
		const nativeTags = (task.tags || []).map((t) => t.replace(/^#/, ""));

		// 自定义标签：从任务文本中提取，使用与系统统一的 RX 正则
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

// ========== 分组查询函数（返回按状态分组的结构化数据） ==========

/**
 * 获取今日任务并按状态分组（未开始/计划中/进行中） @skill-sig
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
 * 获取重要任务并按状态分组（未开始/计划中/进行中） @skill-sig
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
