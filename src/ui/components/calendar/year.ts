import { DateUtils } from "../../../tasks/process/common-process";

export function renderCalendarYear(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const year = new Date().getFullYear();
	const monthNames = [
		"1月",
		"2月",
		"3月",
		"4月",
		"5月",
		"6月",
		"7月",
		"8月",
		"9月",
		"10月",
		"11月",
		"12月",
	];
	const grid = container.createDiv({ cls: "year-grid" });

	for (let m = 0; m < 12; m++) {
		const monthDiv = grid.createDiv({ cls: "year-month-card" });
		monthDiv.createDiv({ text: monthNames[m], cls: "year-month-title" });

		const firstDay = new Date(year, m, 1);
		const startDay = new Date(firstDay);
		const dow = startDay.getDay() || 7;
		startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

		const miniGrid = monthDiv.createDiv({ cls: "year-heat-grid" });
		for (let i = 0; i < 42; i++) {
			const d = new Date(startDay);
			d.setDate(startDay.getDate() + i);
			const isOtherMonth = d.getMonth() !== m;
			const cell = miniGrid.createDiv({
				cls: "year-heat-cell" + (isOtherMonth ? " other-month" : ""),
			});
			cell.textContent = d.getDate().toString();

			const dayTasks = tasks.filter((task) => {
				const intervalMode = options?.intervalMode || "scheduled-due";
				return isTaskInDate(task, d, intervalMode);
			});
			if (dayTasks.length > 0) {
				cell.style.backgroundColor = "#4dabf7";
				cell.style.color = "white";
			}
		}
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
