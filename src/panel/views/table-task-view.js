/**
 * 文件：src/panel/views/table-task-view.js
 * 描述：表格视图，以可配置列的可滚动表格展示所有任务，支持列显示/隐藏切换、点击列排序、点击描述跳转到文件
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 视图基类（用于 TableTaskView 类定义）
 *   - task-query-process.fetchTasks: 统一任务查询接口
 *   - plugin-configs.CONFIG: 状态符号映射、优先级标签等配置常量
 * 对外导出：VIEW_TYPE_TABLE, TableTaskView, startTableTaskView
 * 注意事项：使用虚拟缓存格式化日期（formatDate 含缓存 Map），表头粘性定位 sticky，滚动区域 max-height: 70vh
 * @see .cline/skills/code/views/table-task-view.md
 */

/* <!-- SYNC_COMMENTS_START --> */

/* @skill-sig file src/panel/views/table-task-view.js - 表格视图，以可配置列的可滚动表格展示所有任务，支持列显示/隐藏切换、点击列排序、点击描述跳转到文件 */

/* @skill-state
   tasks   : Array<Object>          // 加载后的任务数据行
   sortCol : string|null            // 当前排序列键名
   sortAsc : boolean                // 排序方向
   colVis  : Object<string,boolean> // 每列可见性
   COLUMNS : Array<{key,label,visible,width}> // 列定义
   formatDate cache : Map           // 日期格式化缓存
*/

/* @skill-api
   BaseTaskView (base-task-view)
   fetchTasks(app)                              // 获取所有任务 (task-query-process)
   CONFIG.STATUS_SYMBOL_MAP / STATUS_ICONS / STATUS_NAMES  // 状态配置 (plugin-configs)
   CONFIG.PRIORITY_ICONS / PRIORITY_LABELS       // 优先级配置 (plugin-configs)
   app.vault.getAbstractFileByPath               // Obsidian 文件 API
   app.workspace.getLeaf                         // Obsidian 编辑器 API
*/

/* @skill-dom
   .table-root
     .table-stats (任务总数)
     .table-controls (列显示复选框)
     .table-scroll > table.task-tbl > thead > th[data-sort] / tbody > tr > td > .task-link
*/

/* @skill-flow
   首次渲染 → render() → loadData() → 默认排序 → 构建 stats/controls/scroll → renderTable() → setupEvents()
   切换列可见 → checkbox change → renderTable()
   点击表头排序 → th click → 切换 sortCol/sortAsc → applySort() → renderTable()
   点击描述跳转 → .task-link click → app.vault.getAbstractFileByPath → 打开文件 → setCursor 跳转到行
*/

/* @skill-condition
   若 fetchTasks 返回空或失败 → 显示 "❌ 未检测到 Tasks 插件" 或 "📑 暂无任务"
   默认排序优先级：状态 → 计划日期 → 优先级
   空值排序统一置底（包括 null/undefined/空字符串）
*/

/* <!-- SYNC_COMMENTS_END --> */
import { CONFIG } from "../../configs/plugin-configs";
import { fetchTasks } from "../../tasks/process/task-query-process";
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_TABLE = "table-task-view";

export class TableTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_TABLE;
	}
	getDisplayText() {
		return "任务表";
	}
	getIcon() {
		return "layout";
	}
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startTableTaskView(dv, app, dv.container);
	}
}

// 表格列定义：列键、显示标签、默认可见性、宽度
const COLUMNS = [
	{ key: "status", label: "状态", visible: true, width: 90 },
	{ key: "description", label: "内容", visible: true, width: 220 },
	{ key: "priority", label: "优先级", visible: true, width: 110 },
	{ key: "recurrence", label: "循环", visible: true, width: 130 },
	{ key: "scheduled", label: "计划", visible: true, width: 125 },
	{ key: "start", label: "开始", visible: true, width: 125 },
	{ key: "due", label: "截止", visible: true, width: 125 },
	{ key: "created", label: "创建", visible: false, width: 125 },
	{ key: "done", label: "完成", visible: false, width: 125 },
	{ key: "cancelled", label: "取消", visible: false, width: 125 },
];

