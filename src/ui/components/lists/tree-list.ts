// src/ui/components/lists/tree-list.ts
// 任务树列表渲染组件

import {
	ContentNode,
	TreeNode,
	buildNodeMap,
	resolveRelations,
} from "../../../process/components/tree-task-process";
import { countTaskStatuses, createProgressBar } from "../bar/progress-bar";
import { createTaskCard } from "../cards/card";

// ========== 统一缩进宽度 ==========

const INDENT_WIDTH = 24;

// ========== 渲染选项 ==========

export interface TreeListOptions {
	hideFolders?: boolean;
	dv?: any;
	pages?: any[];
}

// ========== 去除 number headings 插件序号 ==========

function removeHeadingNumber(text: string): string {
	return text
		.replace(/^[\d]+\.[\d.]*\s+/, "")
		.replace(/^[A-Z]+\.\s+/, "")
		.replace(/^[IVXLCDM]+\.\s+/, "")
		.replace(/^[\d]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^[A-Z]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^[IVXLCDM]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^_[\.\s]*/, "")
		.trim();
}

// ========== 收集节点下所有任务 ==========

function collectNodeTasks(node: ContentNode): any[] {
	const seen = new Set<string>();
	const tasks: any[] = [];

	function add(task: any) {
		const key = (task.path || "") + ":" + (task.lineNumber ?? task.line);
		if (!seen.has(key)) {
			seen.add(key);
			tasks.push(task);
		}
	}

	if (node.type === "task" && node._task) {
		add(node._task);
	}
	node.children.forEach((child) => {
		collectNodeTasks(child).forEach(add);
	});
	return tasks;
}

function collectAllTasksFromNode(node: TreeNode): any[] {
	const seen = new Set<string>();
	const all: any[] = [];

	function add(task: any) {
		const key = (task.path || "") + ":" + (task.lineNumber ?? task.line);
		if (!seen.has(key)) {
			seen.add(key);
			all.push(task);
		}
	}

	node.tasks.forEach(add);
	node.children.forEach((child) => {
		collectAllTasksFromNode(child).forEach(add);
	});
	if (node.contentRoots) {
		node.contentRoots.forEach((cn) => {
			collectNodeTasks(cn).forEach(add);
		});
	}
	return all;
}

// ========== 收集 contentRoots 中已有的任务行号 ==========

function collectRenderedLines(contentNodes: ContentNode[]): Set<number> {
	const lines = new Set<number>();
	function walk(nodes: ContentNode[]) {
		nodes.forEach((cn) => {
			if (cn.type === "task") lines.add(cn.line);
			walk(cn.children);
		});
	}
	walk(contentNodes);
	return lines;
}

// ========== 排序：列表任务 → 标题任务 ==========

function getNodeOrder(node: ContentNode): number {
	if (node.type === "task") return 0;
	if (node.type === "heading") return 1;
	return 2;
}

function sortChildContentNodes(nodes: ContentNode[]): ContentNode[] {
	return [...nodes].sort((a, b) => getNodeOrder(a) - getNodeOrder(b));
}

// ========== 统一行容器 ==========

function createRowWrapper(depth: number): HTMLElement {
	const wrapper = document.createElement("div");
	wrapper.style.cssText = [
		"margin-left:" + depth * INDENT_WIDTH + "px",
		"display:flex",
		"align-items:center",
		"gap:0",
	].join(";");
	return wrapper;
}

function createToggleBtn(childContainer: HTMLElement): HTMLElement {
	const btn = document.createElement("span");
	btn.className = "tree-toggle-btn";
	btn.style.cssText =
		"display:inline-flex;align-items:center;justify-content:center;width:16px;min-width:16px;height:22px;font-size:10px;flex-shrink:0;cursor:pointer;user-select:none;";
	btn.textContent = "▼";

	btn.addEventListener("click", (e) => {
		e.stopPropagation();
		e.preventDefault();
		if (childContainer.style.display === "none") {
			childContainer.style.display = "";
			btn.textContent = "▼";
		} else {
			childContainer.style.display = "none";
			btn.textContent = "▶";
		}
	});

	return btn;
}

function createSpacer(): HTMLElement {
	const spacer = document.createElement("span");
	spacer.style.cssText = "display:inline-flex;width:16px;flex-shrink:0;";
	return spacer;
}

