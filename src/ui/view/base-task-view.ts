// src/ui/view/base-task-view.ts

import { STATUS_NAMES } from "../../core/config/config";
import { DataManager } from "../../core/data/data-manager";
import { BaseTaskEdit } from "../../core/edit/base-task-edit";
import { EditStore } from "../../core/edit/task-edit-store";
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
} from "../../core/task/task-tree";
import { AppLike, GlobalFilter } from "../../type/type";
import { DateUtils } from "../../util/date-utils";
import logger from "../../util/logger";
import { TaskNavigator } from "../../util/navigator-utils";
import { renderKanban } from "../main/board/kanban-board";
import { renderMatrix } from "../main/board/matrix-board";
import {
	invalidateCalendarCache,
	renderCalendarView,
} from "../main/calendar/calendar";
import { formatDate } from "../main/calendar/calendar-view-process";
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

interface GanttInstance {
	taskMap: Map<string, TaskTreeNode>;
	redraw: () => Promise<void>;
	destroy: () => void;
}

interface EditorApp {
	vault: {
		getAbstractFileByPath(path: string): { path: string } | null;
		process(
			file: { path: string },
			fn: (data: string) => string,
		): Promise<void>;
		cachedRead(file: { path: string }): Promise<string>;
		getMarkdownFiles(): Array<{ path: string; name: string }>;
		getAllLoadedFiles(): Array<{ path?: string; children?: unknown[] }>;
	};
}

export abstract class BaseTaskView extends BaseTaskEdit {
	protected container: HTMLElement;
	protected store: Store;
	protected app: unknown;
	protected unsub?: () => void;
	protected calendarSubView = "day";
	protected calendarSelectedDate = new Date();
	protected dataManager: DataManager;
	protected taskTreeNavContainer: HTMLElement | null = null;
	protected rightContentContainer: HTMLElement | null = null;
	protected resizeHandle: HTMLElement | null = null;
	private isResizing = false;
	private onResizeBound: ((e: MouseEvent) => void) | null = null;
	private stopResizeBound: (() => void) | null = null;
	protected selectedTreeNode: TaskTreeNode | null = null;
	protected focusedTreeNode: TaskTreeNode | null = null;
	private focusHistory: TaskTreeNode[] = [];
	private renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private static readonly DEBOUNCE_DELAY = 50;
	private ganttInstance: GanttInstance | null = null;
	protected editStore: EditStore;
	protected scrollPositions = new Map<string, number>();
	private _lastActivePresetId: string | null = null;
	private _lastSidebarCollapsed: boolean | null = null;
	private _lastFilterStr: string | null = null;
	private _lastIntervalMode: string | null = null;

	constructor(container: HTMLElement, store: Store, app: unknown) {
		super();
		this.container = container;
		this.store = store;
		this.app = app;
		this.dataManager = DataManager.getInstance();
		this.editStore = new EditStore(
			this.app as EditorApp,
			(uid: string) => this.dataManager.getNodeByUid(uid),
			this.store,
		);
		this.store.setEditStore(this.editStore);
		this.store.setTaskView(this);
		Panels.getInstance().initPanelSubscriptions();
		const state = store.getState();
		this._lastActivePresetId = state.activePresetId;
		this._lastSidebarCollapsed = state.sidebarCollapsed;
		const cp = state.presets.find((p) => p.id === state.activePresetId);
		this._lastFilterStr = JSON.stringify(cp?.filter);
		this._lastIntervalMode = cp?.intervalMode ?? null;
		this.unsub = store.subscribe(() => {
			const cs = store.getState();
			if (
				this._lastActivePresetId !== cs.activePresetId ||
				this._lastSidebarCollapsed !== cs.sidebarCollapsed ||
				this._lastFilterStr !==
					JSON.stringify(
						cs.presets.find((p) => p.id === cs.activePresetId)
							?.filter,
					) ||
				this._lastIntervalMode !==
					(cs.presets.find((p) => p.id === cs.activePresetId)
						?.intervalMode ?? null)
			) {
				this._lastActivePresetId = cs.activePresetId;
				this._lastSidebarCollapsed = cs.sidebarCollapsed;
				const ap = cs.presets.find((p) => p.id === cs.activePresetId);
				this._lastFilterStr = JSON.stringify(ap?.filter);
				this._lastIntervalMode = ap?.intervalMode ?? null;
				void this.render();
			}
		});
		this.onResizeBound = (e) => this.onResize(e);
		this.stopResizeBound = () => this.stopResize();
		this.store.setOnEditCardsChanged(() => {
			this._needsEditRefresh = true;
			window.requestAnimationFrame(() => this.onEditStateChange());
		});
		this.store.setOnApplyEditContext(() => {
			this.applyEditContext();
			this.previouslyEditedUids.clear();
		});
		this.store.setOnFullRender(() => {
			this.dataManager.invalidateFilterCache();
			invalidateCalendarCache();
			void this.render();
		});
	}

