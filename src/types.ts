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
	icon?: string;
	filter: GlobalFilter;
	sort: { type: string; order: "asc" | "desc" };
	showManagePanel?: boolean; // 是否显示配置管理面板
	manageBars?: {
		// 各子栏显示状态
		time: boolean;
		mark: boolean;
		excut: boolean;
	};
	showToolbar?: boolean; // 是否显示工具栏
	toolbarOrder?: string[]; // 工具栏各栏排序 ['time','mark','excut','view']
	barVisibility?: Record<string, boolean>; // 各栏显隐状态
	showHidden?: boolean;
	toolbarEverShown?: boolean; // 是否已至少展开过一次工具栏
	searchText?: string; // 任务描述搜索关键词
	tableColumns?: Record<string, boolean>; // 表格列显隐状态，默认全显示
	toolbarPanelsCollapsed?: boolean;
	toolbarPanelsHeight?: number;
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
	draftFilter: GlobalFilter | null;
}
