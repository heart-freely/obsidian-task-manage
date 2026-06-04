// src/process/components/tree-task-process.ts
// 任务树数据处理：父子关系解析、检测、文件内容解析

import {
	STATUS_ALL_SYMBOLS,
	SYMBOL_TO_STATUS,
	TASK_ELEMENTS,
	YAML_DATE_FIELDS,
} from "../../configs/configs";

export interface TreeNode {
	path: string;
	name: string;
	relPath: string;
	folderParts: string[];
	metaParent: string | null;
	linkParent: string | null;
	children: TreeNode[];
	tasks: any[];
	conflict: "meta_mismatch" | "meta_missing" | "link_missing" | null;
	missingLinks: string[];
	contentRoots?: ContentNode[];
	_task?: any;
}

export interface ContentNode {
	type: "heading" | "task";
	level?: number;
	text: string;
	raw: string;
	line: number;
	children: ContentNode[];
	parent: ContentNode | null;
	_task?: any;
	yamlStartLine?: number;
	yamlEndLine?: number;
}

const PREFIX = "pages/A 系统/A 任务系统/";

// 从 STATUS_ALL_SYMBOLS 构建所有执行状态符号
const ALL_STATUS_SYMBOLS = (() => {
	const allSymbols = new Set<string>();

	for (const symbols of Object.values(STATUS_ALL_SYMBOLS)) {
		for (const s of symbols) {
			allSymbols.add(s);
		}
	}

	const escapedSymbols = [...allSymbols].map((s) => {
		if (s === "-" || s === "]" || s === "^" || s === "\\") {
			return "\\" + s;
		}
		return s;
	});

	const hasDash = escapedSymbols.includes("\\-");
	const withoutDash = escapedSymbols.filter((s) => s !== "\\-");
	const ordered = hasDash ? ["\\-", ...withoutDash] : withoutDash;

	return ordered.join("");
})();

const TASK_REGEX = new RegExp(`^-\\s*\\[([${ALL_STATUS_SYMBOLS}])\\]\\s+(.+)$`);

// ========== 文件名标准化 ==========

export function normalizeFileName(raw: string): string {
	let name = (raw || "").trim();
	name = name.split("/").pop()!.replace(/\.md$/i, "");
	name = name.replace(/[\u200B-\u200D\uFEFF]/g, "");
	name = name.split("#")[0].split("|")[0];
	return name.toLowerCase();
}

// ========== 链接提取 ==========

export function extractAllLinks(content: string): string[] {
	if (!content) return [];
	const links: string[] = [];

	const wikiRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
	let match: RegExpExecArray | null;
	while ((match = wikiRegex.exec(content)) !== null) {
		const name = normalizeFileName(match[1].trim());
		if (name.endsWith("任务")) links.push(name);
	}

	const mdRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
	while ((match = mdRegex.exec(content)) !== null) {
		const name = normalizeFileName(match[2].trim());
		if (name.endsWith("任务")) links.push(name);
	}

	return [...new Set(links)];
}

// ========== 父任务解析 ==========

export function parseParentField(raw: any): string | null {
	if (!raw) return null;
	const str = String(raw).trim();
	const wikiRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
	const m = wikiRegex.exec(str);
	const name = normalizeFileName(m ? m[1].trim() : str);
	return name.endsWith("任务") ? name : null;
}

// ========== 任务行解析 ==========