	getDefaultFilter(): GlobalFilter {
		return getDefaultFilter();
	}

	async render(): Promise<void> {
		if (this.renderDebounceTimer)
			window.clearTimeout(this.renderDebounceTimer);
		return new Promise<void>((resolve) => {
			this.renderDebounceTimer = window.setTimeout(() => {
				this.renderDebounceTimer = null;
				this.doRender().then(resolve).catch(resolve);
			}, BaseTaskView.DEBOUNCE_DELAY);
		});
	}

	private async doRender(): Promise<void> {
		const sk = this.prepareRender();
		const r = await this.loadData();
		if (!r) {
			this.finishRender(sk);
			return;
		}
		const f = this.applyFilters(r.fullTree);
		if (!f) {
			this.finishRender(sk);
			return;
		}
		if (f.flatNodes.length === 0) {
			this.renderEmpty();
			this.finishRender(sk);
			return;
		}
		const s = this.applySorting(f.flatNodes);
		this.applyEditContext();
		this.renderContent(f.dateFilteredTree, s);
		this.finishRender(sk);
	}

	private prepareRender(): string | null {
		const sc = this.getScrollContainer();
		const sk = this.getScrollKey();
		if (sc && sk) this.scrollPositions.set(sk, sc.scrollTop);
		const re = this.getRootElement();
		if (re) re.removeEventListener("click", this.onGlobalClick);
		else this.container.removeEventListener("click", this.onGlobalClick);
		this.cleanupSplitLayout();
		if (this.ganttInstance) {
			this.ganttInstance.destroy();
			this.ganttInstance = null;
		}
		return sk;
	}

	private async loadData(): Promise<{ fullTree: TaskTreeNode } | null> {
		try {
			await this.dataManager.loadData(this.app as AppLike);
			return { fullTree: this.dataManager.getFullTree() };
		} catch (e: unknown) {
			const m = e instanceof Error ? e.message : String(e);
			logger.warn("[TaskManage] 加载数据失败:", m);
			this.container.replaceChildren();
			this.container.createDiv({ text: "加载失败：" + m });
			return null;
		}
	}

	private applyFilters(
		fullTree: TaskTreeNode,
	): { dateFilteredTree: TaskTreeNode; flatNodes: TaskTreeNode[] } | null {
		const preset = this.store.getActivePreset();
		const af: GlobalFilter = preset?.filter ?? this.getDefaultFilter();
		const im = preset?.intervalMode ?? "scheduled-due";
		const pt = filterTree(fullTree, {
			statuses: af.statuses,
			searchText: af.searchText,
			priorityValues: af.priorityValues,
			repeatCycles: af.repeatCycles,
			includeMarks: af.includeMarks,
		});
		const dt = filterTreeByDateRange(pt, af.dateRange, im);
		applyHideConfig(dt, preset?.hideConfig ?? getDefaultHideConfig());
		if (this.selectedTreeNode) {
			const nf = this.findNodeByUidInTree(dt, this.selectedTreeNode.uid);
			if (nf) {
				this.selectedTreeNode = nf;
				this.focusedTreeNode = nf;
			}
		}
		let fn: TaskTreeNode[] = this.selectedTreeNode
			? this.collectNodeTasksDeep(this.selectedTreeNode)
			: flattenTree(dt);
		fn = fn.filter(
			(n) => n.display && n.uid !== "__task_root__" && n.match,
		);
		return { dateFilteredTree: dt, flatNodes: fn };
	}

	private applySorting(nodes: TaskTreeNode[]): TaskTreeNode[] {
		const s = this.store.getActivePreset()?.sort ?? {
			type: "",
			order: "asc" as const,
		};
		return this.applySort(nodes, s);
	}

