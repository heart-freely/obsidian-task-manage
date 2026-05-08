/**
 * 文件：src/panel/views/organize-task-view.js
 * 描述：任务整理箱视图，提供四级模式过滤任务、批量编辑标记/日期/优先级/标签、预览修改并批量写入文件
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 基础视图类
 *   - read-tasks: 读取任务数据
 *   - organize-task-process: 任务整理逻辑（Op 操作、快照、写入）
 * 对外导出：VIEW_TYPE_ORGANIZE, OrganizeTaskView, startOrganizeView
 * 注意事项：内部维护大量 UI 状态，页面较大，支持分页和快照机制
 * @see .cline/skills/code/views/organize-task-view.md
 */

//  <!-- SYNC_COMMENTS_START -->

/* @skill-sig file src/panel/views/organize-task-view.js - 任务整理箱视图，提供四级模式过滤任务、批量编辑标记/日期/优先级/标签、预览修改并批量写入文件 */

/* @skill-state
   State.mode: 当前模式索引（0-3）
   State.statuses: 已选状态数组
   State.includeMarks: 包含标记列表
   State.excludeMarks: 排除标记列表
   State.tagOrderInvalidOnly: 是否仅显示标记顺序异常
   State.sort: { type: string, order: 'asc'|'desc' }
   State.page: 当前页码
   State.selectedIds: 选中任务 ID 集合
   State.previewMap: 预览结果映射
   State.opsState: 待执行操作队列
   State.snapshots: 历史快照
   State.modifiedMap: 已确定修改映射
   globalState: 外部全局缓存（需传入）
*/

/* @skill-api
   BaseTaskView (base-task-view)
   readTasks (read-tasks)
   isIncomplete, isCompleted, hasEssentialTags, Op, loadSnapshots, saveSnapshots, addSnapshot, writeToFiles (organize-task-process)
*/

/* @skill-dom
   .organize-wrap
     .organize-toolbar
       .toolbar-left (模式切换按钮)
       .toolbar-right (页首/页尾按钮)
     .organize-row (状态筛选)
     .organize-row (包含/排除标记筛选)
     .organize-edit (编辑面板: 优先级/循环/日期/标签等)
     .organize-row (操作栏: 清空预览/保存/快照撤回/刷新/重置)
     .organize-row (排序面板 + 仅显示无序)
     .task-list
       li.task-item (复选框 + 原始行 + 预览/已修改标记)
     .organize-row (分页导航)
*/

/* @skill-flow
   getFilteredTasks() → globalState.filterCache.tasks → MODE 过滤 → statuses 过滤 → includeMarks 过滤 → excludeMarks 过滤 → tagOrderInvalidOnly 过滤 → 排序 → 返回
   整页渲染 → render() → buildStatusFilter() → buildMarkFilter() → buildEditPanel() → buildActionBar() → buildSortAndFilter() → paginate() → buildTaskTable()
   toggleOp() → 切换 opsState → paginate() → generatePreviews() → render()
   确定按钮 → 写入 modifiedMap → render()
   保存按钮 → addSnapshot() → writeToFiles() → 清空 modifiedMap → 刷新数据 → render()
   快照撤回 → 从 snapshots 恢复文件行 → 刷新数据 → render()
*/

/* @skill-condition
   若 globalState?.filterCache?.tasks 不存在 → 返回 []
   排序类型: time(默认按日期), missing(缺失标记数), priority(优先级权重), tagOrder(标记顺序正确性)
   空值排序统一置底（包括 null/undefined/空字符串）
*/

/* @skill-const MODES - 四级过滤模式配置：
   [0] 未完成 & 缺失必需标记 → 可编辑 priority/repeat/created/scheduled/starts/due/tag/id/forbid/sort/autoComplete
   [1] 未完成 & 格式完整 → 可编辑 repeat/due/tag/id/forbid/sort
   [2] 已完成 & 缺失必需标记 → 可编辑 priority/repeat/created/scheduled/starts/due/done/cancel/tag/id/forbid/sort/autoComplete
   [3] 已完成 & 格式完整 → 可编辑 repeat/done/cancel/tag/id/forbid/sort
*/

/* @skill-const EDIT_GROUPS - 编辑分组定义，包含键名/标签/子选项类型 */

/* @skill-object State - 全局状态对象，管理视图层的所有可持久化状态 */

