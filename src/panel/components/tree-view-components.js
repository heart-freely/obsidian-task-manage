// ============================================================================
// 任务树组件 (Task Tree Renderer)
// ============================================================================
// 功能：将扁平的任务列表构建为文件目录树结构，支持折叠/展开、排序、
//       状态统计、过滤根路径等。提供给 tree-task-view 进行渲染。
// 依赖：
//   - read-tasks: 任务读取
//   - plugin-configs: 配置常量 (ROOT_PATH)
//   - tree-task-view: 树面板渲染函数
// 调用方：panel.js - 创建 TaskTreeRenderer 实例并管理渲染
// ============================================================================

import { CONFIG } from "../../configs/plugin-configs";
import { renderTreePanel } from "../views/tree-task-view"; // 相对路径正确

/**
 * 任务树渲染器
 * 将扁平任务列表按文件路径构建目录树，支持折叠、排序、过滤和状态统计。
 * 通过 setFilteredTasksProvider 注数据源，调用 render() 触发完整渲染。
 */
export class TaskTreeRenderer {
	/**
	 * @param {Object} options - 配置选项
	 * @param {HTMLElement} options.container - 树面板的 DOM 容器
	 * @param {Object} options.dv - Dataview 实例
	 * @param {Object} options.app - Obsidian App 实例
	 * @param {Object} options.state - 全局状态对象
	 * @param {Object} options.collapsedNodes - 折叠节点映射表
	 * @param {Object} options.tooltip - TooltipManager 实例
	 * @param {Function} options.onFilterRootPathChange - 根路径过滤变更回调
	 * @param {Function} options.onCollapseChange - 折叠状态变更回调
	 */
	constructor(options) {
		this.container = options.container;
		this.dv = options.dv;
		this.app = options.app;
		this.state = options.state;
		this.collapsedNodes = options.collapsedNodes;
		this.tooltip = options.tooltip;
		this.onFilterRootPathChange = options.onFilterRootPathChange;
		this.onCollapseChange = options.onCollapseChange;
		this._getFilteredTasks = null;
	}

	/**
	 * 渲染树面板
	 * @param {Array} tasks - 要渲染的任务数组
	 */
	render(tasks) {
		if (!this.container) return;
		const rootNodes = this._buildTree(tasks);
		this._sortTreeNodes(rootNodes);
		const flat = [];
		this._flattenTreeForDisplay(rootNodes, 0, flat);
		renderTreePanel(this.container, flat, {
			state: this.state,
			dv: this.dv,
			app: this.app,
			collapsedNodes: this.collapsedNodes,
			tooltip: this.tooltip,
			onFilterRootPathChange: this.onFilterRootPathChange,
			onCollapseChange: this.onCollapseChange,
			onRefresh: () => this.renderFromCurrentFilter(),
		});
	}

	/**
	 * 从当前过滤数据源重新渲染
	 * 调用 setFilteredTasksProvider 注册的过滤函数获取数据并渲染
	 */
	renderFromCurrentFilter() {
		if (this._getFilteredTasks) {
			this.render(this._getFilteredTasks());
		}
	}

	/**
	 * 注册过滤后任务数据提供者
	 * @param {Function} fn - 返回过滤后任务数组的函数
	 */
	setFilteredTasksProvider(fn) {
		this._getFilteredTasks = fn;
	}

	// ========== 数据处理方法 ==========

	/**
	 * 将扁平任务列表构建为文件目录树结构
	 * @param {Array} tasks - 任务数组
	 * @returns {Array} 根节点列表，节点包含 type/file/folder、path、name、tasks、children 等属性
	 */
	_buildTree(tasks) {
		const rootPrefix = CONFIG.ROOT_PATH;
		const fileMap = {};
		tasks.forEach((t) => {
			const p = t.path;
			if (!fileMap[p]) fileMap[p] = [];
			fileMap[p].push(t);
		});

		const rootNodes = [],
			folderMap = {};
		for (const filePath in fileMap) {
			if (!Object.hasOwn(fileMap, filePath)) continue;
			const fileTasks = fileMap[filePath];
			const fileName = filePath.split("/").pop().replace(/\.md$/, "");
			const relPath = filePath.startsWith(rootPrefix)
				? filePath.slice(rootPrefix.length)
				: filePath;
			const parts = relPath.split("/");
			let curPath = "",
				parent = null;

			for (let i = 0; i < parts.length; i++) {
				curPath += (i ? "/" : "") + parts[i];
				const fullPath = rootPrefix + curPath;
				if (i === parts.length - 1) {
					const node = {
						type: "file",
						path: filePath,
						name: fileName,
						tasks: fileTasks,
						fullPath: fullPath,
						parent: parent,
						children: [],
						completedCount: fileTasks.filter(
							(t) => t._status === "completed",
						).length,
						totalCount: fileTasks.length,
					};
					if (parent) parent.children.push(node);
					else rootNodes.push(node);
					folderMap[fullPath] = node;
				} else {
					let folder = folderMap[fullPath];
					if (!folder) {
						folder = {
							type: "folder",
							path: fullPath,
							name: parts[i],
							children: [],
							parent: parent,
							fullPath: fullPath,
						};
						if (parent) parent.children.push(folder);
						else rootNodes.push(folder);
						folderMap[fullPath] = folder;
					}
					parent = folder;
				}
			}
		}
		return rootNodes;
	}

