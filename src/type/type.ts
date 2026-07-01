// src/type/type.ts

import type {
	DateMarkKey,
	MarkKey,
	PriorityIcon,
	RepeatCycle,
	TaskStatus,
} from "../core/config/config";

export type { DateMarkKey, MarkKey, PriorityIcon, RepeatCycle, TaskStatus };

export type TaskSource = "file" | "heading" | "list";
export type IntervalMode =
	| "scheduled-due"
	| "starts-done"
	| "any-date"
	| "none";
export type TaskMarks = Record<MarkKey, boolean>;

export interface TaskData {
	rawLine: string;
	status: TaskStatus;
	content: string;
	priority: number;
	repeat: string;
	created: number | null;
	scheduled: number | null;
	starts: number | null;
	due: number | null;
	done: number | null;
	cancelled: number | null;
	id: string;
	forbid: string;
	tag: string;
}

export interface GlobalFilter {
	dateRange: { start: number | null; end: number | null; isAll: boolean };
	statuses: string[];
	includeMarks: string[];
	excludeMarks: string[];
	rootPath: string | null;
	hideFolders?: boolean;
	searchText?: string;
	priorityValues?: string[];
	repeatCycles?: string[];
}

export interface HideConfig {
	hideStatuses: string[];
	hidePriorityValues: string[];
	hideRepeatCycles: string[];
	hideMarks: string[];
	hideSearchText: string;
	hideTableColumns: Record<string, boolean>;
}

export interface Preset {
	id: string;
	name: string;
	groupId: string;
	businessView: string;
	viewStyle: string;
	icon?: string;
	filter: GlobalFilter;
	sort: { type: string; order: "asc" | "desc" };
	toolbarOrder?: string[];
	barVisibility?: Record<string, boolean>;
	tableColumns?: Record<string, boolean>;
	toolbarPanelsCollapsed?: boolean;
	toolbarPanelsHeight?: number;
	useDynamic?: boolean;
	intervalMode?: string;
	taskTreeNavCollapsed?: boolean;
	taskTreeNavWidth?: number;
	hideConfig?: HideConfig;
	calendarSubView?: string;
}

export interface PresetGroup {
	id: string;
	name: string;
	collapsed?: boolean;
	order?: number;
}

export interface EditState {
	editMode: boolean;
	batchMode: boolean;
	selectedTasks: Set<string>;
	previews: Map<string, string>;
	savedTasks: Set<string>;
	expandedButton: string | null;
	syncMode: boolean; // 新增
	primaryTaskUid: string | null; // 新增
}

export interface EditPanelState {
	batchMode: boolean;
	selectedCount: number;
	hasSnapshots: boolean;
	syncMode: boolean; // 新增
}

export interface AppState {
	activePresetId: string | null;
	presets: Preset[];
	presetGroups: PresetGroup[];
	sidebarCollapsed: boolean;
	sidebarWidth: number;
	editPanelState?: EditPanelState;
}

// ========== O7：类型安全接口 ==========

export interface EditStoreInterface {
	getState(): EditState;
	subscribePanel(listener: () => void): void;
	applyEdit(markKey: string, value: string | null): void;
	applyAutoComplete(days?: number): void;
	applySortTags(): void;
	clearPreviews(): void;
	saveCurrent(): void;
	revertSnapshot(index: number): void;
	getSnapshots(): Array<{ time: string; snapshot: Record<string, string> }>;
	toggleSyncMode(): void;
	syncToStore(): void;
}

export interface TaskViewInterface {
	toggleBatchMode(): void;
	toggleSelectAll(nodes: any[]): void;
	refreshEditCards?(): void;
}
