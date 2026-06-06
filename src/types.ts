// src/types.ts

/** 任务统一结构 */
export interface TaskItem {
	_status: string;
	_cleanText: string;
	_fullLine: string;
	_priorityIcon: string;
	_created: string;
	_scheduled: string;
	_starts: string;
	_due: string;
	_done: string;
	_cancel: string;
	_tag: string;
	_id: string;
	_forbid: string;
	_repeat: string;
	_marks: Record<string, boolean>;
	_cachedTimeRange: { start: number; end: number } | null;
	_tooltip: string;
	_tooltipHtml: string;
	_isHeadingTask: boolean;
	_isFileTask: boolean;
	_headingLevel: number;
	_headingText: string;
	path: string;
	line: number;
	lineNumber: number;
	text: string;
	description: string;
	priority: string;
	status: string;
	fileName: string;
	statusIcon?: string;
	statusName?: string;
	statusText?: string;
	recurrenceLabel?: string;
	tags?: string[];
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

/** 视图隐藏配置 */
export interface HideConfig {
	hideStatuses: string[];
	hidePriorityValues: string[];
	hideRepeatCycles: string[];
	hideMarks: string[];
	hideSearchText: string;
	hideTableColumns: Record<string, boolean>;
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
	taskTreeNavCollapsed?: boolean;
	taskTreeNavWidth?: number;
	hideConfig?: HideConfig;
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
