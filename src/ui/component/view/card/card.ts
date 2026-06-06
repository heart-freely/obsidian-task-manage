// src/ui/component/view/card/card.ts
// 统一任务卡片组件——纯展示，支持详细/简洁两种模式

import {
	PRIORITY_ICONS,
	STATUS_ICONS,
	STATUS_NAMES,
	STATUS_SYMBOL_MAP,
	formatDisplayDate,
	getPriorityLabel,
} from "../../../../process/config/config";
import { tooltip } from "../../tooltip/tooltip";

function hasValue(val: any): boolean {
	if (val === null || val === undefined) return false;
	if (typeof val === "string" && val.trim() === "") return false;
	return true;
}

export interface TaskCardOptions {
	/** 是否显示 tooltip，默认 true */
	showTooltip?: boolean;
	/** 简洁模式：单行显示，隐藏元数据行，默认 false（详细模式） */
	compact?: boolean;
}

export function createTaskCard(
	task: any,
	options?: TaskCardOptions,
): HTMLElement {
	const showTooltip = options?.showTooltip ?? true;
	const compact = options?.compact ?? false;

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
		task._id ? `<span>🆔 ${task._id}</span>` : "",
		task._forbid ? `<span>⛔ ${task._forbid}</span>` : "",
		task._tag ? `<span>🏁 ${task._tag}</span>` : "",
		task.tags?.length ? `<span>🏁 ${task.tags.join(", ")}</span>` : "",
		`<span>📄 ${task.fileName || (task.path ? task.path.split("/").pop()?.replace(".md", "") : "")}</span>`,
	]
		.filter(Boolean)
		.join("");

	const li = document.createElement("li");
	li.className = "task-item";
	li.setAttribute("data-path", task.path);
	li.setAttribute("data-line-number", task.lineNumber ?? 0);

	const descHtml = task._cleanText || task.description || "（无描述）";

	if (compact) {
		// 简洁模式：单行，仅显示描述
		li.style.cssText =
			"margin:0;padding:1px 0;background:transparent;border-radius:4px;font-size:var(--font-ui-small);cursor:pointer;border:none;display:block;list-style:none;border-left:none;";
		li.innerHTML = `<div class="task-desc" style="font-weight:normal;margin-bottom:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:0;line-height:1.5;">${descHtml}</div>`;
	} else {
		// 详细模式：两行
		li.style.cssText =
			"margin:6px 0; padding:8px 10px; background:var(--background-primary); border-radius:8px; font-size:0.9em; cursor:pointer; border-left:3px solid var(--interactive-accent); display:flex; flex-direction:column; color:var(--text-normal); transition:background 0.1s;";
		li.innerHTML = `<div class="task-desc" style="font-weight:500;margin-bottom:4px;">${descHtml}</div><div class="task-meta" style="font-size:0.8em;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;">${meta}</div>`;
	}

	// 悬停背景
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

	// tooltip
	if (showTooltip) {
		const tipParts: string[] = [];
		const statusKey = task._status || "todo";
		tipParts.push(
			statusIcon +
				" " +
				(STATUS_NAMES[statusKey] || statusKey || "未开始"),
		);
		if (hasValue(prioIcon)) tipParts.push(prioIcon + " " + zhName);
		if (hasValue(task._repeat)) tipParts.push("🔁 " + task._repeat);
		if (hasValue(task.recurrenceLabel)) tipParts.push(task.recurrenceLabel);
		const dateFields: Array<{ emoji: string; val: any }> = [
			{ emoji: "➕", val: task._created || created },
			{ emoji: "⏳", val: task._scheduled || scheduled },
			{ emoji: "🛫", val: task._starts || start },
			{ emoji: "📅", val: task._due || due },
			{ emoji: "✅", val: task._done || done },
			{ emoji: "❌", val: task._cancel || cancel },
		];
		for (const { emoji, val } of dateFields) {
			if (hasValue(val)) tipParts.push(emoji + " " + val);
		}
		if (hasValue(task._id)) tipParts.push("🆔 " + task._id);
		if (hasValue(task._forbid)) tipParts.push("⛔ " + task._forbid);
		if (hasValue(task._tag)) tipParts.push("🏁 " + task._tag);
		const tooltipHtml = tipParts.join("<br>");
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
