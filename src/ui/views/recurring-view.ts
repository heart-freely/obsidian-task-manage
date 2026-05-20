import { filterTasks } from "../../tasks/process/filter-task-process";
import { fetchRecurringTasksGrouped } from "../../tasks/process/recurring-task-process";
import { GlobalFilter } from "../../types";
import { renderViewBar } from "../bars/view-bar"; // 修改1
import { renderKanban } from "../components/boards/kanban";
import { renderTaskList } from "../components/lists/task-list";
import { renderTaskTable } from "../components/tables/task-table";
import { BaseTaskView } from "./base-view";

export class RecurringView extends BaseTaskView {
	async render() {
		this.container.empty();

		const toolbar = this.container.createDiv({ cls: "view-toolbar" });
		renderViewBar(toolbar, this.store);

		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? this.getDefaultFilter();
		const currentStyle = preset?.viewStyle ?? "list";

		try {
			const groups = await fetchRecurringTasksGrouped(this.app);
			let tasks = [
				...(groups["每天"] || []),
				...(groups["每周"] || []),
				...(groups["每月"] || []),
			];
			tasks = filterTasks(tasks, activeFilter);
			const sort = preset?.sort ?? { type: "status", order: "asc" };
			tasks = this.applySort(tasks, sort);

			if (tasks.length === 0) {
				this.container.createDiv({ text: "🔁 暂无循环任务" });
				return;
			}

			const viewContainer = this.container.createDiv({
				cls: "view-content",
			});

			switch (currentStyle) {
				case "table":
					renderTaskTable(viewContainer, tasks, {
						onClick: (t: any) => this.openTask(t),
					});
					break;
				case "list":
					renderTaskList(viewContainer, tasks, {
						onClick: (t: any) => this.openTask(t),
						compact: false,
					});
					break;
				case "kanban":
					renderKanban(viewContainer, tasks);
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
		if (file)
			this.app.workspace
				.getLeaf()
				.openFile(file, { eState: { line: task.lineNumber } });
	}

	protected applySort(tasks: any[], sort: { type: string; order: string }) {
		const sorted = [...tasks];
		const order = sort.order === "asc" ? 1 : -1;
		sorted.sort((a: any, b: any) => {
			if (sort.type === "status") {
				const map: Record<string, number> = {
					todo: 0,
					planned: 1,
					"in-progress": 2,
					completed: 3,
					cancelled: 4,
				};
				return ((map[a._status] ?? 5) - (map[b._status] ?? 5)) * order;
			}
			if (sort.type === "priority") {
				const pa = a._priorityIcon || "",
					pb = b._priorityIcon || "";
				return pa.localeCompare(pb) * order;
			}
			return 0;
		});
		return sorted;
	}

	protected getDefaultFilter(): GlobalFilter {
		return {
			dateRange: { start: null, end: null, isAll: true },
			statuses: ["todo", "planned", "in-progress"],
			includeMarks: [],
			excludeMarks: [],
			hideRepeat: false, // 循环任务默认显示
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		};
	}
}
