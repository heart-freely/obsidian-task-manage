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
