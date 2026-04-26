// src/panel/panel-tree.js
// 任务树组件（含虚拟滚动）

import * as readTasks from '../tasks/tasks-read';
import { CONFIG } from '../configs/configs-plugin';

const ROW_HEIGHT = 28;              // 每行的固定高度（与样式一致）
const BUFFER_COUNT = 5;             // 可视区外缓冲行数

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
        this._renderLeftPanel(flat);
    }

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

    _renderLeftPanel(flatNodes) {
        const container = this.container;
        if (!container) return;
        container.innerHTML = '';

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

        // 虚拟滚动设置
        const totalHeight = flatNodes.length * ROW_HEIGHT;
        const ul = document.createElement('div');   // 使用 div 作为滚动容器外部，ul 作为内部占位
        ul.style.cssText = 'position:relative; height:100%; overflow-y:auto; content-visibility:auto; contain-intrinsic-size:1px 28px;';

        const inner = document.createElement('div');
        inner.style.height = totalHeight + 'px';
        inner.style.position = 'relative';
        ul.appendChild(inner);

        // 可见范围渲染
        const renderRange = () => {
            const scrollTop = ul.scrollTop;
            const containerHeight = ul.clientHeight || 400;
            const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_COUNT);
            const endIdx = Math.min(flatNodes.length - 1, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_COUNT);

            // 清空 inner，但保留渲染过的片段（通过 data-index 识别）
            const children = inner.querySelectorAll('[data-index]');
            const existingSet = new Set();
            children.forEach(el => {
                const idx = parseInt(el.getAttribute('data-index'), 10);
                if (idx >= startIdx && idx <= endIdx) {
                    existingSet.add(idx);
                } else {
                    el.remove();
                }
            });

            for (let i = startIdx; i <= endIdx; i++) {
                if (existingSet.has(i)) continue;
                const node = flatNodes[i];
                const row = this._createNodeRow(node, i);
                row.style.position = 'absolute';
                row.style.top = (i * ROW_HEIGHT) + 'px';
                row.setAttribute('data-index', i);
                inner.appendChild(row);
            }
        };

        ul.addEventListener('scroll', renderRange, { passive: true });
        // 首次渲染
        setTimeout(renderRange, 0);

        // tooltip / click 委托 (绑定在 ul 上)
        ul.addEventListener('mouseover', e => {
            if (this.state.modalOpen) return;
            const target = e.target.closest('[data-tooltip-html]');
            if (target && this.tooltip) {
                const html = target.getAttribute('data-tooltip-html');
                this.tooltip.show(html, e.clientX, e.clientY);
            }
        });
        ul.addEventListener('mousemove', e => {
            if (this.state.modalOpen || !this.tooltip) return;
            this.tooltip.move(e.clientX, e.clientY);
        });
        ul.addEventListener('mouseleave', () => {
            if (!this.state.modalOpen && this.tooltip) this.tooltip.hide();
        });
        ul.addEventListener('click', e => {
            const target = e.target.closest('[data-task-link]');
            if (!target) return;
            const link = target.getAttribute('data-task-link');
            this.app.workspace.openLinkText(link, '', { active: true });
        });

        container.appendChild(ul);
        // 存储引用以便 resize 时重新计算
        this._flatNodes = flatNodes;
        this._renderRange = renderRange;
    }

    _createNodeRow(node, index) {
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
            return header;
        }

        const expanded = !this.collapsedNodes[node.fullPath];
        toggle.textContent = expanded ? '▼' : '▶';
        toggle.onclick = (e) => {
            e.stopPropagation();
            if (this.collapsedNodes[node.fullPath]) {
                delete this.collapsedNodes[node.fullPath];
            } else {
                this.collapsedNodes[node.fullPath] = true;
            }
            if (this.onCollapseChange) this.onCollapseChange();
            this.renderFromCurrentFilter();
        };
        header.appendChild(toggle);

        const iconSpan = document.createElement('span');
        iconSpan.style.cssText = 'margin-left:4px;font-weight:bold;color:var(--text-accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto;';
        iconSpan.textContent = node.type === 'folder' ? '📁 ' + node.name : '📄 ' + node.name + ' (' + node.tasks.length + ')';
        header.appendChild(iconSpan);

        const stats = this._calcNodeStats(node);
        if (stats.total > 0) {
            const prog = document.createElement('div');
            prog.style.cssText = 'display:inline-flex;width:70px;height:6px;border-radius:3px;margin-left:8px;overflow:hidden;flex-shrink:0;background:transparent;font-size:0;line-height:0;';
            CONFIG.ALLOWED_STATUSES.forEach(st => {
                if (stats[st] > 0) {
                    const seg = document.createElement('div');
                    seg.style.cssText = `display:inline-block;height:6px;width:${(stats[st]/stats.total*100).toFixed(2)}%;background-color:${CONFIG.STATUS_COLORS[st]}!important;min-width:1px;vertical-align:top;`;
                    seg.title = CONFIG.STATUS_NAMES[st] + ': ' + stats[st];
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
            const newPath = this.state.filterRootPath === node.fullPath ? null : node.fullPath;
            this.onFilterRootPathChange(newPath);
        };

        return header;
    }

    renderFromCurrentFilter() {
        if (this._getFilteredTasks) {
            this.render(this._getFilteredTasks());
        }
    }

    setFilteredTasksProvider(fn) {
        this._getFilteredTasks = fn;
    }
}