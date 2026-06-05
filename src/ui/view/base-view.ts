// src/ui/view/base-view.ts
// 业务视图基类 — 面板筛选 → 节点筛选 → 扁平化 → 排序 → 渲染

import { PRIORITY_ORDER } from "../../process/config/config";
import { DataManager } from "../../process/core/data-manager";
import { Store } from "../../process/store/store";
import {
	filterTree,
	flattenTree,
	TreeFilterOptions,
	TreeNode,
} from "../../process/task/task-tree";
import { GlobalFilter } from "../../types";
import { renderKanban } from "../component/view/board/kanban-board";
import { renderMatrix } from "../component/view/board/matrix-board";
import { renderCalendarDay } from "../component/view/calendar/day-calendar";
import { renderCalendarMonth } from "../component/view/calendar/month-calendar";
import { renderCalendarQuarter } from "../component/view/calendar/quarter-calendar";
import { renderCalendarWeek } from "../component/view/calendar/week-calendar";
import { renderCalendarYear } from "../component/view/calendar/year-calendar";
import { renderCards } from "../component/view/card/cards";
import { renderDetail } from "../component/view/chart/detailc-chart";
import { renderStatistics } from "../component/view/chart/statistics-chart";
import { renderGantt } from "../component/view/gantt/gantt";
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
		return {
			dateRange: { start: null, end: null, isAll: true },
			statuses: [
				"todo",
				"planned",
				"in-progress",
				"completed",
				"cancelled",
			],
			includeMarks: [],
			excludeMarks: [],
			hideRepeat: true,
			hideCompleted: true,
			hideCancelled: true,
			rootPath: null,
			hideFolders: true,
			priorityValues: ["⏬", "🔽", "🔼", "⏫", "🔺"],
			repeatCycles: [
				"every day",
				"every week",
				"every month",
				"every year",
			],
		};
	}

	async render() {
		this.container.empty();
		this.cleanupSplitLayout();

		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			preset?.filter ?? this.getDefaultFilter();
		const currentStyle = preset?.viewStyle ?? "table";
		const intervalMode = preset?.intervalMode ?? "scheduled-due";

		try {
			const { tasks } = await this.dataManager.loadData(this.app);
			const validTasks = tasks.filter((t) => t != null);
			if (validTasks.length === 0) {
				this.renderEmpty();
				return;
			}

			const fullTree = this.dataManager.getFullTree();

			const panelOptions: TreeFilterOptions = {
				statuses: activeFilter.statuses,
				searchText: activeFilter.searchText,
				priorityValues: activeFilter.priorityValues,
				repeatCycles: activeFilter.repeatCycles,
			};
			const panelFilteredTree = filterTree(fullTree, panelOptions);

			let flatTasks: any[];
			if (this.selectedTreeNode) {
				flatTasks = this.collectNodeTasksDeep(this.selectedTreeNode);
				flatTasks = this.applyPanelFilter(flatTasks, activeFilter);
			} else {
				flatTasks = flattenTree(panelFilteredTree);
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
					roots: panelFilteredTree,
					hideFolders: activeFilter.hideFolders ?? true,
					onClick: (node: any) => {
						const t = this.extractTaskFromNode(node);
						if (t) this.openTaskAtLine(t);
					},
					sort,
				});
			} else {
				this.renderSplitLayout(
					panelFilteredTree,
					currentStyle,
					activeFilter,
					intervalMode,
					sort,
					sorted,
				);
			}
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
	}

	private applyPanelFilter(tasks: any[], filter: GlobalFilter): any[] {
		return tasks.filter((t: any) => {
			if (!t) return false;
			if (
				filter.statuses?.length > 0 &&
				!filter.statuses.includes(t._status)
			)
				return false;
			if (filter.searchText) {
				const kw = filter.searchText
					.toLowerCase()
					.split(/\s+/)
					.filter((k) => k.length > 0);
				const text = (t._cleanText || t.text || "").toLowerCase();
				if (kw.length > 0 && !kw.every((k) => text.includes(k)))
					return false;
			}
			if (filter.priorityValues?.length > 0) {
				const allPriorities = ["🔺", "⏫", "🔼", "🔽", "⏬"];
				const isAllSelected = allPriorities.every((p) =>
					filter.priorityValues!.includes(p),
				);
				if (!isAllSelected) {
					const icon = t._priorityIcon;
					if (icon && !filter.priorityValues!.includes(icon))
						return false;
				}
			}
			if (filter.repeatCycles?.length > 0) {
				const allCycles = [
					"every day",
					"every week",
					"every month",
					"every year",
				];
				const isAllSelected = allCycles.every((c) =>
					filter.repeatCycles!.includes(c),
				);
				if (!isAllSelected) {
					if (!t._repeat) return false;
					if (
						!filter.repeatCycles!.some((c: string) =>
							t._repeat.toLowerCase().includes(c),
						)
					)
						return false;
				}
			}
			return true;
		});
	}

	private collectNodeTasksDeep(node: any): any[] {
		const tasks: any[] = [];
		const seen = new Set<string>();
		function add(t: any) {
			if (!t?.path) return;
			const k = t.path + ":" + (t.lineNumber ?? 0);
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
		panelFilteredTree: TreeNode[],
		viewStyle: string,
		filter: GlobalFilter,
		intervalMode: string,
		sort: { type: string; order: string },
		sortedTasks: any[],
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
				roots: panelFilteredTree,
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

	private extractTaskFromNode(node: any): any | null {
		const filePath = node.path || node._filePath || node._task?.path || "";
		if (node._task?.path) return node._task;
		if (node._task)
			return {
				...node._task,
				path: node._task.path || filePath,
				lineNumber: node._task.lineNumber ?? 0,
			};
		if (node.path)
			return {
				path: node.path,
				lineNumber: 0,
				_status: "todo",
				_cleanText: node.name || "",
			};
		if (node.type === "heading" || node.type === "task")
			return {
				path: filePath,
				lineNumber: node.line ?? 0,
				_status: "todo",
				_cleanText: node.text || "",
			};
		return null;
	}

	protected openTaskAtLine(task: any) {
		if (!task?.path) return;
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!file) return;

		const targetLine = task.line ?? task.lineNumber ?? 0;

		const leaf = this.app.workspace.getLeaf(false);
		leaf.openFile(file, { eState: { line: targetLine } }).then(() => {
			setTimeout(() => {
				const view = leaf.view as any;
				const editor = view?.editor;

				if (editor) {
					// 设置光标
					editor.setCursor({ line: targetLine, ch: 0 });

					// 方法1: 使用 editor 的 scrollIntoView
					editor.scrollIntoView(
						{
							from: { line: targetLine, ch: 0 },
							to: {
								line: Math.min(
									targetLine + 10,
									editor.lineCount() - 1,
								),
								ch: 0,
							},
						},
						true,
					);

					// 方法2: 使用 CM6 的滚动容器
					const cm = editor.cm;
					if (cm && cm.scrollDOM) {
						const coords = cm.charCoords(
							{ line: targetLine, ch: 0 },
							"local",
						);
						cm.scrollDOM.scrollTop =
							coords.top - cm.scrollDOM.clientHeight / 3;
					}

					// 方法3: 使用 previewMode 的滚动
					const previewEl = view?.containerEl?.querySelector(
						".markdown-preview-view",
					);
					if (previewEl) {
						const targetEl = previewEl.querySelector(
							`[data-line="${targetLine}"]`,
						);
						if (targetEl) {
							targetEl.scrollIntoView({
								behavior: "auto",
								block: "start",
							});
						}
					}
				}
			}, 300);
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
		tasks: any[],
		style: string,
		filter: GlobalFilter,
		intervalMode: string,
	) {
		const preset = this.store.getActivePreset();
		const h = (t: any) => this.openTaskAtLine(t);
		switch (style) {
			case "table":
				renderTaskTable(container, tasks, {
					onClick: h,
					columnsVisibility: preset?.tableColumns,
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
			case "gantt":
				renderGantt(container, tasks);
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

	protected openTask(task: any) {
		this.openTaskAtLine(task);
	}

	protected applySort(tasks: any[], sort: { type: string; order: string }) {
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
	private getSortValue(task: any, type: string): string | number | null {
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
				return task["_" + type] || null;
		}
	}

	destroy() {
		if (this.unsub) this.unsub();
		this.cleanupSplitLayout();
	}
}
