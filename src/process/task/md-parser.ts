// src/process/task/md-parser.ts
// Markdown 任务解析器

import { TaskItem } from "../../types";
import {
	RX,
	STATUS_ALL_SYMBOLS,
	SYMBOL_TO_STATUS,
	TASK_ELEMENTS,
	TASK_ROOT_PATH,
	YAML_DATE_FIELDS,
	isBlacklisted,
	isTaskFile,
	isWhitelisted,
} from "../config/config";
import { DateUtils } from "../process";

// ========== 导出 TASK_REGEX 供 task-tree.ts 使用 ==========

const ALL_STATUS_SYMBOLS_STR = (() => {
	const allSymbols = new Set<string>();
	for (const symbols of Object.values(STATUS_ALL_SYMBOLS)) {
		for (const s of symbols) allSymbols.add(s);
	}
	const escapedSymbols = [...allSymbols].map((s) =>
		s === "-" || s === "]" || s === "^" || s === "\\" ? "\\" + s : s,
	);
	const hasDash = escapedSymbols.includes("\\-");
	return hasDash
		? ["\\-", ...escapedSymbols.filter((s) => s !== "\\-")].join("")
		: escapedSymbols.join("");
})();

export const TASK_REGEX = new RegExp(
	`^\\s*-\\s*\\[([${ALL_STATUS_SYMBOLS_STR}])\\]\\s+(.+)$`,
);

// ========== 任务行解析 ==========

export function parseTaskLine(
	fullLine: string,
	filePath: string,
	line: number,
): TaskItem {
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

	const task: TaskItem = {
		_status: status,
		_cleanText: cleanText,
		_fullLine: fullLine,
		_priorityIcon: priorityIcon || "",
		_created: m(RX.created) || "",
		_scheduled: m(RX.scheduled) || "",
		_starts: m(RX.starts) || "",
		_due: m(RX.due) || "",
		_done: m(RX.done) || "",
		_cancel: m(RX.cancel) || "",
		_tag: m(RX.tag) || "",
		_id: m(RX.id) || "",
		_forbid: m(RX.forbid) ? m(RX.forbid).replace(/\s/g, "") : "",
		_repeat: m(RX.repeat) || "",
		_marks: {
			priority: !!priorityIcon,
			repeat: !!m(RX.repeat),
			created: !!m(RX.created),
			scheduled: !!m(RX.scheduled),
			starts: !!m(RX.starts),
			due: !!m(RX.due),
			done: !!m(RX.done),
			cancel: !!m(RX.cancel),
			tag: !!m(RX.tag),
			id: !!m(RX.id),
			forbid: !!(m(RX.forbid) && m(RX.forbid).replace(/\s/g, "")),
		},
		_cachedTimeRange: null,
		_tooltip: "",
		_tooltipHtml: "",
		_isHeadingTask: false,
		_isFileTask: false,
		_headingLevel: 0,
		_headingText: "",
		path: filePath,
		line: line,
		lineNumber: line,
		text: cleanText,
		description: cleanText,
		priority: priorityIcon
			? ["🔺", "⏫", "🔼", "🔽", "⏬"].indexOf(priorityIcon).toString()
			: "none",
		status: statusMatch ? statusMatch[1] : " ",
		fileName: filePath.split("/").pop()?.replace(".md", "") || "",
	};

	task._cachedTimeRange = computeTaskTimeRange(task);
	ensureTaskTooltip(task);
	return task;
}

// ========== 文件解析 ==========

// 前置声明，避免循环引用
export interface ContentNode {
	type: "heading" | "task";
	level?: number;
	text: string;
	raw: string;
	line: number;
	children: ContentNode[];
	parent: ContentNode | null;
	_task?: TaskItem;
	yamlStartLine?: number;
	yamlEndLine?: number;
}

