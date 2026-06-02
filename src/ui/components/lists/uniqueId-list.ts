// src/ui/components/lists/uniqueId-renderer.ts
import { createGroupCard } from "../cards/group-card";

export function renderUniqueId(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();
	const uniqueIdTasks = tasks.filter((t) => t._id);
	if (uniqueIdTasks.length === 0) {
		container.createDiv({ text: "🆔 暂无带唯一ID的任务" });
		return;
	}

	const sorted = [...uniqueIdTasks].sort((a, b) => {
		const aHas = a._id ? 1 : 0;
		const bHas = b._id ? 1 : 0;
		return bHas - aHas;
	});

	const card = createGroupCard({
		title: "🆔 唯一ID任务",
		count: sorted.length,
		tasks: sorted,
		onClick: options?.onClick,
		color: "rgba(140, 120, 200, 0.25)",
	});
	container.appendChild(card);
}
