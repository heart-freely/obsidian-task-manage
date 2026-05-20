import { CONFIG } from "../../../configs/configs";
import { tooltip } from "../tooltip/tooltip";

export function renderMatrix(container: HTMLElement, tasks: any[]) {
	const quadrants: any[][] = [[], [], [], []];
	tasks.forEach((task) => {
		const icon = task._priorityIcon;
		if (icon === "🔺") quadrants[0].push(task);
		else if (icon === "⏫") quadrants[1].push(task);
		else if (icon === "🔼") quadrants[2].push(task);
		else quadrants[3].push(task);
	});

	const grid = document.createElement("div");
	grid.className = "view-grid cols-2";

	const labels = [
		"🔺 紧急与重要",
		"⏫ 不紧急但重要",
		"🔼 紧急但不重要",
		"🔽⏬ 不紧急也不重要",
	];
	const colors = [
		"rgba(255,130,130,0.25)",
		"rgba(255,180,100,0.25)",
		"rgba(200,200,200,0.15)",
		"rgba(100,180,255,0.2)",
	];

	labels.forEach((label, idx) => {
		const col = document.createElement("div");
		col.className = "view-col";
		col.style.setProperty("--quad-color", colors[idx]);

		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>${label}</span><span>${quadrants[idx].length}</span>`;
		col.appendChild(header);

		const list = document.createElement("ul");
		list.className = "task-list";
		quadrants[idx].forEach((task) => {
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
		col.appendChild(list);
		grid.appendChild(col);
	});

	container.appendChild(grid);
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
