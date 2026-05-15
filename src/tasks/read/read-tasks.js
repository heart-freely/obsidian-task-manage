import { CONFIG } from "../../configs/plugin-configs";
import logger from "../../utils/logger";
import { DateUtils } from "../process/common-process";

/**
 * 正则标记集合 @auto-sig
 * @property {RegExp} priority - 优先级图标（⏬ 🔽 🔼 ⏫ 🔺）
 * @property {RegExp} repeat - 重复规则（🔁 every day/week/month/year）
 * @property {RegExp} created - 创建日期（➕ YYYY-MM-DD）
 * @property {RegExp} scheduled - 计划日期（⏳ YYYY-MM-DD）
 * @property {RegExp} starts - 开始日期（🛫 YYYY-MM-DD）
 * @property {RegExp} due - 截止日期（📅 YYYY-MM-DD）
 * @property {RegExp} done - 完成日期（✅ YYYY-MM-DD）
 * @property {RegExp} cancel - 取消日期（❌ YYYY-MM-DD）
 * @property {RegExp} tag - 标签标记（🏁 关键词）
 * @property {RegExp} id - ID 标记（🆔 标识符）
 * @property {RegExp} forbid - 禁止标记（⛔ 关键词列表）
 * @sync src/tasks/process/filter-task-process.js → RX.*
 */
export const RX = {
	priority: /⏬|🔽|🔼|⏫|🔺/g,
	repeat: /🔁\s*(every\s+(day|week|month|year))/i,
	created: /➕\s*(\d{4}-\d{2}-\d{2})/,
	scheduled: /⏳\s*(\d{4}-\d{2}-\d{2})/,
	starts: /🛫\s*(\d{4}-\d{2}-\d{2})/,
	due: /📅\s*(\d{4}-\d{2}-\d{2})/,
	done: /✅\s*(\d{4}-\d{2}-\d{2})/,
	cancel: /❌\s*(\d{4}-\d{2}-\d{2})?/,
	tag: /🏁\s*(\S+)/,
	id: /🆔\s*(\S+)/,
	forbid: /⛔\s*([^\s,]+(?:\s*,\s*[^\s,]+)*)/,
};

/**
 * 从任务行文本中解析任务状态 @auto-sig
 * @param {string} line - 任务行文本（如 "- [x] 任务内容"）
 * @returns {string} 状态值：'completed' | 'in-progress' | 'planned' | 'cancelled' | 'todo'
 * @example
 * getTaskStatus("- [x] 任务")     // "completed"
 * getTaskStatus("- [ ] 任务")     // "todo"
 * getTaskStatus("- [/] 任务")    // "in-progress"
 * @sync src/tasks/process/filter-task-process.js → getTaskStatus
 */
export function getTaskStatus(line) {
	const m = line.match(/^\s*- \[(.)\]\s*/);
	return m
		? {
				x: "completed",
				X: "completed",
				"-": "cancelled",
				"/": "in-progress",
				"?": "planned",
			}[m[1]] || "todo"
		: "todo";
}

/**
 * 根据任务状态返回对应的状态图标 @auto-sig
 * @param {Object} task - 任务对象
 * @param {string} [task._status] - 任务状态
 * @param {boolean} [task.completed] - 是否完成（兼容旧格式）
 * @returns {string} 状态图标（✅ ⏩ ❔ ❎ 🔲）
 * @example
 * getStatusIcon({ _status: "completed" }) // "✅"
 * getStatusIcon({ _status: "todo" })      // "🔲"
 */
export function getStatusIcon(task) {
	if (task._status === "completed" || task.completed) return "✅";
	if (task._status === "in-progress") return "⏩";
	if (task._status === "planned") return "❔";
	if (task._status === "cancelled") return "❎";
	return "🔲";
}

/**
 * 判断任务是否为今天的任务 @auto-sig
 * @param {Object} task - 任务对象
 * @param {string} [task._scheduled] - 计划日期
 * @param {string} [task._due] - 截止日期
 * @param {string} [task._starts] - 开始日期
 * @param {string} [task._created] - 创建日期
 * @returns {boolean} 如果有任一日期落在今天范围内则返回 true
 * @example
 * isTaskToday({ _due: "2026-05-06" }) // 如果今天为 2026-05-06 则返回 true
 * @sync src/panel/views/today-task-view.js → isTaskToday
 */
export function isTaskToday(task) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const check = (d) =>
		d ? new Date(d) >= today && new Date(d) < tomorrow : false;
	return (
		check(task._scheduled) ||
		check(task._due) ||
		check(task._starts) ||
		check(task._created)
	);
}

/**
 * 计算任务的时间范围 @auto-sig
 * @param {Object} task - 任务对象
 * @param {string} [task._scheduled] - 计划日期
 * @param {string} [task._due] - 截止日期
 * @param {string} [task._starts] - 开始日期
 * @param {string} [task._done] - 完成日期
 * @returns {{ start: number, end: number } | null} 时间戳范围，若无日期则返回 null
 * @example
 * computeTaskTimeRange({ _scheduled: "2026-05-01", _due: "2026-05-06" })
 * // { start: 1748707200000, end: 1749139200000 }
 * @sync src/tasks/process/calcul-chart-process.js → computeTaskTimeRange
 */
export function computeTaskTimeRange(task) {
	let min = Infinity,
		max = -Infinity;
	const add = (d) => {
		if (d) {
			const ts = new Date(d).getTime();
			if (ts < min) min = ts;
			if (ts > max) max = ts;
		}
	};
	add(task._scheduled);
	add(task._due);
	add(task._starts);
	if (task._done) add(task._done);
	return min === Infinity
		? null
		: {
				start: DateUtils.setStart(new Date(min)).getTime(),
				end: DateUtils.setEnd(new Date(max)).getTime(),
			};
}

