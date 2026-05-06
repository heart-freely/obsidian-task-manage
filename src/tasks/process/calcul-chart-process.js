/**
 * 文件：src/tasks/process/calcul-chart-process.js
 * 描述：图表数据计算及任务统计计算（纯函数），提供甘特图跨度、任务时长、每日状态堆叠等计算能力
 * 所属模块：tasks/process
 * 依赖：plugin-configs（CONFIG.ALLOWED_STATUSES, CONFIG.WORK_HOURS_PER_DAY）
 * 对外导出：computeTotalSpanDays, calcPlannedDuration, calcActualDuration, calcTotalSpanHours, prepareDailyStatusStack
 * 注意事项：所有函数均为纯函数，不修改传入的任务数组，不涉及 Obsidian API
 */

import { CONFIG } from "../../configs/plugin-configs";

// ========== 图表数据计算 ==========

/**
 * 计算任务集合的时间跨度总天数
 * 根据指定的起始和截止字段，找出所有任务中的最早开始和最晚结束日期，计算总天数
 *
 * @param {Array} tasks - 任务对象数组
 * @param {string} fieldStart - 起始日期字段名（如 '_scheduled'）
 * @param {string} fieldEnd - 截止日期字段名（如 '_due'）
 * @returns {number} 跨越的总天数（不足一天按一天计算），无有效数据时返回 0
 *
 * @example
 * const days = computeTotalSpanDays(tasks, '_scheduled', '_due');
 */
export function computeTotalSpanDays(tasks, fieldStart, fieldEnd) {
	if (!tasks.length) return 0;
	let min = Infinity,
		max = -Infinity;
	tasks.forEach((t) => {
		const s = t[fieldStart] ? new Date(t[fieldStart]).getTime() : null;
		const e = t[fieldEnd] ? new Date(t[fieldEnd]).getTime() : null;
		if (s && e && s <= e) {
			if (s < min) min = s;
			if (e > max) max = e;
		}
	});
	if (min === Infinity || max === -Infinity) return 0;
	return Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 计算任务集合的计划总时长（天）
 * 基于每个任务的 _scheduled（计划开始）和 _due（截止日期）计算
 *
 * @param {Array} tasks - 任务对象数组
 * @returns {number} 四舍五入后的计划总天数
 *
 * @example
 * const plannedDays = calcPlannedDuration(tasks);
 */
export function calcPlannedDuration(tasks) {
	let total = 0;
	tasks.forEach((t) => {
		if (t._scheduled && t._due)
			total += Math.max(
				0,
				(new Date(t._due) - new Date(t._scheduled)) / 86400000,
			);
	});
	return Math.round(total);
}

/**
 * 计算任务集合的实际总时长（天）
 * 基于每个任务的 _starts（实际开始）和 _done（实际完成）计算
 *
 * @param {Array} tasks - 任务对象数组
 * @returns {number} 四舍五入后的实际总天数
 *
 * @example
 * const actualDays = calcActualDuration(tasks);
 */
export function calcActualDuration(tasks) {
	let total = 0;
	tasks.forEach((t) => {
		if (t._starts && t._done)
			total += Math.max(
				0,
				(new Date(t._done) - new Date(t._starts)) / 86400000,
			);
	});
	return Math.round(total);
}

/**
 * 计算任务集合的时间跨度总工时
 * 基于 computeTotalSpanDays 计算的天数，乘以 CONFIG.WORK_HOURS_PER_DAY
 *
 * @param {Array} tasks - 任务对象数组
 * @param {string} fieldStart - 起始日期字段名
 * @param {string} fieldEnd - 截止日期字段名
 * @returns {number} 总工时（天数 × 每日工作小时数）
 *
 * @example
 * const totalHours = calcTotalSpanHours(tasks, '_scheduled', '_due');
 */
export function calcTotalSpanHours(tasks, fieldStart, fieldEnd) {
	const days = computeTotalSpanDays(tasks, fieldStart, fieldEnd);
	return days * CONFIG.WORK_HOURS_PER_DAY;
}

/**
 * 准备每日任务状态堆叠数据
 * 遍历指定日期范围内的每一天，统计每个状态下包含的任务数量
 * 用于生成每日状态堆叠图（如 ECharts 堆叠面积图）
 *
 * @param {Array} tasks - 任务对象数组
 * @param {{start: Date, end: Date}|null} dateRange - 日期范围对象，如果提供则限定统计范围
 * @param {Function} formatDate - 日期格式化函数，接收 Date 返回字符串键
 * @param {Function} setStart - 将日期设置为当天起始时刻的函数
 * @param {Function} setEnd - 将日期设置为当天结束时刻的函数
 * @returns {{dates: string[], seriesData: Object.<string, number[]>, statusOrder: string[]}}
 *          - dates: 有序的日期键列表
 *          - seriesData: 每个状态对应的数值数组（与 dates 一一对应）
 *          - statusOrder: 状态顺序（取自 CONFIG.ALLOWED_STATUSES）
 *
 * @example
 * const { dates, seriesData, statusOrder } = prepareDailyStatusStack(
 *     tasks,
 *     { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
 *     DateUtils.formatDate,
 *     DateUtils.setStart,
 *     DateUtils.setEnd
 * );
 */
export function prepareDailyStatusStack(
	tasks,
	dateRange,
	formatDate,
	setStart,
	setEnd,
) {
	const dayMap = {};
	function keyOf(d) {
		return formatDate(d);
	}
	function initDay() {
		return {
			todo: 0,
			planned: 0,
			"in-progress": 0,
			completed: 0,
			cancelled: 0,
		};
	}
	if (dateRange) {
		const cur = setStart(new Date(dateRange.start));
		const end = setStart(new Date(dateRange.end));
		while (cur <= end) {
			dayMap[keyOf(cur)] = initDay();
			cur.setDate(cur.getDate() + 1);
		}
	}
	tasks.forEach((t) => {
		const range = t._cachedTimeRange;
		if (!range) return;
		const cur = setStart(new Date(range.start));
		const end = setStart(new Date(range.end));
		while (cur <= end) {
			const key = keyOf(cur);
			if (dateRange) {
				if (dayMap[key]) dayMap[key][t._status]++;
			} else {
				if (!dayMap[key]) dayMap[key] = initDay();
				dayMap[key][t._status]++;
			}
			cur.setDate(cur.getDate() + 1);
		}
	});
	const sorted = Object.keys(dayMap)
		.sort()
		.map((k) => [k, dayMap[k]]);
	const dates = sorted.map((e) => e[0]);
	const seriesData = {};
	CONFIG.ALLOWED_STATUSES.forEach((s) => {
		seriesData[s] = sorted.map((e) => e[1][s]);
	});
	return { dates, seriesData, statusOrder: CONFIG.ALLOWED_STATUSES };
}
