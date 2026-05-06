/**
 * 文件：src/panel/views/base-task-view.js
 * 描述：基础任务视图类 BaseTaskView（继承 ItemView），以及通用任务卡片创建、数据标准化工具函数
 * 所属模块：panel/views
 * 依赖：
 *   - obsidian: ItemView
 *   - configs/plugin-configs: PRIORITY_ICONS, PRIORITY_LABELS, STATUS_ICONS, STATUS_NAMES
 *   - tasks/read/read-tasks: RX（正则表达式集）
 * 对外导出：VIEW_TYPE_INBOX, BaseTaskView, createTaskCard, normalizeTaskCardData, adaptTasksApiTask
 * 注意事项：所有具体任务视图均继承 BaseTaskView；createTaskCard 创建标准任务卡片 DOM；normalizeTaskCardData 统一数据格式
 * @see .cline/skills/code/views/base-task-view.md
 */

/* @skill-sig class BaseTaskView extends ItemView - 任务视图基类，所有具体任务视图均继承此类 */

/* @skill-api
  ItemView (obsidian)
  this.app.plugins.plugins.dataview
  this.app.workspace.getLeaf()
  this.app.vault.getAbstractFileByPath()
  this.contentEl.createEl / empty
  PRIORITY_ICONS, PRIORITY_LABELS, STATUS_ICONS, STATUS_NAMES (plugin-configs)
  RX (read-tasks)
*/

/* @skill-state
  _cleanupFn : function|null        // 视图清理函数（在 onClose 或重新渲染时调用）
  _storageAdapter : StorageAdapter   // 持久化存储适配器
  _instanceId : string               // 视图实例唯一 ID
  无 UI 级内部状态（纯展示视图）
*/

import { ItemView } from "obsidian";
import {
	PRIORITY_ICONS,
	PRIORITY_LABELS,
	STATUS_ICONS,
	STATUS_NAMES,
} from "../../configs/plugin-configs";
import { RX } from "../../tasks/read/read-tasks";

export class BaseTaskView extends ItemView {
	/* @skill-sig constructor(leaf, storageAdapter, instanceId) - 初始化基类视图，保存存储适配器和实例 ID */

	constructor(leaf, storageAdapter, instanceId) {
		super(leaf);
		this._cleanupFn = null;
		this._storageAdapter = storageAdapter;
		this._instanceId = instanceId;
	}
	getViewType() {
		throw new Error("Must override getViewType()");
	}
	getDisplayText() {
		return "Task View";
	}
	getIcon() {
		return "bar-chart-3";
	}

	/* @skill-sig async onOpen() : void - 视图打开时自动调用：初始化 Dataview API 适配器 dv，清空容器，调用 _startCore */

	/* @skill-flow
       onOpen() → 检查 Dataview 插件 → 创建 dv 适配器对象 → this.contentEl.empty() → await this._startCore(dv, this.app, ...)
    */

	/* @skill-condition
       若 Dataview 插件未加载 → 显示提示信息并直接返回
       若已加载 → 创建 dv 适配器（包含 pages / page / el 方法），执行子类 _startCore
    */

	async onOpen() {
		const dvPlugin = this.app.plugins.plugins.dataview;
		if (!dvPlugin || !dvPlugin.api) {
			this.contentEl.createEl("div", {
				text: "⚠️ 请先安装并启用 Dataview 插件。",
			});
			return;
		}
		const dv = {
			pages: (source) => dvPlugin.api.pages(source) || [],
			page: (path) => {
				const cleanPath = path.replace(/\.md$/, "");
				return dvPlugin.api.page(cleanPath) || null;
			},
			el: (tag, textOrOpts, opts) => {
				const el = document.createElement(tag);
				let realOpts = {};
				if (typeof textOrOpts === "string") {
					el.textContent = textOrOpts;
					if (opts && typeof opts === "object") realOpts = opts;
				} else if (textOrOpts && typeof textOrOpts === "object") {
					realOpts = textOrOpts;
				}
				if (realOpts.cls) el.className = realOpts.cls;
				if (realOpts.style) el.style.cssText = realOpts.style;
				if (realOpts.attr) {
					for (const key in realOpts.attr) {
						if (Object.hasOwn(realOpts.attr, key))
							el.setAttribute(key, realOpts.attr[key]);
					}
				}
				return el;
			},
			container: this.contentEl,
		};
		this.contentEl.empty();
		this._cleanupFn = await this._startCore(
			dv,
			this.app,
			this._storageAdapter,
			this._instanceId,
		);
	}

	async onClose() {
		/* 可扩展 */
	}
	async _startCore(dv, app, storageAdapter, instanceId) {
		throw new Error("Must override _startCore");
	}
}

/* @skill-func createTaskCard(task, app) → HTMLLIElement - 创建统一的任务卡片 DOM 元素，含 meta 信息行和点击跳转事件 */

/* @skill-flow
   createTaskCard(task, app) → 解析优先级/状态 → 拼接 meta 行 → 创建 li 元素 → 绑定 click 事件（跳转到任务行） → 返回 li
*/

/* @skill-dom
   li.task-item[data-path][data-line]
     div.task-desc   // 任务描述（加粗）
     div.task-meta   // meta 信息行（状态、优先级、循环、日期、ID、引用、标签、文件名）
*/

