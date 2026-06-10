// src/core/config/panel-default-config.ts
// 面板默认配置 — 所有功能面板的默认值和共用常量统一来源

import { GlobalFilter, HideConfig, Preset } from "../../type/type";

// ========== 共用常量 ==========

/** 年份范围偏移（用于"全部"时间范围和动态年滑动条） */
export const YEAR_RANGE_OFFSET = 10;

// ========== 默认筛选条件 ==========

export function getDefaultFilter(): GlobalFilter {
	return {
		dateRange: { start: null, end: null, isAll: true },
		statuses: [],
		includeMarks: [],
		excludeMarks: [],
		hideRepeat: true,
		hideCompleted: true,
		hideCancelled: true,
		rootPath: null,
		hideFolders: true,
		priorityValues: [],
		repeatCycles: [],
	};
}

// ========== 默认隐藏配置 ==========

export function getDefaultHideConfig(): HideConfig {
	return {
		hideStatuses: [],
		hidePriorityValues: [],
		hideRepeatCycles: [],
		hideMarks: [],
		hideSearchText: "",
		hideTableColumns: {
			status: false,
			content: false,
			priority: false,
			repeat: false,
			created: false,
			scheduled: false,
			starts: false,
			cancelled: false,
			done: false,
			due: false,
			tag: false,
			id: false,
			forbid: false,
		},
	};
}

// ========== 默认预设 ==========

export function getDefaultPresets(): Preset[] {
	const defaultFilter = getDefaultFilter();
	const defaultHideConfig = getDefaultHideConfig();

	const basePreset = {
		groupId: "basic",
		showToolbar: false,
		toolbarEverShown: false,
		toolbarPanelsCollapsed: false,
		toolbarPanelsHeight: 300,
		toolbarOrder: [
			"excut",
			"search",
			"mark",
			"time",
			"view",
			"hide",
			"sort",
			"config",
		] as string[],
		barVisibility: {
			time: true,
			excut: true,
			search: true,
			mark: true,
			view: true,
			hide: true,
			sort: true,
			config: true,
		} as Record<string, boolean>,
		// 时间模式默认不选中（none）
		intervalMode: "none" as string,
		taskTreeNavCollapsed: true,
		taskTreeNavWidth: 280,
		hideConfig: { ...defaultHideConfig },
	};

	return [
		{
			...basePreset,
			id: "inbox",
			name: "待办任务",
			businessView: "inbox",
			viewStyle: "list",
			icon: "📥",
			filter: { ...defaultFilter, statuses: ["todo", "scheduled"] },
			sort: { type: "", order: "asc" as const },
			useDynamic: false,
		},
		{
			...basePreset,
			id: "important",
			name: "重要任务",
			businessView: "important",
			viewStyle: "list",
			icon: "⭐",
			filter: {
				...defaultFilter,
				statuses: ["todo", "scheduled", "in-progress"],
				priorityValues: ["🔺", "⏫", "🔼"],
			},
			sort: { type: "", order: "asc" as const },
			useDynamic: false,
		},
		{
			...basePreset,
			id: "today",
			name: "今天任务",
			businessView: "today",
			viewStyle: "list",
			icon: "📅",
			filter: {
				...defaultFilter,
				statuses: ["todo", "scheduled", "in-progress"],
				dateRange: {
					start: new Date(
						new Date().getFullYear(),
						new Date().getMonth(),
						new Date().getDate(),
					).getTime(),
					end: new Date(
						new Date().getFullYear(),
						new Date().getMonth(),
						new Date().getDate(),
						23,
						59,
						59,
						999,
					).getTime(),
					isAll: false,
				},
			},
			sort: { type: "", order: "asc" as const },
			useDynamic: true,
		},
		{
			...basePreset,
			id: "future",
			name: "未来任务",
			businessView: "future",
			viewStyle: "list",
			icon: "🔜",
			filter: {
				...defaultFilter,
				statuses: ["todo", "scheduled", "in-progress"],
				dateRange: {
					start: new Date(
						new Date().getFullYear(),
						new Date().getMonth(),
						new Date().getDate(),
					).getTime(),
					end: new Date(
						new Date().getFullYear(),
						new Date().getMonth(),
						new Date().getDate() + 15,
						23,
						59,
						59,
						999,
					).getTime(),
					isAll: false,
				},
			},
			sort: { type: "", order: "asc" as const },
			useDynamic: true,
		},
		{
			...basePreset,
			id: "all-tasks",
			name: "所有任务",
			businessView: "allTasks",
			viewStyle: "list",
			icon: "📋",
			filter: { ...defaultFilter },
			sort: { type: "", order: "asc" as const },
			useDynamic: false,
		},
	];
}
