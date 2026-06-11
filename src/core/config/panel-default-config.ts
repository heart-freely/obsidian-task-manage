// src/core/config/panel-default-config.ts

import { GlobalFilter, HideConfig, Preset } from "../../type/type";

export const YEAR_RANGE_OFFSET = 10;

export function getDefaultFilter(): GlobalFilter {
	return {
		dateRange: { start: null, end: null, isAll: true },
		statuses: [],
		includeMarks: [],
		excludeMarks: [],
		rootPath: null,
		hideFolders: true,
		priorityValues: [],
		repeatCycles: [],
	};
}

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

export function getDefaultPresets(): Preset[] {
	const defaultFilter = getDefaultFilter();
	const defaultHideConfig = getDefaultHideConfig();

	const basePreset = {
		groupId: "basic",
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
			viewStyle: "kanban",
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
			viewStyle: "priority",
			icon: "⭐",
			filter: {
				...defaultFilter,
				statuses: [],
				priorityValues: ["🔺", "⏫", "🔼"],
			},
			hideConfig: {
				...defaultHideConfig,
				hideStatuses: ["completed", "cancelled"],
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
				statuses: [],
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
			intervalMode: "any-date",
			sort: { type: "", order: "asc" as const },
			useDynamic: true,
		},
		{
			...basePreset,
			id: "future",
			name: "未来任务",
			businessView: "future",
			viewStyle: "timeline",
			icon: "🔜",
			filter: {
				...defaultFilter,
				statuses: [],
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
			intervalMode: "any-date",
			sort: { type: "", order: "asc" as const },
			useDynamic: true,
		},
		{
			...basePreset,
			id: "all-tasks",
			name: "所有任务",
			businessView: "allTasks",
			viewStyle: "table",
			icon: "📋",
			filter: { ...defaultFilter },
			sort: { type: "", order: "asc" as const },
			useDynamic: false,
		},
	];
}
