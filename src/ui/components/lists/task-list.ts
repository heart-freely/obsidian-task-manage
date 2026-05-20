import { createTaskCard } from "../cards/task-card";

interface TaskListOptions {
	onClick?: (task: any) => void;
	compact?: boolean; // true=简洁单行，false/undefined=详细两行
}

export function renderTaskList(
	container: HTMLElement,
	tasks: any[],
	options: TaskListOptions = {},
) {
	const ul = container.createEl("ul", { cls: "task-list" });
	tasks.forEach((task) => {
		const card = createTaskCard(task);
		if (options.compact) {
			card.classList.add("task-item-compact");
			const meta = card.querySelector(".task-meta");
			if (meta) meta.remove();
			const desc = card.querySelector(".task-desc");
			if (desc) (desc as HTMLElement).style.whiteSpace = "nowrap";
		}
		if (options.onClick) {
			card.addEventListener("click", (e) => {
				e.stopPropagation();
				options.onClick!(task);
			});
		}
		ul.appendChild(card);
	});
}
