// src/ui/main/table/table.ts

import {
	DEFAULT_TABLE_COLUMNS,
	STATUS_ICONS,
	STATUS_NAMES,
} from "../../../core/config/config";
import {
	getPriorityIcon,
	getPriorityName,
} from "../../../core/task/task-derived";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { formatDisplayDate } from "../../../util/date-utils";
import { createEl } from "../../../util/dom-utils";
import { removeHeadingNumber } from "../list/tree-view-process";

interface TaskTableOptions {
	onClick?: (node: TaskTreeNode) => void;
	columnsVisibility?: Record<string, boolean>;
}

const TYPE_LABELS: Record<string, string> = {
	file: "📄 文件任务",
	heading: "H 标题任务",
	list: "● 列表任务",
};

interface ColumnDef {
	key: string;
	label: string;
	getValue: (node: TaskTreeNode) => string;
}

export function renderTaskTable(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options: TaskTableOptions = {},
) {
	const visibility = options.columnsVisibility ?? DEFAULT_TABLE_COLUMNS;

	const allColumns: ColumnDef[] = [
		{
			key: "type",
			label: "类型",
			getValue: (n) => TYPE_LABELS[n.type] || "",
		},
		{
			key: "status",
			label: "状态",
			getValue: (n) =>
				`${STATUS_ICONS[n.status] || "🔲"} ${STATUS_NAMES[n.status] || "待办中"}`,
		},
		{
			key: "content",
			label: "描述",
			getValue: (n) => {
				let text = n.text || n.content || "";
				if (n.type === "heading") {
					text = removeHeadingNumber(text);
				}
				return text;
			},
		},
		{
			key: "priority",
			label: "优先级",
			getValue: (n) => {
				const icon = getPriorityIcon(n);
				return icon
					? `${icon} ${getPriorityName(n)}`
					: getPriorityName(n);
			},
		},
		{
			key: "repeat",
			label: "循环",
			getValue: (n) => (n.repeat ? `🔁 ${n.repeat}` : ""),
		},
		{
			key: "created",
			label: "创建",
			getValue: (n) =>
				n.created ? formatDisplayDate(new Date(n.created)) : "",
		},
		{
			key: "scheduled",
			label: "计划",
			getValue: (n) =>
				n.scheduled ? formatDisplayDate(new Date(n.scheduled)) : "",
		},
		{
			key: "starts",
			label: "开始",
			getValue: (n) =>
				n.starts ? formatDisplayDate(new Date(n.starts)) : "",
		},
		{
			key: "cancelled",
			label: "取消",
			getValue: (n) =>
				n.cancelled ? formatDisplayDate(new Date(n.cancelled)) : "",
		},
		{
			key: "done",
			label: "完成",
			getValue: (n) =>
				n.done ? formatDisplayDate(new Date(n.done)) : "",
		},
		{
			key: "due",
			label: "截止",
			getValue: (n) => (n.due ? formatDisplayDate(new Date(n.due)) : ""),
		},
		{ key: "id", label: "唯一ID", getValue: (n) => n.id || "" },
		{ key: "forbid", label: "引用ID", getValue: (n) => n.forbid || "" },
		{ key: "tag", label: "标签", getValue: (n) => n.tag || "" },
	];

	const visibleColumns = allColumns.filter((col) => {
		if (col.key === "type") return true;
		if (!visibility[col.key]) return false;
		return nodes.some((n) => col.getValue(n) !== "");
	});

	const table = createEl("table");
	table.className = "task-table";
	table.addClass("task-w-full", "task-border-collapse");

	const thead = createEl("thead");
	const headerRow = createEl("tr");
	visibleColumns.forEach((col) => {
		const mode = col.key === "content" ? "wrap" : "nowrap";
		headerRow.appendChild(createTh(col.label, mode));
	});
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = createEl("tbody");
	nodes.forEach((node) => {
		const row = createEl("tr");
		row.className = "task-row";
		row.addClass("task-clickable");
		row.addEventListener("dblclick", () => options.onClick?.(node));

		visibleColumns.forEach((col) => {
			const value = col.getValue(node);
			const wrap = col.key === "content";
			row.appendChild(createTd(value, wrap));
		});
		tbody.appendChild(row);
	});
	table.appendChild(tbody);
	container.appendChild(table);
}

function createTh(text: string, mode: "nowrap" | "wrap"): HTMLTableCellElement {
	const th = createEl("th") as HTMLTableCellElement;
	th.textContent = text;
	th.addClass(
		"task-px-2",
		"task-py-1",
		"task-text-left",
		"task-border-bottom",
		"task-text-smaller",
		"task-text-muted",
		"task-font-semibold",
		"task-text-nowrap",
	);
	if (mode === "nowrap") {
		th.addClass("task-w-1");
	} else {
		th.addClass("task-w-66");
	}
	return th;
}

function createTd(text: string, wrap: boolean): HTMLTableCellElement {
	const td = createEl("td") as HTMLTableCellElement;
	td.textContent = text;
	td.addClass(
		"task-px-2",
		"task-py-1",
		"task-border-bottom",
		"task-text-smaller",
		"task-text-normal",
		"task-align-top",
	);
	if (wrap) {
		td.addClass("task-text-wrap", "task-break-word", "task-overflow-wrap");
	} else {
		td.addClass("task-text-nowrap");
	}
	return td;
}