function createTextLabel(text: string, title?: string): HTMLElement {
	const item = document.createElement("div");
	item.style.cssText = [
		"padding:2px 4px",
		"cursor:pointer",
		"border-radius:4px",
		"font-size:var(--font-ui-small)",
		"font-weight:normal",
		"font-family:var(--font-text)",
		"color:var(--text-normal)",
		"white-space:nowrap",
		"overflow:hidden",
		"text-overflow:ellipsis",
	].join(";");
	item.textContent = text;
	if (title) item.title = title;

	item.addEventListener("mouseenter", () => {
		item.style.backgroundColor = "var(--background-modifier-hover)";
	});
	item.addEventListener("mouseleave", () => {
		item.style.backgroundColor = "";
	});

	return item;
}

function createCardContent(task: any): HTMLElement {
	const card = createTaskCard(task, { showTooltip: true });

	card.style.border = "none";
	card.style.background = "transparent";
	card.style.padding = "0";
	card.style.margin = "0";
	card.style.fontSize = "var(--font-ui-small)";
	card.style.listStyle = "none";
	card.style.borderRadius = "0";
	card.style.borderLeft = "none";
	card.style.display = "block";
	card.style.paddingLeft = "0";

	const meta = card.querySelector(".task-meta") as HTMLElement;
	if (meta) meta.style.display = "none";

	const desc = card.querySelector(".task-desc") as HTMLElement;
	if (desc) {
		desc.style.fontWeight = "normal";
		desc.style.marginBottom = "0";
		desc.style.whiteSpace = "nowrap";
		desc.style.overflow = "hidden";
		desc.style.textOverflow = "ellipsis";
		desc.style.paddingLeft = "0";
	}

	return card;
}

// ========== 辅助：添加进度条和徽章 ==========

function addProgressBadge(
	container: HTMLElement,
	counts: Record<string, number>,
	total: number,
) {
	const wrapper = document.createElement("div");
	wrapper.style.cssText =
		"display:flex;align-items:center;gap:4px;margin-left:4px;flex-shrink:0;";

	const progressBar = createProgressBar({
		counts,
		total,
		height: "8px",
		showPercent: true,
	});
	progressBar.style.cssText += "width:60px;min-width:60px;flex-shrink:0;";
	wrapper.appendChild(progressBar);

	const badge = document.createElement("span");
	badge.textContent = "(" + total + ")";
	badge.style.cssText =
		"font-size:var(--font-ui-smaller);color:var(--text-muted);flex-shrink:0;";
	wrapper.appendChild(badge);

	container.appendChild(wrapper);
}

// ========== 主渲染函数 ==========

export function renderTaskTree(
	container: HTMLElement,
	tasks: any[],
	options: TreeListOptions = {},
) {
	container.empty();

	const hideFolders = options?.hideFolders ?? true;
	const dv = options?.dv;
	const pages = options?.pages;

	const fileMap = new Map<string, any[]>();
	tasks.forEach((task) => {
		if (!fileMap.has(task.path)) fileMap.set(task.path, []);
		fileMap.get(task.path)!.push(task);
	});

	let roots: TreeNode[] = [];

	if (dv && pages && pages.length > 0) {
		const nodeMap = buildNodeMap(pages, fileMap, dv);
		roots = resolveRelations(nodeMap);
	}

	const tree = document.createElement("div");
	tree.className = "task-tree";

	if (roots.length > 0) {
		roots.forEach((root) => {
			renderFileNodeInline(root, 0, tree);
		});
	} else if (pages && pages.length > 0) {
		renderSimpleTree(fileMap, 0, tree, hideFolders);
	} else {
		const defaultRoot = document.createElement("div");
		defaultRoot.style.cssText =
			"padding:2px 4px;font-size:var(--font-ui-small);color:var(--text-muted);";
		defaultRoot.textContent = "📄 任务系统";
		tree.appendChild(defaultRoot);
	}

	container.appendChild(tree);
}

// ========== 文件节点 ==========

