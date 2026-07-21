// src/core/parser/md-parser.ts

import { TaskData, TaskStatus } from "../../type/type";
import {
	matchTaskFileName,
	matchTaskFilePath,
	matchTaskHeading,
	TASK_ROOT_PATHS,
} from "../config/config";
import { parseTaskFromYaml } from "./task-parser";
import { parseTaskLine, TASK_REGEX } from "./tasks-parser";

function setRecord(
	record: Record<string, unknown>,
	key: string,
	value: unknown,
): void {
	record[key] = value;
}

export interface ContentNode {
	type: "heading" | "task";
	text: string;
	raw: string;
	line: number;
	depth: number;
	children: ContentNode[];
	task: TaskData | null;
	yamlStartLine?: number;
	yamlEndLine?: number;
}

export interface ParsedFileData {
	path: string;
	name: string;
	content: string;
	yaml: Record<string, unknown>;
	fileTask: TaskData | null;
	contentRoots: ContentNode[];
	hasMarkedTasks: boolean;
	yamlEndLine: number;
	hasFrontmatter: boolean;
}

export { TASK_REGEX };

function hasTaskMarks(task: TaskData): boolean {
	if (task.status && task.status !== "none") return true;
	if (task.priority !== 5) return true;
	if (task.repeat) return true;
	if (
		task.created ||
		task.scheduled ||
		task.starts ||
		task.due ||
		task.done ||
		task.cancelled
	)
		return true;
	if (task.id || task.forbid || task.tag) return true;
	return false;
}

function hasMarkedTasksInNodes(nodes: ContentNode[]): boolean {
	for (const node of nodes) {
		if (node.type === "task" && node.task && hasTaskMarks(node.task))
			return true;
		if (hasMarkedTasksInNodes(node.children)) return true;
	}
	return false;
}

function hasListTasks(nodes: ContentNode[]): boolean {
	for (const node of nodes) {
		if (node.type === "task") return true;
		if (node.children.length > 0 && hasListTasks(node.children))
			return true;
	}
	return false;
}

function hasHeadingTaskYaml(yamlData: Record<string, unknown> | null): boolean {
	if (!yamlData) return false;
	const task = parseTaskFromYaml(yamlData);
	return task !== null && hasTaskMarks(task);
}

function hasFileTaskFrontmatter(yamlData: Record<string, unknown>): boolean {
	const task = parseTaskFromYaml(yamlData);
	return task !== null && hasTaskMarks(task);
}

function hasAnyTask(
	type: "list" | "heading" | "file",
	contentRoots: ContentNode[],
	headingYaml?: Record<string, unknown> | null,
	fileYaml?: Record<string, unknown>,
): boolean {
	if (hasMarkedTasksInNodes(contentRoots)) return true;
	if (type === "heading" || type === "file") {
		if (headingYaml && hasHeadingTaskYaml(headingYaml)) return true;
	}
	if (type === "file") {
		if (fileYaml && hasFileTaskFrontmatter(fileYaml)) return true;
	}
	return false;
}

function parseFrontmatter(content: string): Record<string, unknown> {
	if (!content) return {};
	const trimmed = content.trimStart();
	if (!trimmed.startsWith("---")) return {};
	const endIdx = trimmed.indexOf("---", 3);
	if (endIdx === -1) return {};
	const yamlContent = trimmed.substring(3, endIdx).trim();
	const result: Record<string, unknown> = {};
	for (const line of yamlContent.split("\n")) {
		const ci = line.indexOf(":");
		if (ci === -1) continue;
		const key = line.substring(0, ci).trim();
		let value: unknown = line.substring(ci + 1).trim();
		if (typeof value === "string") {
			if (
				(value.startsWith("'") && value.endsWith("'")) ||
				(value.startsWith('"') && value.endsWith('"'))
			) {
				value = value.slice(1, -1);
			}
		}
		if (key) setRecord(result, key, value);
	}
	return result;
}

