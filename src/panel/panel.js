/* <!-- SYNC_COMMENTS_START --> */
/**
 * 文件：src/panel/panel.js
 * 描述：导航中心视图（NavigatorView），提供任务管理的中心面板，包含侧边栏视图切换器、粘性头部（快捷日期/控制按钮/排序）、过滤区和主内容区
 * 所属模块：panel
 * 依赖：
 *   - obsidian: Notice
 *   - configs/plugin-configs: CONFIG
 *   - storage/persist-storage: createInitialState, getEffectiveDateRange, getFilterFingerprint, PersistenceManager
 *   - tasks/read/read-tasks: getAllTasks
 *   - tasks/process/*: filterTasks, fetchFutureTasks, fetchOverdueTasks, fetchTasks 等
 *   - panel/bars/*: 控制按钮栏、日期栏、隐藏按钮栏、标记过滤栏、快捷日期栏、视图切换器、排序栏
 *   - panel/components/tree-view-components: TaskTreeRenderer
 *   - panel/interacts/tooltip-interact: TooltipManager
 *   - panel/views/*: base-list-view, base-task-view, data-tasks-view, kanban-task-view, matrix-task-view
 * 对外导出：VIEW_TYPE_NAVIGATOR, NavigatorView, startNavigatorCore
 * 注意事项：所有子视图（重要/循环/今天/未来/逾期/依赖/标签/收集箱/整理箱/时间线/表格/树/日历/甘特图/番茄钟/矩阵/看板）均通过 activateSubView 动态加载；树面板（treePanel）和内容面板（viewPanel）为双面板布局；状态通过 PersistenceManager 持久化, tools to extend
 * @see .cline/skills/code/views/views.md
 */

