// src/util/logger.ts

const logger = {
	// eslint-disable-next-line no-console -- 项目唯一日志工具
	info(...args: unknown[]) {
		console.log("[TASK-INFO]", ...args);
	},
	// eslint-disable-next-line no-console -- 项目唯一日志工具
	debug(...args: unknown[]) {
		console.debug("[TASK-DEBUG]", ...args);
	},
};

export default logger;
