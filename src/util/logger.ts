// 简易日志工具，生产模式下仅输出错误

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
	info(...args) {
		if (!isProduction) console.log("[TASK-INFO]", ...args);
	},
	warn(...args) {
		console.warn("[TASK-WARN]", ...args); // 警告总是输出
	},
	error(...args) {
		console.error("[TASK-ERROR]", ...args);
	},
	debug(...args) {
		if (!isProduction) console.debug("[TASK-DEBUG]", ...args);
	},
};

export default logger;
