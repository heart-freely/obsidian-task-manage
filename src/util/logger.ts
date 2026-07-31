// src/util/logger.ts

const logger = {
	warn(...args: unknown[]) {
		console.warn("[TASK-WARN]", ...args);
	},
	error(...args: unknown[]) {
		console.error("[TASK-ERROR]", ...args);
	},
};

export default logger;