export function parseTaskLine(
	fullLine: string,
	path: string,
	line: number,
): any {
	const RX_PRIORITY = /⏬|🔽|🔼|⏫|🔺/g;
	const RX_REPEAT = /🔁\s*(every\s+(day|week|month|year))/;
	const RX_CREATED = /➕\s*(\d{4}-\d{2}-\d{2})/;
	const RX_SCHEDULED = /⏳\s*(\d{4}-\d{2}-\d{2})/;
	const RX_STARTS = /🛫\s*(\d{4}-\d{2}-\d{2})/;
	const RX_DUE = /📅\s*(\d{4}-\d{2}-\d{2})/;
	const RX_DONE = /✅\s*(\d{4}-\d{2}-\d{2})/;
	const RX_CANCEL = /❌\s*(\d{4}-\d{2}-\d{2})?/;
	const RX_TAG = /🏁\s*(\S+)/;
	const RX_ID = /🆔\s*(\S+)/;
	const RX_FORBID = /⛔\s*([^\s,]+(?:\s*,\s*[^\s,]+)*)/;

	function m(rx: RegExp, idx?: number): string | null {
		const match = fullLine.match(rx);
		return match ? match[idx !== undefined ? idx : 1] || null : null;
	}

	const statusMatch = fullLine.match(/^\s*- \[(.)\]\s*/);
	let status = "todo";
	if (statusMatch) {
		const s = statusMatch[1];
		status = SYMBOL_TO_STATUS[s] || "todo";
	}

	const cleanText = fullLine
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
		.replace(/^\s*- \[.\]\s*/, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	const priorityIcon = (fullLine.match(RX_PRIORITY) || [null])[0];

	return {
		_status: status,
		_cleanText: cleanText,
		_fullLine: fullLine,
		_priorityIcon: priorityIcon || "",
		_created: m(RX_CREATED),
		_scheduled: m(RX_SCHEDULED),
		_starts: m(RX_STARTS),
		_due: m(RX_DUE),
		_done: m(RX_DONE),
		_cancel: m(RX_CANCEL) || "",
		_tag: m(RX_TAG),
		_id: m(RX_ID),
		_forbid: m(RX_FORBID) ? m(RX_FORBID).replace(/\s/g, "") : "",
		_repeat: m(RX_REPEAT),
		path: path,
		line: line,
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
}

// ========== 从 Markdown 内容解析 YAML frontmatter ==========

function parseFrontmatter(content: string): Record<string, any> {
	if (!content) return {};

	const trimmed = content.trimStart();
	if (!trimmed.startsWith("---")) return {};

	const endIdx = trimmed.indexOf("---", 3);
	if (endIdx === -1) return {};

	const yamlContent = trimmed.substring(3, endIdx).trim();
	const result: Record<string, any> = {};

	const lines = yamlContent.split("\n");
	for (const line of lines) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;
		const key = line.substring(0, colonIdx).trim();
		let value = line.substring(colonIdx + 1).trim();
		if (
			(value.startsWith("'") && value.endsWith("'")) ||
			(value.startsWith('"') && value.endsWith('"'))
		) {
			value = value.slice(1, -1);
		}
		if (key) {
			result[key] = value;
		}
	}

	return result;
}

// ========== 从 YAML 数据构建统一任务数据 ==========

function buildTaskDataFromYaml(
	yamlData: Record<string, any>,
	filePath: string,
	line: number,
): any {
	const statusMap: Record<string, string> = {};
	TASK_ELEMENTS.status.children?.forEach((c) => {
		statusMap[c.zhName] = c.key;
	});

	const priorityMap: Record<string, string> = {};
	TASK_ELEMENTS.priority.children?.forEach((c, idx) => {
		priorityMap[c.zhName] = c.icon!;
		priorityMap[String(4 - idx)] = c.icon!;
	});

	const rawStatus = yamlData["任务状态"] || "未开始";
	const rawPriority = yamlData["任务优先级"] || "none";
	const statusKey = statusMap[rawStatus] || "todo";
	const priorityIcon = priorityMap[rawPriority] || "";
	const priorityNum = rawPriority === "none" ? "none" : rawPriority;

	const formatDate = (val: any): string | null => {
		if (!val) return null;
		const str = String(val);
		if (str === "NaN" || str.includes("NaN")) return null;
		const dateMatch = str.match(/(\d{4}-\d{2}-\d{2})/);
		return dateMatch ? dateMatch[1] : str.substring(0, 10);
	};

	const dateValues: Record<string, string | null> = {};
	for (const yaName of YAML_DATE_FIELDS) {
		dateValues[yaName] = formatDate(yamlData[yaName]);
	}

	const name = yamlData["任务名称"] || "";
	const description = yamlData["任务简介"] || name;

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
		path: filePath,
		line: line,
		lineNumber: line,
		text: description,
		description: description,
		priority: priorityNum,
		status: " ",
		_isHeadingTask: false,
		_isFileTask: false,
		_headingLevel: 0,
		_headingText: "",
	};
}

// ========== 从页面元数据构建文件任务数据 ==========

function pageToTaskData(page: any, filePath: string): any {
	const name = page.file?.name?.replace(/\.md$/, "") || "";

	const frontmatter = parseFrontmatter(page.file?.content || "");

	const getField = (fieldName: string, defaultValue: string = ""): string => {
		if (
			frontmatter[fieldName] !== undefined &&
			frontmatter[fieldName] !== null &&
			frontmatter[fieldName] !== ""
		) {
			return String(frontmatter[fieldName]);
		}
		if (
			page[fieldName] !== undefined &&
			page[fieldName] !== null &&
			page[fieldName] !== ""
		) {
			return String(page[fieldName]);
		}
		return defaultValue;
	};

	const yamlData: Record<string, any> = {
		任务名称: getField("任务名称", name),
		任务状态: getField("任务状态", "未开始"),
		任务优先级: getField("任务优先级", "none"),
		任务周期: getField("任务周期", ""),
		任务创建: getField("任务创建", ""),
		任务计划: getField("任务计划", ""),
		任务开始: getField("任务开始", ""),
		任务完成: getField("任务完成", ""),
		任务截止: getField("任务截止", ""),
		任务取消: getField("任务取消", ""),
		任务标签: getField("任务标签", ""),
		任务唯一ID: getField("任务唯一ID", ""),
		任务引用ID: getField("任务引用ID", ""),
		任务简介: getField("任务简介", name),
	};

	const taskData = buildTaskDataFromYaml(yamlData, filePath, 0);
	taskData._isFileTask = true;
	taskData._cleanText = getField("任务简介", name);
	return taskData;
}

