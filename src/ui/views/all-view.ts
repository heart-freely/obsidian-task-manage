// src/ui/views/all-tasks-view.ts
import { PRIORITY_ORDER } from "../../configs/configs";
import { filterTasks } from "../../process/bars/bars-process";
import { getAllTasks } from "../../process/tasks/read-process";
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
import { renderPriority } from "../components/lists/priority-list";
import { renderRecurring } from "../components/lists/recurring-list";
import { renderStatus } from "../components/lists/status-list";
import { renderTag } from "../components/lists/tag-list";
import { renderTaskTree } from "../components/lists/tree-list";
import { renderUniqueId } from "../components/lists/uniqueId-list";
import { renderTaskTable } from "../components/tables/table";
import { renderTimeline } from "../components/timeline/timeline";
import { BaseTaskView } from "./base-view";

export class AllTasksView extends BaseTaskView {
	private calendarSubView: string = "month";

	async render() {
		this.container.empty();

		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? this.getDefaultFilter();
		const currentStyle = preset?.viewStyle ?? "table";
		const intervalMode = (preset as any)?.intervalMode ?? "scheduled-due";

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
				this.container.createDiv({ text: "没有符合条件的任务" });
				return;
			}

			const viewContainer = this.container.createDiv({
				cls: "view-content",
			});
			viewContainer.style.padding = "0";
			viewContainer.style.margin = "0";

			switch (currentStyle) {
				case "table":
					renderTaskTable(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						columnsVisibility: preset?.tableColumns,
					});
					break;
				case "list":
					renderTaskList(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						compact: false,
					});
					break;
				case "cards":
					renderCards(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "status":
					renderStatus(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "priority":
					renderPriority(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "kanban":
					renderKanban(viewContainer, filtered);
					break;
				case "matrix":
					renderMatrix(viewContainer, filtered);
					break;
				case "recurring":
					renderRecurring(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "timeline":
					renderTimeline(viewContainer, filtered);
					break;
				case "tag":
					renderTag(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "uniqueId":
					renderUniqueId(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "depends":
					renderDepends(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "tree":
					renderTaskTree(viewContainer, filtered, {
						hideFolders: activeFilter.hideFolders ?? false,
					});
					break;
				case "gantt":
					renderGantt(viewContainer, filtered);
					break;
				case "calendar": {
					const calendarBar = viewContainer.createDiv({
						cls: "calendar-toolbar",
					});
					const views = ["day", "week", "month", "quarter", "year"];
					const labels = ["日", "周", "月", "季", "年"];
					views.forEach((v, idx) => {
						const btn = calendarBar.createEl("button", {
							text: labels[idx],
							cls: "bar-btn",
						});
						if (v === this.calendarSubView) btn.addClass("active");
						btn.onclick = () => {
							this.calendarSubView = v;
							this.render();
						};
					});
					const calContainer = viewContainer.createDiv({
						cls: "calendar-content",
					});
					calContainer.style.padding = "0";
					if (this.calendarSubView === "day") {
						renderCalendarDay(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode,
						});
					} else if (this.calendarSubView === "week") {
						renderCalendarWeek(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode,
						});
					} else if (this.calendarSubView === "month") {
						renderCalendarMonth(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode,
						});
					} else if (this.calendarSubView === "quarter") {
						renderCalendarQuarter(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode,
						});
					} else if (this.calendarSubView === "year") {
						renderCalendarYear(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode,
						});
					}
					break;
				}
				case "statistics":
					renderStatistics(viewContainer, filtered);
					break;
				case "detail":
					renderDetail(viewContainer, filtered);
					break;
				default:
					viewContainer.createDiv({
						text: `未支持的视图样式：${currentStyle}`,
					});
			}
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
	}

	protected openTask(task: any) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (file) {
			this.app.workspace
				.getLeaf()
				.openFile(file, { eState: { line: task.line } });
		}
	}

	protected applySort(tasks: any[], sort: { type: string; order: string }) {
		const sorted = [...tasks];
		const order = sort.order === "asc" ? 1 : -1;
		sorted.sort((a, b) => {
			if (sort.type === "status") {
				const map: Record<string, number> = {
					todo: 0,
					planned: 1,
					"in-progress": 2,
					completed: 3,
					cancelled: 4,
				};
				return (map[a._status] ?? 5) - (map[b._status] ?? 5) * order;
			}
			if (sort.type === "description") {
				const descA = (a._cleanText || a.text || "").toLowerCase();
				const descB = (b._cleanText || b.text || "").toLowerCase();
				if (!descA && !descB) return 0;
				if (!descA) return 1;
				if (!descB) return -1;
				return descA.localeCompare(descB) * order;
			}
			if (sort.type === "priority") {
				const pa = a._priorityIcon || "",
					pb = b._priorityIcon || "";
				const ia = pa ? PRIORITY_ORDER.indexOf(pa) : -1;
				const ib = pb ? PRIORITY_ORDER.indexOf(pb) : -1;
				if (ia === -1 && ib === -1) return 0;
				if (ia === -1) return 1;
				if (ib === -1) return -1;
				return (ia - ib) * order;
			}
			if (sort.type === "repeat") {
				const repA = a._repeat || "",
					repB = b._repeat || "";
				if (!repA && !repB) return 0;
				if (!repA) return 1;
				if (!repB) return -1;
				return repA.localeCompare(repB) * order;
			}
			const dateFields = [
				"created",
				"scheduled",
				"starts",
				"due",
				"cancel",
				"done",
			];
			if (dateFields.includes(sort.type)) {
				const valA = a[`_${sort.type}`] || "",
					valB = b[`_${sort.type}`] || "";
				if (!valA && !valB) return 0;
				if (!valA) return 1;
				if (!valB) return -1;
				return valA.localeCompare(valB) * order;
			}
			if (sort.type === "tag") {
				const tagA = a._tag || "",
					tagB = b._tag || "";
				if (!tagA && !tagB) return 0;
				if (!tagA) return 1;
				if (!tagB) return -1;
				return tagA.localeCompare(tagB) * order;
			}
			if (sort.type === "id") {
				const idA = a._id || "",
					idB = b._id || "";
				if (!idA && !idB) return 0;
				if (!idA) return 1;
				if (!idB) return -1;
				return idA.localeCompare(idB) * order;
			}
			if (sort.type === "forbid") {
				const fA = a._forbid || "",
					fB = b._forbid || "";
				if (!fA && !fB) return 0;
				if (!fA) return 1;
				if (!fB) return -1;
				return fA.localeCompare(fB) * order;
			}
			if (sort.type === "filename") {
				const nameA = (a.path || "").split("/").pop() || "";
				const nameB = (b.path || "").split("/").pop() || "";
				return nameA.localeCompare(nameB) * order;
			}
			return 0;
		});
		return sorted;
	}

	protected getDefaultFilter(): GlobalFilter {
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
		};
	}
}
