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

	const colDiv = document.createElement("div");
	colDiv.className = "group-card";
	colDiv.addClass(
		"task-group-card",
		"task-bg-primary",
		"task-border",
		"task-rounded",
		"task-mb-2",
		"task-shadow-sm",
		"task-overflow-hidden",
	);

	if (color) {
		colDiv.style.borderLeft = `4px solid ${color}`;
	}

	const header = document.createElement("div");
	header.className = "group-card-header";
	header.addClass(
		"task-flex",
		"task-justify-start",
		"task-items-center",
		"task-gap-2",
		"task-p-2",
		"task-font-semibold",
		"task-border-bottom",
	);

	const titleSpan = document.createElement("span");
	titleSpan.textContent = title;

	const countSpan = document.createElement("span");
	countSpan.className = "group-card-count";
	countSpan.addClass("task-text-muted", "task-text-nowrap");
	countSpan.textContent = String(count);

	header.appendChild(titleSpan);
	header.appendChild(countSpan);

	const body = document.createElement("div");
	body.className = "group-card-body";
	body.addClass("task-py-1");

	const list = document.createElement("ul");
	list.className = "task-list";
	list.addClass("task-pl-0", "task-list-none");
	tasks.forEach((node) => {
		const card = createTaskCard(node, {
			onClick,
			onEnterEdit,
		});
		list.appendChild(card);
	});
	body.appendChild(list);

	colDiv.appendChild(header);
	colDiv.appendChild(body);
	return colDiv;
}
