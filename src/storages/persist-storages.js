//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file src/storages/persist-storage.js - 持久化管理与状态创建模块，提供初始状态创建、过滤指纹生成、日期范围获取以及 PersistenceManager 类 */
/* @skill-func
   createInitialState() : Object - 创建插件的初始状态对象（包含所有面板、过滤、排序、图表等功能的默认值）
   getFilterFingerprint(state) : string - 从当前过滤状态生成唯一指纹字符串（用于判断过滤条件是否变化）
   getEffectiveDateRange(state) : {start:Date,end:Date}|null - 获取生效的日期过滤范围（isAll=true或日期不完整时返回null）
   PersistenceManager(storage, scope) : class - 持久化管理器类，负责将插件过滤状态、视图偏好等设置序列化到 Obsidian 存储
   PersistenceManager.save(state, collapsedNodes) : Promise - 持久化当前状态到存储（仅保存用户可配置的视图偏好）
   PersistenceManager.load(state, collapsedNodes, defaultDateRangeFn, noticeFn) : Promise - 从存储中恢复之前持久化的状态（合并到当前 state）
*/
/* @skill-flow
   createInitialState → 返回包含所有默认值的 state 对象
   getFilterFingerprint → 提取日期/状态/标记/隐藏/根路径 → 拼接为指纹字符串
   getEffectiveDateRange → 检查 isAll 和日期完整性 → 返回范围对象或 null
   PersistenceManager.save → 选取可持久化字段 → JSON.stringify → storage.setItem
   PersistenceManager.load → storage.getItem → JSON.parse → 合并到 state 和 collapsedNodes
*/
/* @skill-param
   state: Object - 全局状态对象(含 dateFilterState/markFilterState/hide* 等所有视图状态)
   collapsedNodes: Object - 树面板折叠节点映射表
   storage: Object - Obsidian 的 DataAdapter 或 storage 接口(提供 getItem/setItem)
   scope: string - 存储作用域键名，用于区分不同面板或插件的存储数据
   defaultDateRangeFn: Function - 默认日期范围回调(保留参数，暂未使用)
   noticeFn: Function - 用户通知回调，接收字符串消息(加载失败时调用)
*/
/* @skill-condition
   所属模块: storage - 持久化管理
   依赖: ../configs/plugin-configs(CONFIG.ALLOWED_STATUSES)
   运行环境: Obsidian 插件环境
   状态结构: createInitialState 定义了完整的 state 默认结构
   持久化策略: 仅保存用户可配置的视图偏好(过滤开关/排序/布局)，不保存运行时临时数据(缓存任务列表)
   过滤指纹: getFilterFingerprint 用于快速判断是否需要重新执行过滤逻辑
  关联模块: src/panel/panel.js(使用 PersistenceManager)、所有 view 模块(使用 state)
  路径说明: 实际文件路径为 src/storages/persist-storage.js(vault 中以 storages 命名)
*/
//  <!-- SYNC_COMMENTS_END -->
// src/storage/persist-storage.js
import { CONFIG } from "../configs/plugin-configs";

/**
 * 创建插件的初始状态对象
 * 包含所有面板、过滤、排序、图表等功能的默认值。
 * 每次插件初始化或状态重置时调用此函数获取干净的初始状态。
 *
 * @returns {Object} 初始状态对象
 */
export function createInitialState() {
	return {
		cachedAllTasks: null,
		filterCache: { fingerprint: "", tasks: null },
		dateTaskMapCache: null,
		dateFilterState: {
			start: null,
			end: null,
			isAll: false,
		},
		markFilterState: {
			statuses: [...CONFIG.ALLOWED_STATUSES],
			includeMarks: [],
			excludeMarks: [],
		},
		hideRepeatTasks: true,
		hideCompletedTasks: true,
		hideCancelledTasks: true,
		hideFolders: true,
		showFilters: false,
		showTree: false,
		leftSort: { type: "status", order: "asc" },
		quickBtns: [],
		activeQuickBtn: null,
		dateState: {
			selections: {
				years: {},
				quarters: {},
				months: {},
				weeks: {},
				weekdays: {},
			},
		},
		yearBtns: [],
		quarterBtns: [],
		monthBtns: [],
		weekBtns: [],
		weekdayBtns: [],
		collapsedNodes: {},
		filterRootPath: null,
		chartInstances: [], // 图表实例列表，必须初始化为空数组
		chartScale: 1,
		leftPanelWidth: 300,
		intervalMode: "scheduled-due",
		dataViewStatuses: null,
		taskIdMap: {},
	};
}

/**
 * 从当前过滤状态生成唯一指纹字符串
 * 用于判断过滤条件是否发生变化，从而决定是否需要重新执行过滤逻辑
 *
 * @param {Object} state - 全局状态对象
 * @returns {string} 指纹字符串，由日期范围、状态筛选、标记筛选、隐藏选项和根路径拼接而成
 */
