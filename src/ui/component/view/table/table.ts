// src/ui/component/tables/table.ts

import {
	DEFAULT_TABLE_COLUMNS,
	STATUS_ICONS,
	STATUS_NAMES,
	formatDisplayDate,
} from "../../../../process/config/config";
import {
	getPriorityIcon,
	getPriorityName,
} from "../../../../process/task/task-derived";
import { TaskTreeNode } from "../../../../process/task/task-tree";

interface TaskTableOptions {
	onClick?: (node: TaskTreeNode) => void;
	columnsVisibility?: Record<string, boolean>;
}

export function renderTaskTable(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options: TaskTableOptions = {},
) {
	const visibility = options.columnsVisibility ?? DEFAULT_TABLE_COLUMNS;
	const table = document.createElement("table");
	table.className = "task-table";
	table.style.width = "100%";
	table.style.borderCollapse = "collapse";

	const thead = document.createElement("thead");
	const headerRow = document.createElement("tr");
	if (visibility.status) headerRow.appendChild(createTh("状态", "nowrap"));
	if (visibility.content) headerRow.appendChild(createTh("描述", "wrap"));
	if (visibility.priority)
		headerRow.appendChild(createTh("优先级", "nowrap"));
	if (visibility.repeat) headerRow.appendChild(createTh("循环", "nowrap"));
	if (visibility.created) headerRow.appendChild(createTh("创建", "nowrap"));
	if (visibility.scheduled) headerRow.appendChild(createTh("计划", "nowrap"));
	if (visibility.starts) headerRow.appendChild(createTh("开始", "nowrap"));
	if (visibility.cancelled) headerRow.appendChild(createTh("取消", "nowrap"));
	if (visibility.done) headerRow.appendChild(createTh("完成", "nowrap"));
	if (visibility.due) headerRow.appendChild(createTh("截止", "nowrap"));
	if (visibility.id) headerRow.appendChild(createTh("唯一ID", "nowrap"));
	if (visibility.forbid) headerRow.appendChild(createTh("引用ID", "nowrap"));
	if (visibility.tag) headerRow.appendChild(createTh("标签", "nowrap"));
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement("tbody");
	nodes.forEach((node) => {
		const row = document.createElement("tr");
		row.className = "task-row";
		row.addEventListener("click", () => options.onClick?.(node));

		if (visibility.status) {
			const icon = STATUS_ICONS[node.status] || "🔲";
			const name = STATUS_NAMES[node.status] || "未开始";
			row.appendChild(createTd(`${icon} ${name}`, false));
		}
		if (visibility.content) {
			row.appendChild(createTd(node.text || node.content || "", true));
		}
		if (visibility.priority) {
			const icon = getPriorityIcon(node);
			const label = getPriorityName(node);
			row.appendChild(
				createTd(icon ? `${icon} ${label}` : label || "", false),
			);
		}
		if (visibility.repeat) {
			row.appendChild(
				createTd(node.repeat ? `🔁 ${node.repeat}` : "", false),
			);
		}
		if (visibility.created)
			row.appendChild(
				createTd(
					node.created
						? formatDisplayDate(new Date(node.created))
						: "",
					false,
				),
			);
		if (visibility.scheduled)
			row.appendChild(
				createTd(
					node.scheduled
						? formatDisplayDate(new Date(node.scheduled))
						: "",
					false,
				),
			);
		if (visibility.starts)
			row.appendChild(
				createTd(
					node.starts ? formatDisplayDate(new Date(node.starts)) : "",
					false,
				),
			);
		if (visibility.cancelled)
			row.appendChild(
				createTd(
					node.cancelled
						? formatDisplayDate(new Date(node.cancelled))
						: "",
					false,
				),
			);
		if (visibility.done)
			row.appendChild(
				createTd(
					node.done ? formatDisplayDate(new Date(node.done)) : "",
					false,
				),
			);
		if (visibility.due)
			row.appendChild(
				createTd(
					node.due ? formatDisplayDate(new Date(node.due)) : "",
					false,
				),
			);
		if (visibility.id) row.appendChild(createTd(node.id || "", false));
		if (visibility.forbid)
			row.appendChild(createTd(node.forbid || "", false));
		if (visibility.tag) row.appendChild(createTd(node.tag || "", false));
		tbody.appendChild(row);
	});
	table.appendChild(tbody);
	container.appendChild(table);
}

function createTh(text: string, mode: "nowrap" | "wrap"): HTMLTableCellElement {
	const th = document.createElement("th");
	th.textContent = text;
	th.style.padding = "4px 8px";
	th.style.textAlign = "left";
	th.style.borderBottom = "1px solid var(--background-modifier-border)";
	th.style.fontSize = "var(--font-ui-smaller)";
	th.style.color = "var(--text-muted)";
	th.style.fontWeight = "600";
	th.style.whiteSpace = "nowrap";
	if (mode === "nowrap") th.style.width = "1px";
	else th.style.width = "66%";
	return th;
}

function createTd(text: string, wrap: boolean): HTMLTableCellElement {
	const td = document.createElement("td");
	td.textContent = text;
	td.style.padding = "4px 8px";
	td.style.borderBottom = "1px solid var(--background-modifier-border)";
	td.style.fontSize = "var(--font-ui-smaller)";
	td.style.verticalAlign = "top";
	if (wrap) {
		td.style.whiteSpace = "normal";
		td.style.wordBreak = "break-word";
		td.style.overflowWrap = "break-word";
	} else {
		td.style.whiteSpace = "nowrap";
	}
	return td;
}
