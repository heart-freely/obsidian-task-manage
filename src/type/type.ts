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
	syncMode: boolean;
	primaryTaskUid: string | null;
}

export interface EditPanelState {
	batchMode: boolean;
	selectedCount: number;
	hasSnapshots: boolean;
	syncMode: boolean;
}

export interface AppState {
	activePresetId: string | null;
	presets: Preset[];
	presetGroups: PresetGroup[];
	sidebarCollapsed: boolean;
	sidebarWidth: number;
	editPanelState?: EditPanelState;
}

// ========== 快照类型 ==========

export interface Snapshot {
	time: string;
	snapshot: Record<string, string>;
}

// ========== 类型安全接口 ==========

/** TaskTreeNode 的最小接口，避免循环依赖 */
export interface TaskTreeNodeLike {
	uid: string;
	type: "file" | "heading" | "list";
	path: string;
	line: number;
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
	text: string;
	display: boolean;
	[key: string]: unknown;
}

export interface EditStoreInterface {
	getState(): EditState;
	subscribePanel(listener: () => void): () => void;
	toggleExpandedButton(buttonKey: string): void;
	applyEdit(markKey: string, value: string | null, sourceUid: string): void;
	applyContentEdit(node: TaskTreeNodeLike, newContent: string): void;
	applyAutoComplete(days?: number): void;
	applySortTags(): void;
	clearPreviews(): void;
	saveCurrent(): Promise<void>;
	saveSingle(node: TaskTreeNodeLike): Promise<void>;
	saveAll(): Promise<void>;
	revertSingle(node: TaskTreeNodeLike): Promise<void>;
	revertSnapshot(index: number): Promise<void>;
	getSnapshots(): Snapshot[];
	clearAllSnapshots(): void;
	toggleSyncMode(): void;
	toggleBatchMode(): void;
	toggleSelection(node: TaskTreeNodeLike): void;
	toggleSelectAll(nodes: TaskTreeNodeLike[]): void;
	enterSingleEditMode(node: TaskTreeNodeLike): void;
	enterBatchMode(): void;
	enterBatchModeFromSingle(node: TaskTreeNodeLike): void;
	exitBatchToReading(): void;
	exitEditMode(save?: boolean, keepSelection?: boolean): void;
	setPrimaryTask(uid: string): void;
	syncToStore(): void;
}

export interface TaskViewInterface {
	toggleBatchMode(): void;
	toggleSelectAll(nodes: TaskTreeNodeLike[]): void;
	refreshEditCards(): void;
}
// ========== 甘特图 SVG 接口 ==========

export interface GanttSvgElement extends SVGSVGElement {
	__redraw?: (
		barPositions: Map<string, { left: number; right: number; y: number }>,
	) => void;
}

// ========== ECharts 实例接口 ==========

export interface EChartsInstance {
	setOption(option: Record<string, unknown>): void;
	dispose(): void;
}

// ========== Obsidian 最小接口 ==========

export interface VaultLike {
	getAbstractFileByPath(path: string): { path: string } | null;
	process(
		file: { path: string },
		fn: (data: string) => string,
	): Promise<void>;
	cachedRead(file: { path: string }): Promise<string>;
	getMarkdownFiles(): Array<{ path: string; name: string }>;
	getAllLoadedFiles(): Array<{ path?: string; children?: unknown[] }>;
}

export interface AppLike {
	vault: VaultLike;
	workspace: {
		on(name: string, callback: (...args: unknown[]) => unknown): void;
		getLeaf(split?: boolean): unknown;
		getLeavesOfType(type: string): unknown[];
		setActiveLeaf(leaf: unknown, options?: { focus?: boolean }): void;
	};
}

// ========== 视图刷新接口 ==========

export interface ManageViewLike {
	refreshView(): void;
}

// ========== 编辑存储接口 ==========

export interface EditStoreLike {
	getState(): {
		batchMode: boolean;
		selectedTasks: Set<string>;
		syncMode: boolean;
	};
	subscribePanel(listener: () => void): () => void;
	toggleSyncMode(): void;
	applySortTags(): void;
	applyAutoComplete(days?: number): void;
	clearPreviews(): void;
	saveCurrent(): void;
	revertSnapshot(idx: number): void;
	clearAllSnapshots(): void;
	getSnapshots(): Array<{ time: string; snapshot: Record<string, string> }>;
}

export interface TaskViewLike {
	toggleBatchMode(): void;
	toggleSelectAll(nodes: Array<{ uid: string }>): void;
	refreshEditCards(): void;
}
