// src/ui/component/view/card/card.ts

import {
	STATUS_ICONS,
	STATUS_NAMES,
	formatDisplayDate,
} from "../../../../process/config/config";
import {
	buildTaskTooltip,
	getPriorityIcon,
	getPriorityName,
} from "../../../../process/task/task-derived";
import { TaskTreeNode } from "../../../../process/task/task-tree";
import { tooltip } from "../../tooltip/tooltip";

export interface TaskCardOptions {
	showTooltip?: boolean;
	compact?: boolean;
}

export function createTaskCard(
	node: TaskTreeNode,
	options?: TaskCardOptions,
): HTMLElement {
	const showTooltip = options?.showTooltip ?? true;
	const compact = options?.compact ?? false;

	const prioIcon = getPriorityIcon(node);
	const zhName = getPriorityName(node);
	const statusIcon = STATUS_ICONS[node.status] || "🔲";
	const statusName = STATUS_NAMES[node.status] || "未开始";

	const due = node.due ? formatDisplayDate(new Date(node.due)) : "";
	const scheduled = node.scheduled
		? formatDisplayDate(new Date(node.scheduled))
		: "";
	const start = node.starts ? formatDisplayDate(new Date(node.starts)) : "";
	const created = node.created
		? formatDisplayDate(new Date(node.created))
		: "";
	const done = node.done ? formatDisplayDate(new Date(node.done)) : "";
	const cancelled = node.cancelled
		? formatDisplayDate(new Date(node.cancelled))
		: "";
	const fileName = node.path.split("/").pop()?.replace(".md", "") || "";

	const meta = [
		`<span>${statusIcon} ${statusName}</span>`,
		prioIcon
			? `<span>${prioIcon} ${zhName}</span>`
			: `<span>${zhName}</span>`,
		node.repeat ? `<span>🔁 ${node.repeat}</span>` : "",
		created ? `<span>➕ ${created}</span>` : "",
		scheduled ? `<span>⏳ ${scheduled}</span>` : "",
		start ? `<span>🛫 ${start}</span>` : "",
		cancelled ? `<span>❌ ${cancelled}</span>` : "",
		done ? `<span>✅ ${done}</span>` : "",
		due ? `<span>📅 ${due}</span>` : "",
		node.id ? `<span>🆔 ${node.id}</span>` : "",
		node.forbid ? `<span>⛔ ${node.forbid}</span>` : "",
		node.tag ? `<span>🏁 ${node.tag}</span>` : "",
		`<span>📄 ${fileName}</span>`,
	]
		.filter(Boolean)
		.join("");

	const li = document.createElement("li");
	li.className = "task-item";
	li.setAttribute("data-path", node.path);
	li.setAttribute("data-line-number", String(node.line));

	const descHtml = node.text || node.content || "（无描述）";

	if (compact) {
		li.style.cssText =
			"margin:0;padding:1px 0;background:transparent;border-radius:4px;font-size:var(--font-ui-small);cursor:pointer;border:none;display:block;list-style:none;border-left:none;";
		li.innerHTML = `<div class="task-desc" style="font-weight:normal;margin-bottom:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:0;line-height:1.5;">${descHtml}</div>`;
	} else {
		li.style.cssText =
			"margin:6px 0; padding:8px 10px; background:var(--background-primary); border-radius:8px; font-size:0.9em; cursor:pointer; border-left:3px solid var(--interactive-accent); display:flex; flex-direction:column; color:var(--text-normal); transition:background 0.1s;";
		li.innerHTML = `<div class="task-desc" style="font-weight:500;margin-bottom:4px;">${descHtml}</div><div class="task-meta" style="font-size:0.8em;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;">${meta}</div>`;
	}

	if (!node.display) {
		li.style.opacity = "0.4";
	}

	li.addEventListener("mouseenter", () => {
		li.style.backgroundColor = compact
			? "var(--background-modifier-hover)"
			: "var(--background-modifier-hover)";
	});
	li.addEventListener("mouseleave", () => {
		li.style.backgroundColor = compact
			? "transparent"
			: "var(--background-primary)";
	});

	if (showTooltip) {
		const tooltipHtml = buildTaskTooltip(node);
		if (tooltipHtml) {
			li.addEventListener("mouseenter", (e) =>
				tooltip.show(tooltipHtml, e.clientX, e.clientY),
			);
			li.addEventListener("mousemove", (e) =>
				tooltip.move(e.clientX, e.clientY),
			);
			li.addEventListener("mouseleave", () => tooltip.hide());
		}
	}

	return li;
}
