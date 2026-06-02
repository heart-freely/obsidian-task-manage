import { filterTasks } from "../../process/bars/bars-process";
import { fetchOverdueTasks } from "../../process/views/task-query-process";
import { GlobalFilter } from "../../types";
// 修改1
import { renderKanban } from "../components/boards/kanban-board";
import { renderTaskList } from "../components/lists/list";
import { renderTaskTable } from "../components/tables/table";
import { BaseTaskView } from "./base-view";

export class OverdueView extends BaseTaskView {
	async render() {
		this.container.empty();

		const toolbar = this.container.createDiv({ cls: "view-toolbar" });

		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? this.getDefaultFilter();
		const currentStyle = preset?.viewStyle ?? "list";

		try {
			let tasks = await fetchOverdueTasks(this.app);
			tasks = filterTasks(tasks, activeFilter);
			const sort = preset?.sort ?? { type: "due", order: "asc" };
			tasks = this.applySort(tasks, sort);

			if (tasks.length === 0) {
				this.container.createDiv({ text: "⏰ 暂无逾期任务" });
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
				case "list-simple":
					renderTaskList(viewContainer, tasks, {
						onClick: (t: any) => this.openTask(t),
						compact: true,
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
			if (sort.type === "due") {
				return ((a._due || "") > (b._due || "") ? 1 : -1) * order;
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
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		};
	}
}
