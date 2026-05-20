import { filterTasks } from "../../tasks/process/filter-task-process";
import { fetchTodayTasksGrouped } from "../../tasks/process/task-query-process";
import { GlobalFilter } from "../../types";
import { renderTaskList } from "../components/lists/task-list";
import { BaseTaskView } from "./base-view";

export class TodayView extends BaseTaskView {
	async render() {
		this.container.empty();
		this.container.createEl("h4", { text: "📅 今天任务" });

		// 获取当前筛选条件：优先使用 draftFilter，否则使用当前方案的 filter
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter = state.draftFilter ??
			preset?.filter ?? {
				dateRange: { start: null, end: null, isAll: true },
				statuses: ["todo", "planned", "in-progress"],
				includeMarks: [],
				excludeMarks: [],
				hideRepeat: true,
				hideCompleted: true,
				hideCancelled: true,
				rootPath: null,
			};

		try {
			const { groups } = await fetchTodayTasksGrouped(this.app);
			let tasks = [
				...(groups["未开始"] || []),
				...(groups["计划中"] || []),
				...(groups["进行中"] || []),
			];

			// 应用当前筛选（日期、状态、标记、隐藏已完成等）
			tasks = filterTasks(tasks, activeFilter);

			if (tasks.length === 0) {
				this.container.createDiv({ text: "今天没有符合条件的任务" });
				return;
			}
			renderTaskList(this.container, tasks, {
				onClick: (task: any) => {
					const file = this.app.vault.getAbstractFileByPath(
						task.path,
					);
					if (file) {
						this.app.workspace.getLeaf().openFile(file, {
							eState: { line: task.lineNumber },
						});
					}
				},
			});
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
	}
}