/* @skill-func getApp() : app - 获取 app 引用 */
/* @skill-func loadViewState() : void - 从 localStorage 恢复视图状态 */
/* @skill-func saveViewState() : void - 将视图状态持久化到 localStorage */
/* @skill-func getFilteredTasks() : Task[] - 根据当前 State 筛选和排序任务列表 */
/* @skill-func paginate() : { tasks, paginated } - 对筛选结果分页，重置选中和预览 */
/* @skill-func generatePreviews(paginated) : void - 基于当前 opsState 生成选中任务的预览文本 */
/* @skill-func render() : void - 渲染完整的整理箱 UI */
/* @skill-func buildStatusFilter(root) : void - 构建状态筛选按钮行 */
/* @skill-func buildMarkFilter(root) : void - 构建包含/排除标记筛选行 */
/* @skill-func buildEditPanel(root) : void - 构建编辑操作面板（优先级/循环/日期/标签等） */
/* @skill-func buildActionBar(root) : void - 构建操作栏（清空/保存/快照撤回/刷新/重置） */
/* @skill-func buildSortAndFilter(root) : void - 构建排序面板（时间/缺失标记/优先级/标记顺序 + 仅显示无序） */
/* @skill-func buildTaskTable(root, allTasks, paginated) : void - 构建任务表格（全选/任务行/分页） */
/* @skill-func toggleOp(key, op, val) : void - 切换编辑操作（添加/移除操作到 opsState） */
/* @skill-func async startOrganizeView(dvParam, appParam, panelContainer, gState) : { cleanup, updateSort } - 启动任务整理箱视图，返回控制器 */

//  <!-- SYNC_COMMENTS_END -->

import {
	addSnapshot,
	hasEssentialTags,
	isCompleted,
	isIncomplete,
	loadSnapshots,
	Op,
	saveSnapshots,
	writeToFiles,
} from "../../tasks/process/organize-task-process";
import * as readTasks from "../../tasks/read/read-tasks";
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_ORGANIZE = "organize-task-view";

export class OrganizeTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_ORGANIZE;
	}
	getDisplayText() {
		return "任务整理箱";
	}
	getIcon() {
		return "edit";
	}

	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startOrganizeView(dv, app, dv.container, undefined);
	}
}

// ---------- 模块级变量 ----------
let app, dv, globalState, container;

function getApp() {
	return app;
}

const PAGE_SIZE = 50;
const AUTOCOMPLETE_DAYS = 3;
const STORAGE_KEY_STATE = "organizeViewState";

const MODES = [
	{
		label: "未完成 & 缺失必需标记",
		filter: (t) => isIncomplete(t._status) && !hasEssentialTags(t),
		defaultStatuses: ["todo", "planned"],
		allowedStatuses: ["todo", "planned"],
		editKeys: [
			"priority",
			"repeat",
			"created",
			"scheduled",
			"starts",
			"due",
			"tag",
			"id",
			"forbid",
			"sort",
			"autoComplete",
		],
	},
	{
		label: "未完成 & 格式完整",
		filter: (t) => isIncomplete(t._status) && hasEssentialTags(t),
		defaultStatuses: ["todo", "planned"],
		allowedStatuses: ["todo", "planned"],
		editKeys: ["repeat", "due", "tag", "id", "forbid", "sort"],
	},
	{
		label: "已完成 & 缺失必需标记",
		filter: (t) => isCompleted(t._status) && !hasEssentialTags(t),
		defaultStatuses: ["in-progress", "completed", "cancelled"],
		allowedStatuses: ["in-progress", "completed", "cancelled"],
		editKeys: [
			"priority",
			"repeat",
			"created",
			"scheduled",
			"starts",
			"due",
			"done",
			"cancel",
			"tag",
			"id",
			"forbid",
			"sort",
			"autoComplete",
		],
	},
	{
		label: "已完成 & 格式完整",
		filter: (t) => isCompleted(t._status) && hasEssentialTags(t),
		defaultStatuses: ["in-progress", "completed", "cancelled"],
		allowedStatuses: ["in-progress", "completed", "cancelled"],
		editKeys: ["repeat", "done", "cancel", "tag", "id", "forbid", "sort"],
	},
];