	private renderContent(
		dateFilteredTree: TaskTreeNode,
		sortedNodes: TaskTreeNode[],
	) {
		const preset = this.store.getActivePreset();
		const af = preset?.filter ?? this.getDefaultFilter();
		const style = preset?.viewStyle ?? "table";
		const im = preset?.intervalMode ?? "scheduled-due";
		const sort = preset?.sort ?? { type: "", order: "asc" as const };
		this.container.textContent = "";
		if (style === "tree") {
			const vc = this.container.createDiv({
				cls: "task-view-content task-view-scroll",
			});
			renderTaskTree(vc, {
				root: dateFilteredTree,
				focusRoot: this.focusedTreeNode || undefined,
				hideFolders: af.hideFolders ?? true,
				onClick: (n) => this.onTaskTreeNavClick(n),
				onDoubleClick: (n) => this.openTaskAtLine(n),
				onRestore: () => this.restoreFocus(),
				sort,
			});
		} else if (style === "gantt") {
			const vc = this.container.createDiv({
				cls: "task-view-content task-view-full",
			});
			const ganttPromise = renderGanttWithTree(vc, dateFilteredTree, {
				onTaskClick: (n) => this.openTaskAtLine(n),
				onRestore: () => this.restoreFocus(),
				onNodeClick: (n) => this.onTaskTreeNavClick(n),
				intervalMode: im,
				sort,
				dateRange: af.dateRange,
				focusRoot: this.focusedTreeNode || undefined,
			});
			ganttPromise
				.then((instance) => {
					this.ganttInstance = instance;
				})
				.catch(() => {
					this.ganttInstance = null;
				});
		} else {
			this.renderSplitLayout(
				dateFilteredTree,
				style,
				af,
				im,
				sort,
				sortedNodes,
			);
		}
		if (this.editStore.getState().editMode)
			this.previouslyEditedUids = new Set(
				this.editStore.getState().selectedTasks,
			);
	}