export interface ParsedFileData {
	path: string;
	name: string;
	content: string;
	yaml: Record<string, any>;
	fileTask: TaskItem | null;
	tasks: TaskItem[];
	headingTasks: Array<{
		line: number;
		level: number;
		text: string;
		yamlData: Record<string, any> | null;
		task: TaskItem | null;
	}>;
	contentRoots?: ContentNode[];
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
	const tasks: TaskItem[] = [];
	const headingTasks: ParsedFileData["headingTasks"] = [];

	if (contentRoots) {
		collectFromContent(contentRoots, tasks, headingTasks);
	}

	return {
		path: filePath,
		name: fileName,
		content,
		yaml,
		fileTask,
		tasks,
		headingTasks,
		contentRoots,
	};
}

function collectFromContent(
	nodes: ContentNode[],
	tasks: TaskItem[],
	headingTasks: ParsedFileData["headingTasks"],
) {
	for (const node of nodes) {
		if (node.type === "task" && node._task) tasks.push(node._task);
		if (node.type === "heading") {
			headingTasks.push({
				line: node.line,
				level: node.level || 1,
				text: node.text,
				yamlData: null,
				task: node._task || null,
			});
		}
		if (node.children && node.children.length > 0) {
			collectFromContent(node.children, tasks, headingTasks);
		}
	}
}

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

function buildFileTaskFromYaml(
	yamlData: Record<string, any>,
	filePath: string,
	fileName: string,
): TaskItem {
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
		_fullLine: "",
		_priorityIcon: "",
		_created: "",
		_scheduled: "",
		_starts: "",
		_due: "",
		_done: "",
		_cancel: "",
		_tag: "",
		_id: "",
		_forbid: "",
		_repeat: "",
		_marks: {
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
		_cachedTimeRange: null,
		_tooltip: "",
		_tooltipHtml: "",
		_isHeadingTask: false,
		_isFileTask: true,
		_headingLevel: 0,
		_headingText: "",
		path: filePath,
		line: 0,
		lineNumber: 0,
		text: nameFromFile,
		description: nameFromFile,
		priority: "none",
		status: " ",
		fileName: nameFromFile,
	};
}

function buildTaskFromYaml(
	yamlData: Record<string, any>,
	filePath: string,
	line: number,
	isFile: boolean,
): TaskItem | null {
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

	const task: TaskItem = {
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
		_marks: {
			priority: !!pi,
			repeat: !!yamlData["任务周期"],
			created: !!dv["任务创建"],
			scheduled: !!dv["任务计划"],
			starts: !!dv["任务开始"],
			due: !!dv["任务截止"],
			done: !!dv["任务完成"],
			cancel: !!dv["任务取消"],
			tag: !!yamlData["任务标签"],
			id: !!yamlData["任务唯一ID"],
			forbid: !!yamlData["任务引用ID"],
		},
		_cachedTimeRange: null,
		_tooltip: "",
		_tooltipHtml: "",
		_isHeadingTask: !isFile,
		_isFileTask: isFile,
		_headingLevel: 0,
		_headingText: "",
		path: filePath,
		line: line,
		lineNumber: line,
		text: description,
		description,
		priority: rawPriority === "none" ? "none" : rawPriority,
		status: " ",
		fileName: filePath.split("/").pop()?.replace(".md", "") || "",
	};

	task._cachedTimeRange = computeTaskTimeRange(task);
	ensureTaskTooltip(task);
	return task;
}

