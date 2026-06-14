// core/data/data-manager.ts
// 数据管理器 — 统一数据加载、缓存、筛选、排序、收集

import { GlobalFilter } from "../../type/type";
import { loadAllTaskFiles, ParsedFileData } from "../parser/md-parser";
import {
	buildTaskTree,
	filterTree,
	flattenTree,
	TaskTreeNode,
	TreeFilterOptions,
} from "../task/task-tree";

export type SortConfig = { type: string; order: "asc" | "desc" };

interface DataCache {
	files: ParsedFileData[] | null;
	taskIdMap: Map<string, TaskTreeNode>;
	fullTree: TaskTreeNode | null;
	filteredTree: { fingerprint: string; root: TaskTreeNode } | null;
	flatNodes: { fingerprint: string; nodes: TaskTreeNode[] } | null;
}

function filterFingerprint(filter: GlobalFilter): string {
	return JSON.stringify({
		statuses: filter.statuses?.sort(),
		hideRepeat: filter.hideRepeat,
		hideCompleted: filter.hideCompleted,
		hideCancelled: filter.hideCancelled,
		searchText: filter.searchText,
		priorityValues: filter.priorityValues?.sort(),
		repeatCycles: filter.repeatCycles?.sort(),
	});
}

export class DataManager {
	private static instance: DataManager;
	private cache: DataCache = {
		files: null,
		taskIdMap: new Map(),
		fullTree: null,
		filteredTree: null,
		flatNodes: null,
	};

	private constructor() {}

	static getInstance(): DataManager {
		if (!DataManager.instance) DataManager.instance = new DataManager();
		return DataManager.instance;
	}

	async loadData(app: any): Promise<{
		files: ParsedFileData[];
		nodes: TaskTreeNode[];
		taskIdMap: Map<string, TaskTreeNode>;
	}> {
		if (this.cache.files && this.cache.fullTree) {
			return {
				files: this.cache.files,
				nodes: flattenTree(this.cache.fullTree),
				taskIdMap: this.cache.taskIdMap,
			};
		}

		try {
			const files = await loadAllTaskFiles(app);
			const fullTree = buildTaskTree(files);
			const taskIdMap = new Map<string, TaskTreeNode>();

			const allNodes = flattenTree(fullTree);
			for (const node of allNodes) {
				taskIdMap.set(node.uid, node);
				if (node.id) taskIdMap.set(node.id, node);
			}

			this.cache.files = files;
			this.cache.taskIdMap = taskIdMap;
			this.cache.fullTree = fullTree;
			this.cache.filteredTree = null;
			this.cache.flatNodes = null;

			for (const file of files) {
				file.content = "";
			}

			return { files, nodes: allNodes, taskIdMap };
		} catch (e) {
			console.warn("[TaskManage] 加载任务数据失败:", e);
			return { files: [], nodes: [], taskIdMap: new Map() };
		}
	}

	getFullTree(): TaskTreeNode {
		return (
			this.cache.fullTree || {
				uid: "__empty__",
				type: "file",
				path: "",
				line: 0,
				rawLine: "",
				depth: 0,
				parent: null,
				children: [],
				text: "",
				display: true,
				status: "todo",
				content: "",
				priority: 5,
				repeat: "",
				created: null,
				scheduled: null,
				starts: null,
				due: null,
				done: null,
				cancelled: null,
				id: "",
				forbid: "",
				tag: "",
			}
		);
	}

	getFilteredTree(filter: GlobalFilter): TaskTreeNode {
		const fp = filterFingerprint(filter);
		if (
			this.cache.filteredTree &&
			this.cache.filteredTree.fingerprint === fp
		) {
			return this.cache.filteredTree.root;
		}
		const fullTree = this.cache.fullTree;
		if (!fullTree) return this.getFullTree();

		const options: TreeFilterOptions = {
			statuses: filter.statuses,
			hideRepeat: filter.hideRepeat,
			hideCompleted: filter.hideCompleted,
			hideCancelled: filter.hideCancelled,
			searchText: filter.searchText,
			priorityValues: filter.priorityValues,
			repeatCycles: filter.repeatCycles,
		};
		const root = filterTree(fullTree, options);
		this.cache.filteredTree = { fingerprint: fp, root };
		this.cache.flatNodes = null;
		return root;
	}

	getFlatNodes(filter: GlobalFilter): TaskTreeNode[] {
		const fp = filterFingerprint(filter);
		if (this.cache.flatNodes && this.cache.flatNodes.fingerprint === fp) {
			return this.cache.flatNodes.nodes;
		}
		const tree = this.getFilteredTree(filter);
		const nodes = flattenTree(tree);
		const filtered = nodes.filter(
			(n) => n.display && n.uid !== "__task_root__",
		);
		this.cache.flatNodes = { fingerprint: fp, nodes: filtered };
		return filtered;
	}

	getTaskTimeRange(): { minTime: number | null; maxTime: number | null } {
		const allNodes = this.cache.fullTree
			? flattenTree(this.cache.fullTree)
			: [];
		if (!allNodes.length) return { minTime: null, maxTime: null };
		let minTime: number | null = null;
		let maxTime: number | null = null;
		for (const node of allNodes) {
			const dates = [
				node.created,
				node.scheduled,
				node.starts,
				node.due,
				node.done,
				node.cancelled,
			];
			for (const ts of dates) {
				if (ts === null) continue;
				if (minTime === null || ts < minTime) minTime = ts;
				if (maxTime === null || ts > maxTime) maxTime = ts;
			}
		}
		return { minTime, maxTime };
	}

	getTaskIdMap(): Map<string, TaskTreeNode> {
		return this.cache.taskIdMap;
	}

	/**
	 * 根据 uid 查找任务节点
	 */
	getNodeByUid(uid: string): TaskTreeNode | undefined {
		const allNodes = this.cache.fullTree
			? flattenTree(this.cache.fullTree)
			: [];
		return allNodes.find((n) => n.uid === uid);
	}

	invalidate() {
		this.cache = {
			files: null,
			taskIdMap: new Map(),
			fullTree: null,
			filteredTree: null,
			flatNodes: null,
		};
	}

	invalidateFilterCache() {
		this.cache.filteredTree = null;
		this.cache.flatNodes = null;
	}
}