function stripFrontmatter(content: string): string {
	if (!content) return "";
	const trimmed = content.trimStart();
	if (!trimmed.startsWith("---")) return trimmed;
	const endIdx = trimmed.indexOf("---", 3);
	if (endIdx === -1) return trimmed;
	return trimmed.substring(endIdx + 3);
}

export function parseFile(
	filePath: string,
	fileName: string,
	content: string,
): ParsedFileData {
	const yaml = parseFrontmatter(content);
	const fileTask = parseTaskFromYaml(yaml);
	let hasFrontmatter = false;
	let yamlEndLine = -1;
	const trimmedContent = content.trimStart();
	if (trimmedContent.startsWith("---")) {
		const endIdx = trimmedContent.indexOf("---", 3);
		if (endIdx !== -1) {
			hasFrontmatter = true;
			const fmPart = trimmedContent.substring(0, endIdx + 3);
			const leadingLen = content.length - content.trimStart().length;
			const leadingLines =
				leadingLen > 0
					? content.substring(0, leadingLen).split("\n").length - 1
					: 0;
			yamlEndLine = leadingLines + fmPart.split("\n").length - 1;
		}
	}
	const body = stripFrontmatter(content);
	const bodyStartIndex = content.indexOf(body);
	const actualBodyStartLine =
		bodyStartIndex >= 0
			? content.substring(0, bodyStartIndex).split("\n").length - 1
			: yamlEndLine + 1;
	const contentRoots = body
		? parseFileContent(body, filePath, actualBodyStartLine)
		: [];
	const hasMarkedTasks = hasAnyTask("file", contentRoots, null, yaml);
	return {
		path: filePath,
		name: fileName,
		content,
		yaml,
		fileTask,
		contentRoots,
		hasMarkedTasks,
		yamlEndLine,
		hasFrontmatter,
	};
}

function parseFileContent(
	content: string,
	filePath?: string,
	lineOffset: number = 0,
): ContentNode[] {
	if (!content) return [];
	const lines = content.split("\n");
	const roots: ContentNode[] = [];
	const headingStack: ContentNode[] = [];
	const indentStack: { indent: number; node: ContentNode }[] = [];
	let inCodeBlock = false;
	let inHeadingYaml = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		if (trimmed === "```yaml" || trimmed === "```yml") {
			inHeadingYaml = true;
			continue;
		}
		if (inHeadingYaml && trimmed === "```") {
			inHeadingYaml = false;
			continue;
		}
		if (inHeadingYaml) continue;
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
			const node: ContentNode = {
				type: "heading",
				text: title,
				raw: trimmed,
				line: i + lineOffset,
				depth: level,
				children: [],
				task: null,
			};
			while (
				headingStack.length > 0 &&
				headingStack[headingStack.length - 1].depth >= level
			)
				headingStack.pop();
			if (headingStack.length > 0)
				headingStack[headingStack.length - 1].children.push(node);
			else roots.push(node);
			headingStack.push(node);
			indentStack.length = 0;
			const yamlBlock = parseHeadingYamlBlock(lines, i, level);
			if (yamlBlock.yamlData) {
				const taskData = parseTaskFromYaml(yamlBlock.yamlData);
				if (taskData) {
					node.task = taskData;
					node.yamlStartLine =
						yamlBlock.yamlStartLine >= 0
							? yamlBlock.yamlStartLine + lineOffset
							: undefined;
					node.yamlEndLine =
						yamlBlock.yamlEndLine >= 0
							? yamlBlock.yamlEndLine + lineOffset
							: undefined;
				}
			}
			if (!node.task && matchTaskHeading(title)) {
				node.task = {
					rawLine: trimmed,
					status: "none" as TaskStatus,
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
			continue;
		}

		const currentHeading =
			headingStack.length > 0
				? headingStack[headingStack.length - 1]
				: null;
		if (
			currentHeading?.yamlStartLine !== undefined &&
			currentHeading?.yamlEndLine !== undefined &&
			i + lineOffset > currentHeading.yamlStartLine &&
			i + lineOffset < currentHeading.yamlEndLine
		)
			continue;

		const taskMatch = trimmed.match(TASK_REGEX);
		if (!taskMatch) continue;
		const taskData = parseTaskLine(trimmed, filePath || "", i + lineOffset);
		if (!taskData) continue;

		const node: ContentNode = {
			type: "task",
			text: taskData.content,
			raw: trimmed,
			line: i + lineOffset,
			depth: 0,
			children: [],
			task: taskData,
		};
		const indent = getIndentLevel(line);
		while (
			indentStack.length > 0 &&
			indentStack[indentStack.length - 1].indent >= indent
		)
			indentStack.pop();
		if (indentStack.length > 0)
			indentStack[indentStack.length - 1].node.children.push(node);
		else if (headingStack.length > 0)
			headingStack[headingStack.length - 1].children.push(node);
		else roots.push(node);
		indentStack.push({ indent, node });
	}

	promoteToHeadingTasks(roots);
	return roots;
}