const EDIT_GROUPS = [
	{
		key: "priority",
		label: "优先级 🔺",
		hasSub: true,
		subOptions: ["⏬", "🔽", "🔼", "⏫", "🔺"],
	},
	{
		key: "repeat",
		label: "循环 🔁",
		hasSub: true,
		subOptions: ["every day", "every week", "every month", "every year"],
		allowCustom: true,
	},
	{ key: "created", label: "创建 ➕", subType: "date" },
	{ key: "scheduled", label: "计划 ⏳", subType: "date" },
	{ key: "starts", label: "开始 🛫", subType: "date" },
	{ key: "due", label: "截止 📅", subType: "date" },
	{ key: "done", label: "完成 ✅", subType: "date" },
	{ key: "cancel", label: "取消 ❌", subType: "date" },
	{
		key: "tag",
		label: "标签 🏁",
		hasSub: true,
		subOptions: ["keep", "delete"],
		allowCustom: true,
	},
	{ key: "id", label: "唯一ID 🆔" },
	{ key: "forbid", label: "引用ID ⛔" },
	{ key: "sort", label: "自动排序" },
	{ key: "autoComplete", label: "补全时间", subType: "days" },
];

const State = {
	mode: 0,
	statuses: MODES[0].defaultStatuses.slice(),
	includeMarks: [],
	excludeMarks: [],
	tagOrderInvalidOnly: false,
	sort: { type: "time", order: "desc" },
	page: 1,
	selectedIds: {},
	previewMap: {},
	opsState: {},
	snapshots: [],
	modifiedMap: {},
};

function loadViewState() {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_STATE));
		if (saved) {
			State.mode = saved.mode ?? 0;
			State.statuses =
				saved.statuses ?? MODES[State.mode].defaultStatuses.slice();
			State.includeMarks = saved.includeMarks ?? [];
			State.excludeMarks = saved.excludeMarks ?? [];
			State.tagOrderInvalidOnly = saved.tagOrderInvalidOnly ?? false;
			State.sort = saved.sort ?? { type: "time", order: "desc" };
			State.page = saved.page ?? 1;
		}
	} catch (e) {}
}

function saveViewState() {
	try {
		localStorage.setItem(
			STORAGE_KEY_STATE,
			JSON.stringify({
				mode: State.mode,
				statuses: State.statuses,
				includeMarks: State.includeMarks,
				excludeMarks: State.excludeMarks,
				tagOrderInvalidOnly: State.tagOrderInvalidOnly,
				sort: State.sort,
				page: State.page,
			}),
		);
	} catch (e) {}
}

function getFilteredTasks() {
	if (
		!globalState ||
		!globalState.filterCache ||
		!globalState.filterCache.tasks
	)
		return [];
	let tasks = globalState.filterCache.tasks.slice();
	tasks = tasks.filter(MODES[State.mode].filter);
	if (State.statuses.length < MODES[State.mode].allowedStatuses.length) {
		tasks = tasks.filter((t) => State.statuses.includes(t._status));
	}
	if (State.includeMarks.length)
		tasks = tasks.filter((t) =>
			State.includeMarks.every((mk) =>
				t._fullLine.match(readTasks.RX[mk]),
			),
		);
	if (State.excludeMarks.length)
		tasks = tasks.filter(
			(t) =>
				!State.excludeMarks.some((mk) =>
					t._fullLine.match(readTasks.RX[mk]),
				),
		);
	if (State.tagOrderInvalidOnly)
		tasks = tasks.filter((t) => t._fullLine !== Op.sortTags(t._fullLine));

	const { type, order } = State.sort;
	const ord = order === "asc" ? 1 : -1;
	tasks.sort((a, b) => {
		if (type === "missing") {
			const ma =
				!a._priorityIcon +
				!a._created +
				!a._scheduled +
				!a._starts +
				!a._due;
			const mb =
				!b._priorityIcon +
				!b._created +
				!b._scheduled +
				!b._starts +
				!b._due;
			return ord * (ma - mb);
		}
		if (type === "priority") {
			const wa = a._priorityIcon
				? { "🔺": 5, "⏫": 4, "🔼": 3, "🔽": 2, "⏬": 1 }[
						a._priorityIcon
					] || 0
				: 0;
			const wb = b._priorityIcon
				? { "🔺": 5, "⏫": 4, "🔼": 3, "🔽": 2, "⏬": 1 }[
						b._priorityIcon
					] || 0
				: 0;
			return ord * (wa - wb);
		}
		if (type === "tagOrder") {
			const va = a._fullLine === Op.sortTags(a._fullLine) ? 1 : 0;
			const vb = b._fullLine === Op.sortTags(b._fullLine) ? 1 : 0;
			return ord * (va - vb);
		}
		const da = a._scheduled || a._due,
			db = b._scheduled || b._due;
		if (da && db) return ord * (new Date(da) - new Date(db));
		return da ? -1 : 1;
	});
	return tasks;
}

