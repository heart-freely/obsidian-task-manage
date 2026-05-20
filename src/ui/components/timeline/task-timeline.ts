import { CONFIG } from "../../../configs/configs";
import { tooltip } from "../tooltip/tooltip";

export function renderTimeline(container: HTMLElement, tasks: any[]) {
	const groups: Record<string, any[]> = {};
	tasks.forEach((task) => {
		const due = task._due || "无截止日期";
		if (!groups[due]) groups[due] = [];
		groups[due].push(task);
	});

	const sortedDates = Object.keys(groups).sort((a, b) => {
		if (a === "无截止日期") return 1;
		if (b === "无截止日期") return -1;
		return a.localeCompare(b);
	});

	sortedDates.forEach((date) => {
		const group = document.createElement("div");
		group.className = "timeline-group";

		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>📅 ${date}</span><span>${groups[date].length} 项</span>`;
		group.appendChild(header);

		const list = document.createElement("ul");
		list.className = "task-list";
		groups[date].forEach((task) => {
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
		group.appendChild(list);
		container.appendChild(group);
	});
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
