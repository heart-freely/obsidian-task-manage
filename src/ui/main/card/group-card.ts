// src/ui/main/card/group-card.ts

import { TaskTreeNode } from "../../../core/task/task-tree";
import { createTaskCard } from "./card";

export interface GroupCardOptions {
	title: string;
	count: number;
	tasks: TaskTreeNode[];
	onClick?: (node: TaskTreeNode) => void;
	onEnterEdit?: (node: TaskTreeNode) => void;
	color?: string;
}

export function createGroupCard(options: GroupCardOptions): HTMLElement {
	const { title, count, tasks, onClick, onEnterEdit, color } = options;
	const colDiv = createDiv();
	colDiv.className = "task-group-card";
	colDiv.addClass(
		"task-group-card",
		"task-bg-primary",
		"task-border",
		"task-rounded",
		"task-mb-2",
		"task-shadow-sm",
		"task-overflow-hidden",
	);
	if (color) colDiv.style.borderLeft = `4px solid ${color}`;
	const header = createDiv();
	header.className = "task-group-card-header";
	header.addClass(
		"task-flex",
		"task-justify-start",
		"task-items-center",
		"task-gap-2",
		"task-p-2",
		"task-font-semibold",
		"task-border-bottom",
	);
	const titleSpan = createSpan();
	titleSpan.textContent = title;
	const countSpan = createSpan();
	countSpan.className = "task-group-card-count";
	countSpan.addClass("task-text-muted", "task-text-nowrap");
	countSpan.textContent = String(count);
	header.appendChild(titleSpan);
	header.appendChild(countSpan);
	const body = createDiv();
	body.className = "task-group-card-body";
	body.addClass("task-py-1");
	const list = createEl("ul");
	list.className = "task-list";
	list.addClass("task-pl-0", "task-list-none");
	tasks.forEach((node) => {
		list.appendChild(createTaskCard(node, { onClick, onEnterEdit }));
	});
	body.appendChild(list);
	colDiv.appendChild(header);
	colDiv.appendChild(body);
	return colDiv;
}