function paginate() {
	const tasks = getFilteredTasks();
	const start = (State.page - 1) * PAGE_SIZE;
	const paginated = tasks.slice(start, start + PAGE_SIZE);
	State.selectedIds = {};
	State.previewMap = {};
	for (const t of paginated) {
		if (!State.modifiedMap[t.id]) State.selectedIds[t.id] = true;
	}
	generatePreviews(paginated);
	return { tasks, paginated };
}

function generatePreviews(paginated) {
	const ops = Object.values(State.opsState).sort(
		(a, b) => (a.order || 0) - (b.order || 0),
	);
	for (const t of paginated) {
		if (State.selectedIds[t.id] && !State.modifiedMap[t.id]) {
			let line = t._fullLine;
			for (const op of ops) line = op.handler(line, op.param);
			State.previewMap[t.id] = line;
		}
	}
}

function render() {
	container.innerHTML = "";
	const style = document.createElement("style");
	style.textContent = `
        .organize-wrap { padding: 8px 0; }
        .organize-toolbar { margin-bottom: 8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content: space-between; }
        .organize-toolbar .toolbar-left { display:flex; gap:8px; flex-wrap:wrap; }
        .organize-toolbar .toolbar-right { display:flex; gap:4px; }
        .organize-toolbar button { padding:4px 12px; border:none; border-radius:16px; background:var(--interactive-normal); color:var(--text-normal); cursor:pointer; font-size:0.9em; }
        .organize-toolbar button.active { background:var(--interactive-accent); color:white; font-weight:bold; }
        .organize-edit { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
        .organize-row { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
        .organize-btn { padding:2px 8px; border-radius:12px; border:none; cursor:pointer; font-size:12px; }
        .organize-btn.active { background:var(--interactive-accent); color:white; }
        .task-list { list-style:none; padding:0; }
        .task-item {
            margin:6px 0; padding:8px 10px; background:var(--background-primary);
            border-radius:8px; font-size:0.9em; cursor:pointer;
            border-left:3px solid var(--interactive-accent);
            display:flex; flex-direction:column;
        }
    `;
	container.appendChild(style);

	const root = document.createElement("div");
	root.className = "organize-wrap";

	const toolbar = document.createElement("div");
	toolbar.className = "organize-toolbar";
	const leftDiv = document.createElement("div");
	leftDiv.className = "toolbar-left";
	MODES.forEach((m, i) => {
		const btn = document.createElement("button");
		btn.textContent = m.label;
		btn.className = "organize-btn" + (State.mode === i ? " active" : "");
		btn.addEventListener("click", () => {
			State.mode = i;
			State.statuses = m.defaultStatuses.slice();
			State.includeMarks = [];
			State.excludeMarks = [];
			State.opsState = {};
			saveViewState();
			render();
		});
		leftDiv.appendChild(btn);
	});
	toolbar.appendChild(leftDiv);
	const rightDiv = document.createElement("div");
	rightDiv.className = "toolbar-right";
	const toTopBtn = document.createElement("button");
	toTopBtn.textContent = "⏫ 页首";
	toTopBtn.addEventListener("click", () =>
		container.scrollIntoView({ behavior: "smooth", block: "start" }),
	);
	const toBottomBtn = document.createElement("button");
	toBottomBtn.textContent = "⏬ 页尾";
	toBottomBtn.addEventListener("click", () =>
		container.scrollIntoView({ behavior: "smooth", block: "end" }),
	);
	rightDiv.appendChild(toTopBtn);
	rightDiv.appendChild(toBottomBtn);
	toolbar.appendChild(rightDiv);
	root.appendChild(toolbar);

	buildStatusFilter(root);
	buildMarkFilter(root);
	buildEditPanel(root);
	buildActionBar(root);
	buildSortAndFilter(root);
	const { tasks: allTasks, paginated } = paginate();
	buildTaskTable(root, allTasks, paginated);

	container.appendChild(root);
}

function buildStatusFilter(root) {
	const mode = MODES[State.mode];
	const row = document.createElement("div");
	row.className = "organize-row";
	row.appendChild(
		Object.assign(document.createElement("span"), {
			textContent: "状态",
			style: "font-weight:bold;min-width:90px;",
		}),
	);
	mode.allowedStatuses.forEach((st) => {
		const active = State.statuses.includes(st);
		const btn = document.createElement("button");
		btn.textContent = readTasks.RX[st] || st;
		btn.className = "organize-btn" + (active ? " active" : "");
		btn.addEventListener("click", () => {
			if (active) State.statuses.splice(State.statuses.indexOf(st), 1);
			else State.statuses.push(st);
			saveViewState();
			render();
		});
		row.appendChild(btn);
	});
	root.appendChild(row);
}