function renderFileNodeInline(
	node: TreeNode,
	depth: number,
	parentEl: HTMLElement,
) {
	const hasContent =
		node.tasks.length > 0 ||
		node.children.length > 0 ||
		(node.contentRoots?.length || 0) > 0;

	const childContainer = document.createElement("div");

	const task = node._task;
	const allDescendantTasks = collectAllTasksFromNode(node);
	const { counts, total } = countTaskStatuses(allDescendantTasks);

	const rowWrapper = createRowWrapper(depth);

	if (hasContent) {
		rowWrapper.appendChild(createToggleBtn(childContainer));
	} else {
		rowWrapper.appendChild(createSpacer());
	}

	const contentContainer = document.createElement("div");
	contentContainer.style.cssText =
		"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";

	if (task) {
		const originalCleanText = task._cleanText;
		task._cleanText = "📄 " + (originalCleanText || node.name);

		const card = createCardContent(task);
		card.style.flex = "0 1 auto";
		card.style.minWidth = "0";
		card.style.overflow = "hidden";
		card.style.textOverflow = "ellipsis";
		card.style.whiteSpace = "nowrap";
		contentContainer.appendChild(card);

		if (total > 0 && hasContent) {
			addProgressBadge(contentContainer, counts, total);
		}

		task._cleanText = originalCleanText;
	} else {
		const label = createTextLabel("📄 " + node.name);
		label.style.flex = "0 1 auto";
		label.style.minWidth = "0";
		label.style.overflow = "hidden";
		label.style.textOverflow = "ellipsis";
		label.style.whiteSpace = "nowrap";
		label.addEventListener("click", async () => {
			const app = (window as any).app;
			if (app && node.path) {
				const file = app.vault.getAbstractFileByPath(node.path);
				if (file) {
					app.workspace.getLeaf(false).openFile(file);
				}
			}
		});
		contentContainer.appendChild(label);

		if (total > 0 && hasContent) {
			addProgressBadge(contentContainer, counts, total);
		}
	}

	rowWrapper.appendChild(contentContainer);

	const rightSpacer = document.createElement("div");
	rightSpacer.style.cssText = "flex:1;";
	rowWrapper.appendChild(rightSpacer);

	parentEl.appendChild(rowWrapper);

	// 渲染内容节点
	if (node.contentRoots && node.contentRoots.length > 0) {
		const renderedLines = collectRenderedLines(node.contentRoots);

		const sorted = sortChildContentNodes(node.contentRoots);
		sorted.forEach((cn) => {
			renderContentNode(cn, depth + 1, childContainer, node.path);
		});

		// 渲染不在 contentRoots 中的 node.tasks
		node.tasks.forEach((t) => {
			const line = t.lineNumber ?? t.line;
			if (!renderedLines.has(line)) {
				renderContentNode(
					{
						type: "task",
						text: "",
						raw: "",
						line: line,
						children: [],
						parent: null,
						_task: t,
					},
					depth + 1,
					childContainer,
				);
			}
		});
	} else if (node.tasks.length > 0) {
		node.tasks.forEach((t) => {
			renderContentNode(
				{
					type: "task",
					text: "",
					raw: "",
					line: t.lineNumber ?? t.line,
					children: [],
					parent: null,
					_task: t,
				},
				depth + 1,
				childContainer,
			);
		});
	}

	// 子文件节点
	node.children.forEach((child) => {
		renderFileNodeInline(child, depth + 1, childContainer);
	});

	parentEl.appendChild(childContainer);
}

// ========== 内容节点 ==========

