// src/ui/view/base-task-view.ts
// 业务视图基类 — 筛选 → 时间 → 隐藏 → 排序 → 渲染

import { STATUS_NAMES } from "../../core/config/config";
import { DataManager } from "../../core/data/data-manager";
import { BaseTaskEdit } from "../../core/edit/base-task-edit";
import { EditStore } from "../../core/edit/task-edit-store";
import { formatDate } from "../../core/process/calendar-view-process";
import {
	getDefaultFilter,
	getDefaultHideConfig,
} from "../../core/store/preset/panel-preset";
import { Store } from "../../core/store/store";
import {
	applyHideConfig,
	filterTree,
	filterTreeByDateRange,
	flattenTree,
	TaskTreeNode,
	TreeFilterOptions,
} from "../../core/task/task-tree";
import { GlobalFilter } from "../../type/type";
import { DateUtils } from "../../util/date-utils";
import { TaskNavigator } from "../../util/navigator-utils";
import { renderKanban } from "../main/board/kanban-board";
import { renderMatrix } from "../main/board/matrix-board";
import { renderCalendarView } from "../main/calendar/calendar";
import { renderCards } from "../main/card/grid-card";
import { createViewCard } from "../main/card/view-card";
import { renderDetail } from "../main/chart/detail-chart";
import { renderMarkChart } from "../main/chart/mark-chart";
import { renderTimeChart } from "../main/chart/time-chart";
import { renderGanttWithTree } from "../main/gantt/gantt";
import { renderDepends } from "../main/list/depends-list";
import { renderTaskList } from "../main/list/list";
import { renderOverdueList } from "../main/list/overdue-list";
import { renderPriority } from "../main/list/priority-list";
import { renderRecurring } from "../main/list/recurring-list";
import { renderStatus } from "../main/list/status-list";
import { renderTag } from "../main/list/tag-list";
import { renderTimeList } from "../main/list/time-list";
import { renderTimeline } from "../main/list/timeline-list";
import { renderTaskTree } from "../main/list/tree-list";
import { renderUniqueId } from "../main/list/uniqueId-list";
import { renderTaskTable } from "../main/table/table";
import { Panels } from "../panel/panel";

export abstract class BaseTaskView extends BaseTaskEdit {
	protected container: HTMLElement;
	protected store: Store;
	protected app: any;
	protected unsub?: () => void;
	protected calendarSubView: string = "day";
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

	private _lastActivePresetId: string | null = null;
	private _lastSidebarCollapsed: boolean | null = null;
	private _lastFilterStr: string | null = null;
	private _lastIntervalMode: string | null = null;
	private _needsEditRefresh: boolean = false;
	private previouslyEditedUids: Set<string> = new Set();

