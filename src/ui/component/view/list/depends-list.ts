import { createGroupCard } from "../card/group-card";

export function renderDepends(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();
	// 只保留有依赖标记的任务
	const dependsTasks = tasks.filter((t) => t._forbid);
	if (dependsTasks.length === 0) {
		container.createDiv({ text: "🔗 暂无依赖任务" });
		return;
	}

	const sorted = [...dependsTasks].sort((a, b) => {
		const aHas = a._forbid ? 1 : 0;
		const bHas = b._forbid ? 1 : 0;
		return bHas - aHas;
	});

	const card = createGroupCard({
		title: "🔗 依赖任务",
		count: sorted.length,
		tasks: sorted,
		onClick: options?.onClick,
		color: "rgba(224,108,117,0.25)",
	});
	container.appendChild(card);
}
