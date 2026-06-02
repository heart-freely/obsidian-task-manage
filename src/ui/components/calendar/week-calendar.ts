import { DateUtils } from "../../../process/process";

export function renderCalendarWeek(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";

	// 找到最小/最大日期，生成覆盖的周列表
	const allDates = getRelevantDates(tasks, intervalMode);
	if (allDates.length === 0) {
		container.createDiv({ text: "无任务日期", cls: "empty-placeholder" });
		return;
	}
	const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
	const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

	// 生成周列表
	let weekStart = DateUtils.setStart(minDate);
	// 确保从周一开始
	const dow = weekStart.getDay() || 7;
	weekStart.setDate(weekStart.getDate() - (dow - 1));

	const today = new Date();
	while (weekStart <= maxDate) {
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekEnd.getDate() + 6);

		const weekDiv = container.createDiv({ cls: "week-block" });
		weekDiv.createEl("div", {
			text: `📅 ${DateUtils.formatDate(weekStart)} ~ ${DateUtils.formatDate(weekEnd)} (第${DateUtils.getISOWeekNumber(weekStart)}周)`,
			cls: "week-title",
		});

		// 生成7列网格
		const grid = weekDiv.createDiv({ cls: "calendar-grid" });
		for (let i = 0; i < 7; i++) {
			const d = new Date(weekStart);
			d.setDate(d.getDate() + i);
			const dateStr = DateUtils.formatDate(d);
			const isToday = DateUtils.formatDate(today) === dateStr;

			const cell = grid.createDiv({
				cls: "cal-cell" + (isToday ? " today" : ""),
			});
			cell.createDiv({ text: `${d.getDate()}`, cls: "cal-cell-header" });

			// 获取当天任务
			const dayTasks = tasks.filter((task) =>
				isTaskInDate(task, d, intervalMode),
			);
			if (dayTasks.length > 0) {
				const list = cell.createEl("ul", { cls: "task-list-mini" });
				dayTasks.forEach((task) => {
					const li = list.createEl("li", {
						text: task._cleanText || task.text,
					});
					li.addEventListener("click", () => {
						if (options?.onClick) options.onClick(task);
					});
				});
			}
		}

		weekStart.setDate(weekStart.getDate() + 7);
	}
}

function isTaskInDate(task: any, date: Date, intervalMode: string): boolean {
	const startField =
		intervalMode === "starts-done" ? "_starts" : "_scheduled";
	const endField =
		intervalMode === "starts-done"
			? task._done
				? "_done"
				: "_due"
			: "_due";
	const start = task[startField] ? new Date(task[startField]) : null;
	const end = task[endField] ? new Date(task[endField]) : null;
	if (!start || !end) return false;
	const dayStart = DateUtils.setStart(date).getTime();
	const dayEnd = DateUtils.setEnd(date).getTime();
	return start.getTime() <= dayEnd && end.getTime() >= dayStart;
}

function getRelevantDates(tasks: any[], intervalMode: string): Date[] {
	const dates: Date[] = [];
	tasks.forEach((task) => {
		const startField =
			intervalMode === "starts-done" ? "_starts" : "_scheduled";
		const endField =
			intervalMode === "starts-done"
				? task._done
					? "_done"
					: "_due"
				: "_due";
		if (task[startField]) dates.push(new Date(task[startField]));
		if (task[endField]) dates.push(new Date(task[endField]));
	});
	return dates;
}
