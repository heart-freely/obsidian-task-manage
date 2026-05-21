import { filterTasks } from "../../tasks/process/filter-task-process";
import { getAllTasks } from "../../tasks/read/read-tasks";
import { GlobalFilter } from "../../types";
import { renderKanban } from "../components/boards/kanban";
import { renderMatrix } from "../components/boards/matrix";
import { renderCalendarDay } from "../components/calendar/day";
import { renderCalendarMonth } from "../components/calendar/month";
import { renderCalendarQuarter } from "../components/calendar/quarter";
import { renderCalendarWeek } from "../components/calendar/week";
import { renderCalendarYear } from "../components/calendar/year";
import { renderDetail } from "../components/charts/detail";
import { renderStatistics } from "../components/charts/statistics";
import { renderGantt } from "../components/gantt/gantt";
import { renderTaskList } from "../components/lists/task-list";
import { renderTaskTree } from "../components/lists/task-tree";
import { renderTaskTable } from "../components/tables/task-table";
import { renderTimeline } from "../components/timeline/task-timeline";
import { BaseTaskView } from "./base-view";

export class AllTasksView extends BaseTaskView {
	private calendarSubView: string = "month";

	async render() {
		this.container.empty();

		// 工具栏
		const toolbar = this.container.createDiv({ cls: "view-toolbar" });
		

		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? this.getDefaultFilter();
		const currentStyle = preset?.viewStyle ?? "table";

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
			let filtered = filterTasks(allTasks, activeFilter);
			const sort = preset?.sort ?? { type: "status", order: "asc" };
			filtered = this.applySort(filtered, sort);

			if (filtered.length === 0) {
				this.container.createDiv({ text: "没有符合条件的任务" });
				return;
			}

			const viewContainer = this.container.createDiv({
				cls: "view-content",
			});

			switch (currentStyle) {
				case "table":
					renderTaskTable(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "list":
					renderTaskList(viewContainer, filtered, {
						onClick: (t: any) => this.openTask(t),
						compact: false,
					});
					break;
				case "kanban":
					renderKanban(viewContainer, filtered);
					break;
				case "matrix":
					renderMatrix(viewContainer, filtered);
					break;
				case "timeline":
					renderTimeline(viewContainer, filtered);
					break;
				case "tree":
					renderTaskTree(viewContainer, filtered, {
						hideFolders: activeFilter.hideFolders ?? false,
					});
					break;
				case "gantt":
					renderGantt(viewContainer, filtered);
					break;
				case "calendar":
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
					if (this.calendarSubView === "day") {
						renderCalendarDay(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode:
								(preset as any)?.intervalMode ||
								"scheduled-due",
						});
					} else if (this.calendarSubView === "week") {
						renderCalendarWeek(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode:
								(preset as any)?.intervalMode ||
								"scheduled-due",
						});
					} else if (this.calendarSubView === "month") {
						renderCalendarMonth(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode:
								(preset as any)?.intervalMode ||
								"scheduled-due",
						});
					} else if (this.calendarSubView === "quarter") {
						renderCalendarQuarter(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode:
								(preset as any)?.intervalMode ||
								"scheduled-due",
						});
					} else if (this.calendarSubView === "year") {
						renderCalendarYear(calContainer, filtered, {
							onClick: (t: any) => this.openTask(t),
							intervalMode:
								(preset as any)?.intervalMode ||
								"scheduled-due",
						});
					}
					break;
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
			if (sort.type === "priority") {
				const pa = a._priorityIcon || "",
					pb = b._priorityIcon || "";
				return pa.localeCompare(pb) * order;
			}
			if (sort.type === "scheduled") {
				return (
					((a._scheduled || "") > (b._scheduled || "") ? 1 : -1) *
					order
				);
			}
			if (sort.type === "due") {
				return ((a._due || "") > (b._due || "") ? 1 : -1) * order;
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