	private finishRender(scrollKey: string | null) {
		this.restoreScrollPosition(scrollKey);
		this.bindClickEvent();
	}
	private bindClickEvent() {
		window.setTimeout(() => {
			const re = this.getRootElement();
			if (re) re.addEventListener("click", this.onGlobalClick);
			else this.container.addEventListener("click", this.onGlobalClick);
		}, 100);
	}
	private restoreScrollPosition(scrollKey: string | null) {
		if (!scrollKey) return;
		const st = this.scrollPositions.get(scrollKey);
		if (st === undefined) return;
		window.requestAnimationFrame(() => {
			const sc = this.getScrollContainer();
			if (sc) sc.scrollTop = st;
		});
	}
	private getScrollContainer(): HTMLElement | null {
		if (this.rightContentContainer) return this.rightContentContainer;
		const vc = this.container.querySelector<HTMLElement>(".task-view-content");
		if (vc && vc.scrollHeight > vc.clientHeight) return vc;
		if (this.container.scrollHeight > this.container.clientHeight)
			return this.container;
		return null;
	}
	private getScrollKey(): string {
		const p = this.store.getActivePreset();
		return p ? `${p.id}-${p.viewStyle}-${p.businessView}` : "default";
	}
	private getRootElement(): HTMLElement | null {
		return this.container.closest<HTMLElement>(".manage-root");
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
		void this.render();
	}
	private collectNodeTasksDeep(node: TaskTreeNode): TaskTreeNode[] {
		const t: TaskTreeNode[] = [];
		const seen = new Set<string>();
		(function walk(n: TaskTreeNode) {
			if (!seen.has(n.uid)) {
				seen.add(n.uid);
				t.push(n);
			}
			for (const c of n.children) walk(c);
		})(node);
		return t;
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
		const pc = preset?.taskTreeNavCollapsed ?? false;
		const pw = preset?.taskTreeNavWidth ?? 280;
		const lc = this.container.createDiv({
			cls: "task-split-layout task-split-layout",
		});
		this.taskTreeNavContainer = lc.createDiv({ cls: "task-tree-nav" });
		this.taskTreeNavContainer.addClass("task-tree-nav-dynamic");
		this.taskTreeNavContainer.setCssProps({
			"--tree-nav-width": pc ? "0px" : pw + "px",
			"--tree-nav-min-width": pc ? "0px" : "200px",
			"--tree-nav-border-right": pc
				? "none"
				: "1px solid var(--background-modifier-border)",
		});
		if (!pc) {
			const tc = this.taskTreeNavContainer.createDiv({
				cls: "task-tree-nav-content task-tree-nav-content-inner",
			});
			renderTaskTree(tc, {
				root: displayTree,
				focusRoot: this.focusedTreeNode || undefined,
				hideFolders: filter.hideFolders ?? true,
				onClick: (n) => this.onTaskTreeNavClick(n),
				onDoubleClick: (n) => this.openTaskAtLine(n),
				onRestore: () => this.restoreFocus(),
				sort: sort as { type: string; order: "asc" | "desc" },
			});
			this.resizeHandle = lc.createDiv({
				cls: "task-tree-nav-resize task-tree-nav-resize-visible",
			});
			const arrow = createSpan();
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
					this.resizeHandle.setCssProps({ "--resize-opacity": "1" });
			});
			this.resizeHandle.addEventListener("mouseleave", () => {
				if (!this.isResizing && this.resizeHandle)
					this.resizeHandle.setCssProps({ "--resize-opacity": "0.3" });
			});
			this.resizeHandle.addEventListener("mousedown", (e) => {
				if (e.target === arrow) return;
				this.startResize(e);
			});
		} else {
			this.resizeHandle = lc.createDiv({
				cls: "task-tree-nav-resize task-tree-nav-resize-hidden",
			});
			const arrow = createSpan();
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
			this.resizeHandle.appendChild(arrow);
			this.resizeHandle.addEventListener("mouseenter", () => {
				this.resizeHandle!.setCssProps({ "--resize-opacity": "1" });
			});
			this.resizeHandle.addEventListener("mouseleave", () => {
				// 折叠状态：保持半透明可见，方便点击展开
				this.resizeHandle!.setCssProps({ "--resize-opacity": "0.35" });
			});
		}
		this.rightContentContainer = lc.createDiv({
			cls: "task-right-content task-right-content",
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
		const sr = this.rightContentContainer || this.container;
		const card = sr.querySelector<HTMLElement>(`[data-uid="${node.uid}"]`);
		if (!card?.parentNode) return;
		card.parentNode.replaceChild(
			createViewCard(node, {
				compact: false,
				onClick: (n) => this.openTaskAtLine(n),
				onEnterEdit: (n) => this.handleEnterEdit(n),
			}),
			card,
		);
	}
	updateFocusAfterSave() {
		if (this.selectedTreeNode) {
			const nt = this.dataManager.getFullTree();
			const nf = this.findNodeByUidInTree(nt, this.selectedTreeNode.uid);
			if (nf) {
				this.selectedTreeNode = nf;
				this.focusedTreeNode = nf;
			}
		}
	}
	findNodeByUidInTree(root: TaskTreeNode, uid: string): TaskTreeNode | null {
		if (root.uid === uid) return root;
		for (const c of root.children) {
			const f = this.findNodeByUidInTree(c, uid);
			if (f) return f;
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
		void this.render();
	}
	protected openTaskAtLine(node: TaskTreeNode) {
		void TaskNavigator.openTaskAtLine(this.app as AppLike, node);
	}
	private toggleTaskTreeNav(collapsed: boolean) {
		const p = this.store.getActivePreset();
		if (!p) return;
		this.store.updateSilent({
			presets: this.store
				.getState()
				.presets.map((x) =>
					x.id === p.id
						? { ...x, taskTreeNavCollapsed: collapsed }
						: x,
				),
		});
		void this.store.saveSilent();
		void this.render();
	}
	private startResize(e: MouseEvent) {
		e.preventDefault();
		this.isResizing = true;
		document.body.addClass("task-cursor-col-resize", "task-select-none");
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
		document.body.removeClass("task-cursor-col-resize", "task-select-none");
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
							x.id === p.id ? { ...x, taskTreeNavWidth: w } : x,
						),
				});
				void this.store.saveSilent();
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
		this.container.empty();
		this.container.createDiv({ text: "没有符合条件的任务", cls: "task-empty-message" });
	}

	protected renderByStyle(
		container: HTMLElement,
		nodes: TaskTreeNode[],
		style: string,
		filter: GlobalFilter,
		intervalMode: string,
		_panelFilteredTree?: TaskTreeNode,
		_sort?: { type: string; order: string },
	) {
		const h = (n: TaskTreeNode) => this.openTaskAtLine(n);
		const edit = (n: TaskTreeNode) => this.handleEnterEdit(n);

		// 分帧渲染：将节点分批，每帧渲染一批，避免 UI 阻塞
		const renderChunked = (
			renderOne: (nodes: TaskTreeNode[]) => HTMLElement | void,
			chunkSize = 50,
		) => {
			if (nodes.length <= chunkSize) {
				renderOne(nodes);
				return;
			}

			let index = 0;
			const total = nodes.length;
			const processChunk = () => {
				const end = Math.min(index + chunkSize, total);
				renderOne(nodes.slice(index, end));
				index = end;
				if (index < total) {
					window.requestAnimationFrame(processChunk);
				}
			};
			window.requestAnimationFrame(processChunk);
		};

		switch (style) {
			case "table":
				renderTaskTable(container, nodes, { onClick: h });
				break;
			case "list":
				renderChunked((batch) => {
					renderTaskList(container, batch, {
						onClick: h,
						compact: false,
						onEnterEdit: edit,
					});
				});
				break;
			case "cards":
				renderChunked((batch) => {
					renderCards(container, batch, {
						onClick: h,
						onEnterEdit: edit,
					});
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
				renderKanban(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "matrix":
				renderMatrix(container, nodes, {
					onClick: h,
					onEnterEdit: edit,
				});
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
					onClick: h,
					onEnterEdit: edit,
				});
				break;
			case "tag":
				renderTag(container, nodes, { onClick: h, onEnterEdit: edit });
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
				const cp = this.store.getActivePreset();
				const calsv = cp?.calendarSubView || "day";
				const er = DateUtils.getEffectiveDateRange(filter.dateRange);
				const tp: string[] = [];
				if (
					intervalMode !== "none" &&
					filter.dateRange &&
					!filter.dateRange.isAll &&
					filter.dateRange.start &&
					filter.dateRange.end
				)
					tp.push(
						`${formatDate(new Date(filter.dateRange.start))} ~ ${formatDate(new Date(filter.dateRange.end))}`,
					);
				if (filter.statuses?.length)
					tp.push(
						filter.statuses
							.map((s: string) => STATUS_NAMES[s] || s)
							.join("、"),
					);
				if (intervalMode === "any-date") tp.push("任意时间");
				else if (intervalMode === "scheduled-due") tp.push("计划~截止");
				else if (intervalMode === "starts-done")
					tp.push("开始~取消/完成");
				renderCalendarView(cc, nodes, {
					subView: calsv as
						| "day"
						| "week"
						| "month"
						| "quarter"
						| "year",
					intervalMode,
					onClick: h,
					onSubViewChange: (v) => {
						const st = this.store.getState();
						const pr = st.presets.find(
							(p) => p.id === st.activePresetId,
						);
						if (pr) {
							this.store.updateSilent({
								presets: st.presets.map((p) =>
									p.id === pr.id
										? { ...p, calendarSubView: v }
										: p,
								),
							});
							void this.store.saveSilent();
						}
						void this.render();
					},
					selectedDate: this.calendarSelectedDate,
					dateRange: er,
					filterTitle: tp.join(" · ") + ` · ${nodes.length}个任务`,
					onDayClick: (date) => {
						this.calendarSelectedDate = date;
						const st = this.store.getState();
						const pr = st.presets.find(
							(p) => p.id === st.activePresetId,
						);
						if (pr) {
							this.store.updateSilent({
								presets: st.presets.map((p) =>
									p.id === pr.id
										? { ...p, calendarSubView: "day" }
										: p,
								),
							});
							void this.store.saveSilent();
						}
						void this.render();
					},
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
					intervalMode,
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
				? va.localeCompare(vb as string) * o
				: (va - (vb as number)) * o;
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
				return 5 - node.priority;
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
				return (
					((node as unknown as Record<string, unknown>)[type] as
						| string
						| number
						| null) ?? null
				);
		}
	}

	destroy() {
		if (this.unsub) this.unsub();
		if (this.renderDebounceTimer)
			window.clearTimeout(this.renderDebounceTimer);
		const re = this.getRootElement();
		if (re) re.removeEventListener("click", this.onGlobalClick);
		else this.container.removeEventListener("click", this.onGlobalClick);
		if (this.ganttInstance) {
			this.ganttInstance.destroy();
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
