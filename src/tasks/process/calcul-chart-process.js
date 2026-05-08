//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file src/tasks/process/calcul-chart-process.js - 图表数据纯计算模块，提供甘特图跨度/任务时长/每日状态堆叠等统计计算，不修改入参，不涉及 Obsidian API */
/* @skill-func
   computeTotalSpanDays(tasks, fieldStart, fieldEnd) : number - 计算任务集合的时间跨度总天数，找出最早 start 和最晚 end 的差值
   calcPlannedDuration(tasks) : number - 计算计划总时长（天），基于 _scheduled → _due
   calcActualDuration(tasks) : number - 计算实际总时长（天），基于 _starts → _done
   calcTotalSpanHours(tasks, fieldStart, fieldEnd) : number - 计算总工时 = 跨度天数 × WORK_HOURS_PER_DAY
   prepareDailyStatusStack(tasks, dateRange, formatDate, setStart, setEnd) : {dates, seriesData, statusOrder} - 准备每日状态堆叠数据，遍历日期范围内每一天统计各状态任务数
*/
/* @skill-flow
   computeTotalSpanDays → 遍历 tasks 取 fieldStart/fieldEnd → 计算 min->max 毫秒差 → 转天数 ceil
   calcPlannedDuration → 遍历 tasks 取 _scheduled/_due → 累加 duration → Math.round
   calcActualDuration → 遍历 tasks 取 _starts/_done → 累加 duration → Math.round
   calcTotalSpanHours → 调用 computeTotalSpanDays → 乘以 WORK_HOURS_PER_DAY
   prepareDailyStatusStack → 若 dateRange 则预填 dayMap 每一天的初始计数 → 遍历 tasks 按 _cachedTimeRange 逐日填充各 _status 计数 → 排序 keys → 构建 seriesData
*/
/* @skill-param
   tasks: Array - 任务对象数组，不修改
   fieldStart/fieldEnd: string - 日期字段名（_scheduled/_due/_starts/_done）
   dateRange: {start: Date, end:Date}|null - 限定统计日期范围
   formatDate: Function - 日期格式化函数，接收 Date 返回字符串键
   setStart/setEnd: Function - 日期边界设置函数（来自 DateUtils）
*/
/* @skill-condition
   所有函数均为纯函数，不修改入参
   依赖 CONFIG.ALLOWED_STATUSES / CONFIG.WORK_HOURS_PER_DAY（来自 plugin-configs）
   任务对象必须具有 _cachedTimeRange / _status
   prepareDailyStatusStack 在 dateRange 为 null 时自动扩展 dayMap
   sync: .cline/skills/code/views/views.md → ECharts 堆叠图数据 & 甘特图跨度计算
*/
//  <!-- SYNC_COMMENTS_END -->

import { CONFIG } from "../../configs/plugin-configs";

// ========== 图表数据计算 ==========

/**
 * 计算任务集合的时间跨度总天数 @skill-sig
 * 根据指定的起始和截止字段，找出所有任务中的最早开始和最晚结束日期，计算总天数
 *
 * @param {Array} tasks - 任务对象数组
 * @param {string} fieldStart - 起始日期字段名（如 '_scheduled'）
 * @param {string} fieldEnd - 截止日期字段名（如 '_due'）
 * @returns {number} 跨越的总天数（不足一天按一天计算），无有效数据时返回 0
 *
 * @example
 * const days = computeTotalSpanDays(tasks, '_scheduled', '_due');
 * @sync .cline/skills/code/views/views.md → 甘特图跨度计算
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
 * 准备每日任务状态堆叠数据 @skill-sig
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
 * @sync .cline/skills/code/views/views.md → ECharts 堆叠图数据
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
