// src/ui/components/tables/table.ts
import {
	DEFAULT_TABLE_COLUMNS,
	getPriorityLabel,
} from "../../../configs/configs";

interface TaskTableOptions {
	onClick?: (task: any) => void;
	columnsVisibility?: Record<string, boolean>;
}

export function renderTaskTable(
	container: HTMLElement,
	tasks: any[],
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
	if (visibility.cancel) headerRow.appendChild(createTh("取消", "nowrap"));
	if (visibility.done) headerRow.appendChild(createTh("完成", "nowrap"));
	if (visibility.due) headerRow.appendChild(createTh("截止", "nowrap"));
	if (visibility.tag) headerRow.appendChild(createTh("标签", "nowrap"));
	if (visibility.id) headerRow.appendChild(createTh("唯一ID", "nowrap"));
	if (visibility.forbid) headerRow.appendChild(createTh("引用ID", "nowrap"));
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement("tbody");
	tasks.forEach((task) => {
		const row = document.createElement("tr");
		row.className = "task-row";
		row.addEventListener("click", () => options.onClick?.(task));

		if (visibility.status) {
			const statusKey = task._status || "todo";
			const icon = STATUS_ICONS[statusKey] || "🔲";
			const name = STATUS_NAMES[statusKey] || "未开始";
			row.appendChild(createTd(`${icon} ${name}`, false));
		}
		if (visibility.content) {
			row.appendChild(createTd(task._cleanText || task.text || "", true));
		}
		if (visibility.priority) {
			const icon = task._priorityIcon || "";
			const label = getPriorityLabel(icon);
			row.appendChild(
				createTd(icon ? `${icon} ${label}` : label || "", false),
			);
		}
		if (visibility.repeat) {
			const text = task._repeat ? `🔁 ${task._repeat}` : "";
			row.appendChild(createTd(text, false));
		}
		if (visibility.created) {
			row.appendChild(createTd(task._created || "", false));
		}
		if (visibility.scheduled) {
			row.appendChild(createTd(task._scheduled || "", false));
		}
		if (visibility.starts) {
			row.appendChild(createTd(task._starts || "", false));
		}
		if (visibility.cancel) {
			row.appendChild(createTd(task._cancel || "", false));
		}
		if (visibility.done) {
			row.appendChild(createTd(task._done || "", false));
		}
		if (visibility.due) {
			row.appendChild(createTd(task._due || "", false));
		}
		if (visibility.tag) {
			row.appendChild(createTd(task._tag || "", false));
		}
		if (visibility.id) {
			row.appendChild(createTd(task._id || "", false));
		}
		if (visibility.forbid) {
			row.appendChild(createTd(task._forbid || "", false));
		}
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
	if (mode === "nowrap") {
		th.style.width = "1px";
	} else {
		th.style.width = "66%";
	}
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
