// src/ui/main/card/group-card.ts

import { TaskTreeNode } from "../../../core/task/task-tree";
import { createTaskCard } from "./card";

export interface GroupCardOptions {
	title: string;
	count: number;
	tasks: TaskTreeNode[];
	onClick?: (node: TaskTreeNode) => void;
	color?: string;
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

	if (color) colDiv.style.borderLeft = `4px solid ${color}`;

	const header = document.createElement("div");
	header.className = "group-card-header";
	header.style.padding = "8px 12px";
	header.style.fontWeight = "600";
	header.style.borderBottom = "1px solid var(--background-modifier-border)";
	header.style.display = "flex";
	header.style.justifyContent = "space-between";
	header.style.alignItems = "center";
	header.innerHTML = `<span>${title}</span><span class="group-card-count" style="color:var(--text-muted)">${count}</span>`;

	const body = document.createElement("div");
	body.className = "group-card-body";
	body.style.padding = "8px 0";

	const list = document.createElement("ul");
	list.className = "task-list";
	tasks.forEach((node) => {
		const card = createTaskCard(node, { onClick });
		list.appendChild(card);
	});
	body.appendChild(list);

	colDiv.appendChild(header);
	colDiv.appendChild(body);
	return colDiv;
}