function renderContentNode(
	node: ContentNode,
	depth: number,
	parentEl: HTMLElement,
	filePath?: string,
) {
	const childContainer = document.createElement("div");
	const hasChildren = node.children.length > 0;

	if (node.type === "heading") {
		const task = (node as any)._task;
		const level = node.level || 1;
		const hTag = "H" + level;
		const cleanTitle = removeHeadingNumber(node.text);

		const rowWrapper = createRowWrapper(depth);

		if (hasChildren) {
			rowWrapper.appendChild(createToggleBtn(childContainer));
		} else {
			rowWrapper.appendChild(createSpacer());
		}

		const contentContainer = document.createElement("div");
		contentContainer.style.cssText =
			"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";

		const childTasks = collectNodeTasks(node);
		const { counts, total } = countTaskStatuses(childTasks);

		if (task) {
			const originalCleanText = task._cleanText;
			task._cleanText = hTag + " " + cleanTitle;

			const card = createCardContent(task);
			card.style.flex = "0 1 auto";
			card.style.minWidth = "0";
			card.style.overflow = "hidden";
			card.style.textOverflow = "ellipsis";
			card.style.whiteSpace = "nowrap";
			contentContainer.appendChild(card);

			if (total > 0 && hasChildren) {
				addProgressBadge(contentContainer, counts, total);
			}

			task._cleanText = originalCleanText;
		} else {
			const label = createTextLabel(hTag + " " + cleanTitle, cleanTitle);
			label.style.flex = "0 1 auto";
			label.style.minWidth = "0";
			label.style.overflow = "hidden";
			label.style.textOverflow = "ellipsis";
			label.style.whiteSpace = "nowrap";

			if (filePath && node.line >= 0) {
				label.addEventListener("click", async () => {
					const app = (window as any).app;
					if (app) {
						const file = app.vault.getAbstractFileByPath(filePath);
						if (file) {
							const leaf = app.workspace.getLeaf(false);
							await leaf.openFile(file);
							setTimeout(() => {
								if (leaf.view?.editor) {
									leaf.view.editor.setCursor({
										line: node.line,
										ch: 0,
									});
								}
							}, 30);
						}
					}
				});
			}

			contentContainer.appendChild(label);

			if (total > 0 && hasChildren) {
				addProgressBadge(contentContainer, counts, total);
			}
		}

		rowWrapper.appendChild(contentContainer);

		const rightSpacer = document.createElement("div");
		rightSpacer.style.cssText = "flex:1;";
		rowWrapper.appendChild(rightSpacer);

		parentEl.appendChild(rowWrapper);

		const sortedChildren = sortChildContentNodes(node.children);
		sortedChildren.forEach((child) => {
			renderContentNode(child, depth + 1, childContainer, filePath);
		});
	} else if (node.type === "task") {
		const task = (node as any)._task;
		const taskData = task || {
			_status: "todo",
			text: node.text,
			description: node.text,
			_cleanText: node.text,
			path: filePath || "",
			line: node.line,
			lineNumber: node.line,
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
		};

		const rowWrapper = createRowWrapper(depth);

		const contentContainer = document.createElement("div");
		contentContainer.style.cssText =
			"display:flex;align-items:center;gap:4px;flex-shrink:0;max-width:100%;";

		if (hasChildren) {
			rowWrapper.appendChild(createToggleBtn(childContainer));

			const childTasks = collectNodeTasks(node);
			const { counts, total } = countTaskStatuses(childTasks);

			const originalText = taskData._cleanText;
			if (!originalText.startsWith("● ")) {
				taskData._cleanText = "● " + originalText;
			}

			const card = createCardContent(taskData);
			card.style.flex = "0 1 auto";
			card.style.minWidth = "0";
			card.style.overflow = "hidden";
			card.style.textOverflow = "ellipsis";
			card.style.whiteSpace = "nowrap";
			contentContainer.appendChild(card);

			if (total > 0) {
				addProgressBadge(contentContainer, counts, total);
			}

			taskData._cleanText = originalText;
		} else {
			rowWrapper.appendChild(createSpacer());

			const originalText = taskData._cleanText;
			if (!originalText.startsWith("● ")) {
				taskData._cleanText = "● " + originalText;
			}

			const card = createCardContent(taskData);
			card.style.flex = "0 1 auto";
			card.style.minWidth = "0";
			card.style.overflow = "hidden";
			card.style.textOverflow = "ellipsis";
			card.style.whiteSpace = "nowrap";
			contentContainer.appendChild(card);

			taskData._cleanText = originalText;
		}

		rowWrapper.appendChild(contentContainer);

		const rightSpacer = document.createElement("div");
		rightSpacer.style.cssText = "flex:1;";
		rowWrapper.appendChild(rightSpacer);

		parentEl.appendChild(rowWrapper);

		node.children.forEach((child) => {
			renderContentNode(child, depth + 1, childContainer, filePath);
		});
	}

	parentEl.appendChild(childContainer);
}

// ========== 简单文件夹树（回退） ==========

function renderSimpleTree(
	fileMap: Map<string, any[]>,
	depth: number,
	parentEl: HTMLElement,
	hideFolders: boolean,
) {
	const prefix = "pages/A 系统/A 任务系统/";
	const pathTree = new Map<string, any>();
	fileMap.forEach((fileTasks, path) => {
		const relPath = path.startsWith(prefix)
			? path.slice(prefix.length)
			: path;
		const parts = relPath.split("/");
		let current = pathTree;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!current.has(parts[i])) current.set(parts[i], new Map());
			current = current.get(parts[i]);
		}
		const fileName = parts[parts.length - 1].replace(".md", "");
		if (!current.has("__files")) current.set("__files", new Map());
		current.get("__files").set(fileName, fileTasks);
	});
	renderPathNode(pathTree, depth, parentEl, hideFolders);
}