function computeTaskTimeRange(
	task: TaskItem,
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

function ensureTaskTooltip(task: TaskItem) {
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

// ========== 文件内容解析（核心，不依赖 task-tree.ts） ==========

function parseFileContent(content: string, filePath?: string): ContentNode[] {
	if (!content) return [];

	let body = content;
	if (body.startsWith("---")) {
		const endIdx = body.indexOf("---", 3);
		if (endIdx !== -1) body = body.substring(endIdx + 3);
	}

	const lines = body.split("\n");
	const roots: ContentNode[] = [];
	const headingStack: ContentNode[] = [];
	const indentStack: { indent: number; node: ContentNode }[] = [];
	let inCodeBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (trimmed.startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) continue;
		if (trimmed === "") continue;

		const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const title = headingMatch[2].trim();

			if (title.endsWith("任务")) {
				const { yamlData, yamlStartLine, yamlEndLine } =
					parseHeadingYamlBlock(lines, i, level);
				let taskData: TaskItem | null = null;
				if (yamlData) {
					taskData = yamlDataToTaskData(yamlData, filePath || "", i);
					if (taskData) {
						taskData._headingText = title;
						taskData._headingLevel = level;
					}
				}

				const node: ContentNode = {
					type: "heading",
					level,
					text: title,
					raw: trimmed,
					line: i,
					children: [],
					parent: null,
					yamlStartLine:
						yamlStartLine >= 0 ? yamlStartLine : undefined,
					yamlEndLine: yamlEndLine >= 0 ? yamlEndLine : undefined,
				};
				if (taskData) node._task = taskData;

				while (
					headingStack.length > 0 &&
					headingStack[headingStack.length - 1].level! >= level
				) {
					headingStack.pop();
				}

				if (headingStack.length > 0) {
					headingStack[headingStack.length - 1].children.push(node);
				} else {
					roots.push(node);
				}

				headingStack.push(node);
				indentStack.length = 0;
				continue;
			}
			continue;
		}

		const currentHeading =
			headingStack.length > 0
				? headingStack[headingStack.length - 1]
				: null;
		if (
			currentHeading?.yamlStartLine !== undefined &&
			currentHeading?.yamlEndLine !== undefined &&
			i > currentHeading.yamlStartLine &&
			i < currentHeading.yamlEndLine
		) {
			continue;
		}

		const taskMatch = trimmed.match(TASK_REGEX);
		if (!taskMatch) continue;

		const fullLine = trimmed;
		const taskData: TaskItem = parseTaskLine(fullLine, filePath || "", i);

		const node: ContentNode = {
			type: "task",
			text: taskData._cleanText,
			raw: fullLine,
			line: i,
			children: [],
			parent: null,
		};
		node._task = taskData;

		const indent = getIndentLevel(line);

		while (
			indentStack.length > 0 &&
			indentStack[indentStack.length - 1].indent >= indent
		) {
			indentStack.pop();
		}

		if (indentStack.length > 0) {
			indentStack[indentStack.length - 1].node.children.push(node);
		} else if (headingStack.length > 0) {
			headingStack[headingStack.length - 1].children.push(node);
		} else {
			roots.push(node);
		}

		indentStack.push({ indent, node });
	}

	return roots;
}