export function getFilterFingerprint(state) {
	const s = state.dateFilterState;
	return [
		s.start ? s.start.getTime() : null,
		s.end ? s.end.getTime() : null,
		s.isAll,
		state.markFilterState.statuses.join(","),
		state.markFilterState.includeMarks.join(","),
		state.markFilterState.excludeMarks.join(","),
		state.hideRepeatTasks,
		state.hideCompletedTasks,
		state.hideCancelledTasks,
		state.filterRootPath || "",
	].join("|");
}

/**
 * 获取生效的日期过滤范围
 * 如果 isAll 为 true 或起始/结束日期不完整，则返回 null
 *
 * @param {Object} state - 全局状态对象
 * @returns {{ start: Date, end: Date } | null} 日期范围对象，或 null
 */
export function getEffectiveDateRange(state) {
	if (
		state.dateFilterState.isAll ||
		!state.dateFilterState.start ||
		!state.dateFilterState.end
	)
		return null;
	return {
		start: state.dateFilterState.start,
		end: state.dateFilterState.end,
	};
}

/**
 * 持久化管理器
 * 负责将插件的过滤状态、视图偏好等设置持久化到 Obsidian 存储中，
 * 并在插件加载时恢复这些设置。使用 JSON 格式序列化/反序列化。
 */
export class PersistenceManager {
	/**
	 * @param {Object} storage - Obsidian 的 DataAdapter 或 storage 接口（提供 getItem/setItem）
	 * @param {string} scope - 存储作用域键名，用于区分不同面板或插件的存储数据
	 */
	constructor(storage, scope) {
		this.storage = storage;
		this.scope = scope;
	}

	/**
	 * 持久化当前状态到存储
	 * 选择性地保存用户可配置的视图偏好（过滤开关、排序、布局等），
	 * 不保存运行时临时数据（如缓存的任务列表）。
	 *
	 * @param {Object} state - 全局状态对象
	 * @param {Object} collapsedNodes - 树面板折叠节点映射表
	 * @returns {Promise<void>}
	 */
	async save(state, collapsedNodes) {
		try {
			const data = {
				showFilters: state.showFilters,
				showTree: state.showTree,
				hideRepeatTasks: state.hideRepeatTasks,
				hideCompletedTasks: state.hideCompletedTasks,
				hideCancelledTasks: state.hideCancelledTasks,
				hideFolders: state.hideFolders,
				leftSort: state.leftSort,
				markFilterState: state.markFilterState,
				collapsedNodes: collapsedNodes || state.collapsedNodes,
				chartScale: state.chartScale,
				leftPanelWidth: state.leftPanelWidth,
				intervalMode: state.intervalMode,
				dataViewStatuses: state.dataViewStatuses,
			};
			await this.storage.setItem(this.scope, JSON.stringify(data));
		} catch (e) {
			console.error("持久化失败", e);
		}
	}

	/**
	 * 从存储中恢复之前持久化的状态
	 * 将保存的设置合并到当前 state 对象和 collapsedNodes 映射中。
	 * 如果加载失败（如数据损坏），可选的 noticeFn 回调用于向用户显示提示。
	 *
	 * @param {Object} state - 全局状态对象（会被修改，合并已保存的值）
	 * @param {Object} collapsedNodes - 折叠节点映射表（会被修改，合并已保存的映射）
	 * @param {Function} [defaultDateRangeFn] - 默认日期范围回调（保留参数，暂未使用）
	 * @param {Function} [noticeFn] - 用户通知回调，接收字符串消息，加载失败时调用
	 * @returns {Promise<void>}
	 */
	async load(state, collapsedNodes, defaultDateRangeFn, noticeFn) {
		try {
			const raw = await this.storage.getItem(this.scope);
			if (!raw) return;
			const saved = JSON.parse(raw);
			if (saved) {
				state.showFilters = saved.showFilters ?? false;
				state.showTree = saved.showTree ?? false;
				state.hideRepeatTasks = saved.hideRepeatTasks ?? true;
				state.hideCompletedTasks = saved.hideCompletedTasks ?? true;
				state.hideCancelledTasks = saved.hideCancelledTasks ?? true;
				state.hideFolders = saved.hideFolders ?? true;
				state.leftSort = saved.leftSort || {
					type: "status",
					order: "asc",
				};
				state.markFilterState = saved.markFilterState || {
					statuses: [...CONFIG.ALLOWED_STATUSES],
					includeMarks: [],
					excludeMarks: [],
				};
				Object.assign(collapsedNodes, saved.collapsedNodes || {});
				state.chartScale = saved.chartScale || 1;
				state.leftPanelWidth = saved.leftPanelWidth || 300;
				state.intervalMode = saved.intervalMode || "scheduled-due";
				state.dataViewStatuses = saved.dataViewStatuses || [
					...CONFIG.ALLOWED_STATUSES,
				];
				// 确保 chartInstances 仍存在
				if (!Array.isArray(state.chartInstances))
					state.chartInstances = [];
			}
		} catch (e) {
			if (noticeFn) noticeFn("⚠️ 加载上次视图状态失败，已重置默认设置");
			console.error("加载持久化数据失败", e);
		}
	}
}