/**
 * 确保任务对象包含 _cleanText 和 _tooltip 属性 @auto-sig
 * _cleanText：去除所有标记图标后的纯净文本
 * _tooltip：用于显示的工具提示文本
 * _tooltipHtml：HTML 格式的工具提示文本
 * @param {Object} task - 任务对象（会被直接修改）
 * @param {string} task.text - 原始任务文本
 * @example
 * ensureTaskProperties(task);
 * console.log(task._cleanText);  // "任务描述（无标记）"
 * @sync src/panel/interacts/tooltip-interact.js → ensureTaskProperties
 */
export function ensureTaskProperties(task) {
	if (!task.hasOwnProperty("_cleanText")) {
		task._cleanText =
			task.text
				.replace(/⏬|🔽|🔼|⏫|🔺/g, "")
				.replace(/🔁\s*every\s+(day|week|month|year)/gi, "")
				.replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/❌\s*\d{4}-\d{2}-\d{2}?/g, "")
				.replace(/❌/g, "")
				.replace(/🏁\s*\S+/g, "")
				.replace(/🆔\s*\S+/g, "")
				.replace(/⛔\s*[^\s,]+(?:\s*,\s*[^\s,]+)*/g, "")
				.replace(/⛔[\s\S]*?(?=\s*$|🏁|🆔|🔁|➕|⏳|🛫|📅|✅|❌|$)/g, "")
				.trim() || task.text;
	}
	if (!task.hasOwnProperty("_tooltip")) {
		const parts = [];
		parts.push(getStatusIcon(task) + " " + task._cleanText);
		if (task._priorityIcon) parts.push(task._priorityIcon);
		if (task._repeat) parts.push("🔁 " + task._repeat);
		if (task._created) parts.push("➕ " + task._created);
		if (task._scheduled) parts.push("⏳ " + task._scheduled);
		if (task._starts) parts.push("🛫 " + task._starts);
		if (task._due) parts.push("📅 " + task._due);
		if (task._done) parts.push("✅ " + task._done);
		if (task._cancel) parts.push("❌ " + task._cancel);
		if (task._tag) parts.push("🏁 " + task._tag);
		if (task._id) parts.push("🆔 " + task._id);
		if (task._forbid) parts.push("⛔ " + task._forbid);
		task._tooltip = parts.join("\n");
		task._tooltipHtml = task._tooltip.replace(/\n/g, "<br>");
	}
}

/**
 * 获取所有配置文件夹中的任务 @auto-sig
 * 从 Dataview 查询结果中解析并缓存所有任务
 * @param {boolean} force - 是否强制刷新缓存
 * @param {Object} dv - Dataview 插件实例
 * @param {Object} state - 全局状态上下文（必须包含 cachedAllTasks、taskIdMap）
 * @returns {Array} 解析后的任务对象列表
 * @throws {Error} 如果 state 未提供则抛出
 * @example
 * const tasks = getAllTasks(false, dv, state);
 * // 返回所有配置文件夹中的任务列表
 * @sync src/panel/panel.js → getAllTasks
 * @sync .cline/skills/code/views/views.md → 数据获取流程
 */
export function getAllTasks(force, dv, state) {
	if (!state) throw new Error("Global state context is required");
	if (state.cachedAllTasks && !force) return state.cachedAllTasks;

	const tasks = [];
	for (const folder of CONFIG.TASK_FOLDERS) {
		const pages = dv.pages(folder);
		if (!pages || !pages.length) continue;
		for (const page of pages) {
			if (!CONFIG.FILE_NAME_PATTERN.test(page.file.name)) continue;
			if (!page.file.tasks) continue;
			for (const task of page.file.tasks) {
				try {
					const fullLine =
						(task.completed ? "- [x] " : "- [ ] ") + task.text;
					task._fullLine = fullLine;
					task._status = task.status
						? {
								"/": "in-progress",
								"?": "planned",
								"-": "cancelled",
								x: "completed",
								X: "completed",
							}[task.status] || "todo"
						: getTaskStatus(fullLine);
					function m(rx, idx) {
						return fullLine.match(rx)
							? fullLine.match(rx)[idx !== undefined ? idx : 1] ||
									null
							: null;
					}
					task._created = m(RX.created);
					task._scheduled = m(RX.scheduled);
					task._starts = m(RX.starts);
					task._due = m(RX.due);
					task._done = m(RX.done);
					task._cancel = m(RX.cancel) || "";
					task._tag = m(RX.tag);
					task._id = m(RX.id);
					task._forbid = m(RX.forbid)
						? m(RX.forbid).replace(/\s/g, "")
						: "";
					task._repeat = m(RX.repeat);
					task._priorityIcon = (fullLine.match(RX.priority) || [
						null,
					])[0];
					task._marks = {
						priority: !!task._priorityIcon,
						repeat: !!task._repeat,
						created: !!task._created,
						scheduled: !!task._scheduled,
						starts: !!task._starts,
						due: !!task._due,
						done: !!task._done,
						cancel: !!task._cancel,
						tag: !!task._tag,
						id: !!task._id,
						forbid: !!task._forbid,
					};
					task._cachedTimeRange = computeTaskTimeRange(task);
					ensureTaskProperties(task);
					tasks.push(task);
				} catch (e) {
					logger.warn("任务解析失败，已跳过：", task, e);
				}
			}
		}
	}
	state.cachedAllTasks = tasks;
	state.taskIdMap = {};
	for (const task of tasks) {
		if (task._id) state.taskIdMap[task._id] = task;
	}
	return tasks;
}
