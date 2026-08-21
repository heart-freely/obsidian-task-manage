// src/core/process/tree-view-process.ts
// 任务树视图数据处理

import { getProgressConfig } from "../../../core/config/progress-config";
import { DataManager } from "../../../core/data/data-manager";
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

/**
 * 统计节点进度。countSubLevel 为 false 时只统计直接子任务，
 * 为 true 时（默认）递归统计全部子任务。
 */
export function countNodeStatuses(
	node: TaskTreeNode,
	countSubLevel?: boolean,
): {
	counts: Record<string, number>;
	total: number;
} {
	const useRecursive = countSubLevel ?? getProgressConfig().countSubLevel;
	const tasks = useRecursive
		? collectAllTasksFromNode(node).filter(
				(t) => t.display && t.uid !== "__task_root__",
			)
		: (node.children || []).filter(
				(t) => t.display && t.uid !== "__task_root__",
			);
	return countTaskStatuses(tasks);
}

/**
 * 根据全局配置判断是否应隐藏某个节点的进度条
 * （基于标签 / 文件夹 / 元数据条件）
 */
export function shouldHideProgressBar(node: TaskTreeNode): boolean {
	const cfg = getProgressConfig();
	if (!cfg.hideBasedOnConditions) return false;

	// 按标签隐藏
	if (cfg.hideTags.length > 0) {
		const nodeTags: string[] = [];
		if (node.tag) nodeTags.push(node.tag.trim());
		if (
			cfg.hideTags.some((tag) =>
				nodeTags.some((nt) => nt === tag || nt.startsWith(tag + "/")),
			)
		)
			return true;
	}

	// 按文件夹隐藏（匹配路径前缀，支持多级）
	if (cfg.hideFolders.length > 0) {
		const path = node.path || "";
		if (
			cfg.hideFolders.some(
				(folder) => path === folder || path.startsWith(folder + "/"),
			)
		)
			return true;
	}

	// 按元数据隐藏（匹配文件 frontmatter 的 key: value，如 "hide-progress-bar: true"）
	if (cfg.hideMetadata.length > 0) {
		const yaml = DataManager.getInstance().getFileYaml(node.path || "");
		const yamlText = Object.entries(yaml)
			.map(([k, v]) => k + ": " + String(v))
			.join("\n");
		if (
			cfg.hideMetadata.some((md) => md && yamlText.includes(md.trim()))
		)
			return true;
	}

	return false;
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
