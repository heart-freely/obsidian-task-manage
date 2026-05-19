// src/panel/components/tree-view-components.js
// 任务树组件（数据处理与对外接口，已适配新路径）

import * as readTasks from '../../tasks/read/read-tasks';
import { CONFIG } from '../../configs/plugin-configs';
import { renderTreePanel } from '../views/tree-task-view';   // 相对路径正确

export class TaskTreeRenderer {
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
            onRefresh: () => this.renderFromCurrentFilter()
        });
    }

    renderFromCurrentFilter() {
        if (this._getFilteredTasks) {
            this.render(this._getFilteredTasks());
        }
    }

    setFilteredTasksProvider(fn) {
        this._getFilteredTasks = fn;
    }

    // ========== 数据处理方法 ==========
    _buildTree(tasks) {
        const rootPrefix = CONFIG.ROOT_PATH;
        const fileMap = {};
        tasks.forEach(t => {
            const p = t.path;
            if (!fileMap[p]) fileMap[p] = [];
            fileMap[p].push(t);
        });

        const rootNodes = [], folderMap = {};
        for (const filePath in fileMap) {
            if (!Object.hasOwn(fileMap, filePath)) continue;
            const fileTasks = fileMap[filePath];
            const fileName = filePath.split('/').pop().replace(/\.md$/, '');
            const relPath = filePath.startsWith(rootPrefix) ? filePath.slice(rootPrefix.length) : filePath;
            const parts = relPath.split('/');
            let curPath = '', parent = null;

            for (let i = 0; i < parts.length; i++) {
                curPath += (i ? '/' : '') + parts[i];
                const fullPath = rootPrefix + curPath;
                if (i === parts.length - 1) {
                    const node = {
                        type: 'file',
                        path: filePath,
                        name: fileName,
                        tasks: fileTasks,
                        fullPath: fullPath,
                        parent: parent,
                        children: [],
                        completedCount: fileTasks.filter(t => t._status === 'completed').length,
                        totalCount: fileTasks.length
                    };
                    if (parent) parent.children.push(node);
                    else rootNodes.push(node);
                    folderMap[fullPath] = node;
                } else {
                    let folder = folderMap[fullPath];
                    if (!folder) {
                        folder = {
                            type: 'folder',
                            path: fullPath,
                            name: parts[i],
                            children: [],
                            parent: parent,
                            fullPath: fullPath
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

    _calcNodeStats(node) {
        const stats = { todo: 0, planned: 0, 'in-progress': 0, completed: 0, cancelled: 0, total: 0 };
        if (node.type === 'task') { stats[node.task._status]++; stats.total++; return stats; }
        if (node.tasks) node.tasks.forEach(t => { stats[t._status]++; stats.total++; });
        if (node.children) node.children.forEach(ch => {
            const cs = this._calcNodeStats(ch);
            for (const k in cs) { if (Object.hasOwn(cs, k)) stats[k] += cs[k]; }
        });
        return stats;
    }

    _sortTreeNodes(nodes) {
        nodes.sort((a, b) => {
            return a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name);
        });
        nodes.forEach(node => {
            if (node.type === 'file') {
                node.tasks.sort((a, b) => {
                    const sort = this.state.leftSort;
                    const order = sort.order === 'asc' ? 1 : -1;
                    const type = sort.type;

                    if (type === 'status') {
                        const map = { todo: 0, planned: 1, 'in-progress': 2, cancelled: 3, completed: 4 };
                        return ((map[a._status] ?? 5) - (map[b._status] ?? 5)) * order;
                    }
                    if (type === 'priority') {
                        const prio = { '🔺': 0, '⏫': 1, '🔼': 2, '🔽': 3, '⏬': 4 };
                        return ((prio[a._priorityIcon] ?? 5) - (prio[b._priorityIcon] ?? 5)) * order;
                    }
                    if (type === 'scheduled' || type === 'start' || type === 'due') {
                        const field = '_' + type;
                        const da = a[field] ? new Date(a[field]).getTime() : null;
                        const db = b[field] ? new Date(b[field]).getTime() : null;
                        if (!da && !db) return 0;
                        if (!da) return 1;
                        if (!db) return -1;
                        return (da - db) * order;
                    }
                    if (type === 'filename') {
                        const nameA = (a.path || '').split('/').pop().replace(/\.md$/, '').toLowerCase();
                        const nameB = (b.path || '').split('/').pop().replace(/\.md$/, '').toLowerCase();
                        return nameA.localeCompare(nameB) * order;
                    }

                    // 默认综合时间
                    const getTime = task => {
                        const fields = ['_created', '_starts', '_scheduled', '_due', '_cancel', '_done'];
                        for (let i = 0; i < fields.length; i++) {
                            if (task[fields[i]]) return new Date(task[fields[i]]).getTime();
                        }
                        return null;
                    };
                    const da = getTime(a), db = getTime(b);
                    if (!da && !db) return 0;
                    if (!da) return 1;
                    if (!db) return -1;
                    return (da - db) * order;
                });
            }
            if (node.children) this._sortTreeNodes(node.children);
        });
    }

    _flattenTreeForDisplay(nodes, level, result) {
        nodes.forEach(node => {
            if (this.state.hideFolders && node.type === 'folder') {
                if (node.children && node.children.length) this._flattenTreeForDisplay(node.children, level, result);
            } else {
                node.level = level;
                result.push(node);
                const expanded = !this.collapsedNodes[node.fullPath];
                if (expanded) {
                    if (node.children && node.children.length) {
                        this._flattenTreeForDisplay(node.children, level + 1, result);
                    } else if (node.type === 'file' && node.tasks) {
                        node.tasks.forEach(t => result.push({
                            type: 'task',
                            task: t,
                            parentFile: node,
                            level: level + 1
                        }));
                    }
                }
            }
        });
    }
}