// 状态符号 → 排序权重：空格(未开始)最小，感叹号(已取消)最大
const STATUS_ORDER = { " ": 1, "?": 2, "/": 3, "-": 4, x: 5, X: 5, "!": 6 };

const formatDate = (() => {
	const cache = new Map();
	return (dateObj) => {
		if (!dateObj) return "";
		const key = String(dateObj);
		if (cache.has(key)) return cache.get(key);
		const formatted = window.moment
			? window.moment(dateObj).format("YYYY-MM-DD")
			: new Date(dateObj).toLocaleDateString("en-CA");
		cache.set(key, formatted);
		return formatted;
	};
})();

/**
 * 启动表格视图
 * @param {Object} dv - Dataview 实例
 * @param {Object} app - Obsidian App
 * @param {HTMLElement} container - 容器 DOM
 * @returns {Promise<{cleanup, updateSort}>}
 */
export async function startTableTaskView(dv, app, container) {
	// 注入表格样式（仅首次）
	if (!document.getElementById("task-table-style")) {
		const styleEl = document.createElement("style");
		styleEl.id = "task-table-style";
		styleEl.textContent = `
            .table-root { padding: 8px 0; font-size: 0.9em; color: var(--text-normal); }
            .table-stats { margin-bottom: 12px; font-weight: 600; }
            .table-controls {
                display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;
                padding: 8px; background: var(--background-secondary); border-radius: 8px;
            }
            .table-controls label { display: flex; align-items: center; gap: 4px; font-size: 0.85em; cursor: pointer; user-select: none; }
            .table-scroll {
                overflow: auto !important; max-height: 70vh; border-radius: 8px;
                border: 1px solid var(--background-modifier-border); background: var(--background-primary);
            }
            .task-tbl { width: max-content; min-width: 100%; border-collapse: collapse; table-layout: fixed; }
            .task-tbl th {
                position: sticky; top: 0; z-index: 2; background: var(--background-secondary);
                color: var(--text-accent); font-weight: 600; padding: 10px 12px;
                text-align: left; border-bottom: 2px solid var(--background-modifier-border);
                cursor: pointer; user-select: none; white-space: nowrap;
            }
            .task-tbl th:hover { background: var(--background-modifier-hover); }
            .task-tbl td {
                padding: 8px 12px; border-bottom: 1px solid var(--background-modifier-border);
                vertical-align: top; word-break: break-word; white-space: normal;
            }
            .task-tbl tr:hover td { background: var(--background-modifier-hover); }
            .task-link { color: var(--text-accent); cursor: pointer; text-decoration: none; }
            .task-link:hover { text-decoration: underline; }
        `;
		document.head.appendChild(styleEl);
	}

	let tasks = [];
	let sortCol = null,
		sortAsc = true;
	const colVis = {};
	COLUMNS.forEach((c) => {
		colVis[c.key] = c.visible;
	});

	/**
	 * 将状态符号转为带图标的显示文本
	 * @param {string} symbol - 状态符号（' ', '?', '/', '-', 'x', 'X', '!'）
	 * @returns {string} 带图标的文本
	 */
	function buildStatusText(symbol) {
		const statusKey = CONFIG.STATUS_SYMBOL_MAP[symbol] || "todo";
		const icon = CONFIG.STATUS_ICONS[statusKey] || "🔲";
		const name = CONFIG.STATUS_NAMES[statusKey] || statusKey;
		return `${icon} ${name}`;
	}

	/**
	 * 将优先级转为带图标的显示文本
	 * @param {string} priority - 优先级值
	 * @returns {string} 带图标的文本
	 */
	function buildPriorityText(priority) {
		if (!priority || priority === "none") return "";
		const icon = CONFIG.PRIORITY_ICONS[priority] || "";
		const label = CONFIG.PRIORITY_LABELS[priority] || "";
		return icon ? `${icon} ${label}` : label;
	}

	/**
	 * 加载并转换任务数据
	 * @returns {Promise<Array<Object>>} 扁平化任务行数据（含 _priority/_statusOrder 等排序字段）
	 */
	async function loadData() {
		const raw = await fetchTasks(app);
		if (!raw?.length) return [];

		return raw.map((t) => {
			const sym = t.status.symbol;
			const recurrenceText = t.recurrence
				? "🔁 " + t.recurrence.toText()
				: "";
			return {
				status: buildStatusText(sym),
				description: t.description || "（无描述）",
				priority: buildPriorityText(t.priority),
				recurrence: recurrenceText,
				created: t.createdDate ? "➕ " + formatDate(t.createdDate) : "",
				scheduled: t.scheduledDate
					? "⏳ " + formatDate(t.scheduledDate)
					: "",
				start: t.startDate ? "🛫 " + formatDate(t.startDate) : "",
				due: t.dueDate ? "📅 " + formatDate(t.dueDate) : "",
				done: t.doneDate ? "✅ " + formatDate(t.doneDate) : "",
				cancelled: t.cancelledDate
					? "❌ " + formatDate(t.cancelledDate)
					: "",
				filePath: t.path,
				line: t.lineNumber,
				_priority:
					t.priority === "none" ? 999 : parseInt(t.priority) || 5,
				_created: t.createdDate ? +new Date(t.createdDate) : null,
				_scheduled: t.scheduledDate ? +new Date(t.scheduledDate) : null,
				_start: t.startDate ? +new Date(t.startDate) : null,
				_due: t.dueDate ? +new Date(t.dueDate) : null,
				_done: t.doneDate ? +new Date(t.doneDate) : null,
				_cancelled: t.cancelledDate ? +new Date(t.cancelledDate) : null,
				_statusOrder: STATUS_ORDER[sym] ?? 99,
			};
		});
	}

	/**
	 * 按当前排序列和方向对任务数组排序
	 * 空值/缺失值统一置底
	 */
	function applySort() {
		if (!sortCol) return;
		tasks.sort((a, b) => {
			let va, vb;
			switch (sortCol) {
				case "priority":
					va = a._priority;
					vb = b._priority;
					break;
				case "created":
					va = a._created ?? 0;
					vb = b._created ?? 0;
					break;
				case "scheduled":
					va = a._scheduled ?? 0;
					vb = b._scheduled ?? 0;
					break;
				case "start":
					va = a._start ?? 0;
					vb = b._start ?? 0;
					break;
				case "due":
					va = a._due ?? 0;
					vb = b._due ?? 0;
					break;
				case "done":
					va = a._done ?? 0;
					vb = b._done ?? 0;
					break;
				case "cancelled":
					va = a._cancelled ?? 0;
					vb = b._cancelled ?? 0;
					break;
				case "status":
					va = a._statusOrder;
					vb = b._statusOrder;
					break;
				default:
					va = a[sortCol] || "";
					vb = b[sortCol] || "";
			}
			const [ea, eb] = [
				va === "" || va === null || va === undefined,
				vb === "" || vb === null || vb === undefined,
			];
			if (ea && !eb) return 1;
			if (!ea && eb) return -1;
			if (ea && eb) return 0;
			const cmp =
				typeof va === "string"
					? va.localeCompare(vb, undefined, { numeric: true })
					: va - vb;
			return sortAsc ? cmp : -cmp;
		});
	}

	/**
	 * 渲染表格体（仅替换 .table-scroll 内容）
	 */
	function renderTable() {
		const scrollDiv = container.querySelector(".table-scroll");
		if (!scrollDiv) return;
		scrollDiv.innerHTML = "";

		const visible = COLUMNS.filter((c) => colVis[c.key]);
		const table = document.createElement("table");
		table.className = "task-tbl";

		const thead = document.createElement("thead");
		const hdrRow = document.createElement("tr");
		visible.forEach((c) => {
			const th = document.createElement("th");
			th.dataset.sort = c.key;
			th.style.width = c.width + "px";
			let label = c.label;
			if (sortCol === c.key) label += sortAsc ? " ▲" : " ▼";
			th.textContent = label;
			hdrRow.appendChild(th);
		});
		thead.appendChild(hdrRow);
		table.appendChild(thead);

		const tbody = document.createElement("tbody");
		tasks.forEach((task) => {
			const row = document.createElement("tr");
			visible.forEach((c) => {
				const td = document.createElement("td");
				td.style.width = c.width + "px";
				let val = task[c.key] || "";
				if (c.key === "description" && val) {
					const span = document.createElement("span");
					span.className = "task-link";
					span.dataset.path = task.filePath;
					span.dataset.line = task.line;
					span.textContent = val;
					td.appendChild(span);
				} else {
					td.textContent = val;
				}
				row.appendChild(td);
			});
			tbody.appendChild(row);
		});
		table.appendChild(tbody);
		scrollDiv.appendChild(table);
	}

	/**
	 * 注册事件处理：
	 * - 点击表头 → 切换排序
	 * - 点击描述链接 → 打开文件并跳转到对应行
	 */
	function setupEvents() {
		const scrollDiv = container.querySelector(".table-scroll");
		if (!scrollDiv || scrollDiv._eventsSet) return;
		scrollDiv._eventsSet = true;

		scrollDiv.addEventListener("click", async (e) => {
			const th = e.target.closest("th");
			if (th) {
				const key = th.dataset.sort;
				if (sortCol === key) sortAsc = !sortAsc;
				else {
					sortCol = key;
					sortAsc = true;
				}
				applySort();
				renderTable();
				return;
			}
			const link = e.target.closest(".task-link");
			if (link) {
				const path = link.dataset.path;
				const line = parseInt(link.dataset.line);
				if (!path) return;
				const file = app.vault.getAbstractFileByPath(path);
				if (!file) return;
				const leaf = app.workspace.getLeaf(false);
				await leaf.openFile(file);
				setTimeout(() => {
					leaf.view?.editor?.setCursor({ line, ch: 0 });
				}, 50);
			}
		});
	}

	/**
	 * 主渲染入口：构建完整表格视图容器
	 */
	async function render() {
		container.innerHTML = "";
		container.className = "table-root";

		try {
			tasks = await loadData();
		} catch (e) {
			container.innerHTML =
				'<div class="empty-placeholder">❌ 未检测到 Tasks 插件</div>';
			return;
		}
		if (!tasks.length) {
			container.innerHTML =
				'<div class="empty-placeholder">📑 暂无任务</div>';
			return;
		}

		// 默认排序：状态 → 计划日期 → 优先级
		tasks.sort((a, b) => {
			if (a._statusOrder !== b._statusOrder)
				return a._statusOrder - b._statusOrder;
			if (a._scheduled && b._scheduled)
				return a._scheduled - b._scheduled;
			if (a._scheduled) return -1;
			if (b._scheduled) return 1;
			return a._priority - b._priority;
		});

		const stats = document.createElement("div");
		stats.className = "table-stats";
		stats.textContent = `📁 任务总数: ${tasks.length}`;
		container.appendChild(stats);

		// 列显示控制栏
		const controls = document.createElement("div");
		controls.className = "table-controls";
		COLUMNS.forEach((c) => {
			const lbl = document.createElement("label");
			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = colVis[c.key];
			cb.addEventListener("change", () => {
				colVis[c.key] = cb.checked;
				renderTable();
			});
			lbl.appendChild(cb);
			lbl.append(` ${c.label}`);
			controls.appendChild(lbl);
		});
		container.appendChild(controls);

		const scrollDiv = document.createElement("div");
		scrollDiv.className = "table-scroll";
		container.appendChild(scrollDiv);

		renderTable();
		setupEvents();
	}

	await render();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			render();
		},
	};
}
