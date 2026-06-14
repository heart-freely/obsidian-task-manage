// src/core/store/preset/base-task-preset.ts
// ui/sidebar/preset/base-task-preset.ts
// 业务视图基类 — 筛选 → 时间 → 隐藏 → 排序 → 渲染（带防抖）
// 编辑功能采用 CSS 类切换，避免 DOM 重建

import { GlobalFilter } from "../../../type/type";
import { renderKanban } from "../../../ui/main/board/kanban-board";
import { renderMatrix } from "../../../ui/main/board/matrix-board";
import { renderCalendarView } from "../../../ui/main/calendar/calendar";
import { getEditContext, setEditContext } from "../../../ui/main/card/card";
import { renderCards } from "../../../ui/main/card/grid-card";
import { renderDetail } from "../../../ui/main/chart/detail-chart";
import { renderMarkChart } from "../../../ui/main/chart/mark-chart";
import { renderTimeChart } from "../../../ui/main/chart/time-chart";
import { renderGanttWithTree } from "../../../ui/main/gantt/gantt";
import { renderDepends } from "../../../ui/main/list/depends-list";
import { renderTaskList } from "../../../ui/main/list/list";
import { renderOverdueList } from "../../../ui/main/list/overdue-list";
import { renderPriority } from "../../../ui/main/list/priority-list";
import { renderRecurring } from "../../../ui/main/list/recurring-list";
import { renderStatus } from "../../../ui/main/list/status-list";
import { renderTag } from "../../../ui/main/list/tag-list";
import { renderTimeList } from "../../../ui/main/list/time-list";
import { renderTimeline } from "../../../ui/main/list/timeline-list";
import { renderTaskTree } from "../../../ui/main/list/tree-list";
import { renderUniqueId } from "../../../ui/main/list/uniqueId-list";
import { renderTaskTable } from "../../../ui/main/table/table";
import { formatDate } from "../../component/calendar-view-process";
import { STATUS_NAMES } from "../../config/config";
import {
	getDefaultFilter,
	getDefaultHideConfig,
} from "../../config/panel-default-config";
import { DataManager } from "../../data/data-manager";
import {
	applyHideConfig,
	filterTree,
	filterTreeByDateRange,
	flattenTree,
	TaskTreeNode,
	TreeFilterOptions,
} from "../../task/task-tree";
import { Store } from "../store";
import { EditStore } from "../task-edit-store";

export abstract class BaseTaskView {
	protected container: HTMLElement;
	protected store: Store;
	protected app: any;
	protected unsub?: () => void;
	protected calendarSubView: string = "month";
	protected calendarSelectedDate: Date = new Date();
	protected dataManager: DataManager;

	protected taskTreeNavContainer: HTMLElement | null = null;
	protected rightContentContainer: HTMLElement | null = null;
	protected resizeHandle: HTMLElement | null = null;
	private isResizing: boolean = false;
	private onResizeBound: ((e: MouseEvent) => void) | null = null;
	private stopResizeBound: (() => void) | null = null;

	protected selectedTreeNode: TaskTreeNode | null = null;
	protected focusedTreeNode: TaskTreeNode | null = null;
	private focusHistory: TaskTreeNode[] = [];

	private renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private static DEBOUNCE_DELAY = 50;

	private ganttInstance: any = null;

	protected editStore: EditStore;

	protected scrollPositions: Map<string, number> = new Map();

	private previouslyEditedUids: Set<string> = new Set();

	private _needsEditRefresh: boolean = false;
	private _lastActivePresetId: string | null = null;
	private _lastSidebarCollapsed: boolean | null = null;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.dataManager = DataManager.getInstance();

		this.editStore = new EditStore(
			this.app,
			(uid) => this.dataManager.getNodeByUid(uid),
			this.store,
		);
		this.store.setEditStore(this.editStore);

		// 初始化追踪变量
		const state = store.getState();
		this._lastActivePresetId = state.activePresetId;
		this._lastSidebarCollapsed = state.sidebarCollapsed;

		this.unsub = store.subscribe(() => {
			const state = store.getState();
			const presetChanged =
				this._lastActivePresetId !== state.activePresetId;
			const sidebarChanged =
				this._lastSidebarCollapsed !== state.sidebarCollapsed;

			this._lastActivePresetId = state.activePresetId;
			this._lastSidebarCollapsed = state.sidebarCollapsed;

			if (presetChanged || sidebarChanged) {
				this.render();
			}
		});

