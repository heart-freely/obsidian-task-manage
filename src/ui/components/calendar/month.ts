import { DateUtils } from "../../../tasks/process/common-process";

export function renderCalendarMonth(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";
	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth();

	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dow = startDay.getDay() || 7;
	startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

	const grid = container.createDiv({ cls: "calendar-grid" });
	// 标题行
	["一", "二", "三", "四", "五", "六", "日"].forEach((d) => {
		const cell = grid.createDiv({ text: d, cls: "cal-cell-header" });
	});

	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		const dateStr = DateUtils.formatDate(d);
		const isToday = DateUtils.formatDate(today) === dateStr;
		const isOtherMonth = d.getMonth() !== month;

		const cell = grid.createDiv({
			cls:
				"cal-cell" +
				(isToday ? " today" : "") +
				(isOtherMonth ? " other-month" : ""),
		});
		cell.createDiv({ text: `${d.getDate()}`, cls: "cal-cell-header" });

		const dayTasks = tasks.filter((task) =>
			isTaskInDate(task, d, intervalMode),
		);
		dayTasks.forEach((task) => {
			const taskEl = cell.createDiv({ cls: "cal-task" });
			taskEl.createSpan({ text: task._cleanText || task.text });
			taskEl.addEventListener("click", () => {
				if (options?.onClick) options.onClick(task);
			});
		});
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
