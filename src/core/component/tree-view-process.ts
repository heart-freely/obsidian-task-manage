// src/core/component/tree-view-process.ts

import { countTaskStatuses } from "../../ui/component/progress/progress";
import { ContentNode } from "../parser/md-parser";
import { TaskTreeNode } from "../task/task-tree";

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

export function collectAllTasksFromNode(node: TaskTreeNode): TaskTreeNode[] {
	const seen = new Set<string>();
	const all: TaskTreeNode[] = [];
	function walk(n: TaskTreeNode) {
		if (!seen.has(n.uid)) {
			seen.add(n.uid);
			all.push(n);
		}
		for (const child of n.children) walk(child);
	}
	walk(node);
	return all;
}

export function countNodeStatuses(node: TaskTreeNode): {
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
	const tasks: any[] = [];
	function walk(cn: ContentNode) {
		if (cn.task) tasks.push({ status: cn.task.status });
		for (const child of cn.children) walk(child);
	}
	walk(node);
	return countTaskStatuses(tasks);
}

/**
 * 获取节点排序权重
 * 排序顺序：列表任务(0) → 标题任务(1) → 文件任务(2)
 */
export function getNodeGroupOrder(node: TaskTreeNode): number {
	if (node.type === "list") return 0;
	if (node.type === "heading") return 1;
	return 2;
}

export function compareTasks(
	nodeA: TaskTreeNode,
	nodeB: TaskTreeNode,
	sortType?: string,
	order: number = 1,
): number {
	if (!sortType) return 0;

	if (sortType === "status") {
		const so: Record<string, number> = {
			todo: 0,
			scheduled: 1,
			"in-progress": 2,
			completed: 3,
			cancelled: 4,
		};
		const sa = so[nodeA.status] ?? 5,
			sb = so[nodeB.status] ?? 5;
		if (sa !== sb) return (sa - sb) * order;
	} else if (sortType === "priority") {
		if (nodeA.priority !== nodeB.priority)
			return (nodeA.priority - nodeB.priority) * order;
	} else if (sortType === "scheduled") {
		const da = nodeA.scheduled,
			db = nodeB.scheduled;
		if (da === null && db === null) return 0;
		if (da === null) return 1;
		if (db === null) return -1;
		if (da !== db) return (da - db) * order;
	}

	return (
		(nodeA.content || nodeA.text).localeCompare(
			nodeB.content || nodeB.text,
		) * order
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
		// 按类型分组排序：task 在前，heading 在后
		const ga = a.type === "task" ? 0 : 1;
		const gb = b.type === "task" ? 0 : 1;
		if (ga !== gb) return ga - gb;

		if (!a.task || !b.task) return 0;

		// 组内按 sort.type 排序
		if (sort?.type === "status") {
			const so: Record<string, number> = {
				todo: 0,
				scheduled: 1,
				"in-progress": 2,
				completed: 3,
				cancelled: 4,
			};
			const sa = so[a.task.status] ?? 5;
			const sb = so[b.task.status] ?? 5;
			if (sa !== sb) return (sa - sb) * order;
		} else if (sort?.type === "priority") {
			if (a.task.priority !== b.task.priority)
				return (a.task.priority - b.task.priority) * order;
		}

		return (
			(a.task.content || a.text).localeCompare(b.task.content || b.text) *
			order
		);
	});

	for (const node of sorted) {
		if (node.children.length > 0)
			node.children = sortContentNodes(node.children, sort);
	}
	return sorted;
}

export function sortFileNodes(
	nodes: TaskTreeNode[],
	sort?: { type: string; order: "asc" | "desc" },
): TaskTreeNode[] {
	if (!nodes || nodes.length === 0) return nodes;
	const sorted = [...nodes];
	const order = sort?.order === "asc" ? 1 : -1;

	sorted.sort((a, b) => {
		// 按类型分组排序：list(0) → heading(1) → file(2)
		const ga = getNodeGroupOrder(a);
		const gb = getNodeGroupOrder(b);
		if (ga !== gb) return ga - gb;

		return compareTasks(a, b, sort?.type, order);
	});

	for (const node of sorted) {
		if (node.children.length > 0)
			node.children = sortFileNodes(node.children, sort);
	}
	return sorted;
}
