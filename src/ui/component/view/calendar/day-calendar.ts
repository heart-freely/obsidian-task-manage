import { DateUtils } from "../../../../process/process";

export function renderCalendarDay(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void; intervalMode?: string },
) {
	container.empty();
	const intervalMode = options?.intervalMode || "scheduled-due";

	// 按日期分组任务
	const map = new Map<string, any[]>();
	const today = new Date();
	const todayStr = DateUtils.formatDate(today);
	// 默认只显示今天，若 tasks 中包含今天有交集的任务，则显示；否则也展示今天但无任务
	// 为了支持过去/未来日期，可以扩展，但这里仅展示任务所覆盖的所有日期
	tasks.forEach((task) => {
		// 计算任务覆盖的日期列表
		const dates = getDatesForTask(task, intervalMode);
		dates.forEach((dateStr) => {
			if (!map.has(dateStr)) map.set(dateStr, []);
			map.get(dateStr)!.push(task);
		});
	});

	// 按日期排序
	const sortedDates = Array.from(map.keys()).sort();
	if (sortedDates.length === 0) {
		container.createDiv({ text: "暂无任务日期", cls: "empty-placeholder" });
		return;
	}

	sortedDates.forEach((dateStr) => {
		const groupDiv = container.createDiv({ cls: "day-group" });
		const header = groupDiv.createEl("div", {
			text: `📅 ${dateStr}`,
			cls: "day-header",
		});
		const list = groupDiv.createEl("ul", { cls: "task-list" });
		const dayTasks = map.get(dateStr)!;
		dayTasks.forEach((task) => {
			const li = list.createEl("li", { cls: "task-item" });
			li.createSpan({
				text: `${task._statusIcon || ""} ${task._cleanText || task.text}`,
			});
			li.addEventListener("click", () => {
				if (options?.onClick) options.onClick(task);
			});
		});
	});
}

function getDatesForTask(task: any, intervalMode: string): string[] {
	const dates: string[] = [];
	let startField: string, endField: string;
	if (intervalMode === "starts-done") {
		startField = "_starts";
		endField = "_done" in task && task._done ? "_done" : "_due";
	} else {
		startField = "_scheduled";
		endField = "_due";
	}
	const start = task[startField] ? new Date(task[startField]) : null;
	const end = task[endField] ? new Date(task[endField]) : null;
	if (start && end) {
		let cur = DateUtils.setStart(start);
		const finish = DateUtils.setEnd(end).getTime();
		while (cur.getTime() <= finish) {
			dates.push(DateUtils.formatDate(cur));
			cur.setDate(cur.getDate() + 1);
		}
	}
	return dates;
}
