// src/ui/components/cards/card.ts
import {
	PRIORITY_ICONS,
	STATUS_ICONS,
	STATUS_NAMES,
	STATUS_SYMBOL_MAP,
	formatDisplayDate,
	getPriorityLabel,
} from "../../../configs/configs";
import { tooltip } from "../tooltip/tooltip";

export function createTaskCard(task: any): HTMLElement {
	const prioIcon = task._priorityIcon || PRIORITY_ICONS[task.priority] || "";
	const zhName = getPriorityLabel(prioIcon);

	let statusIcon = task.statusIcon;
	let statusName = task.statusName || task.statusText;
	if (!statusIcon || !statusName) {
		let statusKey = task._status;
		if (!statusKey && task.status) {
			statusKey = STATUS_SYMBOL_MAP[task.status] || "todo";
		}
		statusKey = statusKey || "todo";
		statusIcon = STATUS_ICONS[statusKey] || "🔲";
		statusName = STATUS_NAMES[statusKey] || "未开始";
	}

	const due = formatDisplayDate(task._due || task.due);
	const scheduled = formatDisplayDate(task._scheduled || task.scheduled);
	const start = formatDisplayDate(task._starts || task.start);
	const created = formatDisplayDate(task._created || task.created);
	const done = formatDisplayDate(task._done || task.done);
	const cancel = formatDisplayDate(task._cancel || task.cancel);

	const meta = [
		`<span>${statusIcon} ${statusName}</span>`,
		prioIcon
			? `<span>${prioIcon} ${zhName}</span>`
			: `<span>${zhName}</span>`,
		task.recurrenceLabel ? `<span>${task.recurrenceLabel}</span>` : "",
		created ? `<span>➕ ${created}</span>` : "",
		scheduled ? `<span>⏳ ${scheduled}</span>` : "",
		start ? `<span>🛫 ${start}</span>` : "",
		cancel ? `<span>❌ ${cancel}</span>` : "",
		done ? `<span>✅ ${done}</span>` : "",
		due ? `<span>📅 ${due}</span>` : "",
		task._tag ? `<span>🏁 ${task._tag}</span>` : "",
		task._id ? `<span>🆔 ${task._id}</span>` : "",
		task._forbid ? `<span>⛔ ${task._forbid}</span>` : "",
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
		"margin:6px 0; padding:8px 10px; background:var(--background-primary); border-radius:8px; font-size:0.9em; cursor:pointer; border-left:3px solid var(--interactive-accent); display:flex; flex-direction:column; color: var(--text-normal);";

	const descHtml = task.description || task._cleanText || "（无描述）";
	li.innerHTML = `<div class="task-desc" style="font-weight:500; margin-bottom:4px;">${descHtml}</div><div class="task-meta" style="font-size:0.8em; color:var(--text-muted); display:flex; gap:8px; flex-wrap:wrap;">${meta}</div>`;

	const tipParts: string[] = [];
	if (task._status) {
		tipParts.push(
			statusIcon + " " + (STATUS_NAMES[task._status] || task._status),
		);
	}
	if (prioIcon) {
		tipParts.push(prioIcon + " " + zhName);
	} else {
		tipParts.push(zhName);
	}
	if (task._repeat) tipParts.push("🔁 " + task._repeat);
	if (created) tipParts.push("➕ " + created);
	if (scheduled) tipParts.push("⏳ " + scheduled);
	if (start) tipParts.push("🛫 " + start);
	if (due) tipParts.push("📅 " + due);
	if (done) tipParts.push("✅ " + done);
	if (cancel) tipParts.push("❌ " + cancel);
	if (task._id) tipParts.push("🆔 " + task._id);
	if (task._forbid) tipParts.push("⛔ " + task._forbid);
	if (task._tag) tipParts.push("🏁 " + task._tag);
	const tooltipHtml = tipParts.join("<br>");

	li.addEventListener("mouseenter", (e) => {
		tooltip.show(tooltipHtml, e.clientX, e.clientY);
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
	return li;
}
