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
	hideFolders?: boolean; // 文件夹显隐
}

/** 方案（Preset） */
export interface Preset {
	id: string;
	name: string;
	groupId: string;
	businessView: string;
	viewStyle: string;
	filter: GlobalFilter;
	sort: { type: string; order: "asc" | "desc" };
	showHidden?: boolean;
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
	sidebarWidth: number; // 新增：侧边栏宽度
	draftFilter: GlobalFilter | null;
}
