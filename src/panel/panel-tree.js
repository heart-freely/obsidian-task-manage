// src/panel/ui-tree.js
// 任务树组件 —— 负责左侧面板的树形展示、折叠、聚焦

import * as readTasks from '../tasks/tasks-read';
import {
    ROOT_PATH,
    ALLOWED_STATUSES,
    STATUS_NAMES,
    STATUS_COLORS
} from '../configs/configs-plugin';

/**
 * 任务树渲染器
 * 使用方式：
 *   const tree = new TaskTreeRenderer({ container, dv, app, state, collapsedNodes, ... });
 *   tree.render(filteredTasks);
 */
export class TaskTreeRenderer {
    constructor(options) {
        this.container = options.container;
        this.dv = options.dv;
        this.app = options.app;
        this.state = options.state;           // 主状态对象（用于读取排序、hideFolders、filterRootPath等）
        this.collapsedNodes = options.collapsedNodes;  // 折叠记录对象（可读写）
        this.onFilterRootPathChange = options.onFilterRootPathChange; // 聚焦变化回调
        this.onCollapseChange = options.onCollapseChange;             // 折叠变化回调（用于持久化）
        this.onBeforeRender = options.onBeforeRender || (() => {});   // 每次渲染前调用（如保存状态）
    }

    /**
     * 主渲染入口：传入过滤后的任务，重新构建并绘制树
     */
    render(tasks) {
        if (!this.container) return;
        const rootNodes = this._buildTree(tasks);
        this._sortTreeNodes(rootNodes);
        const flat = [];
        this._flattenTreeForDisplay(rootNodes, 0, flat);
        this._renderLeftPanel(flat);
    }

