// src/ui/views/base-view.ts
// 业务视图基类——支持分栏布局（左侧任务树导航 + 右侧通用视图）
// 排序由视图配置面板的 SortBar 控制，通过 preset.sort 同时作用于右侧视图和左侧任务树

import { PRIORITY_ORDER } from "../../configs/configs";
import { filterTasks } from "../../process/bars/set-bar";
import { getAllTasks } from "../../process/tasks/read-task";
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";
import { renderKanban } from "../components/boards/kanban-board";
import { renderMatrix } from "../components/boards/matrix-board";
import { renderCalendarDay } from "../components/calendar/day-calendar";
import { renderCalendarMonth } from "../components/calendar/month-calendar";
import { renderCalendarQuarter } from "../components/calendar/quarter-calendar";
import { renderCalendarWeek } from "../components/calendar/week-calendar";
import { renderCalendarYear } from "../components/calendar/year-calendar";
import { renderCards } from "../components/cards/cards";
import { renderDetail } from "../components/charts/detailc-charts";
import { renderStatistics } from "../components/charts/statistics-charts";
import { renderGantt } from "../components/gantt/gantt";
import { renderDepends } from "../components/lists/depends-list";
import { renderTaskList } from "../components/lists/list";
import { renderOverdueList } from "../components/lists/overdue-list";
import { renderPriority } from "../components/lists/priority-list";
import { renderRecurring } from "../components/lists/recurring-list";
import { renderStatus } from "../components/lists/status-list";
import { renderTag } from "../components/lists/tag-list";
import { renderTimeList } from "../components/lists/time-list";
import { renderTimeline } from "../components/lists/timeline-list";
import { renderTaskTree, TreeListOptions } from "../components/lists/tree-list";
import { renderUniqueId } from "../components/lists/uniqueId-list";
import { renderTaskTable } from "../components/tables/table";

export abstract class BaseTaskView {
	protected container: HTMLElement;
	protected store: Store;
	protected app: any;
	protected unsub?: () => void;
	protected calendarSubView: string = "month";

	// ========== 分栏布局相关 ==========
	protected taskTreeNavContainer: HTMLElement | null = null;
	protected rightContentContainer: HTMLElement | null = null;
	protected resizeHandle: HTMLElement | null = null;
	private isResizing: boolean = false;
	private onResizeBound: ((e: MouseEvent) => void) | null = null;
	private stopResizeBound: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
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
			const dv = this.app.plugins?.plugins?.dataview?.api;
			if (!dv) {
				this.container.createDiv({
					text: "请先安装并启用 Dataview 插件",
				});
				return;
			}
			const cacheState = { cachedAllTasks: null as any };
			const allTasks = getAllTasks(false, dv, cacheState);
			let filtered = filterTasks(allTasks, activeFilter, intervalMode);
			const sort = preset?.sort ?? { type: "status", order: "asc" };
			filtered = this.applySort(filtered, sort);

			const taskPages = await this.loadTaskPages();

			if (filtered.length === 0) {
				this.renderEmpty();
				return;
			}

