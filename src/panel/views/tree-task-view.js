// src/panel/views/tree-task-view.js
import * as readTasks from '../../tasks/read/read-tasks';
import { CONFIG } from '../../configs/plugin-configs';

const ROW_HEIGHT = 28;
const BUFFER_COUNT = 5;

export function renderTreePanel(container, flatNodes, context) {
    const { state, dv, app, collapsedNodes, tooltip, onFilterRootPathChange, onCollapseChange, onRefresh } = context;
    if (!container) return;
    container.innerHTML = '';

    if (state.filterRootPath) {
        const ind = document.createElement('div');
        ind.innerHTML = '📌 已聚焦：' + state.filterRootPath + ' <span style="cursor:pointer;margin-left:8px;">❌ 清除</span>';
        ind.querySelector('span').onclick = () => onFilterRootPathChange(null);
        container.appendChild(ind);
    }

    if (!flatNodes?.length) {
        container.appendChild(dv.el('div', '📭 无匹配任务', { cls: 'empty-message' }));
        return;
    }

    const totalHeight = flatNodes.length * ROW_HEIGHT;
    const ul = document.createElement('div');
    ul.style.cssText = 'position:relative; height:100%; overflow-y:auto; content-visibility:auto; contain-intrinsic-size:1px 28px;';
    const inner = document.createElement('div');
    inner.style.height = totalHeight + 'px'; inner.style.position = 'relative';
    ul.appendChild(inner);

    const renderRange = () => {
        const scrollTop = ul.scrollTop;
        const containerHeight = ul.clientHeight || 400;
        const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_COUNT);
        const endIdx = Math.min(flatNodes.length - 1, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_COUNT);
        const children = inner.querySelectorAll('[data-index]');
        const existingSet = new Set();
        children.forEach(el => {
            const idx = parseInt(el.getAttribute('data-index'), 10);
            if (idx >= startIdx && idx <= endIdx) existingSet.add(idx);
            else el.remove();
        });
        for (let i = startIdx; i <= endIdx; i++) {
            if (existingSet.has(i)) continue;
            const node = flatNodes[i];
            const row = createNodeRow(node, i, collapsedNodes, state, dv, app, onCollapseChange, onRefresh, onFilterRootPathChange, tooltip);
            row.style.position = 'absolute';
            row.style.top = (i * ROW_HEIGHT) + 'px';
            row.setAttribute('data-index', i);
            inner.appendChild(row);
        }
    };

    let rafId = null;
    ul.addEventListener('scroll', () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(renderRange);
    }, { passive: true });
    setTimeout(renderRange, 0);

    ul.addEventListener('mouseover', e => {
        if (state.modalOpen) return;
        const target = e.target.closest('[data-tooltip-html]');
        if (target && tooltip) { tooltip.show(target.getAttribute('data-tooltip-html'), e.clientX, e.clientY); }
    });
    ul.addEventListener('mousemove', e => { if (state.modalOpen || !tooltip) return; tooltip.move(e.clientX, e.clientY); });
    ul.addEventListener('mouseleave', () => { if (!state.modalOpen && tooltip) tooltip.hide(); });
    ul.addEventListener('click', e => {
        const target = e.target.closest('[data-task-link]');
        if (!target) return;
        app.workspace.openLinkText(target.getAttribute('data-task-link'), '', { active: true });
    });

    container.appendChild(ul);
}

function createNodeRow(node, index, collapsedNodes, state, dv, app, onCollapseChange, onRefresh, onFilterRootPathChange, tooltip) {
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
            const mk = document.createElement('span'); mk.className = 'today-marker'; mk.textContent = '🔹'; header.appendChild(mk);
        }
        const statusIcon = document.createElement('span'); statusIcon.textContent = readTasks.getStatusIcon(task) + ' '; statusIcon.style.marginLeft = '4px';
        header.appendChild(statusIcon);
        const descSpan = document.createElement('span'); descSpan.className = 'task-text'; descSpan.textContent = task._cleanText;
        header.appendChild(descSpan);
        header.setAttribute('data-tooltip-html', task._tooltipHtml);
        header.setAttribute('data-task-link', task.path + '#' + (task.line + 1));
        return header;
    }

    const expanded = !collapsedNodes[node.fullPath];
    toggle.textContent = expanded ? '▼' : '▶';
    toggle.onclick = (e) => {
        e.stopPropagation();
        if (collapsedNodes[node.fullPath]) delete collapsedNodes[node.fullPath];
        else collapsedNodes[node.fullPath] = true;
        if (onCollapseChange) onCollapseChange();
        if (onRefresh) onRefresh();
    };
    header.appendChild(toggle);

    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'margin-left:4px;font-weight:bold;color:var(--text-accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto;';
    iconSpan.textContent = node.type === 'folder' ? '📁 ' + node.name : '📄 ' + node.name + ' (' + node.tasks.length + ')';
    header.appendChild(iconSpan);

    const stats = calcNodeStats(node);
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
        const pct = document.createElement('span'); pct.className = 'progress-text'; pct.textContent = Math.round(stats.completed / stats.total * 100) + '%';
        header.appendChild(pct);
    }

    header.onclick = (e) => {
        e.stopPropagation();
        const newPath = state.filterRootPath === node.fullPath ? null : node.fullPath;
        onFilterRootPathChange(newPath);
    };
    return header;
}

function calcNodeStats(node) {
    const stats = { todo: 0, planned: 0, 'in-progress': 0, completed: 0, cancelled: 0, total: 0 };
    if (node.type === 'task') { stats[node.task._status]++; stats.total++; return stats; }
    if (node.tasks) node.tasks.forEach(t => { stats[t._status]++; stats.total++; });
    if (node.children) node.children.forEach(ch => { const cs = calcNodeStats(ch); for (const k in cs) if (Object.hasOwn(cs, k)) stats[k] += cs[k]; });
    return stats;
}