    // ===== 树构建（与原有逻辑一致） =====
    _buildTree(tasks) {
        const rootPrefix = ROOT_PATH;
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

    // ===== 节点统计 =====
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

    // ===== 排序 =====
    _sortTreeNodes(nodes) {
        nodes.sort((a, b) => {
            return a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name);
        });
        nodes.forEach(node => {
            if (node.type === 'file') {
                node.tasks.sort((a, b) => {
                    const sort = this.state.leftSort;
                    const order = sort.order === 'asc' ? 1 : -1;
                    if (sort.type === 'status') {
                        const map = { todo: 0, planned: 1, 'in-progress': 2, cancelled: 3, completed: 4 };
                        return ((map[a._status] ?? 5) - (map[b._status] ?? 5)) * order;
                    }
                    if (sort.type === 'priority') {
                        const prio = { '🔺': 0, '⏫': 1, '🔼': 2, '🔽': 3, '⏬': 4 };
                        return ((prio[a._priorityIcon] ?? 5) - (prio[b._priorityIcon] ?? 5)) * order;
                    }
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

    // ===== 扁平化 =====
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

    // ===== 核心 DOM 渲染 =====
    _renderLeftPanel(flatNodes) {
        const container = this.container;
        if (!container) return;
        container.innerHTML = '';

        // 聚焦提示条
        if (this.state.filterRootPath) {
            const ind = document.createElement('div');
            ind.innerHTML = '📌 已聚焦：' + this.state.filterRootPath +
                ' <span style="cursor:pointer;margin-left:8px;">❌ 清除</span>';
            ind.querySelector('span').onclick = () => {
                this.onFilterRootPathChange(null);
            };
            container.appendChild(ind);
        }

        if (!flatNodes || flatNodes.length === 0) {
            container.appendChild(this.dv.el('div', '📭 无匹配任务', { cls: 'empty-message' }));
            return;
        }

        const ul = document.createElement('ul');
        ul.style.cssText = 'list-style:none;padding-left:0;content-visibility:auto;contain-intrinsic-size:1px 28px;';

        // 事件委托：工具提示
        ul.addEventListener('mouseover', e => {
            if (this.state.modalOpen) return;
            const target = e.target.closest('[data-tooltip-html]');
            if (target && this.state.tooltipDiv) {
                this.state.tooltipDiv.innerHTML = target.getAttribute('data-tooltip-html');
                this.state.tooltipDiv.style.display = 'block';
            }
        });
        ul.addEventListener('mousemove', e => {
            if (this.state.modalOpen || !this.state.tooltipDiv || this.state.tooltipDiv.style.display === 'none') return;
            this.state.tooltipDiv.style.left = (e.clientX + 15) + 'px';
            this.state.tooltipDiv.style.top = (e.clientY + 15) + 'px';
        });
        ul.addEventListener('mouseleave', () => {
            if (!this.state.modalOpen && this.state.tooltipDiv) this.state.tooltipDiv.style.display = 'none';
        });
        // 事件委托：跳转任务
        ul.addEventListener('click', e => {
            const target = e.target.closest('[data-task-link]');
            if (!target) return;
            const link = target.getAttribute('data-task-link');
            this.app.workspace.openLinkText(link, '', { active: true });
        });

        const self = this; // 保留引用供内部函数使用

        function renderNode(node) {
            const li = document.createElement('li');
            li.style.margin = '0';
            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;cursor:pointer;padding:2px 0;height:28px;';
            header.style.paddingLeft = (node.level * 16) + 'px';
            const toggle = document.createElement('span');
            toggle.style.cssText = 'width:16px;text-align:center;font-size:12px;';

            if (node.type === 'task') {
                toggle.style.visibility = 'hidden';
                header.appendChild(toggle);
                const task = node.task;
                if (readTasks.isTaskToday(task)) {
                    const mk = document.createElement('span');
                    mk.className = 'today-marker';
                    mk.textContent = '🔹';
                    header.appendChild(mk);
                }
                const statusIcon = document.createElement('span');
                statusIcon.textContent = readTasks.getStatusIcon(task) + ' ';
                statusIcon.style.marginLeft = '4px';
                header.appendChild(statusIcon);
                const descSpan = document.createElement('span');
                descSpan.className = 'task-text';
                descSpan.textContent = task._cleanText;
                header.appendChild(descSpan);
                header.setAttribute('data-tooltip-html', task._tooltipHtml);
                header.setAttribute('data-task-link', task.path + '#' + (task.line + 1));
                li.appendChild(header);
                return li;
            }

            const expanded = !self.collapsedNodes[node.fullPath];
            toggle.textContent = expanded ? '▼' : '▶';
            toggle.onclick = (e) => {
                e.stopPropagation();
                if (self.collapsedNodes[node.fullPath]) {
                    delete self.collapsedNodes[node.fullPath];
                } else {
                    self.collapsedNodes[node.fullPath] = true;
                }
                // 触发折叠变化（持久化），并重新渲染树
                if (self.onCollapseChange) self.onCollapseChange();
                self.renderFromCurrentFilter();
            };
            header.appendChild(toggle);

            const iconSpan = document.createElement('span');
            iconSpan.style.cssText = 'margin-left:4px;font-weight:bold;color:var(--text-accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto;';
            iconSpan.textContent = node.type === 'folder' ? '📁 ' + node.name : '📄 ' + node.name + ' (' + node.tasks.length + ')';
            header.appendChild(iconSpan);

            const stats = self._calcNodeStats(node);
            if (stats.total > 0) {
                const prog = document.createElement('div');
                prog.style.cssText = 'display:inline-flex;width:70px;height:6px;border-radius:3px;margin-left:8px;overflow:hidden;flex-shrink:0;background:transparent;font-size:0;line-height:0;';
                ALLOWED_STATUSES.forEach(st => {
                    if (stats[st] > 0) {
                        const seg = document.createElement('div');
                        seg.style.cssText = `display:inline-block;height:6px;width:${(stats[st]/stats.total*100).toFixed(2)}%;background-color:${STATUS_COLORS[st]}!important;min-width:1px;vertical-align:top;`;
                        seg.title = STATUS_NAMES[st] + ': ' + stats[st];
                        prog.appendChild(seg);
                    }
                });
                header.appendChild(prog);
                const pct = document.createElement('span');
                pct.className = 'progress-text';
                pct.textContent = Math.round(stats.completed / stats.total * 100) + '%';
                header.appendChild(pct);
            }

            header.onclick = (e) => {
                e.stopPropagation();
                const newPath = self.state.filterRootPath === node.fullPath ? null : node.fullPath;
                self.onFilterRootPathChange(newPath);
            };
            li.appendChild(header);
            return li;
        }

        flatNodes.forEach(n => ul.appendChild(renderNode(n)));
        container.appendChild(ul);
    }

    /**
     * 从当前筛选缓存重新渲染（用于折叠切换后）
     * 需要在外部提供获取过滤后任务的方法
     */
    renderFromCurrentFilter() {
        // 此方法假设外部注入 getFilteredTasks 函数
        if (this._getFilteredTasks) {
            this.render(this._getFilteredTasks());
        }
    }

    /**
     * 设置获取过滤后任务的函数（由 main.js 注入）
     */
    setFilteredTasksProvider(fn) {
        this._getFilteredTasks = fn;
    }
}