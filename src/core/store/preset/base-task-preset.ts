// ui/sidebar/preset/base-task-preset.ts
// 业务视图基类 — 筛选 → 时间 → 隐藏 → 排序 → 渲染（带防抖）

import { GlobalFilter } from "../../../type/type";
import { renderKanban } from "../../../ui/main/board/kanban-board";
import { renderMatrix } from "../../../ui/main/board/matrix-board";
import { renderCalendarView } from "../../../ui/main/calendar/calendar";
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

	private renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private static DEBOUNCE_DELAY = 50;

	private ganttInstance: any = null;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.dataManager = DataManager.getInstance();
		this.unsub = store.subscribe(() => this.render());
		this.onResizeBound = (e: MouseEvent) => this.onResize(e);
		this.stopResizeBound = () => this.stopResize();
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
				return;
			}

			const sort = preset?.sort ?? { type: "status", order: "asc" };
			const sorted = this.applySort(flatNodes, sort);

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
					onClick: (node: TaskTreeNode) => this.openTaskAtLine(node),
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
		} catch (e) {
			console.warn("[TaskManage] 视图渲染失败:", e);
			this.container.createDiv({
				text:
					"加载失败：" + (e instanceof Error ? e.message : String(e)),
			});
		}
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
				onClick: (node: TaskTreeNode) =>
					this.onTaskTreeNavClick(node, viewStyle),
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

	private onTaskTreeNavClick(node: TaskTreeNode, currentViewStyle: string) {
		if (currentViewStyle === "gantt" || currentViewStyle === "tree") {
			this.openTaskAtLine(node);
			return;
		}
		if (this.focusedTreeNode === node) {
			this.focusedTreeNode = null;
			this.selectedTreeNode = null;
		} else {
			this.focusedTreeNode = node;
			this.selectedTreeNode = node;
		}
		this.render();
	}

	protected openTaskAtLine(node: TaskTreeNode) {
		if (!node?.path) return;
		const file = this.app.vault.getAbstractFileByPath(node.path);
		if (!file) return;
		const targetLine = node.line;
		const leaf = this.app.workspace.getLeaf(false);
		leaf.openFile(file).then(() => {
			const tryScroll = (retries: number) => {
				const editor = leaf.view?.editor;
				if (editor) {
					editor.setCursor({ line: targetLine, ch: 0 });
					editor.scrollIntoView(
						{
							from: { line: Math.max(0, targetLine - 1), ch: 0 },
							to: { line: targetLine + 5, ch: 0 },
						},
						true,
					);
					setTimeout(
						() =>
							editor.scrollIntoView(
								{
									from: { line: targetLine, ch: 0 },
									to: { line: targetLine, ch: 0 },
								},
								true,
							),
						50,
					);
				} else if (retries > 0) {
					setTimeout(() => tryScroll(retries - 1), 100);
				}
			};
			setTimeout(() => tryScroll(5), 150);
		});
	}

	private toggleTaskTreeNav(collapsed: boolean) {
		const p = this.store.getActivePreset();
		if (!p) return;
		this.store.update({
			presets: this.store
				.getState()
				.presets.map((x) =>
					x.id === p.id
						? ({ ...x, taskTreeNavCollapsed: collapsed } as any)
						: x,
				),
		});
		this.render();
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
			if (p)
				this.store.update({
					presets: this.store
						.getState()
						.presets.map((x) =>
							x.id === p.id
								? ({ ...x, taskTreeNavWidth: w } as any)
								: x,
						),
				});
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
		if (this.ganttInstance) {
			this.ganttInstance.destroy?.();
			this.ganttInstance = null;
		}
		this.cleanupSplitLayout();
	}
}
