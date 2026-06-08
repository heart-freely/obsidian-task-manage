// src/process/task/md-parser.ts
// Markdown 任务解析器

import { TaskStatus } from "../../types";
import {
	HEADING_TASK_PATTERN,
	isBlacklisted,
	isTaskFile,
	isWhitelisted,
	RX,
	STATUS_ALL_SYMBOLS,
	SYMBOL_TO_STATUS,
	TASK_ELEMENTS,
	TASK_ROOT_PATH,
	YAML_DATE_FIELDS,
} from "../config/config";

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

// ========== 优先级图标 → 数字 ==========

const PRIORITY_ICON_TO_NUM: Record<string, number> = {
	"🔺": 0,
	"⏫": 1,
	"🔼": 2,
	"🔽": 3,
	"⏬": 4,
};

function parseDate(dateStr: string): number | null {
	if (!dateStr) return null;
	const ts = new Date(dateStr).getTime();
	return isNaN(ts) ? null : ts;
}

// ========== 任务行解析 ==========

export function parseTaskLine(
	fullLine: string,
	filePath: string,
	line: number,
) {
	const statusMatch = fullLine.match(/^\s*- \[(.)\]\s*/);
	let status: TaskStatus = "todo";
	if (statusMatch)
		status = (SYMBOL_TO_STATUS[statusMatch[1]] || "todo") as TaskStatus;
	const text = fullLine.replace(/^\s*- \[.\]\s*/, "");

	function m(rx: RegExp, idx?: number): string | null {
		const match = text.match(rx);
		return match ? match[idx !== undefined ? idx : 1] || null : null;
	}

	const priorityIcon = (text.match(RX.priority) || [null])[0] || "";
	const priority = PRIORITY_ICON_TO_NUM[priorityIcon] ?? 5;

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

	return {
		status,
		content: cleanText,
		priority,
		repeat: (m(RX.repeat) || "").replace(/^🔁\s*/, ""),
		created: parseDate(m(RX.created) || ""),
		scheduled: parseDate(m(RX.scheduled) || ""),
		starts: parseDate(m(RX.starts) || ""),
		due: parseDate(m(RX.due) || ""),
		done: parseDate(m(RX.done) || ""),
		cancelled: parseDate(m(RX.cancelled) || ""),
		tag: m(RX.tag) || "",
		id: m(RX.id) || "",
		forbid: m(RX.forbid) ? m(RX.forbid).replace(/\s/g, "") : "",
	};
}

// ========== 数据结构 ==========

export interface ContentNode {
	type: "heading" | "task";
	text: string;
	raw: string;
	line: number;
	depth: number;
	children: ContentNode[];
	task: ReturnType<typeof parseTaskLine> | null;
	yamlStartLine?: number;
	yamlEndLine?: number;
}

export interface ParsedFileData {
	path: string;
	name: string;
	content: string;
	yaml: Record<string, any>;
	fileTask: ReturnType<typeof parseTaskLine> | null;
	contentRoots: ContentNode[];
}

// ========== 文件解析 ==========