/* @skill-state 运行时状态由 createInitialState() 创建并存储为局部变量 state（在 startNavigatorCore 内部），NavigatorView 实例则管理子视图类型 _lastViewType 的持久化 */
/* @skill-global-state
state = {
  dateFilterState: { start, end, isAll },
  markFilterState: { statuses, includeMarks, excludeMarks },
  hideRepeatTasks: boolean,
  hideCompletedTasks: boolean,
  hideCancelledTasks: boolean,
  hideFolders: boolean,
  showTree: boolean,
  showFilters: boolean,
  filterRootPath: string|null,
  leftSort: { type, order },
  activeQuickBtn: DOMElement|null,
  quickBtns: DOMElement[],
  dateCascadeEls: Object,
  chartInstances: Object[],
  filterCache: { fingerprint, tasks },
  collapsedNodes: Object,
  dataViewStatuses: string[],
}
NavigatorView._lastViewType: string  // 持久化的子视图类型
*/
/* @skill-sig file src/panel/panel.js - 导航中心视图，任务管理面板入口，管理子视图切换/过滤/布局/持久化
   NavigatorView - Obsidian ItemView 子类，注册视图类型 + 生命周期
   startNavigatorCore - 核心启动函数，创建布局/状态/持久化/头部/侧边栏，激活子视图
*/
/* @skill-class
   NavigatorView (extends BaseTaskView) - Obsidian 自定义视图，管理子视图类型持久化
   startNavigatorCore() - 导航核心，创建布局、初始化状态、构建头部、激活子视图
   buildHeader() - 构建粘性头部（快捷日期/控制按钮/排序/过滤区）
   refreshCurrentView() - 刷新当前子视图（过滤→树面板→内容面板→持久化）
   applyNavFilters() : Task[] - 应用导航层过滤（带指纹缓存）
   renderContent(filteredTasks) - 渲染非自渲染视图的内容面板
   activateSubView(viewType, force) - 激活指定子视图
   TaskTreeRenderer - 树面板渲染器
   tooltipManager - 工具提示管理器单例
   persistence - 持久化管理器
*/
/* @skill-api
   导入方:
     main.js 或其他入口: import { VIEW_TYPE_NAVIGATOR, NavigatorView, startNavigatorCore } from "./panel/panel"
   导入:
     obsidian: Notice
     configs/plugin-configs: CONFIG
     storages/persist-storages: createInitialState, getEffectiveDateRange, getFilterFingerprint, PersistenceManager
     tasks/read/read-tasks: getAllTasks
     tasks/process/*: filterTasks, fetchFutureTasks, fetchOverdueTasks, fetchTasks
     panel/bars/*: buildControlPanel, buildDateCascadePanel, buildHideButtons, buildMarkFilterPanel, buildQuickDatePanel, buildViewSwitcher, buildSortRow
     panel/components/tree-view-components: TaskTreeRenderer
     panel/interacts/tooltip-interact: TooltipManager
     panel/views/*: startListBaseView, BaseTaskView, drawCharts, startKanbanView, startMatrixView (等所有子视图)
*/
/* @skill-func
   VIEW_TYPE_NAVIGATOR : string - 视图类型标识符
   NavigatorView.getViewType() : string - 返回视图类型
   NavigatorView.getDisplayText() : string - 返回显示名称
   NavigatorView.getIcon() : string - 返回图标名
   NavigatorView.onOpen() : Promise - 恢复上次子视图类型
   NavigatorView._startCore(dv, app, storageAdapter, instanceId) : Promise<Function> - 启动导航核心
   NavigatorView.getState() : { subViewType } - 获取状态
   NavigatorView.setState(state) : void - 设置状态
   startNavigatorCore(dv, app, storageAdapter, instanceId, initialSubView, navigatorView?) : Promise<Function> - 核心启动函数
   buildHeader() : void - 构建粘性头部
   refreshCurrentView() : Promise - 刷新当前子视图
   applyNavFilters() : Task[] - 应用导航层过滤
   renderContent(filteredTasks) : Promise - 渲染内容面板
   activateSubView(viewType, force?) : Promise - 激活子视图
*/
/* @skill-flow
   NavigatorView.onOpen() → 从 getState() 恢复 _lastViewType
   → _startCore() → startNavigatorCore()
   → 创建布局 outerWithSidebar + sidebar + mainArea
   → 创建 state + persistence + tooltipManager + treeRenderer
   → buildViewSwitcher() 构建侧边栏
   → buildHeader() 构建粘性头部
   → persistence.load() 恢复持久化状态
   → 激活初始子视图 (activateSubView)
   → applyNavFilters() 过滤任务
   → treeRenderer.render() + renderContent()
   → 返回 cleanup 函数
*/
/* @skill-condition
   子视图切换时: dataViewStatuses 在进出 task-dataview-view 时保存/恢复
   matrix/kanban/inbox 视图强制 statuses = ["todo","planned","in-progress"]
   过滤指纹缓存: fingerprint 匹配时跳过重复过滤
   自渲染视图列表: selfRenderedViews 中的视图自行管理 viewPanel
   树面板显隐: state.showTree 控制 display
   过滤区显隐: state.showFilters 控制 display
   cleanup: 销毁 echarts 实例 + 清理子视图 + 清空容器
*/
/* @skill-dom
   .navigator-outer-with-sidebar - 最外层容器（flex 行）
   .navigator-sidebar - 侧边栏视图切换区
   .navigator-main - 主内容区（flex 列）
   .navigator-scroll-area - 可滚动内容区
   .header-sticky - 粘性头部（快捷日期/控制按钮/排序/过滤）
   .filter-area - 过滤区
   .navigator-content-layout - 双面板布局（树面板 + 视图面板）
   .navigator-tree-panel - 左侧树面板
   .navigator-view-panel - 右侧视图内容面板
   .quick-row - 快捷日期行
   .filter-label - 过滤标签
   .section-divider - 节分隔线
   .sort-row-wrapper - 排序行容器
   .empty-message - 空状态提示
   .dataview-tooltip - 工具提示元素（全局唯一）
*/
/* <!-- SYNC_COMMENTS_END --> */
import { Notice } from "obsidian";
import { CONFIG } from "../configs/plugin-configs";
import {
	createInitialState,
	getEffectiveDateRange,
	getFilterFingerprint,
	PersistenceManager,
} from "../storages/persist-storages";
import { DateUtils } from "../tasks/process/common-process";
import { filterTasks } from "../tasks/process/filter-task-process";
import {
	fetchFutureTasks,
	fetchOverdueTasks,
	fetchTasks,
} from "../tasks/process/task-query-process";
import * as readTasks from "../tasks/read/read-tasks";
import { buildControlPanel } from "./bars/control-botton-bar";
import {
	buildDateCascadePanel,
	getQueryRangeFromDateSelection,
	resetCascadeDateUI,
} from "./bars/date-botton-bar";
import { buildHideButtons } from "./bars/hide-botton-bar";
import { buildMarkFilterPanel } from "./bars/mark-botton-bar";
import { buildQuickDatePanel, resetQuickDateUI } from "./bars/quick-botton-bar";
import { buildViewSwitcher } from "./bars/side-botton-bar";
import { buildSortRow } from "./bars/sort-botton-bar";
import { TaskTreeRenderer } from "./components/tree-view-components";
import { TooltipManager } from "./interacts/tooltip-interact";
import { startListBaseView } from "./views/base-list-view";
import { BaseTaskView } from "./views/base-task-view";
import { drawCharts } from "./views/data-tasks-view";
import { startKanbanView } from "./views/kanban-task-view";
import { startMatrixView } from "./views/matrix-task-view";

