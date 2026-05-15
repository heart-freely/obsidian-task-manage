import {
	PRIORITY_ICONS,
	TASK_FILENAME_REGEX_TASKS,
	TASK_FILENAME_REGEXP,
	TASK_FOLDER_PATH,
} from "../../configs/plugin-configs";

/**
 * 参与矩阵展示的状态符号集合：空格（未开始）、?（计划中）、/（进行中）
 * @auto-rule 矩阵状态过滤: 仅处理 空格(未开始)/?(计划中)/(进行中) 三种状态
 */
const STATUS_SYMBOLS = [" ", "?", "/"];

/**
 * 优先级到四象限索引的映射表
 * 优先级数值越小，任务越紧急/重要
 * - 1（最高）→ 象限0：紧急且重要
 * - 2（高）   → 象限1：不紧急但重要
 * - 3（中）   → 象限2：紧急但不重要
 * - 4（低）   → 象限3：不紧急不重要
 * - 'none'（无优先级）在逻辑中默认归入象限3
 * @auto-rule 矩阵优先级映射: 1→Q0 / 2→Q1 / 3→Q2 / 4→Q3 / none→Q3
 *
 * @type {Object.<number, number>}
 */
const PRIORITY_TO_QUADRANT = {
	1: 0, // 最高优先级 → 紧急重要
	2: 1, // 高        → 不紧急但重要
	3: 2, // 中        → 紧急但不重要
	4: 3, // 低        → 不紧急不重要
};

const dateCache = new Map();

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * 优先使用 window.moment（Obsidian 环境），否则回退到原生 Date
 * 使用 Map 缓存结果以提升重复调用性能
 *
 * @param {Date|string|number|null} date - 待格式化的日期
 * @returns {string|null} 格式化后的日期字符串或 null
 *
 * @example
 * formatDate("2026-05-01T00:00:00.000Z") // => "2026-05-01"
 */
function formatDate(date) {
	if (!date) return null;
	const key = String(date);
	if (dateCache.has(key)) return dateCache.get(key);
	const formatted = window.moment
		? window.moment(date).format("YYYY-MM-DD")
		: new Date(date).toISOString().slice(0, 10);
	dateCache.set(key, formatted);
	return formatted;
}

/**
 * 获取原始任务列表
 * 查询条件：路径包含 TASK_FOLDER_PATH + 文件名符合正则
 * 不限状态（包含已完成任务）
 *
 * @param {App} app - Obsidian 应用实例
 * @returns {Promise<Array>} 原始任务对象数组
 * @throws {Promise.reject} 当 Tasks 插件未加载时返回 rejected promise
 *
 * @example
 * const tasks = await fetchRawTasks(app);
 */
export function fetchRawTasks(app) {
	const tasksPlugin = app.plugins.plugins["obsidian-tasks-plugin"];
	if (!tasksPlugin) return Promise.reject("需要 Tasks 插件");
	const query = `path includes "${TASK_FOLDER_PATH}" filename regex matches ${TASK_FILENAME_REGEX_TASKS}`;
	return tasksPlugin.getTasks(query);
}

/**
 * 处理任务集合，按优先级映射到四象限
 * 过滤规则：文件名须匹配 TASK_FILENAME_REGEXP、状态符号须在 STATUS_SYMBOLS 中
 * 可选择排除周期性任务
 * @auto-rule 矩阵状态过滤: 仅处理 空格(未开始)/?(计划中)/(进行中) 三种状态
 * @auto-rule 矩阵优先级映射: 1→Q0 / 2→Q1 / 3→Q2 / 4→Q3 / none→Q3
 *
 * @param {Array} allTasks - 原始任务对象数组
 * @param {boolean} [hideRecurring=false] - 是否排除周期性任务
 * @returns {Array<Array>} 四象限任务数组，每个元素为一个象限的任务列表
 *                         - 索引0：紧急且重要
 *                         - 索引1：不紧急但重要
 *                         - 索引2：紧急但不重要
 *                         - 索引3：不紧急不重要
 *
 * @example
 * const quadrants = processTasks(allTasks, true);
 * quadrants[0] // 紧急且重要的任务列表
 */
