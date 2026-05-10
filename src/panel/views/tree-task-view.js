/* <!-- SYNC_COMMENTS_START --> */
/**
 * 文件：src/panel/views/tree-task-view.js
 * 描述：树状视图，以文件路径为树形结构展示任务，支持展开/折叠、层级缩进、点击任务跳转
 * 所属模块：panel/views
 * 依赖：
 *   - task-query-process.fetchTasks: 统一任务查询接口
 * 对外导出：startTreeView
 * 注意事项：从任务文件路径解析树结构，使用 Set 跟踪展开状态，深度优先渲染
 * @see .cline/skills/code/views/tree-task-view.md
 */

/* @skill-sig function startTreeView(app, container, leftSort, state) : ViewController - 启动树状视图 */

/* @skill-state
  tasks    : Array<Object>     // 加载后的任务列表
  treeData : Object            // 树状结构数据 {path: {name, tasks[], children{}}}
  expanded : Set<string>      // 已展开的路径集合
  sortType : string           // 排序类型: "status"|"priority"|"due"|"created"
  sortAsc  : boolean          // 排序方向
*/

/* @skill-constant MAX_DEPTH : number - 树最大深度，防止无限递归 */

/* @skill-helpers
  getDirParts(path) : string[]    // 拆分路径为目录片段
  getFileName(path) : string      // 提取文件名（无扩展名）
*/

/* @skill-dom
  .tree-root
    .tree-header
      button.collapse-all / button.expand-all (全局折叠/展开)
      select.sort-select (排序选择器)
    .tree-container
      .tree-node (递归渲染)
        .node-header (可点击的文件夹/文件行)
          span.toggle-icon (▶/▼ 切换图标)
          span.node-name (名称)
          span.task-count (任务数)
        .node-children (展开后的子节点列表)
          .tree-node (递归)
        .node-tasks (任务列表)
          .task-item
            span.status-icon
            span.task-description
*/

/* @skill-flow
  初始化 → loadData() → fetchTasks() → buildTree() → render() → expandAll()
  折叠全部 → collapseAll() → expanded 清空 → render()
  展开全部 → expandAll() → expanded 填入所有路径 → render()
  节点点击 → toggleNode(path) → expanded toggle → render()
  排序切换 → sort-select change → sortType/sortAsc 变更 → render()
  任务点击 → 打开文件跳转到对应行
*/

/* @skill-condition
  若 fetchTasks 返回空 → 显示 "暂无任务"
  根节点始终展开，不计入 expanded 跟踪
  最大深度 MAX_DEPTH = 10，超出深度的节点不再展开
  空节点（无任务也无子节点）自动隐藏
*/

/* @skill-api
  fetchTasks(app)                 // 获取所有任务
  app.vault.getAbstractFileByPath // 获取文件对象
  app.workspace.getLeaf           // 获取编辑器叶子节点
*/
/* <!-- SYNC_COMMENTS_END --> */

import { fetchTasks } from "../../tasks/process/task-query-process";

/**
 * 启动树状视图
 * @param {Object} app - Obsidian App 实例
 * @param {HTMLElement} container - 视图容器 DOM 元素
 * @param {Object} leftSort - 左侧栏排序配置（含 type 和 order）
 * @param {Object} state - 全局状态（可选）
 * @returns {Promise<{cleanup, updateSort}>} 视图控制接口
 */