// ========== 标题 YAML 解析 ==========

function parseHeadingYamlBlock(
	lines: string[],
	headingLine: number,
	headingLevel: number,
): {
	yamlData: Record<string, any> | null;
	yamlStartLine: number;
	yamlEndLine: number;
} {
	let yamlStartLine = -1;
	let yamlEndLine = -1;

	for (let i = headingLine + 1; i < lines.length; i++) {
		const trimmed = lines[i].trim();

		const headingMatch = trimmed.match(/^(#{1,6})\s+/);
		if (headingMatch && headingMatch[1].length <= headingLevel) {
			break;
		}

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

	if (yamlStartLine === -1 || yamlEndLine === -1) {
		return { yamlData: null, yamlStartLine: -1, yamlEndLine: -1 };
	}

	const yamlLines = lines.slice(yamlStartLine + 1, yamlEndLine);
	const yamlData: Record<string, any> = {};

	for (const yamlLine of yamlLines) {
		const colonIdx = yamlLine.indexOf(":");
		if (colonIdx === -1) continue;
		const key = yamlLine.substring(0, colonIdx).trim();
		let value = yamlLine.substring(colonIdx + 1).trim();
		if (
			(value.startsWith("'") && value.endsWith("'")) ||
			(value.startsWith('"') && value.endsWith('"'))
		) {
			value = value.slice(1, -1);
		}
		if (key && value) {
			yamlData[key] = value;
		}
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
): any {
	const taskData = buildTaskDataFromYaml(yamlData, filePath, headingLine);
	taskData._isHeadingTask = true;
	return taskData;
}

// ========== 计算缩进级别 ==========

function getIndentLevel(line: string): number {
	const leading = line.length - line.trimStart().length;
	const tabCount = (line.match(/\t/g) || []).length;
	const spaceCount = leading - tabCount;
	return tabCount + Math.floor(spaceCount / 4);
}

// ========== 文件内容解析 ==========

export function parseFileContent(
	content: string,
	filePath?: string,
): ContentNode[] {
	if (!content) return [];
	const lines = content.split("\n");
	const roots: ContentNode[] = [];

	let inTaskSection = false;
	let taskSectionLevel = 0;

	const headingStack: ContentNode[] = [];
	const indentStack: { indent: number; node: ContentNode }[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (trimmed === "") continue;

		const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const title = headingMatch[2].trim();

			if (title === "任务行动" || title.includes("任务行动")) {
				inTaskSection = true;
				taskSectionLevel = level;
				headingStack.length = 0;
				indentStack.length = 0;
				continue;
			}

			if (inTaskSection) {
				if (level <= taskSectionLevel) {
					inTaskSection = false;
					headingStack.length = 0;
					indentStack.length = 0;
					continue;
				}

				if (title.endsWith("任务")) {
					const { yamlData, yamlStartLine, yamlEndLine } =
						parseHeadingYamlBlock(lines, i, level);

					let taskData: any = null;
					if (yamlData) {
						taskData = yamlDataToTaskData(
							yamlData,
							filePath || "",
							i,
						);
						taskData._headingText = title;
						taskData._headingLevel = level;
					}

					const node: ContentNode = {
						type: "heading",
						level: level,
						text: title,
						raw: trimmed,
						line: i,
						children: [],
						parent: null,
						yamlStartLine:
							yamlStartLine >= 0 ? yamlStartLine : undefined,
						yamlEndLine: yamlEndLine >= 0 ? yamlEndLine : undefined,
					};

					if (taskData) {
						node._task = taskData;
					}

					while (
						headingStack.length > 0 &&
						headingStack[headingStack.length - 1].level! >= level
					) {
						headingStack.pop();
					}

					if (headingStack.length > 0) {
						headingStack[headingStack.length - 1].children.push(
							node,
						);
					} else {
						roots.push(node);
					}

					headingStack.push(node);
					indentStack.length = 0;

					continue;
				}

				headingStack.length = 0;
				indentStack.length = 0;
				continue;
			}

			continue;
		}

		if (!inTaskSection) continue;

		const currentHeading =
			headingStack.length > 0
				? headingStack[headingStack.length - 1]
				: null;
		if (
			currentHeading &&
			currentHeading.yamlStartLine !== undefined &&
			currentHeading.yamlEndLine !== undefined &&
			i > currentHeading.yamlStartLine &&
			i < currentHeading.yamlEndLine
		) {
			continue;
		}

		// 匹配任务行
		const taskMatch = trimmed.match(TASK_REGEX);
		if (!taskMatch) continue;

		const fullLine = trimmed;
		const taskData = parseTaskLine(fullLine, filePath || "", i);

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

// ========== 节点构建 ==========

export function buildNodeMap(
	pages: any[],
	tasksByPath: Map<string, any[]>,
	dv: any,
): Map<string, TreeNode> {
	const map = new Map<string, TreeNode>();

	pages.forEach((page) => {
		const path = page.file.path;
		const name = page.file.name.replace(/\.md$/, "");
		const relPath = path.startsWith(PREFIX)
			? path.slice(PREFIX.length)
			: path;
		const folderParts = relPath.split("/").slice(0, -1);
		const metaParent = parseParentField(page["任务父任务"]);
		const content = page.file.content || "";
		const contentRoots = content ? parseFileContent(content, path) : [];

		const fileTasks = tasksByPath.get(path) || [];
		mergeContentWithTasks(contentRoots, fileTasks);

		const fileTaskData = pageToTaskData(page, path);

		const node: TreeNode = {
			path,
			name,
			relPath,
			folderParts,
			metaParent,
			linkParent: null,
			children: [],
			tasks: fileTasks,
			conflict: null,
			missingLinks: [],
			contentRoots,
			_task: fileTaskData,
		};
		map.set(path, node);
	});

	map.forEach((node, path) => {
		const page = pages.find((p) => p.file.path === path);
		if (page) {
			const allLinks = extractAllLinks(page.file.content || "");
			allLinks.forEach((linkName) => {
				const child = findNodeByName(map, linkName);
				if (child && !child.metaParent && !child.linkParent) {
					child.linkParent = normalizeFileName(node.name);
				}
			});
		}
	});

	return map;
}

// ========== 关系解析 ==========

export function resolveRelations(map: Map<string, TreeNode>): TreeNode[] {
	const roots: TreeNode[] = [];

	map.forEach((node) => {
		let parent: TreeNode | null = null;

		if (node.metaParent && node.linkParent) {
			if (node.metaParent === node.linkParent) {
				parent = findNodeByName(map, node.metaParent);
			} else {
				node.conflict = "meta_mismatch";
				parent = findNodeByName(map, node.metaParent);
			}
		} else if (node.metaParent) {
			parent = findNodeByName(map, node.metaParent);
		} else if (node.linkParent) {
			node.conflict = "meta_missing";
			parent = findNodeByName(map, node.linkParent);
		}

		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	});

	map.forEach((parentNode) => {
		const allLinks = extractAllLinks(
			parentNode.contentRoots?.map((n) => n.raw).join("\n") || "",
		);
		allLinks.forEach((linkName) => {
			const child = findNodeByName(map, linkName);
			if (
				child &&
				!parentNode.children.some((c) => c.path === child.path)
			) {
				parentNode.missingLinks.push(linkName);
			}
		});

		if (parentNode.missingLinks.length > 0 && !parentNode.conflict) {
			parentNode.conflict = "link_missing";
		}
	});

	roots.sort((a, b) => a.name.localeCompare(b.name));
	roots.forEach(sortTree);

	return roots;
}

function findNodeByName(
	map: Map<string, TreeNode>,
	name: string,
): TreeNode | null {
	const lower = name.toLowerCase();
	for (const node of map.values()) {
		if (node.name.toLowerCase() === lower) return node;
	}
	return null;
}

function sortTree(node: TreeNode) {
	node.children.sort((a, b) => a.name.localeCompare(b.name));
	node.children.forEach(sortTree);
}

// ========== 警告文本 ==========

export function getWarningText(node: TreeNode): string {
	if (node.conflict === "meta_mismatch") return "⚠️ 元属性不对应";
	if (node.conflict === "meta_missing") return "⚠️ 缺失元属性";
	if (node.conflict === "link_missing") {
		return "⚠️ 缺失链接：" + node.missingLinks.join("、");
	}
	return "";
}

// ========== 合并任务数据 ==========

export function mergeContentWithTasks(
	contentNodes: ContentNode[],
	fileTasks: any[],
): ContentNode[] {
	const taskMap = new Map<number, any>();

	fileTasks.forEach((t) => {
		const line = t.lineNumber ?? t.line;
		taskMap.set(line, t);
	});

	function walk(nodes: ContentNode[]) {
		nodes.forEach((node) => {
			if (node.type === "task") {
				if (!node._task) {
					const task = taskMap.get(node.line);
					if (task) {
						node._task = task;
					} else {
						node._task = parseTaskLine(node.raw, "", node.line);
					}
				}
			}
			if (node.type === "heading") {
				if (!node._task) {
					const task = taskMap.get(node.line);
					if (task) {
						node._task = task;
					}
				}
			}
			walk(node.children);
		});
	}

	walk(contentNodes);
	return contentNodes;
}
