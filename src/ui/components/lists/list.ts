// src/ui/components/lists/list.ts
import { createTaskCard } from "../cards/card";

interface TaskListOptions {
	onClick?: (task: any) => void;
	compact?: boolean;
}

export function renderTaskList(
	container: HTMLElement,
	tasks: any[],
	options: TaskListOptions = {},
) {
	const ul = container.createEl("ul", { cls: "task-list" });
	tasks.forEach((task) => {
		const card = createTaskCard(task, {
			showTooltip: options.compact ?? false,
		});
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
