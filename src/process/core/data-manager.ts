// src/process/core/data-manager.ts
// 数据管理器 — 统一数据加载、缓存、筛选、排序、收集

import { GlobalFilter, TaskItem } from "../../types";
import { loadAllTaskFiles, ParsedFileData } from "../task/md-parser";
import {
	buildTreeFromParsedFiles,
	filterTree,
	flattenTree,
	TreeFilterOptions,
	TreeNode,
} from "../task/task-tree";

export type SortConfig = { type: string; order: "asc" | "desc" };

interface DataCache {
	files: ParsedFileData[] | null;
	allTasks: TaskItem[] | null;
	taskIdMap: Map<string, TaskItem>;
	fullTree: TreeNode[] | null;
	filteredTree: { fingerprint: string; roots: TreeNode[] } | null;
	flatTasks: { fingerprint: string; tasks: TaskItem[] } | null;
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
		allTasks: null,
		taskIdMap: new Map(),
		fullTree: null,
		filteredTree: null,
		flatTasks: null,
	};

	private constructor() {}

	static getInstance(): DataManager {
		if (!DataManager.instance) DataManager.instance = new DataManager();
		return DataManager.instance;
	}

	async loadData(app: any): Promise<{
		files: ParsedFileData[];
		tasks: TaskItem[];
		taskIdMap: Map<string, TaskItem>;
	}> {
		if (this.cache.files && this.cache.allTasks) {
			return {
				files: this.cache.files,
				tasks: this.cache.allTasks,
				taskIdMap: this.cache.taskIdMap,
			};
		}

		try {
			const files = await loadAllTaskFiles(app);
			const allTasks: TaskItem[] = [];
			const taskIdMap = new Map<string, TaskItem>();

			for (const file of files) {
				if (file.fileTask) {
					allTasks.push(file.fileTask);
					if (file.fileTask._id)
						taskIdMap.set(file.fileTask._id, file.fileTask);
				}
				for (const ht of file.headingTasks) {
					if (ht.task) {
						allTasks.push(ht.task);
						if (ht.task._id) taskIdMap.set(ht.task._id, ht.task);
					}
				}
				for (const task of file.tasks) {
					if (task) {
						allTasks.push(task);
						if (task._id) taskIdMap.set(task._id, task);
					}
				}
			}

			const validTasks = allTasks.filter((t) => t != null);

			this.cache.files = files;
			this.cache.allTasks = validTasks;
			this.cache.taskIdMap = taskIdMap;
			this.cache.fullTree = buildTreeFromParsedFiles(files, validTasks);
			this.cache.filteredTree = null;
			this.cache.flatTasks = null;

			for (const file of files) {
				file.content = "";
			}

			return { files, tasks: validTasks, taskIdMap };
		} catch (e) {
			console.warn("[TaskManage] 加载任务数据失败:", e);
			return { files: [], tasks: [], taskIdMap: new Map() };
		}
	}

	getFullTree(): TreeNode[] {
		return this.cache.fullTree || [];
	}

	getFilteredTree(filter: GlobalFilter): TreeNode[] {
		const fp = filterFingerprint(filter);
		if (
			this.cache.filteredTree &&
			this.cache.filteredTree.fingerprint === fp
		) {
			return this.cache.filteredTree.roots;
		}
		const fullTree = this.cache.fullTree || [];
		const options: TreeFilterOptions = {
			statuses: filter.statuses,
			hideRepeat: filter.hideRepeat,
			hideCompleted: filter.hideCompleted,
			hideCancelled: filter.hideCancelled,
			searchText: filter.searchText,
			priorityValues: filter.priorityValues,
			repeatCycles: filter.repeatCycles,
		};
		const roots = filterTree(fullTree, options);
		this.cache.filteredTree = { fingerprint: fp, roots };
		this.cache.flatTasks = null;
		return roots;
	}

	getFlatTasks(filter: GlobalFilter): TaskItem[] {
		const tree = this.getFilteredTree(filter);
		return flattenTree(tree);
	}

	getTaskTimeRange(): { minTime: number | null; maxTime: number | null } {
		const tasks = this.cache.allTasks;
		if (!tasks) return { minTime: null, maxTime: null };
		let minTime: number | null = null;
		let maxTime: number | null = null;
		for (const task of tasks) {
			if (!task) continue;
			const dates = [
				task._created,
				task._scheduled,
				task._starts,
				task._due,
				task._done,
				task._cancel,
			];
			for (const dateStr of dates) {
				if (!dateStr) continue;
				const ts = new Date(dateStr).getTime();
				if (isNaN(ts)) continue;
				if (minTime === null || ts < minTime) minTime = ts;
				if (maxTime === null || ts > maxTime) maxTime = ts;
			}
		}
		return { minTime, maxTime };
	}

	getTaskIdMap(): Map<string, TaskItem> {
		return this.cache.taskIdMap;
	}

	invalidate() {
		this.cache = {
			files: null,
			allTasks: null,
			taskIdMap: new Map(),
			fullTree: null,
			filteredTree: null,
			flatTasks: null,
		};
	}

	invalidateFilterCache() {
		this.cache.filteredTree = null;
		this.cache.flatTasks = null;
	}
}