function buildMarkFilter(root) {
	const mode = MODES[State.mode];
	const incRow = document.createElement("div");
	incRow.className = "organize-row";
	incRow.appendChild(
		Object.assign(document.createElement("span"), {
			textContent: "包含标记",
			style: "font-weight:bold;min-width:90px;",
		}),
	);
	const excRow = document.createElement("div");
	excRow.className = "organize-row";
	excRow.appendChild(
		Object.assign(document.createElement("span"), {
			textContent: "排除标记",
			style: "font-weight:bold;min-width:90px;",
		}),
	);
	(mode.visibleMarks || []).forEach((mk) => {
		const isInc = State.includeMarks.includes(mk);
		const isExc = State.excludeMarks.includes(mk);
		const btnInc = document.createElement("button");
		btnInc.textContent = mk;
		btnInc.className = "organize-btn" + (isInc ? " active" : "");
		btnInc.addEventListener("click", () => {
			if (isInc)
				State.includeMarks.splice(State.includeMarks.indexOf(mk), 1);
			else {
				State.includeMarks.push(mk);
				if (State.excludeMarks.includes(mk))
					State.excludeMarks.splice(
						State.excludeMarks.indexOf(mk),
						1,
					);
			}
			saveViewState();
			render();
		});
		incRow.appendChild(btnInc);
		const btnExc = document.createElement("button");
		btnExc.textContent = mk;
		btnExc.className = "organize-btn" + (isExc ? " active" : "");
		btnExc.addEventListener("click", () => {
			if (isExc)
				State.excludeMarks.splice(State.excludeMarks.indexOf(mk), 1);
			else {
				State.excludeMarks.push(mk);
				if (State.includeMarks.includes(mk))
					State.includeMarks.splice(
						State.includeMarks.indexOf(mk),
						1,
					);
			}
			saveViewState();
			render();
		});
		excRow.appendChild(btnExc);
	});
	root.appendChild(incRow);
	root.appendChild(excRow);
}

function buildEditPanel(root) {
	const editPanel = document.createElement("div");
	editPanel.className = "organize-edit";
	const keys = MODES[State.mode].editKeys;
	EDIT_GROUPS.forEach((group) => {
		if (!keys.includes(group.key)) return;
		const wrap = document.createElement("div");
		const row = document.createElement("div");
		row.className = "organize-row";
		row.appendChild(
			Object.assign(document.createElement("span"), {
				textContent: group.label,
				style: "font-weight:bold;min-width:90px;",
			}),
		);

		if (
			[
				"priority",
				"repeat",
				"created",
				"scheduled",
				"starts",
				"due",
				"done",
				"cancel",
				"tag",
				"id",
				"forbid",
			].includes(group.key)
		) {
			const delBtn = document.createElement("button");
			delBtn.textContent = "删除";
			delBtn.className = "organize-btn";
			delBtn.addEventListener("click", () => toggleOp(group.key, "del"));
			row.appendChild(delBtn);
		}

		if (group.hasSub) {
			group.subOptions.forEach((opt) => {
				const optBtn = document.createElement("button");
				optBtn.textContent =
					(group.key === "repeat" ? "🔁 every " : "") + opt;
				optBtn.className = "organize-btn";
				optBtn.addEventListener("click", () =>
					toggleOp(group.key, "set", opt),
				);
				row.appendChild(optBtn);
			});
			if (group.allowCustom) {
				const input = document.createElement("input");
				input.type = "text";
				input.placeholder = "自定义";
				input.style.width = "80px";
				const apply = document.createElement("button");
				apply.textContent = "应用";
				apply.className = "organize-btn";
				apply.addEventListener("click", () => {
					const v = input.value.trim();
					if (v) toggleOp(group.key, "set", v);
				});
				row.appendChild(input);
				row.appendChild(apply);
			}
		} else if (group.subType === "date") {
			const dateInp = document.createElement("input");
			dateInp.type = "date";
			dateInp.value = window.moment().format("YYYY-MM-DD");
			dateInp.style.cssText = "width:130px;";
			const setBtn = document.createElement("button");
			setBtn.textContent = "应用";
			setBtn.className = "organize-btn";
			setBtn.addEventListener("click", () =>
				toggleOp(group.key, "set", dateInp.value),
			);
			row.appendChild(dateInp);
			row.appendChild(setBtn);
		} else if (group.key === "sort") {
			const setBtn = document.createElement("button");
			setBtn.textContent = "排序";
			setBtn.className = "organize-btn";
			setBtn.addEventListener("click", () => toggleOp(group.key, "set"));
			row.appendChild(setBtn);
		} else if (group.key === "autoComplete") {
			const daysInp = document.createElement("input");
			daysInp.type = "number";
			daysInp.value = String(AUTOCOMPLETE_DAYS);
			daysInp.style.width = "60px";
			const setBtn = document.createElement("button");
			setBtn.textContent = "应用";
			setBtn.className = "organize-btn";
			setBtn.addEventListener("click", () =>
				toggleOp(group.key, "set", daysInp.value),
			);
			row.appendChild(daysInp);
			row.appendChild(setBtn);
		}
		wrap.appendChild(row);
		editPanel.appendChild(wrap);
	});
	root.appendChild(editPanel);
}