/** 导航视图的注册标识符 */
/* @skill-anchor: VIEW_TYPE_NAVIGATOR - 导航视图的注册标识符 */
export const VIEW_TYPE_NAVIGATOR = "navigator-view";

/**
 * 导航视图类（NavigatorView）
 * 继承自 BaseTaskView，是 Obsidian 自定义 ItemView 的实现。
 * 提供任务导航的中心面板，包含侧边栏（视图切换器）、
 * 粘性头部（快捷日期、控制按钮、排序）、过滤区和主内容区。
 */
/* @skill-anchor: NavigatorView - 导航视图类，继承自 BaseTaskView，Obsidian ItemView 实现 */
export class NavigatorView extends BaseTaskView {
	/** @returns {string} 视图类型标识符 */
	getViewType() {
		return VIEW_TYPE_NAVIGATOR;
	}

	/** @returns {string} 视图显示名称 */
	getDisplayText() {
		return "任务导航中心";
	}

	/** @returns {string} 图标名称 */
	getIcon() {
		return "compass";
	}

	/**
	 * 打开视图时恢复上次的子视图类型
	 * 从 getState() 中读取保存的 subViewType，若无则默认 data-view
	 */
	async onOpen() {
		const saved = this.getState();
		this._lastViewType =
			saved && saved.subViewType
				? saved.subViewType
				: "task-dataview-view";
		super.onOpen();
	}

	/**
	 * 启动导航核心逻辑
	 * @param {Object} dv - Obsidian Dataview API
	 * @param {Object} app - Obsidian App 实例
	 * @param {Object} storageAdapter - 存储适配器（用于持久化）
	 * @param {string} instanceId - 实例 ID
	 * @returns {Promise<Function>} cleanup 函数
	 */
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startNavigatorCore(
			dv,
			app,
			storageAdapter,
			instanceId,
			this._lastViewType,
			this,
		);
	}

	/**
	 * 获取当前视图状态（子视图类型）
	 * @returns {{ subViewType: string }}
	 */
	getState() {
		return { subViewType: this._lastViewType || "task-dataview-view" };
	}

	/**
	 * 设置视图状态（恢复子视图类型）
	 * @param {Object} state - 状态对象
	 */
	setState(state) {
		if (state && state.subViewType) this._lastViewType = state.subViewType;
	}
}

/**
 * 启动导航核心逻辑
 * 创建布局容器、初始化状态、设置持久化管理器、构建头部和侧边栏，
 * 激活初始子视图并渲染内容。
 *
 * @param {Object} dv - Obsidian Dataview API
 * @param {Object} app - Obsidian App 实例
 * @param {Object} storageAdapter - 存储适配器
 * @param {string} instanceId - 实例 ID
 * @param {string} initialSubView - 初始子视图类型
 * @param {NavigatorView} [navigatorView] - 可选的 NavigatorView 实例
 * @returns {Promise<Function>} cleanup 函数，调用时清理所有资源
 */
