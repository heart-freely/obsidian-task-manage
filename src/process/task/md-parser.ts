// src/process/task/md-parser.ts
// Markdown 任务解析器

import {
	RX,
	SYMBOL_TO_STATUS,
	TASK_ELEMENTS,
	TASK_ROOT_PATH,
	YAML_DATE_FIELDS,
	isBlacklisted,
	isTaskFile,
	isWhitelisted,
} from "../config/config";
import { DateUtils } from "../process";
import { ContentNode, parseFileContent } from "./task-tree";

// ========== 任务行解析 ==========

export function parseTaskLine(
	fullLine: string,
	filePath: string,
	line: number,
): any {
	const statusMatch = fullLine.match(/^\s*- \[(.)\]\s*/);
	let status = "todo";
	if (statusMatch) status = SYMBOL_TO_STATUS[statusMatch[1]] || "todo";
	const text = fullLine.replace(/^\s*- \[.\]\s*/, "");
	function m(rx: RegExp, idx?: number): string | null {
		const match = text.match(rx);
		return match ? match[idx !== undefined ? idx : 1] || null : null;
	}
	const priorityIcon = (text.match(RX.priority) || [null])[0];
	const cleanText = text
		.replace(/⏬|🔽|🔼|⏫|🔺/g, "")
		.replace(/🔁\s*every\s+(day|week|month|year)/gi, "")
		.replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "")
		.replace(/❌\s*(\d{4}-\d{2}-\d{2})?/g, "")
		.replace(/🏁\s*\S+/g, "")
		.replace(/🆔\s*\S+/g, "")
		.replace(/⛔\s*[^\s,]+(?:\s*,\s*[^\s,]+)*/g, "")
		.replace(/<[^>]+>/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();
	const task: any = {
		_status: status,
		_cleanText: cleanText,
		_fullLine: fullLine,
		_priorityIcon: priorityIcon || "",
		_created: m(RX.created),
		_scheduled: m(RX.scheduled),
		_starts: m(RX.starts),
		_due: m(RX.due),
		_done: m(RX.done),
		_cancel: m(RX.cancel) || "",
		_tag: m(RX.tag),
		_id: m(RX.id),
		_forbid: m(RX.forbid) ? m(RX.forbid).replace(/\s/g, "") : "",
		_repeat: m(RX.repeat),
		path: filePath,
		line,
		lineNumber: line,
		text: cleanText,
		description: cleanText,
		priority: priorityIcon
			? ["🔺", "⏫", "🔼", "🔽", "⏬"].indexOf(priorityIcon).toString()
			: "none",
		status: statusMatch ? statusMatch[1] : " ",
		_isHeadingTask: false,
		_isFileTask: false,
		_headingLevel: 0,
		_headingText: "",
	};
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
	ensureTaskTooltip(task);
	return task;
}

// ========== 文件内容解析 ==========

export interface ParsedFileData {
	path: string;
	name: string;
	content: string;
	yaml: Record<string, any>;
	fileTask: any | null;
	tasks: any[];
	headingTasks: Array<{
		line: number;
		level: number;
		text: string;
		yamlData: Record<string, any> | null;
		task: any | null;
	}>;
}

export function parseFile(
	filePath: string,
	fileName: string,
	content: string,
): ParsedFileData {
	const yaml = parseFrontmatter(content);
	const fileTask = buildFileTaskFromYaml(yaml, filePath, fileName);
	const contentRoots = content
		? parseFileContent(content, filePath)
		: undefined;

	const tasks: any[] = [];
	const headingTasks: ParsedFileData["headingTasks"] = [];

	function collectFromContent(nodes: ContentNode[]) {
		for (const node of nodes) {
			if (node.type === "task" && node._task) tasks.push(node._task);
			if (node.type === "heading") {
				if (node._task) {
					headingTasks.push({
						line: node.line,
						level: node.level || 1,
						text: node.text,
						yamlData: null,
						task: node._task,
					});
				}
			}
			if (node.children.length > 0) collectFromContent(node.children);
		}
	}

	if (contentRoots) collectFromContent(contentRoots);

	return {
		path: filePath,
		name: fileName,
		content,
		yaml,
		fileTask,
		tasks,
		headingTasks,
	};
}

// ========== YAML 解析 ==========

function parseFrontmatter(content: string): Record<string, any> {
	if (!content) return {};
	const trimmed = content.trimStart();
	if (!trimmed.startsWith("---")) return {};
	const endIdx = trimmed.indexOf("---", 3);
	if (endIdx === -1) return {};
	const yamlContent = trimmed.substring(3, endIdx).trim();
	const result: Record<string, any> = {};
	for (const line of yamlContent.split("\n")) {
		const ci = line.indexOf(":");
		if (ci === -1) continue;
		const key = line.substring(0, ci).trim();
		let value = line.substring(ci + 1).trim();
		if (
			(value.startsWith("'") && value.endsWith("'")) ||
			(value.startsWith('"') && value.endsWith('"'))
		)
			value = value.slice(1, -1);
		if (key) result[key] = value;
	}
	return result;
}

// ========== 从 YAML 构建任务数据 ==========