function buildActionBar(root) {
	const actionBar = document.createElement("div");
	actionBar.className = "organize-row";

	const clearBtn = document.createElement("button");
	clearBtn.textContent = "🧹 清空预览";
	clearBtn.className = "organize-btn";
	clearBtn.addEventListener("click", () => {
		State.opsState = {};
		render();
	});
	actionBar.appendChild(clearBtn);

	const saveBtn = document.createElement("button");
	saveBtn.textContent = "💾 保存所有修改";
	saveBtn.className = "organize-btn";
	saveBtn.addEventListener("click", async () => {
		const ids = Object.keys(State.modifiedMap);
		if (!ids.length) return new Notice("没有已确定的修改");
		if (confirm(`确定将 ${ids.length} 个修改写入文件？`)) {
			addSnapshot(State.snapshots, { ...State.modifiedMap });
			const cnt = await writeToFiles(
				app,
				globalState.filterCache.tasks,
				ids,
				State.modifiedMap,
			);
			new Notice(`✅ 已保存 ${cnt} 个任务`);
			State.modifiedMap = {};
			globalState.cachedAllTasks = null;
			globalState.filterCache = { fingerprint: "", tasks: null };
			render();
		}
	});
	actionBar.appendChild(saveBtn);

	const snapSelect = document.createElement("select");
	snapSelect.style.marginLeft = "8px";
	if (State.snapshots.length) {
		State.snapshots.forEach((s, i) => {
			const opt = document.createElement("option");
			opt.textContent =
				s.time + " (" + Object.keys(s.snapshot).length + "个)";
			opt.value = i;
			snapSelect.appendChild(opt);
		});
	} else {
		const opt = document.createElement("option");
		opt.textContent = "无快照";
		opt.disabled = true;
		snapSelect.appendChild(opt);
	}
	const revertBtn = document.createElement("button");
	revertBtn.textContent = "↩️ 快照撤回";
	revertBtn.className = "organize-btn";
	revertBtn.addEventListener("click", async () => {
		if (!State.snapshots.length) return;
		const idx = snapSelect.value;
		const snap = State.snapshots[idx];
		if (confirm(`撤回快照 [${snap.time}] 吗？`)) {
			const groups = {};
			for (const [id, line] of Object.entries(snap.snapshot)) {
				const task = globalState.filterCache.tasks.find(
					(t) => t.path + "|" + t.line === id,
				);
				if (task) {
					if (!groups[task.path]) groups[task.path] = [];
					groups[task.path].push({ line: task.line, newLine: line });
				}
			}
			let cnt = 0;
			for (const [path, items] of Object.entries(groups)) {
				const file = getApp().vault.getAbstractFileByPath(path);
				if (!file) continue;
				await getApp().vault.process(file, (data) => {
					const dataLines = data.split("\n");
					for (const item of items)
						if (item.line < dataLines.length)
							dataLines[item.line] = item.newLine;
					return dataLines.join("\n");
				});
				cnt += items.length;
			}
			new Notice(`✅ 撤回成功，恢复 ${cnt} 个任务`);
			State.snapshots.splice(idx, 1);
			saveSnapshots(State.snapshots);
			globalState.cachedAllTasks = null;
			globalState.filterCache = { fingerprint: "", tasks: null };
			render();
		}
	});
	actionBar.appendChild(snapSelect);
	actionBar.appendChild(revertBtn);

	const refreshBtn = document.createElement("button");
	refreshBtn.textContent = "🔄 刷新数据";
	refreshBtn.className = "organize-btn";
	refreshBtn.addEventListener("click", () => {
		globalState.cachedAllTasks = null;
		globalState.filterCache = { fingerprint: "", tasks: null };
		readTasks.getAllTasks(true, dv, globalState);
		render();
		new Notice("数据已刷新");
	});
	actionBar.appendChild(refreshBtn);

	const resetViewBtn = document.createElement("button");
	resetViewBtn.textContent = "🔄 重置视图";
	resetViewBtn.className = "organize-btn";
	resetViewBtn.addEventListener("click", () => {
		localStorage.removeItem(STORAGE_KEY_STATE);
		State.mode = 0;
		State.statuses = MODES[0].defaultStatuses.slice();
		State.includeMarks = [];
		State.excludeMarks = [];
		State.tagOrderInvalidOnly = false;
		State.sort = { type: "time", order: "desc" };
		State.page = 1;
		State.selectedIds = {};
		State.previewMap = {};
		State.opsState = {};
		State.modifiedMap = {};
		globalState.cachedAllTasks = null;
		globalState.filterCache = { fingerprint: "", tasks: null };
		readTasks.getAllTasks(true, dv, globalState);
		render();
		new Notice("视图已重置");
	});
	actionBar.appendChild(resetViewBtn);

	root.appendChild(actionBar);
}