export function processTasks(allTasks, hideRecurring = false) {
	const quadrantsData = [[], [], [], []];
	allTasks.forEach((t) => {
		const fileName = t.path.split("/").pop();
		if (!TASK_FILENAME_REGEXP.test(fileName)) return;
		const sym = t.status.symbol;
		if (!STATUS_SYMBOLS.includes(sym)) return;
		if (hideRecurring && t.recurrence) return;

		const priorityNum =
			t.priority === "none" || t.priority == null
				? 5
				: parseInt(t.priority);
		const priorityIcon = PRIORITY_ICONS[t.priority] || "";
		const statusText =
			sym === "/" ? "进行中" : sym === "?" ? "计划中" : "未开始";
		const tags = (t.tags || []).map((tag) => tag.replace(/^#/, ""));
		const sortDate = t.scheduledDate || t.startDate || t.dueDate;
		const sortTimestamp = sortDate ? new Date(sortDate).getTime() : null;

		const taskItem = {
			desc: t.description || "（无描述）",
			priorityNum,
			priorityIcon,
			statusText,
			tags,
			created: formatDate(t.createdDate),
			scheduled: formatDate(t.scheduledDate),
			start: formatDate(t.startDate),
			due: formatDate(t.dueDate),
			done: formatDate(t.doneDate),
			cancelled: formatDate(t.cancelledDate),
			path: t.path,
			line: t.lineNumber,
			fileName: fileName.replace(/\.md$/, ""),
			isRecurring: !!t.recurrence,
			sortTimestamp,
			_status:
				t.status?.symbol === "/"
					? "in-progress"
					: t.status?.symbol === "?"
						? "planned"
						: "todo",
		};

		const quadIndex = PRIORITY_TO_QUADRANT[priorityNum] ?? 3;
		quadrantsData[quadIndex].push(taskItem);
	});
	return quadrantsData;
}

/**
 * 排序任务列表
 * @auto-rule 矩阵排序规则: 按状态(进行中→计划中→未开始)→优先级(小→大)→排序日期(早→晚)
 *
 * @param {Array} tasks - 待排序的任务对象数组（不会被修改）
 * @param {{type: string, order: string}} sortConfig - 排序配置
 *        - type: 排序字段（"status"/"priority"/"filename"/任意日期字段名）
 *        - order: 排序方向（"asc" 升序 / "desc" 降序）
 * @returns {Array} 排序后的新任务数组（浅拷贝）
 *
 * @example
 * const sorted = sortTasks(tasks, { type: 'status', order: 'asc' });
 */
export function sortTasks(tasks, sortConfig) {
	const { type, order } = sortConfig;
	const asc = order === "asc";
	const copy = tasks.slice();
	copy.sort((a, b) => {
		if (type === "status") {
			const orderA =
				a.statusText === "进行中"
					? 0
					: a.statusText === "计划中"
						? 1
						: 2;
			const orderB =
				b.statusText === "进行中"
					? 0
					: b.statusText === "计划中"
						? 1
						: 2;
			if (orderA !== orderB) return orderA - orderB;
			if (a.priorityNum !== b.priorityNum)
				return a.priorityNum - b.priorityNum;
			const tsA = a.sortTimestamp || Number.MAX_SAFE_INTEGER;
			const tsB = b.sortTimestamp || Number.MAX_SAFE_INTEGER;
			return tsA - tsB;
		}
		if (type === "priority") return a.priorityNum - b.priorityNum;
		if (type === "filename") {
			const cmp = a.fileName
				.toLowerCase()
				.localeCompare(b.fileName.toLowerCase());
			return asc ? cmp : -cmp;
		}
		const dateField = type;
		const dateA = a[dateField]
			? new Date(a[dateField] + "T00:00:00")
			: null;
		const dateB = b[dateField]
			? new Date(b[dateField] + "T00:00:00")
			: null;
		if (!dateA && !dateB) return 0;
		if (!dateA) return 1;
		if (!dateB) return -1;
		return asc ? dateA - dateB : dateB - dateA;
	});
	return copy;
}
