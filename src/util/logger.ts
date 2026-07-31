// src/util/logger.ts

const logger = {
	info(...args: unknown[]) {
		console.log("[TASK-INFO]", ...args);
	},
	debug(...args: unknown[]) {
		console.debug("[TASK-DEBUG]", ...args);
	},
};

export default logger;