function buildSortAndFilter(root) {
	const row = document.createElement("div");
	row.className = "organize-row";
	row.appendChild(
		Object.assign(document.createElement("span"), {
			textContent: "排序",
			style: "font-weight:bold;min-width:90px;",
		}),
	);
	const sorts = [
		{ value: "time", label: "时间" },
		{ value: "missing", label: "缺失标记" },
		{ value: "priority", label: "优先级" },
		{ value: "tagOrder", label: "标记顺序" },
	];
	sorts.forEach(({ value, label }) => {
		const btn = document.createElement("button");
		btn.textContent = label;
		btn.className =
			"organize-btn" + (State.sort.type === value ? " active" : "");
		btn.addEventListener("click", () => {
			if (State.sort.type === value)
				State.sort.order = State.sort.order === "asc" ? "desc" : "asc";
			else {
				State.sort.type = value;
				State.sort.order = value === "missing" ? "asc" : "desc";
			}
			render();
		});
		row.appendChild(btn);
	});
	const invalidBtn = document.createElement("button");
	invalidBtn.textContent = "🔀 仅显示无序";
	invalidBtn.className =
		"organize-btn" + (State.tagOrderInvalidOnly ? " active" : "");
	invalidBtn.addEventListener("click", () => {
		State.tagOrderInvalidOnly = !State.tagOrderInvalidOnly;
		render();
	});
	row.appendChild(invalidBtn);
	root.appendChild(row);
}

