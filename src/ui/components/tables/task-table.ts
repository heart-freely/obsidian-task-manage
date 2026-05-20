interface TaskTableOptions {
	onClick?: (task: any) => void;
}

export function renderTaskTable(
	container: HTMLElement,
	tasks: any[],
	options: TaskTableOptions = {},
) {
	const table = document.createElement("table");
	table.className = "task-table";

	const thead = document.createElement("thead");
	thead.innerHTML = `
    <tr>
      <th>状态</th>
      <th>内容</th>
      <th>优先级</th>
      <th>计划</th>
      <th>截止</th>
      <th>文件</th>
    </tr>
  `;
	table.appendChild(thead);

	const tbody = document.createElement("tbody");
	tasks.forEach((task) => {
		const row = document.createElement("tr");
		row.className = "task-row";
		row.addEventListener("click", () => options.onClick?.(task));

		row.innerHTML = `
      <td>${task._status || ""}</td>
      <td>${task._cleanText || task.text || ""}</td>
      <td>${task._priorityIcon || ""}</td>
      <td>${task._scheduled || ""}</td>
      <td>${task._due || ""}</td>
      <td>${(task.path || "").split("/").pop() || ""}</td>
    `;
		tbody.appendChild(row);
	});
	table.appendChild(tbody);
	container.appendChild(table);
}
