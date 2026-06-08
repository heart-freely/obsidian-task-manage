// src/process/component/tree-view-process.ts
// 任务树视图数据处理

import { countTaskStatuses } from "../../ui/component/progress/progress";
import { ContentNode, TreeNode } from "../task/task-tree";

// ========== 去除 number headings 插件序号 ==========

export function removeHeadingNumber(text: string): string {
	return text
		.replace(/^[\d]+\.[\d.]*\s+/, "")
		.replace(/^[A-Z]+\.\s+/, "")
		.replace(/^[IVXLCDM]+\.\s+/, "")
		.replace(/^[\d]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^[A-Z]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^[IVXLCDM]+\.[\d.]*[:\)\-\—]\s*/, "")
		.replace(/^\d+\s+/, "")
		.replace(/^_[\.\s]*/, "")
		.trim();
}

// ========== 收集任务 ==========

export function collectNodeTasks(node: ContentNode): any[] {
	const seen = new Set<string>();
	const tasks: any[] = [];
	function add(task: any) {
		const key = (task.path || "") + ":" + (task.lineNumber ?? task.line);
		if (!seen.has(key)) {
			seen.add(key);
			tasks.push(task);
		}
	}
	if (node.type === "task" && node._task) add(node._task);
	node.children.forEach((child) => collectNodeTasks(child).forEach(add));
	return tasks;
}

export function collectAllTasksFromNode(node: TreeNode): any[] {
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
	node.children.forEach((child) =>
		collectAllTasksFromNode(child).forEach(add),
	);
	if (node.contentRoots)
		node.contentRoots.forEach((cn) => collectNodeTasks(cn).forEach(add));
	return all;
}

export function countNodeStatuses(node: TreeNode): {
	counts: Record<string, number>;
	total: number;
} {
	const tasks = collectAllTasksFromNode(node);
	return countTaskStatuses(tasks);
}

export function countContentNodeStatuses(node: ContentNode): {
	counts: Record<string, number>;
	total: number;
} {
	const tasks = collectNodeTasks(node);
	return countTaskStatuses(tasks);
}

// ========== 排序 ==========

export function getNodeGroupOrder(node: ContentNode): number {
	if (node.type === "task") return 0;
	if (node.type === "heading") return 1;
	return 2;
}

export function compareTasks(
	taskA: any,
	taskB: any,
	sortType?: string,
	order: number = 1,
): number {
	if (!sortType) return 0;
	if (sortType === "status") {
		const so: Record<string, number> = {
			todo: 0,
			planned: 1,
			"in-progress": 2,
			completed: 3,
			cancelled: 4,
		};
		const sa = so[taskA._status] ?? 5,
			sb = so[taskB._status] ?? 5;
		if (sa !== sb) return (sa - sb) * order;
	} else if (sortType === "priority") {
		const po: Record<string, number> = {
			"🔺": 0,
			"⏫": 1,
			"🔼": 2,
			"🔽": 3,
			"⏬": 4,
		};
		const pa = taskA._priorityIcon ? (po[taskA._priorityIcon] ?? 5) : 5;
		const pb = taskB._priorityIcon ? (po[taskB._priorityIcon] ?? 5) : 5;
		if (pa !== pb) return (pa - pb) * order;
	} else if (sortType === "scheduled") {
		const da = taskA._scheduled
			? new Date(taskA._scheduled).getTime()
			: null;
		const db = taskB._scheduled
			? new Date(taskB._scheduled).getTime()
			: null;
		if (!da && !db) return 0;
		if (!da) return 1;
		if (!db) return -1;
		if (da !== db) return (da - db) * order;
	}
	return (
		(taskA._cleanText || "").localeCompare(taskB._cleanText || "") * order
	);
}

export function sortContentNodes(
	nodes: ContentNode[],
	sort?: { type: string; order: "asc" | "desc" },
): ContentNode[] {
	if (!nodes || nodes.length === 0) return nodes;
	const sorted = [...nodes];
	const order = sort?.order === "asc" ? 1 : -1;
	sorted.sort((a, b) => {
		const ga = getNodeGroupOrder(a),
			gb = getNodeGroupOrder(b);
		if (ga !== gb) return ga - gb;
		const ta = (a as any)._task,
			tb = (b as any)._task;
		if (!ta && !tb) return 0;
		if (!ta) return 1;
		if (!tb) return -1;
		return compareTasks(ta, tb, sort?.type, order);
	});
	for (const node of sorted) {
		if (node.children.length > 0) {
			node.children = sortContentNodes(node.children, sort);
		}
	}
	return sorted;
}

export function sortFileNodes(
	nodes: TreeNode[],
	sort?: { type: string; order: "asc" | "desc" },
): TreeNode[] {
	if (!nodes || nodes.length === 0) return nodes;
	const sorted = [...nodes];
	const order = sort?.order === "asc" ? 1 : -1;
	sorted.sort((a, b) => {
		const ta = a._task,
			tb = b._task;
		if (!ta && !tb) return 0;
		if (!ta) return 1;
		if (!tb) return -1;
		return compareTasks(ta, tb, sort?.type, order);
	});
	for (const node of sorted) {
		if (node.contentRoots?.length > 0) {
			node.contentRoots = sortContentNodes(node.contentRoots, sort);
		}
		if (node.children.length > 0) {
			node.children = sortFileNodes(node.children, sort);
		}
	}
	return sorted;
}