/* @skill-anchor: startNavigatorCore - 启动导航核心逻辑 */
export async function startNavigatorCore(
	dv,
	app,
	storageAdapter,
	instanceId,
	initialSubView,
	navigatorView,
) {
	// 清理全局残留 tooltip
	document.querySelectorAll(".dataview-tooltip").forEach((el) => el.remove());

	const sharedSortState = { type: "status", order: "asc" };
	const tooltipManager = new TooltipManager();
	tooltipManager.ensureDiv();
	const state = createInitialState();
	state.leftSort = sharedSortState;
	const collapsedNodes = {};
	state.collapsedNodes = collapsedNodes;
	const persistence = new PersistenceManager(storageAdapter, "nav");

	let currentSubViewType = null;
	let currentSubView = null;
	let dataViewStatuses = [...CONFIG.ALLOWED_STATUSES];

	// === 构建布局容器 ===
	const outerWithSidebar = dv.el("div", "", {
		cls: "navigator-outer-with-sidebar",
	});
	const sidebar = dv.el("div", "", { cls: "navigator-sidebar" });
	const mainArea = dv.el("div", "", { cls: "navigator-main" });
	mainArea.style.cssText = "flex:1; display:flex; flex-direction:column;";

	const scrollArea = dv.el("div", "", { cls: "navigator-scroll-area" });
	const stickyHeader = dv.el("div", "", { cls: "header-sticky" });
	scrollArea.appendChild(stickyHeader);
	const filterWrapper = dv.el("div", "", { cls: "filter-area" });
	scrollArea.appendChild(filterWrapper);
	const contentLayout = dv.el("div", "", { cls: "navigator-content-layout" });
	const treePanel = dv.el("div", "", { cls: "navigator-tree-panel" });
	const viewPanel = dv.el("div", "", { cls: "navigator-view-panel" });
	contentLayout.appendChild(treePanel);
	contentLayout.appendChild(viewPanel);
	scrollArea.appendChild(contentLayout);

	mainArea.appendChild(scrollArea);
	outerWithSidebar.appendChild(sidebar);
	outerWithSidebar.appendChild(mainArea);
	dv.container.appendChild(outerWithSidebar);

	// === 树面板渲染器 ===
	const treeRenderer = new TaskTreeRenderer({
		container: treePanel,
		dv,
		app,
		state,
		collapsedNodes,
		tooltip: tooltipManager,
		onFilterRootPathChange: (path) => {
			state.filterRootPath = path;
			state.filterCache.fingerprint = "";
			persistence.save(state, collapsedNodes);
			refreshCurrentView();
		},
		onCollapseChange: () => persistence.save(state, collapsedNodes),
	});
	treeRenderer.setFilteredTasksProvider(() => state.filterCache.tasks || []);

	/**
	 * 构建粘性头部区域
	 * 包含快捷日期按钮行、控制按钮（含隐藏按钮）、过滤区。
	 * 每次重新渲染全局 UI 时调用此函数重建头部。
	 */
	/* @skill-anchor: startNavigatorCore.buildHeader - 构建粘性头部区域 */
	function buildHeader() {
		stickyHeader.innerHTML = "";
		const quickRow = dv.el("div", "", { cls: "quick-row" });
		quickRow.appendChild(
			dv.el("span", "快捷", {
				cls: "filter-label",
				style: "margin-right:8px;",
			}),
		);
		buildQuickDatePanel(quickRow, dv, state, {
			onQuery: () => {
				const isAllActive = state.quickBtns.some(
					(b) =>
						b.classList.contains("quick-btn-active") &&
						b.textContent === "所有任务",
				);
				if (isAllActive) {
					state.dateFilterState.isAll = true;
					state.dateFilterState.start = state.dateFilterState.end =
						null;
				} else {
					const dr = getQueryRangeFromDateSelection(state);
					if (dr) {
						state.dateFilterState.isAll = false;
						state.dateFilterState.start = dr.start;
						state.dateFilterState.end = dr.end;
					}
				}
				state.filterCache.fingerprint = "";
				refreshCurrentView();
			},
		});
		stickyHeader.appendChild(quickRow);
		stickyHeader.appendChild(dv.el("div", "", { cls: "section-divider" }));

		const ctrlRow = buildControlPanel(stickyHeader, dv, state, {
			onRenderAll: () => refreshCurrentView(),
			onToggleFolders: () => treeRenderer.renderFromCurrentFilter(),
			onResetAndClear: () => {
				resetQuickDateUI(state);
				resetCascadeDateUI(state);
				state.markFilterState.statuses = [...CONFIG.ALLOWED_STATUSES];
				state.markFilterState.includeMarks = [];
				state.markFilterState.excludeMarks = [];
				state.hideRepeatTasks = true;
				state.hideCompletedTasks = true;
				state.hideCancelledTasks = true;
				state.hideFolders = true;
				const thisWeek = DateUtils.getWeekRange(new Date());
				state.dateFilterState.isAll = false;
				state.dateFilterState.start = thisWeek.start;
				state.dateFilterState.end = thisWeek.end;
				state.leftSort.type = "status";
				state.leftSort.order = "asc";
				state.activeQuickBtn = null;
				state.cachedAllTasks = null;
				state.filterCache = { fingerprint: "", tasks: null };
				readTasks.getAllTasks(true, dv, state);
				buildHeader();
				refreshCurrentView();
			},
		});
		buildHideButtons(ctrlRow, dv, state, {
			onToggleFilters: () => buildHeader(),
			onToggleTree: () => {
				treePanel.style.display = state.showTree ? "" : "none";
				refreshCurrentView();
			},
		});
		stickyHeader.appendChild(dv.el("div", "", { cls: "section-divider" }));
		const sortContainer = dv.el("div", "", { cls: "sort-row-wrapper" });
		buildSortRow(sortContainer, dv, state, {
			onRenderAll: () => refreshCurrentView(),
		});
		stickyHeader.appendChild(sortContainer);

		filterWrapper.innerHTML = "";
		if (state.showFilters) {
			buildDateCascadePanel(filterWrapper, dv, state);
			filterWrapper.appendChild(
				dv.el("div", "", { cls: "section-divider" }),
			);
			buildMarkFilterPanel(filterWrapper, dv, state, currentSubViewType);
			filterWrapper.style.display = "";
		} else {
			filterWrapper.style.display = "none";
		}
	}

	/**
	 * 刷新当前子视图
	 * 应用过滤 → 渲染树面板 → 渲染内容面板 → 持久化状态
	 */
	/* @skill-anchor: startNavigatorCore.refreshCurrentView - 刷新当前子视图 */
	async function refreshCurrentView() {
		const filtered = applyNavFilters();
		treeRenderer.render(filtered);
		await renderContent(filtered);
		await persistence.save(state, collapsedNodes);

		// 刷新甘特图/日历/整理箱等需要同步的视图
		if (
			[
				"calendar-task-view",
				"gantt-task-view",
				"organize-task-view",
			].includes(currentSubViewType) &&
			currentSubView?.updateSort
		) {
			await currentSubView.updateSort();
		}
	}

	/**
	 * 应用导航层过滤
	 * 使用指纹缓存避免重复过滤。
	 *
	 * @returns {Array} 过滤后的任务列表
	 */
	/* @skill-anchor: startNavigatorCore.applyNavFilters - 应用导航层过滤 */
	function applyNavFilters() {
		const fp = getFilterFingerprint(state);
		if (state.filterCache.fingerprint === fp && state.filterCache.tasks)
			return state.filterCache.tasks.slice();
		let tasks = readTasks.getAllTasks(false, dv, state).slice();
		tasks = filterTasks(tasks, {
			dateFilterState: state.dateFilterState,
			markFilterState: state.markFilterState,
			hideRepeatTasks: state.hideRepeatTasks,
			hideCompletedTasks: state.hideCompletedTasks,
			hideCancelledTasks: state.hideCancelledTasks,
			filterRootPath: state.filterRootPath,
		});
		state.filterCache.fingerprint = fp;
		state.filterCache.tasks = tasks.slice();
		return tasks;
	}

	/**
	 * 渲染内容面板（仅对非自渲染视图生效）
	 * 自渲染视图（如 inbox、today、calendar 等）自行管理其 viewPanel 内容。
	 *
	 * @param {Array} filteredTasks - 过滤后的任务列表
	 */
	/* @skill-anchor: startNavigatorCore.renderContent - 渲染内容面板 */
	async function renderContent(filteredTasks) {
		const selfRenderedViews = [
			"inbox-task-view",
			"important-task-view",
			"recurring-task-view",
			"today-task-view",
			"future-n-task-view",
			"future-all-task-view",
			"overdue-task-view",
			"depends-task-view",
			"tag-task-view",
			"organize-task-view",
			"timeline-task-view",
			"table-task-view",
			"tree-task-view",
			"calendar-task-view",
			"gantt-task-view",
			"pomodoro-task-view",
		];

		if (selfRenderedViews.includes(currentSubViewType)) {
			return;
		}

		viewPanel.innerHTML = "";
		if (!currentSubViewType) return;
		if (currentSubViewType === "task-dataview-view") {
			drawCharts(viewPanel, filteredTasks, {
				dv,
				state,
				formatDate: DateUtils.formatDate,
				setStart: DateUtils.setStart,
				setEnd: DateUtils.setEnd,
				getEffectiveDateRange: () => getEffectiveDateRange(state),
			});
		} else if (
			currentSubViewType === "matrix-tasks-view" ||
			currentSubViewType === "kanban-task-view"
		) {
			if (currentSubView && currentSubView.updateSort)
				await currentSubView.updateSort();
		}
	}

	/**
	 * 激活指定子视图
	 * 切换当前子视图，清理旧视图资源，加载新视图，刷新过滤和布局。
	 * 同时更新侧边栏视图切换器的高亮状态。
	 *
	 * @param {string} viewType - 目标子视图类型
	 * @param {boolean} [force=false] - 是否强制切换（即使类型相同）
	 */
	/* @skill-anchor: startNavigatorCore.activateSubView - 激活指定子视图 */
	async function activateSubView(viewType, force = false) {
		if (!force && currentSubViewType === viewType) return;
		if (currentSubViewType === "task-dataview-view")
			dataViewStatuses = [...state.markFilterState.statuses];
		if (currentSubView && currentSubView.cleanup) {
			try {
				await currentSubView.cleanup();
			} catch (e) {
				console.error(e);
			}
			currentSubView = null;
		}
		currentSubViewType = viewType;

		if (
			[
				"matrix-tasks-view",
				"kanban-task-view",
				"inbox-task-view",
			].includes(viewType)
		) {
			state.markFilterState.statuses = ["todo", "planned", "in-progress"];
		} else {
			state.markFilterState.statuses = [...dataViewStatuses];
		}
		buildHeader();

		try {
			if (viewType === "matrix-tasks-view") {
				currentSubView = await startMatrixView(
					app,
					viewPanel,
					sharedSortState,
				);
			} else if (viewType === "kanban-task-view") {
				currentSubView = await startKanbanView(dv, app, viewPanel);
			} else if (viewType === "important-task-view") {
				const { startImportantView } =
					await import("./views/important-task-view");
				currentSubView = await startImportantView(dv, app, viewPanel);
			} else if (viewType === "recurring-task-view") {
				const { startRecurringView } =
					await import("./views/recurring-task-view");
				currentSubView = await startRecurringView(dv, app, viewPanel);
			} else if (viewType === "today-task-view") {
				const { startTodayView } =
					await import("./views/today-task-view");
				currentSubView = await startTodayView(dv, app, viewPanel);
			} else if (viewType === "future-n-task-view") {
				currentSubView = await startListBaseView(
					app,
					viewPanel,
					(app) => fetchFutureTasks(app, 15),
					"未来15天",
					"rgba(97, 175, 239, 0.25)",
				);
			} else if (viewType === "future-all-task-view") {
				currentSubView = await startListBaseView(
					app,
					viewPanel,
					async (app) => {
						const tasks = await fetchTasks(app);
						const now = window.moment();
						return tasks.filter((t) => {
							const date = t.dueDate || t.scheduledDate;
							return date && window.moment(date).isAfter(now);
						});
					},
					"未来所有任务",
					"rgba(100, 200, 200, 0.25)",
				);
			} else if (viewType === "overdue-task-view") {
				currentSubView = await startListBaseView(
					app,
					viewPanel,
					fetchOverdueTasks,
					"逾期任务",
					"rgba(255, 130, 130, 0.25)",
				);
			} else if (viewType === "depends-task-view") {
				const { startDependsView } =
					await import("./views/depends-task-view");
				currentSubView = await startDependsView(dv, app, viewPanel);
			} else if (viewType === "tag-task-view") {
				const { startTagView } = await import("./views/tag-task-view");
				currentSubView = await startTagView(dv, app, viewPanel);
			} else if (viewType === "inbox-task-view") {
				const { startInboxView } =
					await import("./views/inbox-task-view");
				currentSubView = await startInboxView(dv, app, viewPanel);
			} else if (viewType === "timeline-task-view") {
				const { startTimelineView } =
					await import("./views/timeline-task-view");
				currentSubView = await startTimelineView(dv, app, viewPanel);
			} else if (viewType === "table-task-view") {
				const { startTableTaskView } =
					await import("./views/table-task-view");
				currentSubView = await startTableTaskView(dv, app, viewPanel);
			} else if (viewType === "calendar-task-view") {
				const { startCalendarView } =
					await import("./views/calendar-task-view");
				currentSubView = await startCalendarView(
					dv,
					app,
					viewPanel,
					state,
				);
			} else if (viewType === "gantt-task-view") {
				const { startGanttView } =
					await import("./views/gantt-task-view");
				currentSubView = await startGanttView(
					dv,
					app,
					viewPanel,
					state,
				);
			} else if (viewType === "organize-task-view") {
				const { startOrganizeView } =
					await import("./views/organize-task-view");
				currentSubView = await startOrganizeView(
					dv,
					app,
					viewPanel,
					state,
				);
			} else {
				currentSubView = {
					cleanup: () => {},
					updateSort: () => {},
				};
				viewPanel.innerHTML =
					'<div class="empty-message">🛠️ 此视图即将上线</div>';
			}
		} catch (e) {
			viewPanel.innerHTML =
				'<div class="empty-message">视图加载失败</div>';
			return;
		}

		await refreshCurrentView();
		buildViewSwitcher(sidebar, dv, app, viewType, activateSubView);
		if (navigatorView) {
			navigatorView._lastViewType = viewType;
			navigatorView.app.workspace.requestSaveLayout();
		}
	}

	// === 初始渲染流程 ===
	buildViewSwitcher(sidebar, dv, app, initialSubView, activateSubView);
	state.showTree = state.showTree ?? false;
	state.showFilters = state.showFilters ?? false;
	buildHeader();
	treePanel.style.display = state.showTree ? "" : "none";

	await persistence.load(
		state,
		collapsedNodes,
		() => {
			const tw = DateUtils.getWeekRange(new Date());
			return { start: tw.start, end: tw.end };
		},
		(msg) => new Notice(msg),
	);

	dataViewStatuses = [...(state.dataViewStatuses || CONFIG.ALLOWED_STATUSES)];
	if (["matrix-tasks-view", "kanban-task-view"].includes(initialSubView)) {
		state.markFilterState.statuses = ["todo", "planned", "in-progress"];
	} else {
		state.markFilterState.statuses = [...dataViewStatuses];
	}

	// 激活初始子视图
	try {
		if (initialSubView === "matrix-tasks-view") {
			currentSubView = await startMatrixView(
				app,
				viewPanel,
				sharedSortState,
			);
		} else if (initialSubView === "kanban-task-view") {
			currentSubView = await startKanbanView(dv, app, viewPanel);
		} else if (initialSubView === "important-task-view") {
			const { startImportantView } =
				await import("./views/important-task-view");
			currentSubView = await startImportantView(dv, app, viewPanel);
		} else if (initialSubView === "recurring-task-view") {
			const { startRecurringView } =
				await import("./views/recurring-task-view");
			currentSubView = await startRecurringView(dv, app, viewPanel);
		} else if (initialSubView === "today-task-view") {
			const { startTodayView } = await import("./views/today-task-view");
			currentSubView = await startTodayView(dv, app, viewPanel);
		} else if (initialSubView === "future-n-task-view") {
			currentSubView = await startListBaseView(
				app,
				viewPanel,
				(app) => fetchFutureTasks(app, 15),
				"未来15天",
				"rgba(97, 175, 239, 0.25)",
			);
		} else if (initialSubView === "future-all-task-view") {
			currentSubView = await startListBaseView(
				app,
				viewPanel,
				async (app) => {
					const tasks = await fetchTasks(app);
					const now = window.moment();
					return tasks.filter((t) => {
						const date = t.dueDate || t.scheduledDate;
						return date && window.moment(date).isAfter(now);
					});
				},
				"未来所有任务",
				"rgba(100, 200, 200, 0.25)",
			);
		} else if (initialSubView === "overdue-task-view") {
			currentSubView = await startListBaseView(
				app,
				viewPanel,
				fetchOverdueTasks,
				"逾期任务",
				"rgba(255, 130, 130, 0.25)",
			);
		} else if (initialSubView === "depends-task-view") {
			const { startDependsView } =
				await import("./views/depends-task-view");
			currentSubView = await startDependsView(dv, app, viewPanel);
		} else if (initialSubView === "tag-task-view") {
			const { startTagView } = await import("./views/tag-task-view");
			currentSubView = await startTagView(dv, app, viewPanel);
		} else if (initialSubView === "inbox-task-view") {
			const { startInboxView } = await import("./views/inbox-task-view");
			currentSubView = await startInboxView(dv, app, viewPanel);
		} else if (initialSubView === "timeline-task-view") {
			const { startTimelineView } =
				await import("./views/timeline-task-view");
			currentSubView = await startTimelineView(dv, app, viewPanel);
		} else if (initialSubView === "table-task-view") {
			const { startTableTaskView } =
				await import("./views/table-task-view");
			currentSubView = await startTableTaskView(dv, app, viewPanel);
		} else if (initialSubView === "calendar-task-view") {
			const { startCalendarView } =
				await import("./views/calendar-task-view");
			currentSubView = await startCalendarView(dv, app, viewPanel, state);
		} else if (initialSubView === "gantt-task-view") {
			const { startGanttView } = await import("./views/gantt-task-view");
			currentSubView = await startGanttView(dv, app, viewPanel, state);
		} else if (initialSubView === "organize-task-view") {
			const { startOrganizeView } =
				await import("./views/organize-task-view");
			currentSubView = await startOrganizeView(dv, app, viewPanel, state);
		}
	} catch (e) {
		viewPanel.innerHTML = '<div class="empty-message">视图加载失败</div>';
	}

	currentSubViewType = initialSubView;
	const filtered = applyNavFilters();
	treeRenderer.render(filtered);

	if (
		currentSubViewType === "matrix-tasks-view" ||
		currentSubViewType === "kanban-task-view"
	) {
		if (currentSubView && currentSubView.updateSort)
			await currentSubView.updateSort();
	} else if (currentSubViewType === "task-dataview-view") {
		await renderContent(filtered);
	}

	// 返回 cleanup 函数
	return async () => {
		state.chartInstances.forEach((c) => {
			try {
				c.dispose();
			} catch (e) {}
		});
		if (currentSubView && currentSubView.cleanup)
			await currentSubView.cleanup();
		dv.container.empty();
	};
}
