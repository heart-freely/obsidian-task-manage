// src/util/logger.ts

const logger = {
	info(...args: unknown[]) {
		console.log("[TASK-INFO]", ...args);
	},
	warn(...args: unknown[]) {
		console.warn("[TASK-WARN]", ...args);
	},
	error(...args: unknown[]) {
		console.error("[TASK-ERROR]", ...args);
	},
	debug(...args: unknown[]) {
		console.debug("[TASK-DEBUG]", ...args);
	},
};

export default logger;
