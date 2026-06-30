// src/core/store/preset/panel-preset.ts

import { GlobalFilter, HideConfig, Preset } from "../../../type/type";

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

const DEFAULT_BAR_VISIBILITY: Record<string, boolean> = {
	filter: true,
	time: true,
	view: true,
	hide: true,
	edit: true,
	sort: true,
	config: true,
};

const DEFAULT_TOOLBAR_ORDER: string[] = [
	"filter",
	"time",
	"view",
	"hide",
	"edit",
	"sort",
	"config",
];

export function getDefaultPresets(): Preset[] {
	const defaultFilter = getDefaultFilter();
	const defaultHideConfig = getDefaultHideConfig();

	const basePreset = {
		groupId: "basic",
		toolbarPanelsCollapsed: false,
		toolbarPanelsHeight: 300,
		toolbarOrder: [...DEFAULT_TOOLBAR_ORDER],
		barVisibility: { ...DEFAULT_BAR_VISIBILITY },
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
