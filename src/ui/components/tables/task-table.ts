import { CONFIG, DEFAULT_TABLE_COLUMNS } from "../../../configs/configs";

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

	const thead = document.createElement("thead");
	const headerRow = document.createElement("tr");
	if (visibility.status) headerRow.appendChild(createTh("状态"));
	if (visibility.content) headerRow.appendChild(createTh("描述"));
	if (visibility.priority) headerRow.appendChild(createTh("优先级"));
	if (visibility.repeat) headerRow.appendChild(createTh("循环"));
	if (visibility.scheduled) headerRow.appendChild(createTh("计划"));
	if (visibility.starts) headerRow.appendChild(createTh("开始"));
	if (visibility.due) headerRow.appendChild(createTh("截止"));
	if (visibility.created) headerRow.appendChild(createTh("创建"));
	if (visibility.done) headerRow.appendChild(createTh("完成"));
	if (visibility.cancel) headerRow.appendChild(createTh("取消"));
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement("tbody");
	tasks.forEach((task) => {
		const row = document.createElement("tr");
		row.className = "task-row";
		row.addEventListener("click", () => options.onClick?.(task));

		if (visibility.status) {
			const statusKey = task._status || "todo";
			const icon = CONFIG.STATUS_ICONS[statusKey] || "🔲";
			const name = CONFIG.STATUS_NAMES[statusKey] || "未开始";
			row.appendChild(createTd(`${icon} ${name}`));
		}
		if (visibility.content) {
			row.appendChild(createTd(task._cleanText || task.text || ""));
		}
		if (visibility.priority) {
			row.appendChild(createTd(task._priorityIcon || ""));
		}
		if (visibility.repeat) {
			row.appendChild(createTd(task._repeat || ""));
		}
		if (visibility.scheduled) {
			row.appendChild(createTd(task._scheduled || ""));
		}
		if (visibility.starts) {
			row.appendChild(createTd(task._starts || ""));
		}
		if (visibility.due) {
			row.appendChild(createTd(task._due || ""));
		}
		if (visibility.created) {
			row.appendChild(createTd(task._created || ""));
		}
		if (visibility.done) {
			row.appendChild(createTd(task._done || ""));
		}
		if (visibility.cancel) {
			row.appendChild(createTd(task._cancel || ""));
		}
		tbody.appendChild(row);
	});
	table.appendChild(tbody);
	container.appendChild(table);
}

function createTh(text: string): HTMLTableCellElement {
	const th = document.createElement("th");
	th.textContent = text;
	return th;
}

function createTd(text: string): HTMLTableCellElement {
	const td = document.createElement("td");
	td.textContent = text;
	return td;
}
