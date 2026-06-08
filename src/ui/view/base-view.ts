// src/ui/view/base-view.ts
// 业务视图基类 — 筛选 → 时间 → 隐藏 → 扁平化 → 排序 → 渲染（带防抖）

import { PRIORITY_ORDER } from "../../process/config/config";
import {
	getDefaultFilter,
	getDefaultHideConfig,
} from "../../process/config/panel-default-config";
import { DataManager } from "../../process/core/data-manager";
import { Store } from "../../process/store/store";
import {
	filterTree,
	filterTreeByDateRange,
	filterTreeByHideConfig,
	flattenTree,
	TreeFilterOptions,
	TreeNode,
} from "../../process/task/task-tree";
import { GlobalFilter, HideConfig, TaskItem } from "../../types";
import { renderKanban } from "../component/view/board/kanban-board";
import { renderMatrix } from "../component/view/board/matrix-board";
import { renderCalendarDay } from "../component/view/calendar/day-calendar";
import { renderCalendarMonth } from "../component/view/calendar/month-calendar";
import { renderCalendarQuarter } from "../component/view/calendar/quarter-calendar";
import { renderCalendarWeek } from "../component/view/calendar/week-calendar";
import { renderCalendarYear } from "../component/view/calendar/year-calendar";
import { renderCards } from "../component/view/card/grid-card";
import { renderDetail } from "../component/view/chart/detailc-chart";
import { renderStatistics } from "../component/view/chart/statistics-chart";
import { renderGanttWithTree } from "../component/view/gantt/gantt";
import { renderDepends } from "../component/view/list/depends-list";
import { renderTaskList } from "../component/view/list/list";
import { renderOverdueList } from "../component/view/list/overdue-list";
import { renderPriority } from "../component/view/list/priority-list";
import { renderRecurring } from "../component/view/list/recurring-list";
import { renderStatus } from "../component/view/list/status-list";
import { renderTag } from "../component/view/list/tag-list";
import { renderTimeList } from "../component/view/list/time-list";
import { renderTimeline } from "../component/view/list/timeline-list";
import { renderTaskTree } from "../component/view/list/tree-list";
import { renderUniqueId } from "../component/view/list/uniqueId-list";
import { renderTaskTable } from "../component/view/table/table";

export abstract class BaseTaskView {
	protected container: HTMLElement;
	protected store: Store;
	protected app: any;
	protected unsub?: () => void;
	protected calendarSubView: string = "month";
	protected dataManager: DataManager;

	protected taskTreeNavContainer: HTMLElement | null = null;
	protected rightContentContainer: HTMLElement | null = null;
	protected resizeHandle: HTMLElement | null = null;
	private isResizing: boolean = false;
	private onResizeBound: ((e: MouseEvent) => void) | null = null;
	private stopResizeBound: (() => void) | null = null;

