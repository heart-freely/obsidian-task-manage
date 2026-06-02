// src/types.ts

/** 任务统一结构 */
export interface TaskItem {
	_status: string;
	_cleanText: string;
	_fullLine: string;
	_priorityIcon?: string;
	_created?: string;
	_scheduled?: string;
	_starts?: string;
	_due?: string;
	_done?: string;
	_cancel?: string;
	_tag?: string;
	_id?: string;
	_forbid?: string;
	_repeat?: string;
	_marks?: Record<string, boolean>;
	_cachedTimeRange?: { start: number; end: number };
	_tooltip?: string;
	_tooltipHtml?: string;
	path: string;
	line: number;
	[key: string]: any;
}

/** 全局筛选条件 */
export interface GlobalFilter {
	dateRange: { start: number | null; end: number | null; isAll: boolean };
	statuses: string[];
	includeMarks: string[];
	excludeMarks: string[];
	hideRepeat: boolean;
	hideCompleted: boolean;
	hideCancelled: boolean;
	rootPath: string | null;
	hideFolders?: boolean;
	searchText?: string;
	priorityValues?: string[];
	repeatCycles?: string[];
}

/** 方案 */
export interface Preset {
	id: string;
	name: string;
	groupId: string;
	businessView: string;
	viewStyle: string;
	icon?: string;
	filter: GlobalFilter;
	sort: { type: string; order: "asc" | "desc" };
	showToolbar?: boolean;
	toolbarOrder?: string[];
	barVisibility?: Record<string, boolean>;
	showHidden?: boolean;
	toolbarEverShown?: boolean;
	searchText?: string;
	tableColumns?: Record<string, boolean>;
	toolbarPanelsCollapsed?: boolean;
	toolbarPanelsHeight?: number;
	useDynamic?: boolean;
	intervalMode?: string;
}

/** 方案分组 */
export interface PresetGroup {
	id: string;
	name: string;
	collapsed?: boolean;
	order?: number;
}

/** Store 状态 */
export interface AppState {
	activePresetId: string | null;
	presets: Preset[];
	presetGroups: PresetGroup[];
	sidebarCollapsed: boolean;
	sidebarWidth: number;
}