function renderPathNode(
	node: Map<string, any>,
	depth: number,
	parentEl: HTMLElement,
	hideFolders: boolean,
) {
	const folders = Array.from(node.keys())
		.filter((k) => k !== "__files")
		.sort();
	const files = node.get("__files") as Map<string, any[]> | undefined;

	folders.forEach((folderName) => {
		const subNode = node.get(folderName);
		const allTasks = collectAllTasks(subNode);
		const { counts, total } = countTaskStatuses(allTasks);
		if (allTasks.length === 0 && subNode.size === 0) return;

		if (!hideFolders) {
			const folderNode = document.createElement("div");
			folderNode.style.cssText =
				"margin-left:" +
				depth * INDENT_WIDTH +
				"px;cursor:pointer;user-select:none;padding:2px 0;display:flex;align-items:center;gap:4px;";
			const toggle = document.createElement("span");
			toggle.textContent = "▼";
			toggle.style.cssText =
				"display:inline-block;width:16px;font-size:10px;flex-shrink:0;";
			const icon = document.createElement("span");
			icon.textContent = "📁";
			icon.style.flexShrink = "0";
			const name = document.createElement("span");
			name.textContent = folderName;
			name.style.fontWeight = "normal";
			name.style.flexShrink = "0";
			const badge = document.createElement("span");
			badge.textContent = "(" + total + ")";
			badge.style.cssText =
				"font-size:var(--font-ui-smaller);color:var(--text-muted);flex-shrink:0;";
			const progressBar = createProgressBar({
				counts,
				total,
				height: "4px",
			});
			progressBar.style.cssText += "flex:0 1 80px;min-width:40px;";
			folderNode.appendChild(toggle);
			folderNode.appendChild(icon);
			folderNode.appendChild(name);
			folderNode.appendChild(badge);
			folderNode.appendChild(progressBar);

			const childContainer = document.createElement("div");
			folderNode.addEventListener("click", (e) => {
				e.stopPropagation();
				if (childContainer.style.display === "none") {
					childContainer.style.display = "";
					toggle.textContent = "▼";
				} else {
					childContainer.style.display = "none";
					toggle.textContent = "▶";
				}
			});
			parentEl.appendChild(folderNode);
			parentEl.appendChild(childContainer);
			renderPathNode(subNode, depth + 1, childContainer, hideFolders);
		} else {
			renderPathNode(subNode, depth, parentEl, hideFolders);
		}
	});

	if (files) {
		const fileNames = Array.from(files.keys()).sort();
		fileNames.forEach((fileName) => {
			const fileTasks = files.get(fileName)!;
			const { counts, total } = countTaskStatuses(fileTasks);
			const fileNode = document.createElement("div");
			fileNode.style.cssText =
				"margin-left:" +
				depth * INDENT_WIDTH +
				"px;cursor:pointer;user-select:none;padding:2px 0;display:flex;align-items:center;gap:4px;";
			const toggle = document.createElement("span");
			toggle.textContent = "▼";
			toggle.style.cssText =
				"display:inline-block;width:16px;font-size:10px;flex-shrink:0;";
			const icon = document.createElement("span");
			icon.textContent = "📄";
			icon.style.flexShrink = "0";
			const name = document.createElement("span");
			name.textContent = fileName;
			name.style.fontWeight = "normal";
			name.style.flexShrink = "0";
			const badge = document.createElement("span");
			badge.textContent = "(" + total + ")";
			badge.style.cssText =
				"font-size:var(--font-ui-smaller);color:var(--text-muted);flex-shrink:0;";
			const progressBar = createProgressBar({
				counts,
				total,
				height: "4px",
			});
			progressBar.style.cssText += "flex:0 1 80px;min-width:40px;";
			fileNode.appendChild(toggle);
			fileNode.appendChild(icon);
			fileNode.appendChild(name);
			fileNode.appendChild(badge);
			fileNode.appendChild(progressBar);

			const taskList = document.createElement("div");
			fileTasks.forEach((task) => {
				renderContentNode(
					{
						type: "task",
						text: "",
						raw: "",
						line: 0,
						children: [],
						parent: null,
						_task: task,
					},
					depth + 1,
					taskList,
				);
			});
			fileNode.addEventListener("click", (e) => {
				e.stopPropagation();
				if (taskList.style.display === "none") {
					taskList.style.display = "";
					toggle.textContent = "▼";
				} else {
					taskList.style.display = "none";
					toggle.textContent = "▶";
				}
			});
			parentEl.appendChild(fileNode);
			parentEl.appendChild(taskList);
		});
	}
}

function collectAllTasks(node: Map<string, any>): any[] {
	const all: any[] = [];
	const files = node.get("__files") as Map<string, any[]> | undefined;
	if (files) {
		files.forEach((t) => {
			all.push(...t);
		});
	}
	node.forEach((v, k) => {
		if (k !== "__files") all.push(...collectAllTasks(v));
	});
	return all;
}
