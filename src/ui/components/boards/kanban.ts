import { CONFIG } from "../../../configs/configs";
import { tooltip } from "../tooltip/tooltip";

export function renderKanban(container: HTMLElement, tasks: any[]) {
	const groups: Record<string, any[]> = {
		todo: [],
		planned: [],
		"in-progress": [],
	};
	tasks.forEach((t) => {
		const st = t._status;
		if (groups[st]) groups[st].push(t);
		else groups.todo.push(t);
	});

	const board = document.createElement("div");
	board.className = "kanban-board";

	const columns = [
		{ key: "todo", label: "未开始", color: "rgba(180,180,180,0.25)" },
		{ key: "planned", label: "计划中", color: "rgba(97,175,239,0.25)" },
		{
			key: "in-progress",
			label: "进行中",
			color: "rgba(224,108,117,0.25)",
		},
	];

	columns.forEach((col) => {
		const colDiv = document.createElement("div");
		colDiv.className = "view-col";
		colDiv.style.setProperty("--quad-color", col.color);

		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>${col.label}</span><span>${(groups[col.key] || []).length}</span>`;
		colDiv.appendChild(header);

		const list = document.createElement("ul");
		list.className = "task-list";
		(groups[col.key] || []).forEach((task) => {
			const li = document.createElement("li");
			li.className = "task-item";
			li.innerHTML = `
        <div class="task-desc">${CONFIG.STATUS_ICONS[task._status] || "🔲"} ${task._priorityIcon || ""} ${task._cleanText || task.text || ""}</div>
        <div class="task-meta">${task._due ? "📅 " + task._due : ""}</div>
      `;

			const tipHtml = buildTooltipHtml(task);
			li.addEventListener("mouseenter", (e) => {
				tooltip.show(tipHtml, e.clientX, e.clientY);
			});
			li.addEventListener("mousemove", (e) => {
				tooltip.move(e.clientX, e.clientY);
			});
			li.addEventListener("mouseleave", () => {
				tooltip.hide();
			});

			li.addEventListener("click", () => {
				const app = (window as any).app;
				const file = app?.vault?.getAbstractFileByPath(task.path);
				if (file)
					app.workspace
						.getLeaf()
						.openFile(file, { eState: { line: task.line } });
			});
			list.appendChild(li);
		});
		colDiv.appendChild(list);
		board.appendChild(colDiv);
	});

	container.appendChild(board);
}

function buildTooltipHtml(task: any): string {
	const parts: string[] = [];
	if (task._status) parts.push("状态：" + task._status);
	if (task._priorityIcon) parts.push("优先级：" + task._priorityIcon);
	if (task._due) parts.push("📅 " + task._due);
	if (task._scheduled) parts.push("⏳ " + task._scheduled);
	if (task._id) parts.push("🆔 " + task._id);
	if (task._forbid) parts.push("⛔ " + task._forbid);
	if (task._tag) parts.push("🏁 " + task._tag);
	return parts.join("<br>");
}