function buildFileTaskFromYaml(
	yamlData: Record<string, any>,
	filePath: string,
	fileName: string,
): any {
	const nameFromFile = fileName.replace(/\.md$/, "");
	const task = buildTaskFromYaml(yamlData, filePath, 0, true);
	if (task) {
		task._isFileTask = true;
		task._cleanText = nameFromFile;
		task.fileName = nameFromFile;
		return task;
	}
	return {
		_status: "todo",
		_cleanText: nameFromFile,
		path: filePath,
		line: 0,
		lineNumber: 0,
		_priorityIcon: "",
		_tag: "",
		_id: "",
		_forbid: "",
		_repeat: "",
		_created: "",
		_scheduled: "",
		_starts: "",
		_due: "",
		_done: "",
		_cancel: "",
		status: " ",
		priority: "none",
		_isFileTask: true,
		_isHeadingTask: false,
		_headingLevel: 0,
		_headingText: "",
		fileName: nameFromFile,
		_marks: {
			status: true,
			priority: false,
			repeat: false,
			created: false,
			scheduled: false,
			starts: false,
			due: false,
			done: false,
			cancel: false,
			tag: false,
			id: false,
			forbid: false,
		},
	};
}

function buildTaskFromYaml(
	yamlData: Record<string, any>,
	filePath: string,
	line: number,
	isFile: boolean,
): any | null {
	const sm: Record<string, string> = {};
	TASK_ELEMENTS.status.children?.forEach((c) => {
		sm[c.zhName] = c.key;
	});
	const pm: Record<string, string> = {};
	TASK_ELEMENTS.priority.children?.forEach((c, idx) => {
		pm[c.zhName] = c.icon!;
		pm[String(4 - idx)] = c.icon!;
	});
	const rawStatus = yamlData["任务状态"] || "未开始",
		rawPriority = yamlData["任务优先级"] || "none";
	const sk = sm[rawStatus] || "todo",
		pi = pm[rawPriority] || "";
	const fd = (val: any): string | null => {
		if (!val) return null;
		const s = String(val);
		if (s === "NaN" || s.includes("NaN")) return null;
		const dm = s.match(/(\d{4}-\d{2}-\d{2})/);
		return dm ? dm[1] : s.substring(0, 10);
	};
	const dv: Record<string, string | null> = {};
	for (const yn of YAML_DATE_FIELDS) dv[yn] = fd(yamlData[yn]);
	const name = yamlData["任务名称"] || "";
	const description = yamlData["任务简介"] || name;
	if (!description && !name && Object.keys(dv).every((k) => !dv[k]))
		return null;
	const task: any = {
		_status: sk,
		_cleanText: description,
		_fullLine: "",
		_priorityIcon: pi,
		_created: dv["任务创建"] || "",
		_scheduled: dv["任务计划"] || "",
		_starts: dv["任务开始"] || "",
		_due: dv["任务截止"] || "",
		_done: dv["任务完成"] || "",
		_cancel: dv["任务取消"] || "",
		_tag: yamlData["任务标签"] || "",
		_id: yamlData["任务唯一ID"] || "",
		_forbid: yamlData["任务引用ID"] || "",
		_repeat: yamlData["任务周期"] || "",
		path: filePath,
		line,
		lineNumber: line,
		text: description,
		description,
		priority: rawPriority === "none" ? "none" : rawPriority,
		status: " ",
		_isHeadingTask: !isFile,
		_isFileTask: isFile,
		_headingLevel: 0,
		_headingText: "",
		fileName: filePath.split("/").pop()?.replace(".md", "") || "",
	};
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
	ensureTaskTooltip(task);
	return task;
}

// ========== 工具函数 ==========

function computeTaskTimeRange(
	task: any,
): { start: number; end: number } | null {
	let min = Infinity,
		max = -Infinity,
		has = false;
	function add(d: any) {
		if (d) {
			const ts = new Date(d).getTime();
			if (!isNaN(ts)) {
				if (ts < min) min = ts;
				if (ts > max) max = ts;
				has = true;
			}
		}
	}
	add(task._scheduled);
	add(task._due);
	add(task._starts);
	if (task._done) add(task._done);
	if (!has) return null;
	return {
		start: DateUtils.setStart(new Date(min)).getTime(),
		end: DateUtils.setEnd(new Date(max)).getTime(),
	};
}

function ensureTaskTooltip(task: any) {
	if (task._tooltip) return;
	const parts: string[] = [];
	const icon = getStatusIconForTooltip(task._status);
	parts.push(icon + " " + task._cleanText);
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

function getStatusIconForTooltip(status: string): string {
	const map: Record<string, string> = {
		todo: "🔲",
		planned: "❔",
		"in-progress": "⏩",
		completed: "✅",
		cancelled: "❎",
	};
	return map[status] || "🔲";
}

// ========== 全部文件解析（入口） ==========

export async function loadAllTaskFiles(app: any): Promise<ParsedFileData[]> {
	const files = app.vault
		.getMarkdownFiles()
		.filter(
			(f: any) =>
				f.path.startsWith(TASK_ROOT_PATH) && f.name.endsWith(".md"),
		);

	const results: ParsedFileData[] = [];
	for (const file of files) {
		if (isBlacklisted(file.path)) continue;
		if (!isWhitelisted(file.path)) continue;
		try {
			const content = await app.vault.cachedRead(file);
			const parsed = parseFile(file.path, file.name, content);

			if (isTaskFile(file.name, parsed.tasks.length > 0)) {
				results.push(parsed);
			}
		} catch (e) {
			// 跳过读取失败的文件
		}
	}
	return results;
}
