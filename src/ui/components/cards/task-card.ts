import { CONFIG } from "../../../configs/configs";
import { tooltip } from "../tooltip/tooltip";

export function createTaskCard(task: any): HTMLElement {
	const prio = task.priority || "none";
	const prioIcon = CONFIG.PRIORITY_ICONS[prio] || "";
	const prioLabel = CONFIG.PRIORITY_LABELS[prio] || "None|无";

	let statusIcon = task.statusIcon;
	let statusName = task.statusName || task.statusText;
	if (!statusIcon || !statusName) {
		const statusKey = task.status || task._status || "todo";
		statusIcon = CONFIG.STATUS_ICONS[statusKey] || "🔲";
		statusName = CONFIG.STATUS_NAMES[statusKey] || "未开始";
	}

	// 元数据行（详细模式）
	const meta = [
		`<span>${statusIcon} ${statusName}</span>`,
		prioIcon
			? `<span>${prioIcon} ${prioLabel}</span>`
			: `<span>${prioLabel}</span>`,
		task.recurrenceLabel ? `<span>${task.recurrenceLabel}</span>` : "",
		task.scheduled ? `<span>⏳ ${task.scheduled}</span>` : "",
		task.start ? `<span>🛫 ${task.start}</span>` : "",
		task.due ? `<span>📅 ${task.due}</span>` : "",
		task.id ? `<span>🆔 ${task.id}</span>` : "",
		task.forbid ? `<span>⛔ ${task.forbid}</span>` : "",
		task.tags && task.tags.length
			? `<span>🏁 ${task.tags.join(", ")}</span>`
			: "",
		`<span>📄 ${task.fileName || (task.path ? task.path.split("/").pop()?.replace(".md", "") : "")}</span>`,
	]
		.filter(Boolean)
		.join("");

	const li = document.createElement("li");
	li.className = "task-item";
	li.setAttribute("data-path", task.path);
	li.setAttribute("data-line", task.lineNumber ?? task.line);
	li.style.cssText =
		"margin:6px 0; padding:8px 10px; background:var(--background-primary); " +
		"border-radius:8px; font-size:0.9em; cursor:pointer; " +
		"border-left:3px solid var(--interactive-accent); display:flex; flex-direction:column; " +
		"color: var(--text-normal);";

	// 第一行：状态图标 + 优先级图标 + 描述（紧凑模式下将隐藏优先级图标）
	const descHtml = `${statusIcon} ${prioIcon} ${task.description || task._cleanText || "（无描述）"}`;
	li.innerHTML = `
    <div class="task-desc" style="font-weight:500; margin-bottom:4px;">${descHtml}</div>
    <div class="task-meta" style="font-size:0.8em; color:var(--text-muted); display:flex; gap:8px; flex-wrap:wrap;">${meta}</div>
  `;

	// 悬停提示
	if (!task._tooltipHtml) {
		const parts = [];
		if (task._status) parts.push("状态：" + task._status);
		if (task._priorityIcon) parts.push("优先级：" + task._priorityIcon);
		if (task._due) parts.push("📅 " + task._due);
		if (task._scheduled) parts.push("⏳ " + task._scheduled);
		if (task._id) parts.push("🆔 " + task._id);
		if (task._forbid) parts.push("⛔ " + task._forbid);
		if (task._tag) parts.push("🏁 " + task._tag);
		task._tooltipHtml = parts.join("<br>");
	}

	li.addEventListener("mouseenter", (e) => {
		tooltip.show(task._tooltipHtml, e.clientX, e.clientY);
	});
	li.addEventListener("mousemove", (e) => {
		tooltip.move(e.clientX, e.clientY);
	});
	li.addEventListener("mouseleave", () => {
		tooltip.hide();
	});

	li.addEventListener("click", async () => {
		const app = (window as any).app;
		const file = app?.vault.getAbstractFileByPath(task.path);
		if (file) {
			const leaf = app.workspace.getLeaf(false);
			await leaf.openFile(file);
			setTimeout(
				() =>
					leaf.view?.editor?.setCursor({
						line: parseInt(task.lineNumber ?? task.line),
						ch: 0,
					}),
				30,
			);
		}
	});

	// 紧凑模式下隐藏优先级图标
	const compactFlag = false; // 具体由 task-list 组件控制
	// 将在 task-list 中通过类名实现
	return li;
}
