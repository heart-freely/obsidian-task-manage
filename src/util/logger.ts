// src/util/logger.ts
const isProduction = (() => {
	try {
		if (
			typeof process !== "undefined" &&
			process.env &&
			process.env.NODE_ENV === "production"
		) {
			return true;
		}
	} catch {
		// process 不可用时视为非生产环境，忽略错误
	}
	return false;
})();

const logger = {
	info(...args: unknown[]) {
		if (!isProduction) console.log("[TASK-INFO]", ...args);
	},
	warn(...args: unknown[]) {
		console.warn("[TASK-WARN]", ...args);
	},
	error(...args: unknown[]) {
		console.error("[TASK-ERROR]", ...args);
	},
	debug(...args: unknown[]) {
		if (!isProduction) console.debug("[TASK-DEBUG]", ...args);
	},
};

export default logger;
