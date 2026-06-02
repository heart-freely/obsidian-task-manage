// src/ui/views/base-view.ts
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
import { renderTaskTree } from "../components/lists/tree-list";
import { renderUniqueId } from "../components/lists/uniqueId-list";
import { renderTaskTable } from "../components/tables/table";

export abstract class BaseTaskView {
	protected container: HTMLElement;
	protected store: Store;
	protected app: any;
	protected unsub?: () => void;
	protected calendarSubView: string = "month";

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.unsub = store.subscribe(() => this.render());
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
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
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
			if (filtered.length === 0) {
				this.renderEmpty();
				return;
			}
			const viewContainer = this.container.createDiv({
				cls: "view-content",
			});
			viewContainer.style.padding = "0";
			viewContainer.style.margin = "0";
			this.renderByStyle(
				viewContainer,
				filtered,
				currentStyle,
				activeFilter,
				intervalMode,
			);
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
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
		switch (style) {
			case "table":
				renderTaskTable(container, tasks, {
					onClick: (t: any) => this.openTask(t),
					columnsVisibility: preset?.tableColumns,
				});
				break;
			case "list":
				renderTaskList(container, tasks, {
					onClick: (t: any) => this.openTask(t),
					compact: false,
				});
				break;
			case "cards":
				renderCards(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "status":
				renderStatus(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "priority":
				renderPriority(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "kanban":
				renderKanban(container, tasks);
				break;
			case "matrix":
				renderMatrix(container, tasks);
				break;
			case "recurring":
				renderRecurring(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "time":
				renderTimeList(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "overdue":
				renderOverdueList(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "timeline":
				renderTimeline(container, tasks);
				break;
			case "tag":
				renderTag(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "uniqueId":
				renderUniqueId(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "depends":
				renderDepends(container, tasks, {
					onClick: (t: any) => this.openTask(t),
				});
				break;
			case "tree":
				renderTaskTree(container, tasks, {
					hideFolders: filter.hideFolders ?? false,
				});
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
				const opts = {
					onClick: (t: any) => this.openTask(t),
					intervalMode,
				};
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
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (file)
			this.app.workspace
				.getLeaf()
				.openFile(file, { eState: { line: task.line } });
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
	}
}
