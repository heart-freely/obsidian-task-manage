import { createTaskCard } from "./task-card";

export interface GroupCardOptions {
	title: string;
	count: number;
	tasks: any[];
	onClick?: (task: any) => void;
	color?: string; // 左侧颜色条，如 "rgba(180,180,180,0.25)"
}

export function createGroupCard(options: GroupCardOptions): HTMLElement {
	const { title, count, tasks, onClick, color } = options;

	const colDiv = document.createElement("div");
	colDiv.className = "group-card";
	colDiv.style.background = "var(--background-primary)";
	colDiv.style.border = "1px solid var(--background-modifier-border)";
	colDiv.style.borderRadius = "8px";
	colDiv.style.marginBottom = "12px";
	colDiv.style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
	colDiv.style.overflow = "hidden";

	// 左侧颜色条（若提供）
	if (color) {
		colDiv.style.borderLeft = `4px solid ${color}`;
	}

	// 标题栏
	const header = document.createElement("div");
	header.className = "group-card-header";
	header.style.padding = "8px 12px";
	header.style.fontWeight = "600";
	header.style.borderBottom = "1px solid var(--background-modifier-border)";
	header.style.display = "flex";
	header.style.justifyContent = "space-between";
	header.style.alignItems = "center";
	header.innerHTML = `<span>${title}</span><span class="group-card-count" style="color:var(--text-muted)">${count}</span>`;

	// 任务列表区
	const body = document.createElement("div");
	body.className = "group-card-body";
	body.style.padding = "8px 0";

	const list = document.createElement("ul");
	list.className = "task-list";
	tasks.forEach((task) => {
		const card = createTaskCard(task);
		if (onClick) {
			card.addEventListener("click", (e) => {
				e.stopPropagation();
				onClick(task);
			});
		}
		list.appendChild(card);
	});
	body.appendChild(list);

	colDiv.appendChild(header);
	colDiv.appendChild(body);
	return colDiv;
}