function parseHeadingYamlBlock(
	lines: string[],
	headingLine: number,
	headingLevel: number,
): {
	yamlData: Record<string, any> | null;
	yamlStartLine: number;
	yamlEndLine: number;
} {
	let yamlStartLine = -1,
		yamlEndLine = -1;
	for (let i = headingLine + 1; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		const hm = trimmed.match(/^(#{1,6})\s+/);
		if (hm && hm[1].length <= headingLevel) break;
		if (trimmed === "```yaml" || trimmed === "```yml") {
			yamlStartLine = i;
			for (let j = i + 1; j < lines.length; j++) {
				if (lines[j].trim() === "```") {
					yamlEndLine = j;
					break;
				}
			}
			break;
		}
	}
	if (yamlStartLine === -1 || yamlEndLine === -1)
		return { yamlData: null, yamlStartLine: -1, yamlEndLine: -1 };
	const yamlData: Record<string, any> = {};
	for (const yamlLine of lines.slice(yamlStartLine + 1, yamlEndLine)) {
		const colonIdx = yamlLine.indexOf(":");
		if (colonIdx === -1) continue;
		const key = yamlLine.substring(0, colonIdx).trim();
		let value = yamlLine.substring(colonIdx + 1).trim();
		if (
			(value.startsWith("'") && value.endsWith("'")) ||
			(value.startsWith('"') && value.endsWith('"'))
		)
			value = value.slice(1, -1);
		if (key && value) yamlData[key] = value;
	}
	return {
		yamlData: Object.keys(yamlData).length > 0 ? yamlData : null,
		yamlStartLine,
		yamlEndLine,
	};
}

function yamlDataToTaskData(
	yamlData: Record<string, any>,
	filePath: string,
	headingLine: number,
): TaskItem {
	const statusMap: Record<string, string> = {};
	TASK_ELEMENTS.status.children?.forEach((c) => {
		statusMap[c.zhName] = c.key;
	});
	const priorityMap: Record<string, string> = {};
	TASK_ELEMENTS.priority.children?.forEach((c, idx) => {
		priorityMap[c.zhName] = c.icon!;
		priorityMap[String(4 - idx)] = c.icon!;
	});
	const rawStatus = yamlData["任务状态"] || "未开始",
		rawPriority = yamlData["任务优先级"] || "none";
	const statusKey = statusMap[rawStatus] || "todo",
		priorityIcon = priorityMap[rawPriority] || "";
	const formatDate = (val: any): string | null => {
		if (!val) return null;
		const str = String(val);
		if (str === "NaN" || str.includes("NaN")) return null;
		const dateMatch = str.match(/(\d{4}-\d{2}-\d{2})/);
		return dateMatch ? dateMatch[1] : str.substring(0, 10);
	};
	const dateValues: Record<string, string | null> = {};
	for (const yaName of YAML_DATE_FIELDS)
		dateValues[yaName] = formatDate(yamlData[yaName]);
	const name = yamlData["任务名称"] || "",
		description = yamlData["任务简介"] || name;
	return {
		_status: statusKey,
		_cleanText: description,
		_fullLine: "",
		_priorityIcon: priorityIcon,
		_created: dateValues["任务创建"] || "",
		_scheduled: dateValues["任务计划"] || "",
		_starts: dateValues["任务开始"] || "",
		_due: dateValues["任务截止"] || "",
		_done: dateValues["任务完成"] || "",
		_cancel: dateValues["任务取消"] || "",
		_tag: yamlData["任务标签"] || "",
		_id: yamlData["任务唯一ID"] || "",
		_forbid: yamlData["任务引用ID"] || "",
		_repeat: yamlData["任务周期"] || "",
		_marks: {
			priority: !!priorityIcon,
			repeat: !!yamlData["任务周期"],
			created: !!dateValues["任务创建"],
			scheduled: !!dateValues["任务计划"],
			starts: !!dateValues["任务开始"],
			due: !!dateValues["任务截止"],
			done: !!dateValues["任务完成"],
			cancel: !!dateValues["任务取消"],
			tag: !!yamlData["任务标签"],
			id: !!yamlData["任务唯一ID"],
			forbid: !!yamlData["任务引用ID"],
		},
		_cachedTimeRange: null,
		_tooltip: "",
		_tooltipHtml: "",
		_isHeadingTask: true,
		_isFileTask: false,
		_headingLevel: 0,
		_headingText: "",
		path: filePath,
		line: headingLine,
		lineNumber: headingLine,
		text: description,
		description,
		priority: rawPriority === "none" ? "none" : rawPriority,
		status: " ",
		fileName: filePath.split("/").pop()?.replace(".md", "") || "",
	};
}

function getIndentLevel(line: string): number {
	const leading = line.length - line.trimStart().length;
	const tabCount = (line.match(/\t/g) || []).length;
	return tabCount + Math.floor((leading - tabCount) / 4);
}

// ========== 批量文件加载 ==========

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
			console.warn("[TaskManage] 读取任务文件失败:", file.path, e);
		}
	}
	return results;
}