	constructor(container: HTMLElement, store: Store, app: any) {
		super();
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
		this.store.setTaskView(this);

		const panels = Panels.getInstance();
		panels.initPanelSubscriptions();

		const state = store.getState();
		this._lastActivePresetId = state.activePresetId;
		this._lastSidebarCollapsed = state.sidebarCollapsed;
		const currentPreset = state.presets.find(
			(p) => p.id === state.activePresetId,
		);
		this._lastFilterStr = JSON.stringify(currentPreset?.filter);
		this._lastIntervalMode = currentPreset?.intervalMode ?? null;

		this.unsub = store.subscribe(() => {
			const state = store.getState();
			const presetChanged =
				this._lastActivePresetId !== state.activePresetId;
			const sidebarChanged =
				this._lastSidebarCollapsed !== state.sidebarCollapsed;
			const currentPreset = state.presets.find(
				(p) => p.id === state.activePresetId,
			);
			const filterStr = JSON.stringify(currentPreset?.filter);
			const filterChanged = this._lastFilterStr !== filterStr;
			const currentIntervalMode = currentPreset?.intervalMode;
			const intervalModeChanged =
				this._lastIntervalMode !== currentIntervalMode;

			this._lastActivePresetId = state.activePresetId;
			this._lastSidebarCollapsed = state.sidebarCollapsed;
			this._lastFilterStr = filterStr;
			this._lastIntervalMode = currentIntervalMode;

			if (
				presetChanged ||
				sidebarChanged ||
				filterChanged ||
				intervalModeChanged
			) {
				this.render();
			}
		});

		this.onResizeBound = (e: MouseEvent) => this.onResize(e);
		this.stopResizeBound = () => this.stopResize();

		this.store.setOnEditCardsChanged(() => {
			this._needsEditRefresh = true;
			requestAnimationFrame(() => this.onEditStateChange());
		});

		this.store.setOnApplyEditContext(() => {
			this.applyEditContext();
			this.previouslyEditedUids.clear();
		});

		this.store.setOnFullRender(() => {
			this.dataManager.invalidateFilterCache();
			this.render();
		});
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

	private async doRender() {
		const scrollKey = this.prepareRender();

		const result = await this.loadData();
		if (!result) {
			this.finishRender(scrollKey);
			return;
		}

		const { nodes, fullTree } = result;
		if (nodes.length === 0) {
			this.renderEmpty();
			this.finishRender(scrollKey);
			return;
		}

		const filtered = this.applyFilters(fullTree);
		if (!filtered) {
			this.finishRender(scrollKey);
			return;
		}

		const { dateFilteredTree, flatNodes } = filtered;
		if (flatNodes.length === 0) {
			this.renderEmpty();
			this.finishRender(scrollKey);
			return;
		}

		const sorted = this.applySorting(flatNodes);
		this.applyEditContext();
		this.renderContent(dateFilteredTree, sorted);
		this.finishRender(scrollKey);
	}

	private prepareRender(): string | null {
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

		this.cleanupSplitLayout();
		if (this.ganttInstance) {
			this.ganttInstance.destroy?.();
			this.ganttInstance = null;
		}

		return scrollKey;
	}

	private async loadData(): Promise<{
		nodes: TaskTreeNode[];
		fullTree: TaskTreeNode;
	} | null> {
		try {
			const { nodes } = await this.dataManager.loadData(this.app);
			const fullTree = this.dataManager.getFullTree();
			return { nodes, fullTree };
		} catch (e) {
			logger.warn("[TaskManage] 加载数据失败:", e);
			this.container.replaceChildren();
			this.container.createDiv({
				text:
					"加载失败：" + (e instanceof Error ? e.message : String(e)),
			});
			return null;
		}
	}

	private applyFilters(fullTree: TaskTreeNode): {
		dateFilteredTree: TaskTreeNode;
		flatNodes: TaskTreeNode[];
	} | null {
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			preset?.filter ?? this.getDefaultFilter();
		const intervalMode = preset?.intervalMode ?? "scheduled-due";

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

		if (this.selectedTreeNode) {
			const newFocus = this.findNodeByUidInTree(
				dateFilteredTree,
				this.selectedTreeNode.uid,
			);
			if (newFocus) {
				this.selectedTreeNode = newFocus;
				this.focusedTreeNode = newFocus;
			}
		}

		let flatNodes: TaskTreeNode[];
		if (this.selectedTreeNode) {
			flatNodes = this.collectNodeTasksDeep(this.selectedTreeNode);
		} else {
			flatNodes = flattenTree(dateFilteredTree);
		}
		flatNodes = flatNodes.filter(
			(n) => n.display && n.uid !== "__task_root__" && n.match,
		);

		return { dateFilteredTree, flatNodes };
	}

	private applySorting(nodes: TaskTreeNode[]): TaskTreeNode[] {
		const preset = this.store.getActivePreset();
		const sort = preset?.sort ?? { type: "", order: "asc" };
		return this.applySort(nodes, sort);
	}

	private renderContent(
		dateFilteredTree: TaskTreeNode,
		sortedNodes: TaskTreeNode[],
	) {
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			preset?.filter ?? this.getDefaultFilter();
		const currentStyle = preset?.viewStyle ?? "table";
		const intervalMode = preset?.intervalMode ?? "scheduled-due";
		const sort = preset?.sort ?? { type: "", order: "asc" };

		this.container.textContent = "";

		if (currentStyle === "tree") {
			const viewContainer = this.container.createDiv({
				cls: "view-content task-view-padding-reset",
			});
			renderTaskTree(viewContainer, {
				root: dateFilteredTree,
				focusRoot: this.focusedTreeNode || undefined,
				hideFolders: activeFilter.hideFolders ?? true,
				onClick: (n: TaskTreeNode) => this.onTaskTreeNavClick(n),
				onDoubleClick: (n: TaskTreeNode) => this.openTaskAtLine(n),
				onRestore: () => this.restoreFocus(),
				sort,
			});
		} else if (currentStyle === "gantt") {
			const viewContainer = this.container.createDiv({
				cls: "view-content task-view-full",
			});
			this.ganttInstance = renderGanttWithTree(
				viewContainer,
				dateFilteredTree,
				{
					onTaskClick: (n: TaskTreeNode) => this.openTaskAtLine(n),
					onRestore: () => this.restoreFocus(),
					onNodeClick: (n: TaskTreeNode) =>
						this.onTaskTreeNavClick(n),
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
				sortedNodes,
			);
		}

		if (this.editStore.getState().editMode) {
			this.previouslyEditedUids = new Set(
				this.editStore.getState().selectedTasks,
			);
		}
	}

	private finishRender(scrollKey: string | null) {
		this.restoreScrollPosition(scrollKey);
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
			cls: "split-layout task-split-layout",
		});

		this.taskTreeNavContainer = layoutContainer.createDiv({
			cls: "task-tree-nav",
		});
		this.taskTreeNavContainer.addClass("task-tree-nav-dynamic");
		this.taskTreeNavContainer.setCssProps({
			"--tree-nav-width": panelCollapsed ? "0px" : panelWidth + "px",
			"--tree-nav-min-width": panelCollapsed ? "0px" : "200px",
			"--tree-nav-border-right": panelCollapsed
				? "none"
				: "1px solid var(--background-modifier-border)",
		});

		if (!panelCollapsed) {
			const treeContent = this.taskTreeNavContainer.createDiv({
				cls: "task-tree-nav-content task-tree-nav-content-inner",
			});

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
				cls: "task-tree-nav-resize task-tree-nav-resize-visible",
			});

