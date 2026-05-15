import { CONFIG } from "../../configs/plugin-configs";

/**
 * 多条件任务过滤函数 @auto-sig
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

	if (filterRootPath) {
		result = result.filter((t) => t.path.startsWith(filterRootPath));
	}

	if (statuses.length < CONFIG.ALLOWED_STATUSES.length) {
		result = result.filter((t) => statuses.includes(t._status));
	}

	if (hideRepeatTasks) result = result.filter((t) => !t._repeat);

	if (hideCompletedTasks)
		result = result.filter((t) => t._status !== "completed");

	if (hideCancelledTasks)
		result = result.filter((t) => t._status !== "cancelled");

	if (includeMarks.length) {
		result = result.filter((t) =>
			includeMarks.every((m) => t._marks && t._marks[m]),
		);
	}

	if (excludeMarks.length) {
		result = result.filter(
			(t) => !excludeMarks.some((m) => t._marks && t._marks[m]),
		);
	}

	return result;
}