			if (currentStyle === "tree") {
				// 独立任务树视图：全宽渲染，点击跳转文件
				const viewContainer = this.container.createDiv({
					cls: "view-content",
				});
				viewContainer.style.padding = "0";
				viewContainer.style.margin = "0";
				renderTaskTree(viewContainer, filtered, {
					hideFolders: activeFilter.hideFolders ?? true,
					dv,
					pages: taskPages,
					onClick: (node: any) => {
						const task = this.extractTaskFromNode(node);
						if (task) this.openTaskAtLine(task);
					},
					sort: sort,
				});
			} else {
				// 分栏布局：左侧任务树导航 + 右侧通用视图
				this.renderSplitLayout(
					filtered,
					currentStyle,
					activeFilter,
					intervalMode,
					dv,
					taskPages,
					sort,
				);
			}
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
	}

	// ========== 分栏布局渲染 ==========

	private renderSplitLayout(
		tasks: any[],
		viewStyle: string,
		filter: GlobalFilter,
		intervalMode: string,
		dv: any,
		pages: any[],
		sort: { type: string; order: string },
	) {
		const preset = this.store.getActivePreset();
		const panelCollapsed = preset?.taskTreeNavCollapsed ?? false;
		const panelWidth = preset?.taskTreeNavWidth ?? 280;

		// 主布局容器
		const layoutContainer = this.container.createDiv({
			cls: "split-layout",
		});
		layoutContainer.style.cssText = `
			display: flex;
			height: 100%;
			position: relative;
			overflow: hidden;
		`;

		// 折叠状态下的展开按钮
		if (panelCollapsed) {
			const toggleBtn = layoutContainer.createDiv({
				cls: "task-tree-nav-toggle",
			});
			toggleBtn.style.cssText = `
				width: 20px;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				background: var(--background-secondary);
				border-right: 1px solid var(--background-modifier-border);
				color: var(--text-muted);
				font-size: 10px;
				flex-shrink: 0;
				writing-mode: vertical-lr;
				letter-spacing: 2px;
				user-select: none;
			`;
			toggleBtn.createSpan({ text: "任 务 树" });
			toggleBtn.addEventListener("click", () =>
				this.toggleTaskTreeNav(false),
			);
		}

		// 左侧：任务树导航面板
		this.taskTreeNavContainer = layoutContainer.createDiv({
			cls: "task-tree-nav",
		});
		this.taskTreeNavContainer.style.cssText = `
			width: ${panelCollapsed ? "0px" : panelWidth + "px"};
			min-width: ${panelCollapsed ? "0px" : "200px"};
			max-width: 500px;
			border-right: ${panelCollapsed ? "none" : "1px solid var(--background-modifier-border)"};
			background: var(--background-primary);
			overflow: hidden;
			transition: width 0.2s ease, min-width 0.2s ease;
			display: flex;
			flex-direction: column;
			flex-shrink: 0;
		`;

		if (!panelCollapsed) {
			// 面板头部（仅标题 + 折叠按钮，排序由视图配置面板的 SortBar 控制）
			const header = this.taskTreeNavContainer.createDiv({
				cls: "task-tree-nav-header",
			});
			header.style.cssText = `
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 4px 8px;
				border-bottom: 1px solid var(--background-modifier-border);
				background: var(--background-secondary);
				flex-shrink: 0;
			`;

			const titleSpan = header.createSpan({ text: "任务树" });
			titleSpan.style.cssText = `
				font-size: var(--font-ui-smaller);
				font-weight: 600;
			`;

			const collapseBtn = header.createEl("button", { text: "◀" });
			collapseBtn.style.cssText = `
				border: none;
				background: transparent;
				cursor: pointer;
				font-size: 10px;
				padding: 2px 6px;
				color: var(--text-muted);
				flex-shrink: 0;
			`;
			collapseBtn.addEventListener("click", () =>
				this.toggleTaskTreeNav(true),
			);

			// 任务树内容
			const treeContent = this.taskTreeNavContainer.createDiv({
				cls: "task-tree-nav-content",
			});
			treeContent.style.cssText = `
				flex: 1;
				overflow-y: auto;
				overflow-x: hidden;
				padding: 4px 0;
			`;

			// 复用现有任务树渲染引擎，传入 preset.sort
			const treeOptions: TreeListOptions = {
				hideFolders: filter.hideFolders ?? true,
				dv,
				pages,
				onClick: (node: any) => {
					this.onTaskTreeNavClick(node, viewStyle);
				},
				sort: sort,
			};
			renderTaskTree(treeContent, tasks, treeOptions);

			// 拖拽调整宽度
			this.resizeHandle = layoutContainer.createDiv({
				cls: "task-tree-nav-resize",
			});
			this.resizeHandle.style.cssText = `
				width: 4px;
				cursor: col-resize;
				background: transparent;
				flex-shrink: 0;
				transition: background 0.15s;
			`;
			this.resizeHandle.addEventListener("mouseenter", () => {
				if (this.resizeHandle && !this.isResizing) {
					this.resizeHandle.style.background =
						"var(--interactive-accent)";
				}
			});
			this.resizeHandle.addEventListener("mouseleave", () => {
				if (this.resizeHandle && !this.isResizing) {
					this.resizeHandle.style.background = "transparent";
				}
			});
			this.resizeHandle.addEventListener("mousedown", (e) =>
				this.startResize(e),
			);
		}

		// 右侧：通用视图内容
		this.rightContentContainer = layoutContainer.createDiv({
			cls: "right-content",
		});
		this.rightContentContainer.style.cssText = `
			flex: 1;
			overflow: auto;
			min-width: 0;
			padding: 0;
		`;

		// 渲染右侧内容
		this.renderByStyle(
			this.rightContentContainer,
			tasks,
			viewStyle,
			filter,
			intervalMode,
			dv,
			pages,
		);

		// 全局鼠标事件
		document.addEventListener("mousemove", this.onResizeBound!);
		document.addEventListener("mouseup", this.stopResizeBound!);
	}

	// ========== 任务树导航点击处理 ==========

	/**
	 * 任务树导航面板点击处理
	 *
	 * 规则：
	 * - 甘特图视图或任务树视图：点击跳转到文件对应行，滚动到视图顶部
	 * - 其他通用视图：点击筛选右侧内容，显示该节点下的所有子任务
	 *   - 有子任务的节点 → 筛选所有子任务（不包含节点自身）
	 *   - 无子任务的节点 → 显示节点自身
	 */
	// onTaskTreeNavClick — 已在上一版确认正确
	private onTaskTreeNavClick(node: any, currentViewStyle: string) {
		if (currentViewStyle === "gantt" || currentViewStyle === "tree") {
			const task = this.extractTaskFromNode(node);
			if (task) this.openTaskAtLine(task);
			return;
		}

		if (!this.rightContentContainer) return;
		const preset = this.store.getActivePreset();
		if (!preset) return;

		const childTasks = this.collectNodeTasksDeep(node);
		if (childTasks.length === 0) return;

		const sorted = this.applySort(
			childTasks,
			preset.sort ?? { type: "status", order: "asc" },
		);

		this.rightContentContainer.empty();
		this.renderByStyle(
			this.rightContentContainer,
			sorted,
			currentViewStyle,
			preset.filter,
			preset.intervalMode ?? "scheduled-due",
		);
	}

	// ========== 辅助方法 ==========

	/**
	 * 从节点中提取可跳转的任务数据
	 */
	private extractTaskFromNode(node: any): any | null {
		// 直接的 _task 属性（文件任务、标题任务、列表任务都有）
		if (node._task && node._task.path) {
			return node._task;
		}
		// TreeNode 的文件节点
		if (node.type === "file" && node.path) {
			return {
				path: node.path,
				line: 0,
				lineNumber: 0,
				_status: "todo",
				_cleanText: node.name || "",
			};
		}
		// ContentNode 的 heading 节点
		if (node.type === "heading" && node._task && node._task.path) {
			return node._task;
		}
		// ContentNode 的 task 节点
		if (node.type === "task" && node._task && node._task.path) {
			return node._task;
		}
		return null;
	}

	/**
	 * 深度收集节点下的所有任务（用于筛选）
	 *
	 * 筛选规则：
	 * - 有子任务的节点 → 收集所有子任务，不包含节点自身的 _task
	 * - 无子任务的节点 → 返回节点自身的 _task
	 */
	private collectNodeTasksDeep(node: any): any[] {
		const tasks: any[] = [];
		const seen = new Set<string>();

		function addTask(t: any) {
			if (!t || !t.path) return;
			const key = (t.path || "") + ":" + (t.lineNumber ?? t.line ?? 0);
			if (!seen.has(key)) {
				seen.add(key);
				tasks.push(t);
			}
		}

		function collectFromNode(n: any) {
			// 收集 tasks 数组（TreeNode 的文件节点）
			if (Array.isArray(n.tasks)) {
				n.tasks.forEach((t: any) => addTask(t));
			}

			// 递归收集 children
			if (Array.isArray(n.children)) {
				n.children.forEach((child: any) => collectFromNode(child));
			}

			// 递归收集 contentRoots（TreeNode）
			if (Array.isArray(n.contentRoots)) {
				n.contentRoots.forEach((cn: any) => collectFromNode(cn));
			}
		}

		// 先收集所有子任务（不包含节点自身的 _task）
		collectFromNode(node);

		// 如果没有任何子任务被收集到，但有 _task，则使用自身
		if (tasks.length === 0 && node._task && node._task.path) {
			addTask(node._task);
		}

		return tasks;
	}

	/**
	 * 跳转到文件并定位到指定行，滚动到视图顶部
	 */
	protected openTaskAtLine(task: any) {
		if (!task || !task.path) return;
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!file) return;

		const leaf = this.app.workspace.getLeaf(false);
		leaf.openFile(file, {
			eState: { line: task.lineNumber ?? task.line ?? 0 },
		}).then(() => {
			// 延迟确保编辑器已加载
			setTimeout(() => {
				const editor = leaf.view?.editor;
				if (editor) {
					const targetLine = task.lineNumber ?? task.line ?? 0;
					// 设置光标位置
					editor.setCursor({ line: targetLine, ch: 0 });
					// 滚动到视图顶部
					editor.scrollIntoView(
						{
							from: { line: targetLine, ch: 0 },
							to: { line: targetLine, ch: 0 },
						},
						true,
					);
				}
			}, 100);
		});
	}

	private toggleTaskTreeNav(collapsed: boolean) {
		const preset = this.store.getActivePreset();
		if (!preset) return;

		const state = this.store.getState();
		const newPresets = state.presets.map((p) =>
			p.id === preset.id
				? ({ ...p, taskTreeNavCollapsed: collapsed } as any)
				: p,
		);
		this.store.update({ presets: newPresets });

		// 重新渲染以应用新布局
		this.render();
	}

	// ========== 拖拽调整宽度 ==========

	private startResize(e: MouseEvent) {
		e.preventDefault();
		this.isResizing = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	}

	private onResize(e: MouseEvent) {
		if (!this.isResizing || !this.taskTreeNavContainer) return;

		const layoutRect =
			this.taskTreeNavContainer.parentElement?.getBoundingClientRect();
		if (!layoutRect) return;

		const w = Math.min(500, Math.max(200, e.clientX - layoutRect.left));
		this.taskTreeNavContainer.style.width = w + "px";
	}

	private stopResize() {
		if (!this.isResizing) return;
		this.isResizing = false;
		document.body.style.cursor = "";
		document.body.style.userSelect = "";

		// 持久化宽度
		if (this.taskTreeNavContainer) {
			const width =
				parseInt(this.taskTreeNavContainer.style.width) || 280;
			const preset = this.store.getActivePreset();
			if (preset) {
				const state = this.store.getState();
				const newPresets = state.presets.map((p) =>
					p.id === preset.id
						? ({ ...p, taskTreeNavWidth: width } as any)
						: p,
				);
				this.store.update({ presets: newPresets });
			}
		}
	}

	// ========== 清理 ==========

	private cleanupSplitLayout() {
		if (this.onResizeBound) {
			document.removeEventListener("mousemove", this.onResizeBound);
		}
		if (this.stopResizeBound) {
			document.removeEventListener("mouseup", this.stopResizeBound);
		}
		this.taskTreeNavContainer = null;
		this.rightContentContainer = null;
		this.resizeHandle = null;
		this.isResizing = false;
	}

	// ========== 任务页面加载 ==========

	private async loadTaskPages(): Promise<any[]> {
		try {
			const files = this.app.vault
				.getFiles()
				.filter(
					(f: any) =>
						f.path.startsWith("pages/A 系统/A 任务系统") &&
						f.name.endsWith("任务.md"),
				);

			const pages: any[] = [];
			for (const f of files) {
				try {
					const content = await this.app.vault.cachedRead(f);
					pages.push({
						file: {
							path: f.path,
							name: f.name,
							content: content,
						},
					});
				} catch (e) {
					pages.push({
						file: {
							path: f.path,
							name: f.name,
							content: "",
						},
					});
				}
			}
			return pages;
		} catch (e) {
			console.warn("加载任务文件列表失败:", e);
			return [];
		}
	}

	// ========== 渲染方法 ==========

	protected renderEmpty() {
		this.container.createDiv({ text: "没有符合条件的任务" });
	}

	// src/ui/views/base-view.ts
	// 只展示需要修改的部分：renderByStyle 方法

	protected renderByStyle(
		container: HTMLElement,
		tasks: any[],
		style: string,
		filter: GlobalFilter,
		intervalMode: string,
		dv?: any,
		pages?: any[],
	) {
		const preset = this.store.getActivePreset();

		// 通用点击处理器：跳转文件
		const handleClick = (t: any) => this.openTaskAtLine(t);

		switch (style) {
			case "table":
				renderTaskTable(container, tasks, {
					onClick: handleClick,
					columnsVisibility: preset?.tableColumns,
				});
				break;
			case "list":
				renderTaskList(container, tasks, {
					onClick: handleClick,
					compact: false,
				});
				break;
			case "cards":
				renderCards(container, tasks, {
					onClick: handleClick,
				});
				break;
			case "status":
				renderStatus(container, tasks, { onClick: handleClick });
				break;
			case "priority":
				renderPriority(container, tasks, { onClick: handleClick });
				break;
			case "recurring":
				renderRecurring(container, tasks, { onClick: handleClick });
				break;
			case "time":
				renderTimeList(container, tasks, { onClick: handleClick });
				break;
			case "overdue":
				renderOverdueList(container, tasks, { onClick: handleClick });
				break;
			case "tag":
				renderTag(container, tasks, { onClick: handleClick });
				break;
			case "uniqueId":
				renderUniqueId(container, tasks, { onClick: handleClick });
				break;
			case "depends":
				renderDepends(container, tasks, { onClick: handleClick });
				break;
			// kanban, matrix, gantt, calendar, statistics, detail 内部自行处理点击
			case "kanban":
				renderKanban(container, tasks);
				break;
			case "matrix":
				renderMatrix(container, tasks);
				break;
			case "timeline":
				renderTimeline(container, tasks);
				break;
			case "gantt":
				renderGantt(container, tasks);
				break;
			case "calendar": {
				const calendarBar = container.createDiv({
					cls: "calendar-toolbar",
				});
				["day", "week", "month", "quarter", "year"].forEach((v) => {
					const labels: Record<string, string> = {
						day: "日",
						week: "周",
						month: "月",
						quarter: "季",
						year: "年",
					};
					const btn = calendarBar.createEl("button", {
						text: labels[v],
						cls: "bar-btn",
					});
					if (v === this.calendarSubView) btn.addClass("active");
					btn.onclick = () => {
						this.calendarSubView = v;
						this.render();
					};
				});
				const calContainer = container.createDiv({
					cls: "calendar-content",
				});
				calContainer.style.padding = "0";
				const opts = { onClick: handleClick, intervalMode };
				const calMap: Record<string, Function> = {
					day: renderCalendarDay,
					week: renderCalendarWeek,
					month: renderCalendarMonth,
					quarter: renderCalendarQuarter,
					year: renderCalendarYear,
				};
				(calMap[this.calendarSubView] || renderCalendarMonth)(
					calContainer,
					tasks,
					opts,
				);
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
		// 保留旧接口兼容性
		this.openTaskAtLine(task);
	}

	protected applySort(tasks: any[], sort: { type: string; order: string }) {
		const sorted = [...tasks];
		const order = sort.order === "asc" ? 1 : -1;
		sorted.sort((a, b) => {
			const va = this.getSortValue(a, sort.type),
				vb = this.getSortValue(b, sort.type);
			if (va === vb) return 0;
			if (va === null) return 1;
			if (vb === null) return -1;
			return typeof va === "string"
				? (va as string).localeCompare(vb as string) * order
				: ((va as number) - (vb as number)) * order;
		});
		return sorted;
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
			case "repeat":
				return task._repeat || null;
			case "created":
				return task._created || null;
			case "scheduled":
				return task._scheduled || null;
			case "starts":
				return task._starts || null;
			case "due":
				return task._due || null;
			case "cancel":
				return task._cancel || null;
			case "done":
				return task._done || null;
			case "tag":
				return task._tag || null;
			case "id":
				return task._id || null;
			case "forbid":
				return task._forbid || null;
			case "filename":
				return (task.path || "").split("/").pop() || null;
			default:
				return null;
		}
	}

	destroy() {
		if (this.unsub) this.unsub();
		this.cleanupSplitLayout();
	}
}