			const arrow = document.createElement("span");
			arrow.addClass("task-tree-nav-arrow");
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
					this.resizeHandle.style.setProperty("opacity", "1");
			});
			this.resizeHandle.addEventListener("mouseleave", () => {
				if (!this.isResizing && this.resizeHandle)
					this.resizeHandle.style.setProperty("opacity", "0");
			});
			this.resizeHandle.addEventListener("mousedown", (e) => {
				if (e.target === arrow) return;
				this.startResize(e);
			});
		} else {
			const resizeHandle = layoutContainer.createDiv({
				cls: "task-tree-nav-resize task-tree-nav-resize-hidden",
			});

			const arrow = document.createElement("span");
			arrow.addClass("task-tree-nav-arrow");
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
				resizeHandle.style.setProperty("opacity", "1");
			});
			resizeHandle.addEventListener("mouseleave", () => {
				resizeHandle.style.setProperty("opacity", "0");
			});
			this.resizeHandle = resizeHandle;
		}

		this.rightContentContainer = layoutContainer.createDiv({
			cls: "right-content task-right-content",
		});
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

	refreshSingleCard(node: TaskTreeNode) {
		const searchRoot = this.rightContentContainer || this.container;
		const card = searchRoot.querySelector(
			`[data-uid="${node.uid}"]`,
		) as HTMLElement;
		if (!card?.parentNode) return;

		const newCard = createViewCard(node, {
			compact: false,
			onClick: (n) => this.openTaskAtLine(n),
			onEnterEdit: (n) => this.handleEnterEdit(n),
		});
		card.parentNode.replaceChild(newCard, card);
	}

	updateFocusAfterSave() {
		if (this.selectedTreeNode) {
			const newTree = this.dataManager.getFullTree();
			const newFocus = this.findNodeByUidInTree(
				newTree,
				this.selectedTreeNode.uid,
			);
			if (newFocus) {
				this.selectedTreeNode = newFocus;
				this.focusedTreeNode = newFocus;
			}
		}
	}

	private findNodeByUidInTree(
		root: TaskTreeNode,
		uid: string,
	): TaskTreeNode | null {
		if (root.uid === uid) return root;
		for (const child of root.children) {
			const found = this.findNodeByUidInTree(child, uid);
			if (found) return found;
		}
		return null;
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
		TaskNavigator.openTaskAtLine(this.app, node);
	}

	private toggleTaskTreeNav(collapsed: boolean) {
		const p = this.store.getActivePreset();
		if (!p) return;

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

		this.render();
	}

	private startResize(e: MouseEvent) {
		e.preventDefault();
		this.isResizing = true;
		document.body.addClass("task-cursor-col-resize");
		document.body.addClass("task-select-none");
	}

	private onResize(e: MouseEvent) {
		if (!this.isResizing || !this.taskTreeNavContainer) return;
		const r =
			this.taskTreeNavContainer.parentElement?.getBoundingClientRect();
		if (!r) return;
		this.taskTreeNavContainer.setCssProps({
			"--tree-nav-width":
				Math.min(500, Math.max(200, e.clientX - r.left)) + "px",
		});
	}

	private stopResize() {
		if (!this.isResizing) return;
		this.isResizing = false;
		document.body.removeClass("task-cursor-col-resize");
		document.body.removeClass("task-select-none");
		if (this.taskTreeNavContainer) {
			const w =
				parseInt(
					getComputedStyle(
						this.taskTreeNavContainer,
					).getPropertyValue("--tree-nav-width"),
				) || 280;
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
		const edit = (n: TaskTreeNode) => this.handleEnterEdit(n);
		switch (style) {
			case "table":
				renderTaskTable(container, nodes, { onClick: h });
				break;
			case "list":
				renderTaskList(container, nodes, {
					onClick: h,
					compact: false,
					onEnterEdit: edit,
				});
				break;
			case "cards":
				renderCards(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "status":
				renderStatus(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "priority":
				renderPriority(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "kanban":
				renderKanban(container, nodes);
				break;
			case "matrix":
				renderMatrix(container, nodes);
				break;
			case "recurring":
				renderRecurring(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "time":
				renderTimeList(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "overdue":
				renderOverdueList(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "timeline":
				renderTimeline(container, nodes, {
					onEnterEdit: edit,
				});
				break;
			case "tag":
				renderTag(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "uniqueId":
				renderUniqueId(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "depends":
				renderDepends(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;

			case "calendar": {
				const cc = container.createDiv({
					cls: "calendar-content task-p-0",
				});

				const preset = this.store.getActivePreset();
				const calSubView = preset?.calendarSubView || "day";
				const calSelectedDate = this.calendarSelectedDate || new Date();
				const effectiveRange = DateUtils.getEffectiveDateRange(
					filter.dateRange,
				);

				const updatePreset = (changes: Partial<any>) => {
					const st = this.store.getState();
					const pr = st.presets.find(
						(p) => p.id === st.activePresetId,
					);
					if (pr) {
						this.store.updateSilent({
							presets: st.presets.map((p) =>
								p.id === pr.id ? { ...p, ...changes } : p,
							),
						});
						this.store.saveSilent();
					}
				};

				const handleDayClick = (date: Date) => {
					this.calendarSelectedDate = date;
					updatePreset({ calendarSubView: "day" });
					this.render();
				};

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
					subView: calSubView as
						| "day"
						| "week"
						| "month"
						| "quarter"
						| "year",
					intervalMode,
					onClick: h,
					onSubViewChange: (v) => {
						updatePreset({ calendarSubView: v });
						this.render();
					},
					selectedDate: calSelectedDate,
					dateRange: effectiveRange,
					filterTitle,
					onDayClick: handleDayClick,
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
					dateRange: DateUtils.getEffectiveDateRange(
						filter.dateRange,
					),
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
		this.selectedTreeNode = null;
		this.focusedTreeNode = null;
		this.focusHistory.length = 0;
		this.calendarSubView = "day";
		this.calendarSelectedDate = new Date();
		this._lastFilterStr = null;
		this._lastActivePresetId = null;
		this._lastSidebarCollapsed = null;
		this._lastIntervalMode = null;
		this._needsEditRefresh = false;
		this.previouslyEditedUids.clear();

		this.container.textContent = "";
	}
}
