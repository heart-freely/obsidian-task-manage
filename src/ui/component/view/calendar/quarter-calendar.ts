import { DateUtils } from "../../../../process/process";

export function renderCalendarQuarter(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const today = new Date();
	const q = Math.floor(today.getMonth() / 3) + 1;
	const startMonth = (q - 1) * 3;

	for (let m = 0; m < 3; m++) {
		const monthIdx = startMonth + m;
		const monDiv = container.createDiv({ cls: "quarter-month" });
		monDiv.createEl("div", {
			text: `${today.getFullYear()}年${monthIdx + 1}月`,
			cls: "quarter-month-title",
		});
		// 复用月视图的简化版（这里直接嵌入简化网格，或调用 renderCalendarMonth 的一部分，为避免循环，我们内联一个简单网格）
		renderMiniMonth(monDiv, today.getFullYear(), monthIdx, tasks, options);
	}
}

function renderMiniMonth(
	container: HTMLElement,
	year: number,
	month: number,
	tasks: any[],
	options?: any,
) {
	const firstDay = new Date(year, month, 1);
	const startDay = new Date(firstDay);
	const dow = startDay.getDay() || 7;
	startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));

	const grid = container.createDiv({ cls: "mini-calendar-grid" });
	for (let i = 0; i < 42; i++) {
		const d = new Date(startDay);
		d.setDate(startDay.getDate() + i);
		const dateStr = DateUtils.formatDate(d);
		const isOtherMonth = d.getMonth() !== month;
		const cell = grid.createDiv({
			cls: "mini-cell" + (isOtherMonth ? " other-month" : ""),
		});
		cell.textContent = d.getDate().toString();
		const dayTasks = tasks.filter((task) => {
			// 判断任务是否覆盖该日期（使用 intervalMode）
			const intervalMode = options?.intervalMode || "scheduled-due";
			return isTaskInDate(task, d, intervalMode);
		});
		if (dayTasks.length > 0) {
			cell.style.backgroundColor = "#4dabf7";
			cell.style.color = "white";
			cell.title = dayTasks.map((t) => t._cleanText).join(", ");
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
