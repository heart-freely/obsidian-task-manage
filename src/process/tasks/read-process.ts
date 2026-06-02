// src/tasks/read/read-tasks.ts
import { CONFIG } from "../../configs/configs";
import logger from "../../utils/logger";
import { DateUtils } from "../process";

export const RX = {
	priority: /⏬|🔽|🔼|⏫|🔺/g,
	repeat: /🔁\s*(every\s+(day|week|month|year))/i,
	created: /➕\s*(\d{4}-\d{2}-\d{2})/,
	scheduled: /⏳\s*(\d{4}-\d{2}-\d{2})/,
	starts: /🛫\s*(\d{4}-\d{2}-\d{2})/,
	due: /📅\s*(\d{4}-\d{2}-\d{2})/,
	done: /✅\s*(\d{4}-\d{2}-\d{2})/,
	cancel: /❌\s*(\d{4}-\d{2}-\d{2})?/,
	tag: /🏁\s*(\S+)/,
	id: /🆔\s*(\S+)/,
	forbid: /⛔\s*([^\s,]+(?:\s*,\s*[^\s,]+)*)/,
};

export function getTaskStatus(line: string) {
	const m = line.match(/^\s*- \[(.)\]\s*/);
	return m
		? {
				x: "completed",
				X: "completed",
				"-": "cancelled",
				"/": "in-progress",
				">": "in-progress", // 新增：- [>] 视为进行中
				"?": "planned",
			}[m[1]] || "todo"
		: "todo";
}

export function getStatusIcon(task: any) {
	if (task._status === "completed" || task.completed) return "✅";
	if (task._status === "in-progress") return "⏩";
	if (task._status === "planned") return "❔";
	if (task._status === "cancelled") return "❎";
	return "🔲";
}

export function isTaskToday(task: any) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const check = (d: any) =>
		d ? new Date(d) >= today && new Date(d) < tomorrow : false;
	return (
		check(task._scheduled) ||
		check(task._due) ||
		check(task._starts) ||
		check(task._created)
	);
}

export function computeTaskTimeRange(task: any) {
	let min = Infinity,
		max = -Infinity;
	const add = (d: any) => {
		if (d) {
			const ts = new Date(d).getTime();
			if (ts < min) min = ts;
			if (ts > max) max = ts;
		}
	};
	add(task._scheduled);
	add(task._due);
	add(task._starts);
	if (task._done) add(task._done);
	return min === Infinity
		? null
		: {
				start: DateUtils.setStart(new Date(min)).getTime(),
				end: DateUtils.setEnd(new Date(max)).getTime(),
			};
}

export function ensureTaskProperties(task: any) {
	if (!task.hasOwnProperty("_cleanText")) {
		task._cleanText =
			task.text
				.replace(/⏬|🔽|🔼|⏫|🔺/g, "")
				.replace(/🔁\s*every\s+(day|week|month|year)/gi, "")
				.replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "")
				.replace(/❌\s*\d{4}-\d{2}-\d{2}?/g, "")
				.replace(/❌/g, "")
				.replace(/🏁\s*\S+/g, "")
				.replace(/🆔\s*\S+/g, "")
				.replace(/⛔\s*[^\s,]+(?:\s*,\s*[^\s,]+)*/g, "")
				.replace(/⛔[\s\S]*?(?=\s*$|🏁|🆔|🔁|➕|⏳|🛫|📅|✅|❌|$)/g, "")
				.trim() || task.text;
	}
	if (!task.hasOwnProperty("_tooltip")) {
		const parts = [];
		parts.push(getStatusIcon(task) + " " + task._cleanText);
		if (task._priorityIcon) parts.push(task._priorityIcon);
		if (task._repeat) parts.push("🔁 " + task._repeat);
		if (task._created) parts.push("➕ " + task._created);
		if (task._scheduled) parts.push("⏳ " + task._scheduled);
		if (task._starts) parts.push("🛫 " + task._starts);
		if (task._due) parts.push("📅 " + task._due);
		if (task._done) parts.push("✅ " + task._done);
		if (task._cancel) parts.push("❌ " + task._cancel);
		if (task._tag) parts.push("🏁 " + task._tag);
		if (task._id) parts.push("🆔 " + task._id);
		if (task._forbid) parts.push("⛔ " + task._forbid);
		task._tooltip = parts.join("\n");
		task._tooltipHtml = task._tooltip.replace(/\n/g, "<br>");
	}
}

export function getAllTasks(force: boolean, dv: any, state: any) {
	if (!state) throw new Error("Global state context is required");
	if (state.cachedAllTasks && !force) return state.cachedAllTasks;

	const tasks: any[] = [];
	for (const folder of CONFIG.TASK_FOLDERS) {
		const pages = dv.pages(folder);
		if (!pages || !pages.length) continue;
		for (const page of pages) {
			if (!CONFIG.FILE_NAME_PATTERN.test(page.file.name)) continue;
			if (!page.file.tasks) continue;
			for (const task of page.file.tasks) {
				try {
					const fullLine =
						(task.completed ? "- [x] " : "- [ ] ") + task.text;
					task._fullLine = fullLine;
					task._status = task.status
						? {
								"/": "in-progress",
								">": "in-progress",
								"?": "planned",
								"-": "cancelled",
								x: "completed",
								X: "completed",
							}[task.status] || "todo"
						: getTaskStatus(fullLine);
					function m(rx: RegExp, idx?: number) {
						return fullLine.match(rx)
							? fullLine.match(rx)![
									idx !== undefined ? idx : 1
								] || null
							: null;
					}
					task._created = m(RX.created);
					task._scheduled = m(RX.scheduled);
					task._starts = m(RX.starts);
					task._due = m(RX.due);
					task._done = m(RX.done);
					task._cancel = m(RX.cancel) || "";
					task._tag = m(RX.tag);
					task._id = m(RX.id);
					task._forbid = m(RX.forbid)
						? m(RX.forbid).replace(/\s/g, "")
						: "";
					task._repeat = m(RX.repeat);
					task._priorityIcon = (fullLine.match(RX.priority) || [
						null,
					])[0];
					task._marks = {
						priority: !!task._priorityIcon,
						repeat: !!task._repeat,
						created: !!task._created,
						scheduled: !!task._scheduled,
						starts: !!task._starts,
						due: !!task._due,
						done: !!task._done,
						cancel: !!task._cancel,
						tag: !!task._tag,
						id: !!task._id,
						forbid: !!task._forbid,
					};
					task._cachedTimeRange = computeTaskTimeRange(task);
					ensureTaskProperties(task);
					tasks.push(task);
				} catch (e) {
					logger.warn("任务解析失败，已跳过：", task, e);
				}
			}
		}
	}
	state.cachedAllTasks = tasks;
	state.taskIdMap = {};
	for (const task of tasks) {
		if (task._id) state.taskIdMap[task._id] = task;
	}
	return tasks;
}