function buildTaskTable(root, allTasks, paginated) {
	const listContainer = document.createElement("div");
	if (!paginated.length) {
		const empty = document.createElement("div");
		empty.style.cssText = "padding:20px;text-align:center;";
		empty.textContent = "✨ 没有匹配的任务";
		listContainer.appendChild(empty);
	} else {
		const ctrl = document.createElement("div");
		ctrl.className = "organize-row";
		const toggleBtn = document.createElement("button");
		toggleBtn.textContent = "全选/全不选";
		toggleBtn.className = "organize-btn";
		toggleBtn.addEventListener("click", () => {
			const allSel = paginated.every((t) => State.selectedIds[t.id]);
			paginated.forEach((t) => {
				if (!State.modifiedMap[t.id]) {
					State.selectedIds[t.id] = !allSel;
				}
			});
			generatePreviews(paginated);
			render();
		});
		ctrl.appendChild(toggleBtn);
		listContainer.appendChild(ctrl);

		const ul = document.createElement("ul");
		ul.className = "task-list";
		paginated.forEach((t) => {
			const li = document.createElement("li");
			li.className = "task-item";
			const firstRow = document.createElement("div");
			firstRow.style.cssText =
				"display:flex; align-items:center; gap:6px; margin-bottom:4px;";
			const chk = document.createElement("input");
			chk.type = "checkbox";
			chk.checked = !!State.selectedIds[t.id];
			chk.disabled = !!State.modifiedMap[t.id];
			chk.addEventListener("change", (e) => {
				if (e.target.checked) {
					State.selectedIds[t.id] = true;
				} else {
					delete State.selectedIds[t.id];
				}
				generatePreviews(paginated);
				render();
			});
			firstRow.appendChild(chk);
			const textSpan = document.createElement("span");
			textSpan.textContent = t._fullLine
				? t._fullLine.substring(0, 200)
				: "";
			textSpan.style.cssText =
				"cursor:pointer; word-break:break-word; flex:1;";
			textSpan.addEventListener("click", () => {
				const file = getApp().vault.getAbstractFileByPath(t.path);
				if (file) {
					const leaf = getApp().workspace.getLeaf(false);
					leaf.openFile(file).then(() =>
						setTimeout(
							() =>
								leaf.view?.editor?.setCursor({
									line: t.line,
									ch: 0,
								}),
							50,
						),
					);
				}
			});
			firstRow.appendChild(textSpan);
			li.appendChild(firstRow);

			const preview = State.previewMap[t.id];
			const modified = State.modifiedMap[t.id];
			if (
				!modified &&
				State.selectedIds[t.id] &&
				preview &&
				preview !== t._fullLine
			) {
				const prevDiv = document.createElement("div");
				prevDiv.style.cssText =
					"color:var(--text-muted); margin-top:4px; font-size:0.85em;";
				prevDiv.textContent = "📝 预览: " + preview.substring(0, 200);
				li.appendChild(prevDiv);
				const applyBtn = document.createElement("button");
				applyBtn.textContent = "确定";
				applyBtn.className = "organize-btn";
				applyBtn.addEventListener("click", () => {
					State.modifiedMap[t.id] = preview;
					delete State.selectedIds[t.id];
					render();
				});
				li.appendChild(applyBtn);
			} else if (modified) {
				const modDiv = document.createElement("div");
				modDiv.style.cssText =
					"color:var(--text-muted); margin-top:4px; font-size:0.85em;";
				modDiv.textContent = "📝 已修改: " + modified.substring(0, 200);
				li.appendChild(modDiv);
				const revertBtn = document.createElement("button");
				revertBtn.textContent = "撤回";
				revertBtn.className = "organize-btn";
				revertBtn.addEventListener("click", () => {
					delete State.modifiedMap[t.id];
					State.selectedIds[t.id] = true;
					render();
				});
				li.appendChild(revertBtn);
			}
			ul.appendChild(li);
		});
		listContainer.appendChild(ul);

		const totalPages = Math.ceil(allTasks.length / PAGE_SIZE);
		if (totalPages > 1) {
			const pageRow = document.createElement("div");
			pageRow.style.cssText =
				"display:flex;gap:4px;justify-content:center;margin-top:8px;";
			for (let p = 1; p <= totalPages; p++) {
				const btn = document.createElement("button");
				btn.textContent = "" + p;
				btn.className =
					"organize-btn" + (State.page === p ? " active" : "");
				btn.addEventListener("click", () => {
					State.page = p;
					render();
				});
				pageRow.appendChild(btn);
			}
			listContainer.appendChild(pageRow);
		}
	}
	root.appendChild(listContainer);
}

function toggleOp(key, op, val) {
	Object.keys(State.opsState).forEach((k) => {
		if (k.startsWith(key + "_")) delete State.opsState[k];
	});
	if (op === "del") {
		const h = Op["del" + key.charAt(0).toUpperCase() + key.slice(1)];
		if (h)
			State.opsState[key + "_del"] = {
				handler: h,
				order: EDIT_GROUPS.findIndex((g) => g.key === key),
			};
	} else {
		const group = EDIT_GROUPS.find((g) => g.key === key);
		let param, handler;
		if (group.subType === "date")
			param = val || window.moment().format("YYYY-MM-DD");
		else if (group.subType === "days") param = val || AUTOCOMPLETE_DAYS;
		else param = val;
		handler = Op["set" + key.charAt(0).toUpperCase() + key.slice(1)];
		if (!handler && key === "sort") handler = Op.sortTags;
		if (!handler && key === "autoComplete") handler = Op.autoComplete;
		if (handler)
			State.opsState[key + "_set"] = {
				handler,
				param,
				order: EDIT_GROUPS.indexOf(group),
			};
	}
	const { paginated } = paginate();
	generatePreviews(paginated);
	render();
}

// ---------- 入口 ----------

export async function startOrganizeView(
	dvParam,
	appParam,
	panelContainer,
	gState,
) {
	app = appParam;
	dv = dvParam;
	container = panelContainer;
	globalState = gState;
	loadViewState();
	State.snapshots = loadSnapshots();
	render();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			render();
		},
	};
}
