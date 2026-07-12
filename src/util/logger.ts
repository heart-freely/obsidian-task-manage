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
	} catch (e) {}
	return false;
})();

const logger = {
	info(...args: any[]) {
		if (!isProduction) console.log("[TASK-INFO]", ...args);
	},
	warn(...args: any[]) {
		console.warn("[TASK-WARN]", ...args);
	},
	error(...args: any[]) {
		console.error("[TASK-ERROR]", ...args);
	},
	debug(...args: any[]) {
		if (!isProduction) console.debug("[TASK-DEBUG]", ...args);
	},
};

export default logger;
