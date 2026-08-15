// src/core/process/tree-view-process.ts
// 任务树视图数据处理

import { ContentNode } from "../../../core/parser/md-parser";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { countTaskStatuses } from "../../component/progress/progress";

export function removeHeadingNumber(text: string): string {
	return text
		.replace(/^[\d]+\.[\d.]*\s+/, "")
		.replace(/^[A-Z]+\.\s+/, "")
		.replace(/^[IVXLCDM]+\.\s+/, "")
		.replace(/^[\d]+\.[\d.]*[:)-—]\s*/, "")
		.replace(/^[A-Z]+\.[\d.]*[:)-—]\s*/, "")
		.replace(/^[IVXLCDM]+\.[\d.]*[:)-—]\s*/, "")
		.replace(/^\d+\s+/, "")
		.replace(/^_[.\s]*/, "")
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
	const tasks = collectAllTasksFromNode(node).filter(
		(t) => t.display && t.uid !== "__task_root__",
	);
	return countTaskStatuses(tasks);
}

export function countContentNodeStatuses(node: ContentNode): {
	counts: Record<string, number>;
	total: number;
} {
	const tasks: Array<{ status: string }> = [];
	function walk(cn: ContentNode) {
		if (cn.task) tasks.push({ status: cn.task.status });
		for (const child of cn.children) walk(child);
	}
	walk(node);
	return countTaskStatuses(tasks as Array<{ status: string }>);
}

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
			cancelled: 3,
			completed: 4,
		};
		const sa = so[nodeA.status] ?? 5;
		const sb = so[nodeB.status] ?? 5;
		if (sa !== sb) return (sa - sb) * order;
	} else if (sortType === "priority") {
		if (nodeA.priority !== nodeB.priority)
			return (nodeB.priority - nodeA.priority) * order;
	} else if (sortType === "scheduled") {
		const da = nodeA.scheduled;
		const db = nodeB.scheduled;
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
		const ga = a.type === "task" ? 0 : 1;
		const gb = b.type === "task" ? 0 : 1;
		if (ga !== gb) return ga - gb;

		if (!a.task || !b.task) return 0;

		if (sort?.type === "status") {
			const so: Record<string, number> = {
				todo: 0,
				scheduled: 1,
				"in-progress": 2,
				cancelled: 3,
				completed: 4,
			};
			const sa = so[a.task.status] ?? 5;
			const sb = so[b.task.status] ?? 5;
			if (sa !== sb) return (sa - sb) * order;
		} else if (sort?.type === "priority") {
			if (a.task.priority !== b.task.priority)
				return (b.task.priority - a.task.priority) * order;
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