export async function startTreeView(app, container, leftSort, state = {}) {
	let tasks = [];
	let treeData = {};
	let expanded = new Set();
	let sortType = leftSort?.type || "status";
	let sortAsc = leftSort?.order !== "desc";

	const MAX_DEPTH = 10;

	/**
	 * 将任务列表按文件路径构建为树结构
	 * 树节点结构：{ name, tasks[], children{} }
	 */
	function buildTree() {
		const root = { name: "root", tasks: [], children: {} };
		tasks.forEach((task) => {
			if (!task.path) return;
			const parts = task.path.split("/");
			let current = root;
			parts.forEach((part, idx) => {
				if (!current.children[part]) {
					current.children[part] = {
						name: part,
						tasks: [],
						children: {},
					};
				}
				current = current.children[part];
				// 将任务附加到每个层级节点
				if (idx === parts.length - 1) {
					current.tasks.push(task);
				}
			});
		});
		return root;
	}

	/**
	 * 应用排序：按状态/优先级/日期等排序任务数组
	 * @param {Array<Object>} taskList - 待排序任务列表
	 * @returns {Array<Object>} 排序后的任务列表
	 */
	function sortTasks(taskList) {
		const copy = [...taskList];
		const statusOrder = {
			" ": 1,
			"?": 2,
			"/": 3,
			"-": 4,
			x: 5,
			X: 5,
			"!": 6,
		};
		copy.sort((a, b) => {
			let cmp = 0;
			switch (sortType) {
				case "status": {
					const sa = statusOrder[a.status?.symbol] ?? 99;
					const sb = statusOrder[b.status?.symbol] ?? 99;
					cmp = sa - sb;
					break;
				}
				case "priority": {
					const pa =
						a.priority === "none" ? 999 : parseInt(a.priority) || 5;
					const pb =
						b.priority === "none" ? 999 : parseInt(b.priority) || 5;
					cmp = pa - pb;
					break;
				}
				case "due": {
					const da = a.dueDate ? +new Date(a.dueDate) : 0;
					const db = b.dueDate ? +new Date(b.dueDate) : 0;
					cmp = da - db;
					break;
				}
				case "created": {
					const ca = a.createdDate ? +new Date(a.createdDate) : 0;
					const cb = b.createdDate ? +new Date(b.createdDate) : 0;
					cmp = ca - cb;
					break;
				}
				default:
					cmp = (a.description || "").localeCompare(
						b.description || "",
					);
			}
			return sortAsc ? cmp : -cmp;
		});
		return copy;
	}

	/* @skill-dom
	  .tree-root
	    .tree-header
	      button.collapse-all / button.expand-all (全局折叠/展开)
	      select.sort-select (排序选择器)
	    .tree-container
	      .tree-node (递归渲染)
	        .node-header (可点击的文件夹/文件行)
	          span.toggle-icon (▶/▼ 切换图标)
	          span.node-name (名称)
	          span.task-count (任务数)
	        .node-children (展开后的子节点列表)
	          .tree-node (递归)
	        .node-tasks (任务列表)
	          .task-item
	            span.status-icon
	            span.task-description
	*/

	/* @skill-flow
	  初始化 → loadData() → fetchTasks() → buildTree() → render() → expandAll()
	  折叠全部 → collapseAll() → expanded 清空 → render()
	  展开全部 → expandAll() → expanded 填入所有路径 → render()
	  节点点击 → toggleNode(path) → expanded toggle → render()
	  排序切换 → sort-select change → sortType/sortAsc 变更 → render()
	  任务点击 → 打开文件跳转到对应行
	*/

	/* @skill-condition
	  若 fetchTasks 返回空 → 显示 "暂无任务"
	  根节点始终展开，不计入 expanded 跟踪
	  最大深度 MAX_DEPTH = 10，超出深度的节点不再展开
	  空节点（无任务也无子节点）自动隐藏
	*/

	/* @skill-api
	  fetchTasks(app)                 // 获取所有任务
	  app.vault.getAbstractFileByPath // 获取文件对象
	  app.workspace.getLeaf           // 获取编辑器叶子节点
	*/

	/**
	 * 渲染树节点（递归）
	 * @param {Object} node - 树节点 { name, tasks[], children{} }
	 * @param {number} depth - 当前深度
	 * @param {string} path - 当前节点路径
	 * @returns {HTMLElement|null} 节点DOM元素，空节点返回 null
	 */
	function renderNode(node, depth = 0, path = "") {
		const hasChildren = Object.keys(node.children).length > 0;
		const hasTasks = node.tasks.length > 0;
		const isEmpty = !hasChildren && !hasTasks;
		if (isEmpty) return null;

		const div = document.createElement("div");
		div.className = "tree-node";
		div.style.paddingLeft = `${depth * 16}px`;

		const header = document.createElement("div");
		header.className = "node-header";

		// 展开/折叠图标
		const toggleIcon = document.createElement("span");
		toggleIcon.className = "toggle-icon";
		if (hasChildren) {
			toggleIcon.textContent = expanded.has(path) ? "▼" : "▶";
			toggleIcon.style.cursor = "pointer";
			toggleIcon.style.marginRight = "4px";
		} else {
			toggleIcon.textContent = "📄";
			toggleIcon.style.marginRight = "4px";
		}
		header.appendChild(toggleIcon);

		// 节点名称
		const nameSpan = document.createElement("span");
		nameSpan.className = "node-name";
		nameSpan.textContent = node.name;
		header.appendChild(nameSpan);

		// 任务计数
		if (hasTasks) {
			const countSpan = document.createElement("span");
			countSpan.className = "task-count";
			countSpan.textContent = ` (${node.tasks.length})`;
			header.appendChild(countSpan);
		}

		// 点击展开/折叠
		if (hasChildren) {
			header.addEventListener("click", () => {
				if (expanded.has(path)) {
					expanded.delete(path);
				} else {
					expanded.add(path);
				}
				render();
			});
			header.style.cursor = "pointer";
		}

		div.appendChild(header);

		// 子节点（展开时渲染）
		if (hasChildren && expanded.has(path)) {
			if (depth < MAX_DEPTH) {
				const childrenDiv = document.createElement("div");
				childrenDiv.className = "node-children";

				const sortedKeys = Object.keys(node.children).sort((a, b) => {
					// 文件夹（有子节点的）排前面
					const aHasChildren =
						Object.keys(node.children[a].children).length > 0;
					const bHasChildren =
						Object.keys(node.children[b].children).length > 0;
					if (aHasChildren && !bHasChildren) return -1;
					if (!aHasChildren && bHasChildren) return 1;
					return a.localeCompare(b, "zh-CN");
				});

				sortedKeys.forEach((key) => {
					const childPath = path ? `${path}/${key}` : key;
					const childEl = renderNode(
						node.children[key],
						depth + 1,
						childPath,
					);
					if (childEl) {
						childrenDiv.appendChild(childEl);
					}
				});
				div.appendChild(childrenDiv);
			} else {
				const limitMsg = document.createElement("div");
				limitMsg.className = "depth-limit-hint";
				limitMsg.textContent = `...超出最大深度 ${MAX_DEPTH}`;
				div.appendChild(limitMsg);
			}
		}

		// 渲染当前节点的任务列表
		if (hasTasks && expanded.has(path)) {
			const tasksDiv = document.createElement("div");
			tasksDiv.className = "node-tasks";
			const sorted = sortTasks(node.tasks);
			sorted.forEach((task) => {
				const item = document.createElement("div");
				item.className = "task-item";
				item.style.paddingLeft = `${depth * 16 + 24}px`;

				const icon = document.createElement("span");
				icon.className = "status-icon";
				const statusKey = task.status?.symbol || " ";
				const iconMap = {
					" ": "🔲",
					"?": "❓",
					"/": "🔄",
					"-": "⏸",
					x: "✅",
					X: "✅",
					"!": "⛔",
				};
				icon.textContent = iconMap[statusKey] || "🔲";
				item.appendChild(icon);

				const desc = document.createElement("span");
				desc.className = "task-description";
				desc.textContent = task.description || "（无描述）";
				item.appendChild(desc);

				item.addEventListener("click", () => {
					if (task.path) {
						const file = app.vault.getAbstractFileByPath(task.path);
						if (file) {
							const leaf = app.workspace.getLeaf(false);
							leaf.openFile(file).then(() => {
								if (task.lineNumber !== undefined) {
									setTimeout(() => {
										leaf.view?.editor?.setCursor({
											line: task.lineNumber,
											ch: 0,
										});
									}, 50);
								}
							});
						}
					}
				});
				item.style.cursor = "pointer";
				tasksDiv.appendChild(item);
			});
			div.appendChild(tasksDiv);
		}

		return div;
	}

	/**
	 * 主渲染函数
	 */
	function render() {
		container.innerHTML = "";

		// 工具栏
		const toolbar = document.createElement("div");
		toolbar.className = "tree-header";

		const collapseBtn = document.createElement("button");
		collapseBtn.textContent = "折叠全部";
		collapseBtn.addEventListener("click", () => {
			expanded.clear();
			render();
		});
		toolbar.appendChild(collapseBtn);

		const expandBtn = document.createElement("button");
		expandBtn.textContent = "展开全部";
		expandBtn.addEventListener("click", () => {
			// 将所有路径加入 expanded
			function collectPaths(node, path) {
				Object.keys(node.children).forEach((key) => {
					const childPath = path ? `${path}/${key}` : key;
					expanded.add(childPath);
					collectPaths(node.children[key], childPath);
				});
			}
			collectPaths(treeData, "");
			render();
		});
		toolbar.appendChild(expandBtn);

		const sortSelect = document.createElement("select");
		sortSelect.className = "sort-select";
		const sortOptions = [
			{ value: "status", label: "按状态排序" },
			{ value: "priority", label: "按优先级排序" },
			{ value: "due", label: "按截止日期排序" },
			{ value: "created", label: "按创建日期排序" },
		];
		sortOptions.forEach((opt) => {
			const option = document.createElement("option");
			option.value = opt.value;
			option.textContent = opt.label;
			if (opt.value === sortType) option.selected = true;
			sortSelect.appendChild(option);
		});
		sortSelect.addEventListener("change", () => {
			sortType = sortSelect.value;
			render();
		});
		toolbar.appendChild(sortSelect);

		const orderBtn = document.createElement("button");
		orderBtn.textContent = sortAsc ? "↑ 升序" : "↓ 降序";
		orderBtn.addEventListener("click", () => {
			sortAsc = !sortAsc;
			render();
		});
		toolbar.appendChild(orderBtn);

		container.appendChild(toolbar);

		// 检查是否有任务
		if (tasks.length === 0) {
			const empty = document.createElement("div");
			empty.className = "empty-placeholder";
			empty.textContent = "暂无任务";
			container.appendChild(empty);
			return;
		}

		// 树容器
		const treeContainer = document.createElement("div");
		treeContainer.className = "tree-container";

		// 遍历根节点子节点
		Object.keys(treeData.children).forEach((key) => {
			const nodeEl = renderNode(treeData.children[key], 0, key);
			if (nodeEl) {
				treeContainer.appendChild(nodeEl);
			}
		});

		if (treeContainer.children.length === 0) {
			const empty = document.createElement("div");
			empty.className = "empty-placeholder";
			empty.textContent = "暂无任务";
			treeContainer.appendChild(empty);
		}

		container.appendChild(treeContainer);
	}

	/**
	 * 加载任务数据
	 */
	async function loadData() {
		try {
			tasks = await fetchTasks(app);
			treeData = buildTree();

			// 初始化展开状态：顶层节点默认展开
			if (expanded.size === 0) {
				Object.keys(treeData.children).forEach((key) => {
					expanded.add(key);
				});
			}
		} catch (e) {
			tasks = [];
			treeData = { name: "root", tasks: [], children: {} };
		}
	}

	/**
	 * 初始化
	 */
	async function init() {
		await loadData();
		render();
	}

	await init();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: (newSort) => {
			if (newSort) {
				sortType = newSort.type || sortType;
				sortAsc = newSort.order !== "desc";
			}
			render();
		},
	};
}

// ===== 为兼容其他模块添加的导出 =====

/**
 * 渲染树形面板（与 startTreeView 功能相同）
 * 用于 tree-view-components.js 中的导入
 */
export const renderTreePanel = startTreeView;

/**
 * 树视图类（占位，因为当前实现使用函数式 startTreeView）
 * 若需要类形式，可以后续包装，目前先导出空对象让编译通过
 */
export const TreeTaskView = {};

/**
 * 树视图类型标识
 */
export const VIEW_TYPE_TREE = "tree-task-view";
