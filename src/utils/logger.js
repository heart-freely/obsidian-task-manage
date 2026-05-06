/**
 * 文件：src/utils/logger.js
 * 描述：简易日志工具，提供分级日志输出；生产模式下仅输出警告和错误
 * 所属模块：utils
 * 依赖：无
 * 对外导出：logger（默认导出）
 * 注意事项：NODE_ENV 为 "production" 时，info 和 debug 级别日志将被静默
 *
 * @module logger
 */

/**
 * @typedef {Object} Logger
 * @property {Function} info - 输出信息日志（生产模式静默）
 * @property {Function} warn - 输出警告日志（始终输出）
 * @property {Function} error - 输出错误日志（始终输出）
 * @property {Function} debug - 输出调试日志（生产模式静默）
 */

// src/utils/logger.js
// 简易日志工具，生产模式下仅输出错误

/** @type {boolean} 是否为生产模式 */
const isProduction = (() => {
	try {
		if (
			typeof process !== "undefined" &&
			process.env &&
			process.env.NODE_ENV === "production"
		) {
			return true;
		}
	} catch (e) {}
	return false;
})();

/** @type {Logger} */
const logger = {
	/**
	 * 输出信息日志（生产模式静默）
	 * @param {...*} args - 日志参数
	 */
	info(...args) {
		if (!isProduction) console.log("[TASK-INFO]", ...args);
	},
	/**
	 * 输出警告日志（始终输出）
	 * @param {...*} args - 日志参数
	 */
	warn(...args) {
		console.warn("[TASK-WARN]", ...args); // 警告总是输出
	},
	/**
	 * 输出错误日志（始终输出）
	 * @param {...*} args - 日志参数
	 */
	error(...args) {
		console.error("[TASK-ERROR]", ...args);
	},
	/**
	 * 输出调试日志（生产模式静默）
	 * @param {...*} args - 日志参数
	 */
	debug(...args) {
		if (!isProduction) console.debug("[TASK-DEBUG]", ...args);
	},
};

export default logger;
