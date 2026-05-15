const {
	getDailyNotesSettings,
	getAllTasks,
	getTasksForDay,
	getTasksForDateRange,
	getTasksForToday,
} = require("../read/read-tasks");
const { getSettings } = require("../../configs/plugin-configs");

/**
 * 获取今日收件箱任务
 * @param {object} app - Obsidian App 实例
 * @returns {Promise<object[]>}
 */
async function getInboxTasks(app) {
	const tasks = await getAllTasks(app);
	return tasks.filter((t) => !t.isTask && !t.completed);
}

/**
 * 获取未来收件箱任务（按大类分组渲染）
 * @param {object} app - Obsidian App 实例
 * @param {object} [opts] - 控制选项
 * @param {boolean} [opts.includeDone] - 是否包含已完成任务
 * @param {string[]}  [opts.categories] - 要展示的大类列表，默认全部
 * @returns {Promise<string>} 渲染后的 Markdown
 */
async function getFutureInboxTasks(app, opts = {}) {
	const { includeDone = false, categories } = opts;
	const tasks = await getAllTasks(app, { includeDone });

	const inboxTasks = tasks.filter((t) => !t.tags?.length && !t.section);

	const grouped = groupByCategory(inboxTasks);
	const catNames = categories ?? Object.keys(grouped);

	const parts = catNames
		.filter((cat) => grouped[cat]?.length > 0)
		.map((cat) => _renderCategory(cat, grouped[cat]));

	return parts.join("\n\n");
}

/**
 * 将任务按“大类”分组
 * @param {object[]} tasks
 * @returns {object<string, object[]>}
 */
function groupByCategory(tasks) {
	const map = {};
	for (const t of tasks) {
		const cat = resolveCategory(t);
		if (!map[cat]) map[cat] = [];
		map[cat].push(t);
	}
	return map;
}

/**
 * 解析一条任务所属的大类
 * @param {object} task
 * @returns {string} 大类名称
 */
function resolveCategory(task) {
	return task.category || "未分类";
}

/**
 * 渲染单个大类的完整 Markdown 区块
 * @param {string} cat - 大类名称
 * @param {object[]} tasks - 该大类下的所有任务
 * @returns {string} Markdown 字符串
 */
function _renderCategory(cat, tasks) {
	const lines = [`### ${cat}（${tasks.length}）`];
	for (const t of tasks) {
		lines.push(`- [ ] ${t.content ?? t.title ?? ""}`);
	}
	return lines.join("\n");
}

module.exports = {
	getInboxTasks,
	getFutureInboxTasks,
};