	/**
	 * 递归计算节点及其子节点的任务状态统计
	 * @param {Object} node - 树节点
	 * @returns {Object} 包含 todo/planned/in-progress/completed/cancelled/total 计数
	 */
	_calcNodeStats(node) {
		const stats = {
			todo: 0,
			planned: 0,
			"in-progress": 0,
			completed: 0,
			cancelled: 0,
			total: 0,
		};
		if (node.type === "task") {
			stats[node.task._status]++;
			stats.total++;
			return stats;
		}
		if (node.tasks)
			node.tasks.forEach((t) => {
				stats[t._status]++;
				stats.total++;
			});
		if (node.children)
			node.children.forEach((ch) => {
				const cs = this._calcNodeStats(ch);
				for (const k in cs) {
					if (Object.hasOwn(cs, k)) stats[k] += cs[k];
				}
			});
		return stats;
	}

	/**
	 * 递归排序树节点（先文件夹后文件，同类型按名称排序）
	 * 文件内的任务按 state.leftSort 设定的字段和顺序排序
	 * @param {Array} nodes - 要排序的节点数组
	 */
	_sortTreeNodes(nodes) {
		nodes.sort((a, b) => {
			return a.type !== b.type
				? a.type === "folder"
					? -1
					: 1
				: a.name.localeCompare(b.name);
		});
		nodes.forEach((node) => {
			if (node.type === "file") {
				node.tasks.sort((a, b) => {
					const sort = this.state.leftSort;
					const order = sort.order === "asc" ? 1 : -1;
					const type = sort.type;

					if (type === "status") {
						const map = {
							todo: 0,
							planned: 1,
							"in-progress": 2,
							cancelled: 3,
							completed: 4,
						};
						return (
							((map[a._status] ?? 5) - (map[b._status] ?? 5)) *
							order
						);
					}
					if (type === "priority") {
						const prio = {
							"🔺": 0,
							"⏫": 1,
							"🔼": 2,
							"🔽": 3,
							"⏬": 4,
						};
						return (
							((prio[a._priorityIcon] ?? 5) -
								(prio[b._priorityIcon] ?? 5)) *
							order
						);
					}
					if (
						type === "scheduled" ||
						type === "start" ||
						type === "due"
					) {
						const field = "_" + type;
						const da = a[field]
							? new Date(a[field]).getTime()
							: null;
						const db = b[field]
							? new Date(b[field]).getTime()
							: null;
						if (!da && !db) return 0;
						if (!da) return 1;
						if (!db) return -1;
						return (da - db) * order;
					}
					if (type === "filename") {
						const nameA = (a.path || "")
							.split("/")
							.pop()
							.replace(/\.md$/, "")
							.toLowerCase();
						const nameB = (b.path || "")
							.split("/")
							.pop()
							.replace(/\.md$/, "")
							.toLowerCase();
						return nameA.localeCompare(nameB) * order;
					}

					// 默认综合时间
					const getTime = (task) => {
						const fields = [
							"_created",
							"_starts",
							"_scheduled",
							"_due",
							"_cancel",
							"_done",
						];
						for (let i = 0; i < fields.length; i++) {
							if (task[fields[i]])
								return new Date(task[fields[i]]).getTime();
						}
						return null;
					};
					const da = getTime(a),
						db = getTime(b);
					if (!da && !db) return 0;
					if (!da) return 1;
					if (!db) return -1;
					return (da - db) * order;
				});
			}
			if (node.children) this._sortTreeNodes(node.children);
		});
	}

	/**
	 * 将树结构拍平为扁平数组用于渲染，考虑折叠状态和 hideFolders 过滤
	 * @param {Array} nodes - 树节点数组
	 * @param {number} level - 当前层级
	 * @param {Array} result - 结果数组（引用）
	 */
	_flattenTreeForDisplay(nodes, level, result) {
		nodes.forEach((node) => {
			if (this.state.hideFolders && node.type === "folder") {
				if (node.children && node.children.length)
					this._flattenTreeForDisplay(node.children, level, result);
			} else {
				node.level = level;
				result.push(node);
				const expanded = !this.collapsedNodes[node.fullPath];
				if (expanded) {
					if (node.children && node.children.length) {
						this._flattenTreeForDisplay(
							node.children,
							level + 1,
							result,
						);
					} else if (node.type === "file" && node.tasks) {
						node.tasks.forEach((t) =>
							result.push({
								type: "task",
								task: t,
								parentFile: node,
								level: level + 1,
							}),
						);
					}
				}
			}
		});
	}
}