function promoteToHeadingTasks(nodes: ContentNode[]) {
	for (const node of nodes) {
		if (
			node.type === "heading" &&
			!node.task &&
			hasListTasks(node.children)
		) {
			node.task = {
				rawLine: node.raw,
				status: "none" as TaskStatus,
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

function parseHeadingYamlBlock(
	lines: string[],
	headingLine: number,
	headingLevel: number,
): {
	yamlData: Record<string, unknown> | null;
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
	const yamlData: Record<string, unknown> = {};
	for (const yamlLine of lines.slice(yamlStartLine + 1, yamlEndLine)) {
		const colonIdx = yamlLine.indexOf(":");
		if (colonIdx === -1) continue;
		const key = yamlLine.substring(0, colonIdx).trim();
		let value: unknown = yamlLine.substring(colonIdx + 1).trim();
		if (typeof value === "string") {
			if (
				(value.startsWith("'") && value.endsWith("'")) ||
				(value.startsWith('"') && value.endsWith('"'))
			)
				value = value.slice(1, -1);
		}
		if (key && value !== "") setRecord(yamlData, key, value);
	}
	return {
		yamlData: Object.keys(yamlData).length > 0 ? yamlData : null,
		yamlStartLine,
		yamlEndLine,
	};
}

function getIndentLevel(line: string): number {
	const tabSize = 4;
	const leading = line.length - line.trimStart().length;
	const leadingText = line.substring(0, leading);
	let column = 0;
	for (const ch of leadingText) {
		column +=
			ch === "\t"
				? (Math.floor(column / tabSize) + 1) * tabSize - column
				: 1;
	}
	return Math.floor(column / tabSize);
}

export function isTaskFile(fileName: string, parsed: ParsedFileData): boolean {
	if (matchTaskFileName(fileName)) return true;
	if (parsed.hasMarkedTasks) return true;
	if (parsed.fileTask) return true;
	return false;
}

interface VaultFile {
	path: string;
	name: string;
}
interface AppLike {
	vault: {
		getMarkdownFiles(): VaultFile[];
		cachedRead(file: VaultFile): Promise<string>;
	};
}

export async function loadAllTaskFiles(
	app: AppLike,
): Promise<ParsedFileData[]> {
	if (TASK_ROOT_PATHS.length === 0) return [];
	const files = app.vault
		.getMarkdownFiles()
		.filter((f) => matchTaskFilePath(f.path) && f.name.endsWith(".md"));
	const results: ParsedFileData[] = [];
	for (const file of files) {
		try {
			const content = await app.vault.cachedRead(file);
			const parsed = parseFile(file.path, file.name, content);
			if (isTaskFile(file.name, parsed)) results.push(parsed);
		} catch (e: unknown) {
			logger.warn("[TaskManage] 读取任务文件失败:", file.path, e);
		}
	}
	return results;
}