		this.onResizeBound = (e: MouseEvent) => this.onResize(e);
		this.stopResizeBound = () => this.stopResize();
	}

	private getEditSearchRoot(): HTMLElement {
		return this.rightContentContainer || this.container;
	}

	private onEditStateChange() {
		const state = this.editStore.getState();
		const currentUids = new Set(state.selectedTasks);

		if (!state.editMode) {
			requestAnimationFrame(() => {
				this.restoreEditedCards();
				this.previouslyEditedUids.clear();
			});
			return;
		}

		for (const uid of this.previouslyEditedUids) {
			if (!currentUids.has(uid)) {
				this.setCardReadMode(uid);
			}
		}

		for (const uid of currentUids) {
			if (!this.previouslyEditedUids.has(uid)) {
				this.setCardEditMode(uid);
			} else {
				const uidCopy = uid;
				requestAnimationFrame(() => {
					this.refreshCardEditContent(uidCopy);
				});
			}
		}

		this.applyEditContext();
		this.previouslyEditedUids = new Set(currentUids);
	}

	private setCardEditMode(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;

		const node = this.dataManager.getNodeByUid(uid);
		if (!node) return;

		const editCtx = getEditContext();
		if (!editCtx) return;

		card.classList.add("task-item-editing");
		card.style.cursor = "default";
		this.refreshCardEditContent(uid);
	}

	private setCardReadMode(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"].task-item-editing`,
		) as HTMLElement;
		if (!card) return;

		card.classList.remove("task-item-editing");
		card.style.cursor = "pointer";

		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			descEl.style.color = "var(--text-normal)";
			descEl.style.cursor = "pointer";
			descEl.removeAttribute("contenteditable");
		}

		const previewRow = card.querySelector(
			".task-preview-row",
		) as HTMLElement;
		if (previewRow) {
			previewRow.innerHTML = "";
			previewRow.style.display = "none";
			previewRow.style.background = "";
		}

		// 刷新编辑栏，隐藏无值按钮
		const editBar = card.querySelector(".task-edit-bar");
		if (editBar && editBar.parentNode) {
			const node = this.dataManager.getNodeByUid(uid);
			if (node) {
				import("../../../util/edit-utils").then(({ createEditBar }) => {
					const newEditBar = createEditBar(node, {
						expandedButton: null,
						previewText: null,
						isEditing: false,
						onEdit: () => {},
					});
					try {
						editBar.parentNode!.replaceChild(newEditBar, editBar);
					} catch (e) {
						// 忽略
					}
				});
			}
		}
	}

	private refreshCardEditContent(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"].task-item-editing`,
		) as HTMLElement;
		if (!card) return;

		const node = this.dataManager.getNodeByUid(uid);
		if (!node) return;

		const editCtx = getEditContext();
		if (!editCtx) return;

		const previewText = editCtx.previews.get(uid);
		const hasEdits = previewText !== null && previewText !== node.rawLine;
		const saved = editCtx.savedTasks.has(node.uid);

		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			descEl.style.color = hasEdits
				? "var(--text-accent)"
				: "var(--text-normal)";
			descEl.style.cursor = "text";
		}

		let previewRow = card.querySelector(".task-preview-row") as HTMLElement;
		if (previewRow) previewRow.remove();
		if (previewText) {
			import("../../../util/edit-utils").then(({ createPreviewRow }) => {
				const newPreviewRow = createPreviewRow(
					previewText,
					saved,
					saved ? null : () => editCtx.onSave(node),
					saved ? () => editCtx.onRevert(node) : null,
					hasEdits,
					hasEdits && editCtx.onRestore
						? () => editCtx.onRestore!(node)
						: null,
				);
				card.appendChild(newPreviewRow);
			});
		}

		const editBar = card.querySelector(".task-edit-bar");
		if (editBar && editBar.parentNode) {
			import("../../../util/edit-utils").then(({ createEditBar }) => {
				const newEditBar = createEditBar(node, {
					expandedButton: editCtx.expandedButton,
					previewText: previewText ?? null,
					isEditing: true,
					onEdit: (n, markKey, value) => {
						if (markKey.endsWith("_toggle")) {
							editCtx.onEdit(n, markKey, null);
						} else {
							editCtx.onEdit(n, markKey, value);
						}
					},
				});
				try {
					editBar.parentNode!.replaceChild(newEditBar, editBar);
				} catch (e) {
					// 忽略
				}
			});
		}
	}

	private restoreEditedCards() {
		const searchRoot = this.getEditSearchRoot();
		const uids = Array.from(this.previouslyEditedUids);
		for (const uid of uids) {
			this.setCardReadMode(uid);
		}
	}

	getDefaultFilter(): GlobalFilter {
		return getDefaultFilter();
	}

	async render(): Promise<void> {
		if (this.renderDebounceTimer) clearTimeout(this.renderDebounceTimer);
		return new Promise<void>((resolve) => {
			this.renderDebounceTimer = setTimeout(async () => {
				this.renderDebounceTimer = null;
				await this.doRender();
				resolve();
			}, BaseTaskView.DEBOUNCE_DELAY);
		});
	}

	protected renderImmediate(): void {
		if (this.renderDebounceTimer) clearTimeout(this.renderDebounceTimer);
		this.renderDebounceTimer = null;
		this.doRender();
	}

	private applyEditContext() {
		const state = this.editStore.getState();
		if (state.editMode) {
			setEditContext({
				editMode: true,
				batchMode: state.batchMode,
				selectedTasks: state.selectedTasks,
				previews: state.previews,
				savedTasks: state.savedTasks,
				expandedButton: state.expandedButton,
				onEdit: (node, markKey, value) => {
					if (markKey.endsWith("_toggle")) {
						this.editStore.toggleExpandedButton(
							markKey.replace("_toggle", ""),
						);
					} else {
						this.editStore.applyEdit(markKey, value);
					}
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				},
				onContentEdit: (node, newContent) => {
					this.editStore.applyContentEdit(node, newContent);
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				},
				onCheckChange: (node, checked) => {
					this.editStore.toggleSelection(node);
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				},
				onSave: (node) => {
					this.editStore.saveSingle(node);
				},
				onRevert: (node) => {
					this.editStore.revertSingle(node);
				},
				onRestore: (node) => {
					this.editStore.applyContentEdit(
						node,
						node.rawLine || node.content || node.text,
					);
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				},
			});
		} else {
			setEditContext(null);
		}
	}

	private onGlobalClick = (e: MouseEvent) => {
		const target = e.target as HTMLElement;
		const es = this.editStore;
		const isEditMode = es.getState().editMode;
		const isBatchMode = es.getState().batchMode;

		if (isEditMode) {
			if (
				target.closest(".task-edit-bar") ||
				target.closest(".task-preview-row") ||
				target.closest(".organize-edit-toolbar") ||
				target.closest(".organize-bottom-bar") ||
				target.closest(".organize-mode-row") ||
				target.getAttribute("contenteditable") === "true"
			) {
				return;
			}

			if (isBatchMode && target.closest(".panel-host")) {
				if (
					target.closest("button") ||
					target.closest("input") ||
					target.closest("select") ||
					target.closest(".panel-header-btn") ||
					target.closest(".panel-eye")
				) {
					return;
				}
			}

			if (target.closest(".panel-host")) {
				es.exitEditMode(false);
				requestAnimationFrame(() => this.onEditStateChange());
				return;
			}

			if (target.closest(".manage-sidebar")) {
				if (
					target.closest(".side-top-row") ||
					target.closest("[title*='折叠']") ||
					target.closest("[title*='展开']")
				) {
					return;
				}
				es.exitEditMode(false);
				requestAnimationFrame(() => this.onEditStateChange());
				return;
			}

			const taskItem = target.closest(".task-item") as HTMLElement;
			if (taskItem) {
				const uid = taskItem.getAttribute("data-uid");
				if (uid) {
					const node = this.dataManager.getNodeByUid(uid);
					if (node) {
						const clickedOnContent =
							target.closest(".task-desc") ||
							target.closest(".task-edit-bar") ||
							target.closest(".task-preview-row") ||
							target.closest(".task-meta") ||
							(target.tagName === "INPUT" &&
								target.getAttribute("type") === "checkbox");

						if (clickedOnContent) {
							es.enterEditMode(node);
							this._needsEditRefresh = true;
							requestAnimationFrame(() =>
								this.onEditStateChange(),
							);
							return;
						}

						es.exitEditMode(false);
						requestAnimationFrame(() => this.onEditStateChange());
						return;
					}
				}
			}

			es.exitEditMode(false);
			requestAnimationFrame(() => this.onEditStateChange());
			return;
		}

		const taskItem = target.closest(".task-item") as HTMLElement;
		if (taskItem) {
			const uid = taskItem.getAttribute("data-uid");
			if (!uid) return;
			const node = this.dataManager.getNodeByUid(uid);
			if (!node) return;

			es.enterEditMode(node);
			this._needsEditRefresh = true;
			requestAnimationFrame(() => this.onEditStateChange());
			return;
		}
	};

	private getScrollContainer(): HTMLElement | null {
		if (this.rightContentContainer) {
			return this.rightContentContainer;
		}
		const viewContent = this.container.querySelector(
			".view-content",
		) as HTMLElement;
		if (
			viewContent &&
			viewContent.scrollHeight > viewContent.clientHeight
		) {
			return viewContent;
		}
		if (this.container.scrollHeight > this.container.clientHeight) {
			return this.container;
		}
		return null;
	}

	private getScrollKey(): string {
		const preset = this.store.getActivePreset();
		if (!preset) return "default";
		return `${preset.id}-${preset.viewStyle}-${preset.businessView}`;
	}

	private getRootElement(): HTMLElement | null {
		return this.container.closest(".manage-root") as HTMLElement;
	}

	private async doRender() {
		const scrollContainer = this.getScrollContainer();
		const scrollKey = this.getScrollKey();
		if (scrollContainer && scrollKey) {
			this.scrollPositions.set(scrollKey, scrollContainer.scrollTop);
		}

		const rootEl = this.getRootElement();
		if (rootEl) {
			rootEl.removeEventListener("click", this.onGlobalClick);
		} else {
			this.container.removeEventListener("click", this.onGlobalClick);
		}

		this.container.empty();
		this.cleanupSplitLayout();
		if (this.ganttInstance) {
			this.ganttInstance.destroy?.();
			this.ganttInstance = null;
		}

		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			preset?.filter ?? this.getDefaultFilter();
		const currentStyle = preset?.viewStyle ?? "table";
		const intervalMode = preset?.intervalMode ?? "scheduled-due";

		try {
			const { nodes } = await this.dataManager.loadData(this.app);
			if (nodes.length === 0) {
				this.renderEmpty();
				this.restoreScrollPosition(scrollKey);
				this.bindClickEvent();
				return;
			}

			const fullTree = this.dataManager.getFullTree();

			const panelOptions: TreeFilterOptions = {
				statuses: activeFilter.statuses,
				searchText: activeFilter.searchText,
				priorityValues: activeFilter.priorityValues,
				repeatCycles: activeFilter.repeatCycles,
				includeMarks: activeFilter.includeMarks,
			};
			const panelFilteredTree = filterTree(fullTree, panelOptions);
			const dateFilteredTree = filterTreeByDateRange(
				panelFilteredTree,
				activeFilter.dateRange,
				intervalMode,
			);

			const hideConfig = preset?.hideConfig ?? getDefaultHideConfig();
			applyHideConfig(dateFilteredTree, hideConfig);

			let flatNodes: TaskTreeNode[];
			if (this.selectedTreeNode) {
				flatNodes = this.collectNodeTasksDeep(this.selectedTreeNode);
			} else {
				flatNodes = flattenTree(dateFilteredTree);
			}
			flatNodes = flatNodes.filter((n) => {
				if (!n.display || n.uid === "__task_root__") return false;
				if (!n.match) return false;
				return true;
			});

			if (flatNodes.length === 0) {
				this.renderEmpty();
				this.restoreScrollPosition(scrollKey);
				this.bindClickEvent();
				return;
			}

			const sort = preset?.sort ?? { type: "status", order: "asc" };
			const sorted = this.applySort(flatNodes, sort);

			this.applyEditContext();

			if (currentStyle === "tree") {
				const viewContainer = this.container.createDiv({
					cls: "view-content",
				});
				viewContainer.style.padding = "0";
				viewContainer.style.margin = "0";
				renderTaskTree(viewContainer, {
					root: dateFilteredTree,
					focusRoot: this.focusedTreeNode || undefined,
					hideFolders: activeFilter.hideFolders ?? true,
					onClick: (node: TaskTreeNode) =>
						this.onTaskTreeNavClick(node),
					onDoubleClick: (node: TaskTreeNode) =>
						this.openTaskAtLine(node),
					onRestore: () => this.restoreFocus(),
					sort,
				});
			} else if (currentStyle === "gantt") {
				const viewContainer = this.container.createDiv({
					cls: "view-content",
				});
				viewContainer.style.cssText = "height:100%;overflow:hidden;";
				this.ganttInstance = renderGanttWithTree(
					viewContainer,
					dateFilteredTree,
					{
						onTaskClick: (node: TaskTreeNode) =>
							this.openTaskAtLine(node),
						onRestore: () => this.restoreFocus(),
						onNodeClick: (node: TaskTreeNode) =>
							this.onTaskTreeNavClick(node),
						intervalMode,
						sort: sort as { type: string; order: "asc" | "desc" },
						dateRange: activeFilter.dateRange,
						focusRoot: this.focusedTreeNode || undefined,
					},
				);
			} else {
				this.renderSplitLayout(
					dateFilteredTree,
					currentStyle,
					activeFilter,
					intervalMode,
					sort,
					sorted,
				);
			}

			if (this.editStore.getState().editMode) {
				this.previouslyEditedUids = new Set(
					this.editStore.getState().selectedTasks,
				);
			}

			this.restoreScrollPosition(scrollKey);
		} catch (e) {
			console.warn("[TaskManage] 视图渲染失败:", e);
			this.container.createDiv({
				text:
					"加载失败：" + (e instanceof Error ? e.message : String(e)),
			});
		}

		this.bindClickEvent();
	}

	private bindClickEvent() {
		setTimeout(() => {
			const rootEl = this.getRootElement();
			if (rootEl) {
				rootEl.addEventListener("click", this.onGlobalClick);
			} else {
				this.container.addEventListener("click", this.onGlobalClick);
			}
		}, 100);
	}

	private restoreScrollPosition(scrollKey: string | null) {
		if (!scrollKey) return;
		const savedScrollTop = this.scrollPositions.get(scrollKey);
		if (savedScrollTop === undefined) return;
		requestAnimationFrame(() => {
			const newScrollContainer = this.getScrollContainer();
			if (newScrollContainer) {
				newScrollContainer.scrollTop = savedScrollTop;
			}
		});
	}

	private restoreFocus() {
		this.focusHistory.pop();
		if (this.focusHistory.length > 0) {
			this.focusedTreeNode =
				this.focusHistory[this.focusHistory.length - 1];
			this.selectedTreeNode = this.focusedTreeNode;
		} else {
			this.focusedTreeNode = null;
			this.selectedTreeNode = null;
		}
		this.render();
	}

	private collectNodeTasksDeep(node: TaskTreeNode): TaskTreeNode[] {
		const tasks: TaskTreeNode[] = [];
		const seen = new Set<string>();
		function walk(n: TaskTreeNode) {
			if (!seen.has(n.uid)) {
				seen.add(n.uid);
				tasks.push(n);
			}
			for (const child of n.children) walk(child);
		}
		walk(node);
		return tasks;
	}

	private renderSplitLayout(
		displayTree: TaskTreeNode,
		viewStyle: string,
		filter: GlobalFilter,
		intervalMode: string,
		sort: { type: string; order: string },
		sortedNodes: TaskTreeNode[],
	) {
		const preset = this.store.getActivePreset();
		const panelCollapsed = preset?.taskTreeNavCollapsed ?? false;
		const panelWidth = preset?.taskTreeNavWidth ?? 280;

		const layoutContainer = this.container.createDiv({
			cls: "split-layout",
		});
		layoutContainer.style.cssText =
			"display:flex;height:100%;position:relative;overflow:hidden;";

		this.taskTreeNavContainer = layoutContainer.createDiv({
			cls: "task-tree-nav",
		});
		this.taskTreeNavContainer.style.cssText = `width:${panelCollapsed ? "0px" : panelWidth + "px"};min-width:${panelCollapsed ? "0px" : "200px"};max-width:500px;border-right:${panelCollapsed ? "none" : "1px solid var(--background-modifier-border)"};background:var(--background-primary);overflow:hidden;transition:width 0.2s ease,min-width 0.2s ease;display:flex;flex-direction:column;flex-shrink:0;`;

		if (!panelCollapsed) {
			const treeContent = this.taskTreeNavContainer.createDiv({
				cls: "task-tree-nav-content",
			});
			treeContent.style.cssText =
				"flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 0;";

			renderTaskTree(treeContent, {
				root: displayTree,
				focusRoot: this.focusedTreeNode || undefined,
				hideFolders: filter.hideFolders ?? true,
				onClick: (node: TaskTreeNode) => this.onTaskTreeNavClick(node),
				onDoubleClick: (node: TaskTreeNode) =>
					this.openTaskAtLine(node),
				onRestore: () => this.restoreFocus(),
				sort,
			});

			this.resizeHandle = layoutContainer.createDiv({
				cls: "task-tree-nav-resize",
			});
			this.resizeHandle.style.cssText =
				"width:8px;min-width:8px;cursor:col-resize;background:rgba(128,128,128,0.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;flex-shrink:0;position:relative;";

			const arrow = document.createElement("span");
			arrow.style.cssText =
				"cursor:pointer;font-size:8px;color:rgba(255,255,255,0.8);line-height:1;user-select:none;writing-mode:vertical-lr;";
			arrow.textContent = "◀";
			arrow.title = "折叠任务树";
			arrow.addEventListener("mousedown", (e) => {
				e.stopPropagation();
				e.preventDefault();
			});
			arrow.addEventListener("click", (e) => {
				e.stopPropagation();
				this.toggleTaskTreeNav(true);
			});
			this.resizeHandle.appendChild(arrow);

			this.resizeHandle.addEventListener("mouseenter", () => {
				if (!this.isResizing && this.resizeHandle)
					this.resizeHandle.style.opacity = "1";
			});
			this.resizeHandle.addEventListener("mouseleave", () => {
				if (!this.isResizing && this.resizeHandle)
					this.resizeHandle.style.opacity = "0";
			});
			this.resizeHandle.addEventListener("mousedown", (e) => {
				if (e.target === arrow) return;
				this.startResize(e);
			});
		} else {
			const resizeHandle = layoutContainer.createDiv({
				cls: "task-tree-nav-resize",
			});
			resizeHandle.style.cssText =
				"width:8px;min-width:8px;cursor:col-resize;background:rgba(128,128,128,0.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;flex-shrink:0;position:relative;";

			const arrow = document.createElement("span");
			arrow.style.cssText =
				"cursor:pointer;font-size:8px;color:rgba(255,255,255,0.8);line-height:1;user-select:none;writing-mode:vertical-lr;";
			arrow.textContent = "▶";
			arrow.title = "展开任务树";
			arrow.addEventListener("mousedown", (e) => {
				e.stopPropagation();
				e.preventDefault();
			});
			arrow.addEventListener("click", (e) => {
				e.stopPropagation();
				this.toggleTaskTreeNav(false);
			});
			resizeHandle.appendChild(arrow);

			resizeHandle.addEventListener("mouseenter", () => {
				resizeHandle.style.opacity = "1";
			});
			resizeHandle.addEventListener("mouseleave", () => {
				resizeHandle.style.opacity = "0";
			});

			this.resizeHandle = resizeHandle;
		}

		this.rightContentContainer = layoutContainer.createDiv({
			cls: "right-content",
		});
		this.rightContentContainer.style.cssText =
			"flex:1;overflow:auto;min-width:0;padding:0;";
		this.renderByStyle(
			this.rightContentContainer,
			sortedNodes,
			viewStyle,
			filter,
			intervalMode,
			displayTree,
			sort,
		);

		document.addEventListener("mousemove", this.onResizeBound!);
		document.addEventListener("mouseup", this.stopResizeBound!);
	}

	private onTaskTreeNavClick(node: TaskTreeNode) {
		if (this.focusedTreeNode === node) {
			this.restoreFocus();
			return;
		}
		this.focusHistory.push(node);
		this.focusedTreeNode = node;
		this.selectedTreeNode = node;
		this.render();
	}

	protected openTaskAtLine(node: TaskTreeNode) {
		if (!node?.path) return;
		const file = this.app.vault.getAbstractFileByPath(node.path);
		if (!file) return;
		const targetLine = node.line;

		const leaf = this.app.workspace.getLeaf(false);
		leaf.openFile(file, { active: true }).then(() => {
			const tryScroll = (retries: number) => {
				const editor = leaf.view?.editor;
				if (!editor && retries > 0) {
					setTimeout(() => tryScroll(retries - 1), 250);
					return;
				}
				if (!editor) return;

				const lineCount = editor.lineCount();
				const clampedLine = Math.min(targetLine, lineCount - 1);

				editor.setCursor({ line: clampedLine, ch: 0 });
				editor.scrollIntoView(
					{
						from: { line: clampedLine, ch: 0 },
						to: {
							line: Math.min(clampedLine + 10, lineCount - 1),
							ch: 0,
						},
					},
					true,
				);
				editor.setSelection(
					{ line: clampedLine, ch: 0 },
					{
						line: clampedLine,
						ch: editor.getLine(clampedLine)?.length || 0,
					},
				);
			};
			setTimeout(() => tryScroll(8), 300);
		});
	}

	private toggleTaskTreeNav(collapsed: boolean) {
		const p = this.store.getActivePreset();
		if (!p) return;

		if (this.taskTreeNavContainer) {
			if (collapsed) {
				this.taskTreeNavContainer.style.width = "0px";
				this.taskTreeNavContainer.style.minWidth = "0px";
				this.taskTreeNavContainer.style.borderRight = "none";
			} else {
				const width = p.taskTreeNavWidth || 280;
				this.taskTreeNavContainer.style.width = width + "px";
				this.taskTreeNavContainer.style.minWidth = "200px";
				this.taskTreeNavContainer.style.borderRight =
					"1px solid var(--background-modifier-border)";
			}
		}

		this.store.updateSilent({
			presets: this.store
				.getState()
				.presets.map((x) =>
					x.id === p.id
						? ({ ...x, taskTreeNavCollapsed: collapsed } as any)
						: x,
				),
		});
		this.store.saveSilent();
	}

	private startResize(e: MouseEvent) {
		e.preventDefault();
		this.isResizing = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	}

	private onResize(e: MouseEvent) {
		if (!this.isResizing || !this.taskTreeNavContainer) return;
		const r =
			this.taskTreeNavContainer.parentElement?.getBoundingClientRect();
		if (!r) return;
		this.taskTreeNavContainer.style.width =
			Math.min(500, Math.max(200, e.clientX - r.left)) + "px";
	}

	private stopResize() {
		if (!this.isResizing) return;
		this.isResizing = false;
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
		if (this.taskTreeNavContainer) {
			const w = parseInt(this.taskTreeNavContainer.style.width) || 280;
			const p = this.store.getActivePreset();
			if (p) {
				this.store.updateSilent({
					presets: this.store
						.getState()
						.presets.map((x) =>
							x.id === p.id
								? ({ ...x, taskTreeNavWidth: w } as any)
								: x,
						),
				});
				this.store.saveSilent();
			}
		}
	}

	private cleanupSplitLayout() {
		if (this.onResizeBound)
			document.removeEventListener("mousemove", this.onResizeBound);
		if (this.stopResizeBound)
			document.removeEventListener("mouseup", this.stopResizeBound);
		this.taskTreeNavContainer = null;
		this.rightContentContainer = null;
		this.resizeHandle = null;
		this.isResizing = false;
	}

	protected renderEmpty() {
		this.container.createDiv({ text: "没有符合条件的任务" });
	}

	protected renderByStyle(
		container: HTMLElement,
		nodes: TaskTreeNode[],
		style: string,
		filter: GlobalFilter,
		intervalMode: string,
		panelFilteredTree?: TaskTreeNode,
		sort?: { type: string; order: string },
	) {
		const h = (n: TaskTreeNode) => this.openTaskAtLine(n);
		switch (style) {
			case "table":
				renderTaskTable(container, nodes, { onClick: h });
				break;
			case "list":
				renderTaskList(container, nodes, {
					onClick: h,
					compact: false,
				});
				break;
			case "cards":
				renderCards(container, nodes, { onClick: h });
				break;
			case "status":
				renderStatus(container, nodes, { onClick: h });
				break;
			case "priority":
				renderPriority(container, nodes, { onClick: h });
				break;
			case "kanban":
				renderKanban(container, nodes);
				break;
			case "matrix":
				renderMatrix(container, nodes);
				break;
			case "recurring":
				renderRecurring(container, nodes, { onClick: h });
				break;
			case "time":
				renderTimeList(container, nodes, { onClick: h });
				break;
			case "overdue":
				renderOverdueList(container, nodes, { onClick: h });
				break;
			case "timeline":
				renderTimeline(container, nodes);
				break;
			case "tag":
				renderTag(container, nodes, { onClick: h });
				break;
			case "uniqueId":
				renderUniqueId(container, nodes, { onClick: h });
				break;
			case "depends":
				renderDepends(container, nodes, { onClick: h });
				break;
			case "calendar": {
				const cc = container.createDiv({ cls: "calendar-content" });
				cc.style.padding = "0";

				const titleParts: string[] = [];
				if (
					intervalMode !== "none" &&
					filter.dateRange &&
					!filter.dateRange.isAll &&
					filter.dateRange.start &&
					filter.dateRange.end
				) {
					titleParts.push(
						`${formatDate(new Date(filter.dateRange.start))} ~ ${formatDate(new Date(filter.dateRange.end))}`,
					);
				} else if (intervalMode === "none") {
					titleParts.push("任意时间");
				}
				if (filter.statuses && filter.statuses.length > 0) {
					titleParts.push(
						filter.statuses
							.map((s: string) => STATUS_NAMES[s] || s)
							.join("、"),
					);
				}
				if (intervalMode === "any-date") {
					titleParts.push("任意时间");
				} else if (intervalMode === "scheduled-due") {
					titleParts.push("计划~截止");
				} else if (intervalMode === "starts-done") {
					titleParts.push("开始~取消/完成");
				}
				const listCount = nodes.length;
				const filterTitle =
					titleParts.join(" · ") + ` · ${listCount}个任务`;

				renderCalendarView(cc, nodes, {
					subView: this.calendarSubView as
						| "day"
						| "week"
						| "month"
						| "quarter"
						| "year",
					intervalMode,
					onClick: h,
					onSubViewChange: (v) => {
						this.calendarSubView = v;
						this.render();
					},
					onDaySelect: (date) => {
						this.calendarSelectedDate = date;
					},
					selectedDate: this.calendarSelectedDate || new Date(),
					dateRange: filter.dateRange,
					filterTitle,
				});
				break;
			}
			case "mark":
				renderMarkChart(container, nodes);
				break;
			case "timeChart":
				renderTimeChart(container, nodes);
				break;
			case "detail":
				renderDetail(container, nodes, {
					dateRange: filter.dateRange,
					intervalMode: intervalMode,
				});
				break;
			default:
				container.createDiv({ text: `未支持的视图样式：${style}` });
		}
	}

	protected applySort(
		nodes: TaskTreeNode[],
		sort: { type: string; order: string },
	): TaskTreeNode[] {
		const s = [...nodes];
		const o = sort.order === "asc" ? 1 : -1;
		s.sort((a, b) => {
			const va = this.getSortValue(a, sort.type),
				vb = this.getSortValue(b, sort.type);
			if (va === vb) return 0;
			if (va === null) return 1;
			if (vb === null) return -1;
			return typeof va === "string"
				? va.localeCompare(vb) * o
				: ((va as number) - (vb as number)) * o;
		});
		return s;
	}

	private getSortValue(
		node: TaskTreeNode,
		type: string,
	): string | number | null {
		switch (type) {
			case "status": {
				const so: Record<string, number> = {
					none: -1,
					todo: 0,
					scheduled: 1,
					"in-progress": 2,
					cancelled: 3,
					completed: 4,
				};
				return so[node.status] ?? 5;
			}
			case "description":
				return (node.content || node.text || "").toLowerCase();
			case "priority":
				return node.priority;
			case "scheduled":
				return node.scheduled;
			case "due":
				return node.due;
			case "created":
				return node.created;
			case "starts":
				return node.starts;
			case "done":
				return node.done;
			case "cancelled":
				return node.cancelled;
			default:
				return (node as any)[type] ?? null;
		}
	}

	destroy() {
		if (this.unsub) this.unsub();
		if (this.renderDebounceTimer) clearTimeout(this.renderDebounceTimer);

		const rootEl = this.getRootElement();
		if (rootEl) {
			rootEl.removeEventListener("click", this.onGlobalClick);
		} else {
			this.container.removeEventListener("click", this.onGlobalClick);
		}

		if (this.ganttInstance) {
			this.ganttInstance.destroy?.();
			this.ganttInstance = null;
		}
		this.cleanupSplitLayout();
		this.scrollPositions.clear();
		this.previouslyEditedUids.clear();
	}
}
