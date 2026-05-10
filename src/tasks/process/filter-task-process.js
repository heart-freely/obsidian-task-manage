// src/tasks/process/filter-task-process.js
/* <!-- SYNC_COMMENTS_START --> */
/* @skill-sig file src/tasks/process/filter-task-process.js - 多条件任务过滤核心，基于日期范围/状态/标记/路径/重复/完成/取消等维度过滤，被所有视图复用 */
/* @skill-func
   filterTasks(tasks: Array, options: Object) : Array - 多条件过滤函数，过滤顺序：日期范围 → 文件路径 → 状态 → 重复/完成/取消 → 包含标记 → 排除标记
*/
/* @skill-flow
   filterTasks(tasks, options) → 提取 dateFilterState / markFilterState / hideRepeatTasks / hideCompletedTasks / hideCancelledTasks / filterRootPath
   → 步骤1: 日期范围过滤（!isAll 且 start/end 存在时，按 _cachedTimeRange 区间重叠判断）
   → 步骤2: 文件路径前缀过滤（filterRootPath 按 t.path.startsWith）
   → 步骤3: 状态过滤（按 CONFIG.ALLOWED_STATUSES 子集筛选）
   → 步骤4: 过滤重复/已完成/已取消（按 _repeat / _status）
   → 步骤5: 包含标记过滤（includeMarks 必须全部存在）
   → 步骤6: 排除标记过滤（excludeMarks 任一存在则排除）
   → 返回过滤后数组
*/
/* @skill-param
   options.dateFilterState: {start, end, isAll} - 日期范围，isAll=true 时跳过日期过滤
   options.markFilterState: {statuses, includeMarks, excludeMarks} - 标记与状态条件
   options.hideRepeatTasks: boolean 默认 true - 隐藏重复任务
   options.hideCompletedTasks: boolean 默认 true - 隐藏已完成任务
   options.hideCancelledTasks: boolean 默认 true - 隐藏已取消任务
   options.filterRootPath: string|null 默认 null - 按文件路径前缀过滤
*/
/* @skill-condition
   依赖 CONFIG.ALLOWED_STATUSES（来自 plugin-configs）
   任务对象必须具有 _cachedTimeRange / _status / _repeat / _marks 属性
   过滤顺序固定，不可调换
   includeMarks 为 "与" 条件（必须全部满足）
   excludeMarks 为 "或" 条件（任一满足即排除）
   sync: .cline/skills/code/views/views.md → 所有视图共用过滤逻辑
*/
/* <!-- SYNC_COMMENTS_END --> */

import { CONFIG } from "../../configs/plugin-configs";

/**
 * 多条件任务过滤函数 @skill-sig
 * 根据传入的 options 对象，对任务数组进行逐级过滤
 * 过滤顺序：日期范围 → 文件路径 → 状态 → 重复/完成/取消 → 包含标记 → 排除标记
 *
 * @param {Array} tasks - 待过滤的任务对象数组
 * @param {Object} options - 过滤配置选项
 * @param {Object} [options.dateFilterState] - 日期范围过滤状态
 * @param {Date|null} [options.dateFilterState.start] - 日期范围起始
 * @param {Date|null} [options.dateFilterState.end] - 日期范围结束
 * @param {boolean} [options.dateFilterState.isAll] - 是否忽略日期过滤
 * @param {Object} [options.markFilterState] - 标记过滤状态
 * @param {string[]} [options.markFilterState.statuses] - 允许的状态列表（默认 CONFIG.ALLOWED_STATUSES）
 * @param {string[]} [options.markFilterState.includeMarks] - 必须包含的标记名列表
 * @param {string[]} [options.markFilterState.excludeMarks] - 必须排除的标记名列表
 * @param {boolean} [options.hideRepeatTasks=true] - 是否隐藏重复任务
 * @param {boolean} [options.hideCompletedTasks=true] - 是否隐藏已完成任务
 * @param {boolean} [options.hideCancelledTasks=true] - 是否隐藏已取消任务
 * @param {string|null} [options.filterRootPath=null] - 按文件路径前缀过滤
 * @returns {Array} 过滤后的任务数组
 *
 * @example
 * // 过滤出本月未完成且带重要标记的任务
 * const filtered = filterTasks(allTasks, {
 *     dateFilterState: { start: monthStart, end: monthEnd, isAll: false },
 *     markFilterState: {
 *         includeMarks: ['important'],
 *         excludeMarks: [],
 *         statuses: ['todo', 'in_progress']
 *     },
 *     hideCompletedTasks: true,
 *     hideCancelledTasks: true
 * });
 * @sync .cline/skills/code/views/views.md → 所有视图共用过滤逻辑
 */
export function filterTasks(tasks, options) {
	const {
		dateFilterState = { start: null, end: null, isAll: false },
		markFilterState = {},
		hideRepeatTasks = true,
		hideCompletedTasks = true,
		hideCancelledTasks = true,
		filterRootPath = null,
	} = options;

	const statuses = markFilterState.statuses || CONFIG.ALLOWED_STATUSES;
	const includeMarks = markFilterState.includeMarks || [];
	const excludeMarks = markFilterState.excludeMarks || [];

	let result = tasks;

	// 日期范围过滤：基于任务的 _cachedTimeRange 判断是否与目标区间重叠
	if (
		!dateFilterState.isAll &&
		dateFilterState.start &&
		dateFilterState.end
	) {
		const qr = {
			start: dateFilterState.start.getTime(),
			end: dateFilterState.end.getTime(),
		};
		result = result.filter((t) => {
			const tr = t._cachedTimeRange;
			return tr && tr.start <= qr.end && tr.end >= qr.start;
		});
	}

	// 文件路径前缀过滤
	if (filterRootPath) {
		result = result.filter((t) => t.path.startsWith(filterRootPath));
	}

	// 状态过滤：仅保留在允许列表中的状态
	if (statuses.length < CONFIG.ALLOWED_STATUSES.length) {
		result = result.filter((t) => statuses.includes(t._status));
	}

	// 过滤重复任务
	if (hideRepeatTasks) result = result.filter((t) => !t._repeat);
	// 过滤已完成任务
	if (hideCompletedTasks)
		result = result.filter((t) => t._status !== "completed");
	// 过滤已取消任务
	if (hideCancelledTasks)
		result = result.filter((t) => t._status !== "cancelled");

	// 包含标记过滤：任务必须包含所有指定标记
	if (includeMarks.length) {
		result = result.filter((t) =>
			includeMarks.every((m) => t._marks && t._marks[m]),
		);
	}
	// 排除标记过滤：任务不能包含任一排除标记
	if (excludeMarks.length) {
		result = result.filter(
			(t) => !excludeMarks.some((m) => t._marks && t._marks[m]),
		);
	}

	return result;
}
