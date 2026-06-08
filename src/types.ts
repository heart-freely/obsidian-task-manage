// src/types.ts

// 从 config.ts 重新导出（类型从常量自动派生，单一数据源）
import type {
	DateMarkKey,
	MarkKey,
	PriorityIcon,
	RepeatCycle,
	TaskStatus,
} from "./process/config/config";

export type { DateMarkKey, MarkKey, PriorityIcon, RepeatCycle, TaskStatus };

// ========== 纯业务类型 ==========

/** 任务来源类型 */
export type TaskSource = "file" | "heading" | "list";

/** 时间计算模式 */
export type IntervalMode =
	| "scheduled-due"
	| "starts-done"
	| "any-date"
	| "none";

/** 任务标记存在性映射 */
export type TaskMarks = Record<MarkKey, boolean>;

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

/** 视图方案 */
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

/** Store 全局状态 */
export interface AppState {
	activePresetId: string | null;
	presets: Preset[];
	presetGroups: PresetGroup[];
	sidebarCollapsed: boolean;
	sidebarWidth: number;
}

export interface Task {
	/** 执行状态 */
	status: TaskStatus;
	/** 去除所有标记后的纯文本描述 */
	content: string;

	/**
	 * 优先级数字
	 * 0 = 最高 (🔺), 1 = 高 (⏫), 2 = 中 (🔼), 3 = 低 (🔽), 4 = 最低 (⏬), 5 = 无优先级
	 */
	priority: number;

	/** 循环规则原文（不含🔁前缀），如 "every week" */
	repeat: string;

	/** 创建日期（毫秒时间戳，null 表示不存在） */
	created: number | null;
	/** 计划日期（毫秒时间戳，null 表示不存在） */
	scheduled: number | null;
	/** 开始日期（毫秒时间戳，null 表示不存在） */
	starts: number | null;
	/** 截止日期（毫秒时间戳，null 表示不存在） */
	due: number | null;
	/** 完成日期（毫秒时间戳，null 表示不存在） */
	done: number | null;
	/** 取消日期（毫秒时间戳，null 表示不存在） */
	cancelled: number | null;

	/** 唯一ID（用户自定义标记 🆔 的值） */
	id: string;
	/** 依赖ID列表（逗号分隔的原始字符串，来自 ⛔ 标记） */
	forbid: string;
	/** 标签（来自 🏁 标记） */
	tag: string;
}