export function parseFile(
	filePath: string,
	fileName: string,
	content: string,
): ParsedFileData {
	const yaml = parseFrontmatter(content);
	const fileTask = buildFileTaskFromYaml(yaml);
	const contentRoots = content ? parseFileContent(content, filePath) : [];

	return {
		path: filePath,
		name: fileName,
		content,
		yaml,
		fileTask,
		contentRoots,
	};
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

function buildFileTaskFromYaml(yamlData: Record<string, any>) {
	const task = buildTaskFromYaml(yamlData);
	return task;
}

function buildTaskFromYaml(yamlData: Record<string, any>) {
	const sm: Record<string, string> = {};
	TASK_ELEMENTS.status.children.forEach((c) => {
		sm[c.zhName] = c.key;
	});
	const pm: Record<string, number> = {};
	TASK_ELEMENTS.priority.children.forEach((c, idx) => {
		pm[c.zhName] = 4 - idx;
	});

	const rawStatus = yamlData["任务状态"] || "未开始";
	const rawPriority = yamlData["任务优先级"] || "none";
	const sk = (sm[rawStatus] || "todo") as TaskStatus;
	const pi = rawPriority === "none" ? 5 : (pm[rawPriority] ?? 5);

	const parseDate = (val: any): number | null => {
		if (!val) return null;
		const s = String(val);
		const dm = s.match(/(\d{4}-\d{2}-\d{2})/);
		const dateStr = dm ? dm[1] : s.substring(0, 10);
		const ts = new Date(dateStr).getTime();
		return isNaN(ts) ? null : ts;
	};

	const dv: Record<string, number | null> = {};
	for (const yn of YAML_DATE_FIELDS) dv[yn] = parseDate(yamlData[yn]);

	const description = yamlData["任务简介"] || yamlData["任务名称"] || "";
	if (!description && Object.values(dv).every((v) => v === null)) return null;

	return {
		status: sk,
		content: description,
		priority: pi,
		repeat: (yamlData["任务周期"] || "").replace(/^🔁\s*/, ""),
		created: dv["任务创建"] ?? null,
		scheduled: dv["任务计划"] ?? null,
		starts: dv["任务开始"] ?? null,
		due: dv["任务截止"] ?? null,
		done: dv["任务完成"] ?? null,
		cancelled: dv["任务取消"] ?? null,
		tag: yamlData["任务标签"] || "",
		id: yamlData["任务唯一ID"] || "",
		forbid: yamlData["任务引用ID"] || "",
	};
}

// ========== 文件内容解析 ==========

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
		if (inCodeBlock || trimmed === "") continue;

		const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const title = headingMatch[2].trim();
			const node: ContentNode = {
				type: "heading",
				text: title,
				raw: trimmed,
				line: i,
				depth: level,
				children: [],
				task: null,
			};

			while (
				headingStack.length > 0 &&
				headingStack[headingStack.length - 1].depth >= level
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

			if (HEADING_TASK_PATTERN.test(title)) {
				const { yamlData, yamlStartLine, yamlEndLine } =
					parseHeadingYamlBlock(lines, i, level);
				let taskData = null;
				if (yamlData) {
					taskData = buildTaskFromYaml(yamlData);
				}
				if (taskData) {
					node.task = taskData;
				} else {
					node.task = {
						status: "todo" as TaskStatus,
						content: title,
						priority: 5,
						repeat: "",
						created: null,
						scheduled: null,
						starts: null,
						due: null,
						done: null,
						cancelled: null,
						tag: "",
						id: "",
						forbid: "",
					};
				}
				node.yamlStartLine =
					yamlStartLine >= 0 ? yamlStartLine : undefined;
				node.yamlEndLine = yamlEndLine >= 0 ? yamlEndLine : undefined;
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

		const taskData = parseTaskLine(trimmed, filePath || "", i);
		const node: ContentNode = {
			type: "task",
			text: taskData.content,
			raw: trimmed,
			line: i,
			depth: 0,
			children: [],
			task: taskData,
		};

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

	promoteToHeadingTasks(roots);
	return roots;
}

function promoteToHeadingTasks(nodes: ContentNode[]) {
	for (const node of nodes) {
		if (node.type === "heading" && !node.task && hasListTasks(node)) {
			node.task = {
				status: "todo" as TaskStatus,
				content: node.text,
				priority: 5,
				repeat: "",
				created: null,
				scheduled: null,
				starts: null,
				due: null,
				done: null,
				cancelled: null,
				tag: "",
				id: "",
				forbid: "",
			};
		}
		if (node.children.length > 0) promoteToHeadingTasks(node.children);
	}
}

function hasListTasks(node: ContentNode): boolean {
	for (const child of node.children) {
		if (child.type === "task" && child.task) return true;
		if (hasListTasks(child)) return true;
	}
	return false;
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
			if (isTaskFile(file.name, parsed.contentRoots.length > 0)) {
				results.push(parsed);
			}
		} catch (e) {
			console.warn("[TaskManage] 读取任务文件失败:", file.path, e);
		}
	}
	return results;
}