	protected selectedTreeNode: any = null;

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
		if (this.renderDebounceTimer) {
			clearTimeout(this.renderDebounceTimer);
		}
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
			const { tasks } = await this.dataManager.loadData(this.app);
			if (tasks.length === 0) {
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
			const displayTree = filterTreeByHideConfig(
				dateFilteredTree,
				hideConfig,
			);

			let flatTasks: TaskItem[];
			if (this.selectedTreeNode) {
				flatTasks = this.collectNodeTasksDeep(this.selectedTreeNode);
				flatTasks = this.applyHideConfig(flatTasks, hideConfig);
			} else {
				flatTasks = flattenTree(displayTree);
			}

			if (flatTasks.length === 0) {
				this.renderEmpty();
				return;
			}

			const sort = preset?.sort ?? { type: "status", order: "asc" };
			const sorted = this.applySort(flatTasks, sort);

			if (currentStyle === "tree") {
				const viewContainer = this.container.createDiv({
					cls: "view-content",
				});
				viewContainer.style.padding = "0";
				viewContainer.style.margin = "0";
				renderTaskTree(viewContainer, {
					roots: displayTree,
					hideFolders: activeFilter.hideFolders ?? true,
					onClick: (node: any) => {
						const t = this.extractTaskFromNode(node);
						if (t) this.openTaskAtLine(t);
					},
					sort,
				});
			} else if (currentStyle === "gantt") {
				const viewContainer = this.container.createDiv({
					cls: "view-content",
				});
				viewContainer.style.cssText = "height:100%;overflow:hidden;";
				this.ganttInstance = renderGanttWithTree(
					viewContainer,
					displayTree,
					{
						onTaskClick: (t: TaskItem) => this.openTaskAtLine(t),
						intervalMode,
						sort: sort as { type: string; order: "asc" | "desc" },
						dateRange: activeFilter.dateRange,
					},
				);
			} else {
				this.renderSplitLayout(
					displayTree,
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

	private applyHideConfig(
		tasks: TaskItem[],
		hideConfig: HideConfig,
	): TaskItem[] {
		let result = tasks;
		if (hideConfig.hideStatuses.length > 0) {
			result = result.filter(
				(t) => !hideConfig.hideStatuses.includes(t._status),
			);
		}
		if (hideConfig.hidePriorityValues.length > 0) {
			result = result.filter(
				(t) => !hideConfig.hidePriorityValues.includes(t._priorityIcon),
			);
		}
		if (hideConfig.hideRepeatCycles.length > 0) {
			result = result.filter((t) => {
				if (!t._repeat) return true;
				const taskCycle = t._repeat.toLowerCase().replace(/^🔁\s*/, "");
				return !hideConfig.hideRepeatCycles.some((c) => {
					const filterCycle = c.toLowerCase().replace(/^🔁\s*/, "");
					if (taskCycle === filterCycle) return true;
					if (
						filterCycle === "every day" &&
						/\bevery\s+(\d+\s+)?days?\b/i.test(taskCycle)
					)
						return true;
					if (
						filterCycle === "every week" &&
						/\bevery\s+(\d+\s+)?weeks?\b/i.test(taskCycle)
					)
						return true;
					if (
						filterCycle === "every month" &&
						/\bevery\s+(\d+\s+)?months?\b/i.test(taskCycle)
					)
						return true;
					if (
						filterCycle === "every year" &&
						/\bevery\s+(\d+\s+)?years?\b/i.test(taskCycle)
					)
						return true;
					return false;
				});
			});
		}
		if (hideConfig.hideMarks.length > 0) {
			result = result.filter(
				(t) => !hideConfig.hideMarks.some((m) => t._marks?.[m]),
			);
		}
		if (hideConfig.hideSearchText) {
			const kw = hideConfig.hideSearchText
				.toLowerCase()
				.split(/\s+/)
				.filter((k) => k.length > 0);
			if (kw.length > 0) {
				result = result.filter((t) => {
					const d = (t._cleanText || t.text || "").toLowerCase();
					return !kw.every((k) => d.includes(k));
				});
			}
		}
		return result;
	}

	private applyPanelFilter(
		tasks: TaskItem[],
		filter: GlobalFilter,
	): TaskItem[] {
		return tasks.filter((t: TaskItem) => {
			if (!t) return false;

			const activeGroups: Array<() => boolean> = [];

			const statuses = filter.statuses || [];
			if (statuses.length > 0) {
				activeGroups.push(() => statuses.includes(t._status));
			}

			const priorityValues = filter.priorityValues || [];
			if (priorityValues.length > 0) {
				activeGroups.push(() => {
					const icon = t._priorityIcon;
					return icon ? priorityValues.includes(icon) : false;
				});
			}

			const repeatCycles = filter.repeatCycles || [];
			if (repeatCycles.length > 0) {
				activeGroups.push(() => {
					if (!t._repeat) return false;
					const taskCycle = t._repeat
						.toLowerCase()
						.replace(/^🔁\s*/, "");
					return repeatCycles.some((c) => {
						const filterCycle = c
							.toLowerCase()
							.replace(/^🔁\s*/, "");
						if (taskCycle === filterCycle) return true;
						if (
							filterCycle === "every day" &&
							/\bevery\s+(\d+\s+)?days?\b/i.test(taskCycle)
						)
							return true;
						if (
							filterCycle === "every week" &&
							/\bevery\s+(\d+\s+)?weeks?\b/i.test(taskCycle)
						)
							return true;
						if (
							filterCycle === "every month" &&
							/\bevery\s+(\d+\s+)?months?\b/i.test(taskCycle)
						)
							return true;
						if (
							filterCycle === "every year" &&
							/\bevery\s+(\d+\s+)?years?\b/i.test(taskCycle)
						)
							return true;
						return false;
					});
				});
			}

			const includeMarks = filter.includeMarks || [];
			const allDateMarks = [
				"created",
				"scheduled",
				"starts",
				"cancel",
				"done",
				"due",
			];
			const dateMarksSelected = allDateMarks.filter((k) =>
				includeMarks.includes(k),
			);
			if (dateMarksSelected.length > 0) {
				activeGroups.push(() => {
					return dateMarksSelected.some((m) => t._marks?.[m]);
				});
			}

			const allDepMarks = ["id", "forbid"];
			const depMarksSelected = allDepMarks.filter((k) =>
				includeMarks.includes(k),
			);
			if (depMarksSelected.length > 0) {
				activeGroups.push(() => {
					return depMarksSelected.some((m) => t._marks?.[m]);
				});
			}

			if (includeMarks.includes("tag")) {
				activeGroups.push(() => {
					return !!t._marks?.tag;
				});
			}

			if (filter.searchText) {
				const kw = filter.searchText
					.toLowerCase()
					.split(/\s+/)
					.filter((k) => k.length > 0);
				if (kw.length > 0) {
					activeGroups.push(() => {
						const text = (
							t._cleanText ||
							t.text ||
							""
						).toLowerCase();
						return kw.every((k) => text.includes(k));
					});
				}
			}

			if (activeGroups.length === 0) return true;
			return activeGroups.some((check) => check());
		});
	}

	private collectNodeTasksDeep(node: any): TaskItem[] {
		const tasks: TaskItem[] = [];
		const seen = new Set<string>();
		function add(t: TaskItem) {
			if (!t?.path) return;
			const k = t.path + ":" + (t.lineNumber ?? t.line ?? 0);
			if (!seen.has(k)) {
				seen.add(k);
				tasks.push(t);
			}
		}
		function collectFromContentNode(cn: any) {
			if (cn._task?.path) add(cn._task);
			if (Array.isArray(cn.children))
				cn.children.forEach((c: any) => collectFromContentNode(c));
		}
		function collectFromTreeNode(tn: any) {
			if (Array.isArray(tn.contentRoots))
				tn.contentRoots.forEach((c: any) => collectFromContentNode(c));
			if (Array.isArray(tn.children))
				tn.children.forEach((c: any) => collectFromTreeNode(c));
		}
		if (
			node.contentRoots !== undefined ||
			(node.children !== undefined && !node.type)
		) {
			collectFromTreeNode(node);
		} else if (node.type === "heading" || node.type === "task") {
			collectFromContentNode(node);
		}
		if (tasks.length === 0 && node._task?.path) add(node._task);
		return tasks;
	}

	private renderSplitLayout(
		displayTree: TreeNode[],
		viewStyle: string,
		filter: GlobalFilter,
		intervalMode: string,
		sort: { type: string; order: string },
		sortedTasks: TaskItem[],
	) {
		const preset = this.store.getActivePreset();
		const panelCollapsed = preset?.taskTreeNavCollapsed ?? false;
		const panelWidth = preset?.taskTreeNavWidth ?? 280;

		const layoutContainer = this.container.createDiv({
			cls: "split-layout",
		});
		layoutContainer.style.cssText =
			"display:flex;height:100%;position:relative;overflow:hidden;";

		if (panelCollapsed) {
			const toggleBtn = layoutContainer.createDiv({
				cls: "task-tree-nav-toggle",
			});
			toggleBtn.style.cssText =
				"width:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--background-secondary);border-right:1px solid var(--background-modifier-border);color:var(--text-muted);font-size:10px;flex-shrink:0;writing-mode:vertical-lr;letter-spacing:2px;user-select:none;";
			toggleBtn.createSpan({ text: "任 务 树" });
			toggleBtn.addEventListener("click", () =>
				this.toggleTaskTreeNav(false),
			);
		}

		this.taskTreeNavContainer = layoutContainer.createDiv({
			cls: "task-tree-nav",
		});
		this.taskTreeNavContainer.style.cssText = `width:${panelCollapsed ? "0px" : panelWidth + "px"};min-width:${panelCollapsed ? "0px" : "200px"};max-width:500px;border-right:${panelCollapsed ? "none" : "1px solid var(--background-modifier-border)"};background:var(--background-primary);overflow:hidden;transition:width 0.2s ease,min-width 0.2s ease;display:flex;flex-direction:column;flex-shrink:0;`;

		if (!panelCollapsed) {
			const header = this.taskTreeNavContainer.createDiv({
				cls: "task-tree-nav-header",
			});
			header.style.cssText =
				"display:flex;align-items:center;justify-content:space-between;padding:4px 8px;border-bottom:1px solid var(--background-modifier-border);background:var(--background-secondary);flex-shrink:0;";
			header.createSpan({ text: "任务树" }).style.cssText =
				"font-size:var(--font-ui-smaller);font-weight:600;";
			const collapseBtn = header.createEl("button", { text: "◀" });
			collapseBtn.style.cssText =
				"border:none;background:transparent;cursor:pointer;font-size:10px;padding:2px 6px;color:var(--text-muted);flex-shrink:0;";
			collapseBtn.addEventListener("click", () =>
				this.toggleTaskTreeNav(true),
			);

			const treeContent = this.taskTreeNavContainer.createDiv({
				cls: "task-tree-nav-content",
			});
			treeContent.style.cssText =
				"flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 0;";

			renderTaskTree(treeContent, {
				roots: displayTree,
				hideFolders: filter.hideFolders ?? true,
				onClick: (node: any) =>
					this.onTaskTreeNavClick(node, viewStyle),
				sort,
			});

			this.resizeHandle = layoutContainer.createDiv({
				cls: "task-tree-nav-resize",
			});
			this.resizeHandle.style.cssText =
				"width:4px;cursor:col-resize;background:transparent;flex-shrink:0;transition:background 0.15s;";
			this.resizeHandle.addEventListener("mouseenter", () => {
				if (!this.isResizing && this.resizeHandle)
					this.resizeHandle.style.background =
						"var(--interactive-accent)";
			});
			this.resizeHandle.addEventListener("mouseleave", () => {
				if (!this.isResizing && this.resizeHandle)
					this.resizeHandle.style.background = "transparent";
			});
			this.resizeHandle.addEventListener("mousedown", (e) =>
				this.startResize(e),
			);
		}

		this.rightContentContainer = layoutContainer.createDiv({
			cls: "right-content",
		});
		this.rightContentContainer.style.cssText =
			"flex:1;overflow:auto;min-width:0;padding:0;";
		this.renderByStyle(
			this.rightContentContainer,
			sortedTasks,
			viewStyle,
			filter,
			intervalMode,
			displayTree,
			sort,
		);
		document.addEventListener("mousemove", this.onResizeBound!);
		document.addEventListener("mouseup", this.stopResizeBound!);
	}

	private onTaskTreeNavClick(node: any, currentViewStyle: string) {
		if (currentViewStyle === "gantt" || currentViewStyle === "tree") {
			const task = this.extractTaskFromNode(node);
			if (task) this.openTaskAtLine(task);
			return;
		}
		this.selectedTreeNode = this.selectedTreeNode === node ? null : node;
		this.render();
	}

	private extractTaskFromNode(node: any): TaskItem | null {
		const filePath = node.path || node._filePath || node._task?.path || "";
		if (node._task?.path) return node._task;
		if (node._task)
			return {
				...node._task,
				path: node._task.path || filePath,
				line: node._task.line ?? node._task.lineNumber ?? 0,
				lineNumber: node._task.lineNumber ?? node._task.line ?? 0,
			} as TaskItem;
		if (node.path)
			return {
				path: node.path,
				line: 0,
				lineNumber: 0,
				_status: "todo",
				_cleanText: node.name || "",
			} as TaskItem;
		if (node.type === "heading" || node.type === "task")
			return {
				path: filePath,
				line: node.line ?? 0,
				lineNumber: node.line ?? 0,
				_status: "todo",
				_cleanText: node.text || "",
			} as TaskItem;
		return null;
	}

	protected openTaskAtLine(task: TaskItem) {
		if (!task?.path) return;
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!file) return;
		const targetLine = task.line ?? task.lineNumber ?? 0;
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
					setTimeout(() => {
						editor.scrollIntoView(
							{
								from: { line: targetLine, ch: 0 },
								to: { line: targetLine, ch: 0 },
							},
							true,
						);
					}, 50);
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
		tasks: TaskItem[],
		style: string,
		filter: GlobalFilter,
		intervalMode: string,
		panelFilteredTree?: TreeNode[],
		sort?: { type: string; order: string },
	) {
		const preset = this.store.getActivePreset();
		const hideConfig = preset?.hideConfig ?? getDefaultHideConfig();
		const tableCols = hideConfig.hideTableColumns;
		const columnsVisibility: Record<string, boolean> = {};
		for (const key in tableCols) {
			columnsVisibility[key] = !tableCols[key];
		}

		const h = (t: TaskItem) => this.openTaskAtLine(t);
		switch (style) {
			case "table":
				renderTaskTable(container, tasks, {
					onClick: h,
					columnsVisibility,
				});
				break;
			case "list":
				renderTaskList(container, tasks, {
					onClick: h,
					compact: false,
				});
				break;
			case "cards":
				renderCards(container, tasks, { onClick: h });
				break;
			case "status":
				renderStatus(container, tasks, { onClick: h });
				break;
			case "priority":
				renderPriority(container, tasks, { onClick: h });
				break;
			case "kanban":
				renderKanban(container, tasks);
				break;
			case "matrix":
				renderMatrix(container, tasks);
				break;
			case "recurring":
				renderRecurring(container, tasks, { onClick: h });
				break;
			case "time":
				renderTimeList(container, tasks, { onClick: h });
				break;
			case "overdue":
				renderOverdueList(container, tasks, { onClick: h });
				break;
			case "timeline":
				renderTimeline(container, tasks);
				break;
			case "tag":
				renderTag(container, tasks, { onClick: h });
				break;
			case "uniqueId":
				renderUniqueId(container, tasks, { onClick: h });
				break;
			case "depends":
				renderDepends(container, tasks, { onClick: h });
				break;
			case "calendar": {
				const bar = container.createDiv({ cls: "calendar-toolbar" });
				["day", "week", "month", "quarter", "year"].forEach((v) => {
					const lb: Record<string, string> = {
						day: "日",
						week: "周",
						month: "月",
						quarter: "季",
						year: "年",
					};
					const b = bar.createEl("button", {
						text: lb[v],
						cls: "bar-btn",
					});
					if (v === this.calendarSubView) b.addClass("active");
					b.onclick = () => {
						this.calendarSubView = v;
						this.render();
					};
				});
				const cc = container.createDiv({ cls: "calendar-content" });
				cc.style.padding = "0";
				const cm: Record<string, Function> = {
					day: renderCalendarDay,
					week: renderCalendarWeek,
					month: renderCalendarMonth,
					quarter: renderCalendarQuarter,
					year: renderCalendarYear,
				};
				(cm[this.calendarSubView] || renderCalendarMonth)(cc, tasks, {
					onClick: h,
					intervalMode,
				});
				break;
			}
			case "statistics":
				renderStatistics(container, tasks);
				break;
			case "detail":
				renderDetail(container, tasks);
				break;
			default:
				container.createDiv({ text: `未支持的视图样式：${style}` });
		}
	}

	protected openTask(task: TaskItem) {
		this.openTaskAtLine(task);
	}

	protected applySort(
		tasks: TaskItem[],
		sort: { type: string; order: string },
	): TaskItem[] {
		const s = [...tasks];
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

	private getSortValue(task: TaskItem, type: string): string | number | null {
		switch (type) {
			case "status":
				return (
					{
						todo: 0,
						planned: 1,
						"in-progress": 2,
						completed: 3,
						cancelled: 4,
					}[task._status] ?? 5
				);
			case "description":
				return (task._cleanText || task.text || "").toLowerCase();
			case "priority":
				return PRIORITY_ORDER.indexOf(task._priorityIcon || "");
			default:
				return (task as any)["_" + type] || null;
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