export function createTaskCard(task, app) {
	const prio = task.priority || "none";
	const prioIcon = PRIORITY_ICONS[prio] || "";
	const prioLabel = PRIORITY_LABELS[prio] || "None|无";

	let statusIcon = task.statusIcon;
	let statusName = task.statusName || task.statusText;
	if (!statusIcon || !statusName) {
		const statusKey = task.status || "todo";
		statusIcon = STATUS_ICONS[statusKey] || "🔲";
		statusName = STATUS_NAMES[statusKey] || "未开始";
	}

	// 修改后的 meta 顺序：状态、优先级、循环、日期、ID、引用、标签、文件名
	const meta = [
		`<span>${statusIcon} ${statusName}</span>`,
		prioIcon
			? `<span>${prioIcon} ${prioLabel}</span>`
			: `<span>${prioLabel}</span>`,
		task.recurrenceLabel ? `<span>${task.recurrenceLabel}</span>` : "",
		task.scheduled ? `<span>⏳ ${task.scheduled}</span>` : "",
		task.start ? `<span>🛫 ${task.start}</span>` : "",
		task.due ? `<span>📅 ${task.due}</span>` : "",
		task.id ? `<span>🆔 ${task.id}</span>` : "",
		task.forbid ? `<span>⛔ ${task.forbid}</span>` : "",
		task.tags && task.tags.length
			? `<span>🏁 ${task.tags.join(", ")}</span>`
			: "",
		`<span>📄 ${task.fileName}</span>`,
	]
		.filter(Boolean)
		.join("");

	const li = document.createElement("li");
	li.className = "task-item";
	li.setAttribute("data-path", task.path);
	li.setAttribute("data-line", task.lineNumber);
	li.style.cssText =
		"margin:6px 0; padding:8px 10px; background:var(--background-primary); " +
		"border-radius:8px; font-size:0.9em; cursor:pointer; " +
		"border-left:3px solid var(--interactive-accent); display:flex; flex-direction:column; " +
		"color: var(--text-normal);";

	li.innerHTML = `
        <div class="task-desc" style="font-weight:500; margin-bottom:4px;">${task.description}</div>
        <div class="task-meta" style="font-size:0.8em; color:var(--text-muted); display:flex; gap:8px; flex-wrap:wrap;">${meta}</div>
    `;

	li.addEventListener("click", async () => {
		const file = app.vault.getAbstractFileByPath(task.path);
		if (file) {
			const leaf = app.workspace.getLeaf(false);
			await leaf.openFile(file);
			setTimeout(
				() =>
					leaf.view?.editor?.setCursor({
						line: parseInt(task.lineNumber),
						ch: 0,
					}),
				30,
			);
		}
	});

	return li;
}

/* @skill-func normalizeTaskCardData(raw) → object - 将原始任务数据标准化为 createTaskCard 所需的格式 */

/* @skill-flow
   normalizeTaskCardData(raw) → 映射 description/priority/status/recurrenceLabel/scheduled/start/due/tags/id/forbid/fileName/path/lineNumber → 返回标准化对象
*/

export function normalizeTaskCardData(raw) {
	return {
		description: raw.description || "（无描述）",
		priority: raw.priority || "none",
		status: raw.status || mapStatusTextToKey(raw.statusText),
		recurrenceLabel: raw.recurrenceLabel || "",
		scheduled: raw.scheduled || null,
		start: raw.start || null,
		due: raw.due || null,
		tags: raw.tags || [],
		id: raw.id || "",
		forbid: raw.forbid || "",
		fileName:
			raw.fileName ||
			(raw.path ? raw.path.split("/").pop().replace(/\.md$/, "") : ""),
		path: raw.path || "",
		lineNumber: raw.lineNumber != null ? raw.lineNumber : 0,
	};
}

function mapStatusTextToKey(statusText) {
	if (!statusText) return "todo";
	const map = { 未开始: "todo", 计划中: "planned", 进行中: "in-progress" };
	return map[statusText] || "todo";
}

/* @skill-func adaptTasksApiTask(task) → task - 适配 Tasks 插件 API 返回的任务对象，解析自定义字段（id/forbid/tag/repeat/priority） */

/* @skill-flow
   adaptTasksApiTask(task) → 构造 _fullLine → 正则解析 _id / _forbid / _tag / _repeat / _priorityIcon → 合并 tags → 返回 task
*/

export function adaptTasksApiTask(task) {
	if (!task._fullLine) {
		const sym = task.status?.symbol || " ";
		const text = task.description || "";
		task._fullLine = `- [${sym === " " ? " " : sym}] ${text}`;
	}
	const fullLine = task._fullLine;

	const m = (rx, idx) => (fullLine.match(rx) || [])[idx ?? 1] || null;

	task._id = m(RX.id);
	task._forbid = m(RX.forbid) ? m(RX.forbid).replace(/\s/g, "") : "";
	task._tag = m(RX.tag);
	task._repeat = m(RX.repeat);
	task._priorityIcon = (fullLine.match(RX.priority) || [null])[0];

	if (!task.tags) {
		task.tags = task._tag ? [task._tag] : [];
	} else if (task._tag && !task.tags.includes(task._tag)) {
		task.tags.push(task._tag);
	}

	return task;
}
