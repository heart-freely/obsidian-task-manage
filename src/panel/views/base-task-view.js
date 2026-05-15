// src/panel/views/base-task-view.js
import { ItemView } from 'obsidian';
import {
    PRIORITY_ICONS,
    PRIORITY_LABELS,
    STATUS_ICONS,
    STATUS_NAMES,
    REPEAT_ICON,
    STATUS_SYMBOL_MAP
} from '../../configs/plugin-configs';
import { RX } from '../../tasks/read/read-tasks';

export class BaseTaskView extends ItemView {
    constructor(leaf, storageAdapter, instanceId) {
        super(leaf);
        this._cleanupFn = null;
        this._storageAdapter = storageAdapter;
        this._instanceId = instanceId;
    }
    getViewType() { throw new Error('Must override getViewType()'); }
    getDisplayText() { return 'Task View'; }
    getIcon() { return 'bar-chart-3'; }

    async onOpen() {
        const dvPlugin = this.app.plugins.plugins.dataview;
        if (!dvPlugin || !dvPlugin.api) {
            this.contentEl.createEl('div', { text: '⚠️ 请先安装并启用 Dataview 插件。' });
            return;
        }
        const dv = {
            pages: (source) => dvPlugin.api.pages(source) || [],
            page: (path) => {
                const cleanPath = path.replace(/\.md$/, '');
                return dvPlugin.api.page(cleanPath) || null;
            },
            el: (tag, textOrOpts, opts) => {
                const el = document.createElement(tag);
                let realOpts = {};
                if (typeof textOrOpts === 'string') {
                    el.textContent = textOrOpts;
                    if (opts && typeof opts === 'object') realOpts = opts;
                } else if (textOrOpts && typeof textOrOpts === 'object') {
                    realOpts = textOrOpts;
                }
                if (realOpts.cls) el.className = realOpts.cls;
                if (realOpts.style) el.style.cssText = realOpts.style;
                if (realOpts.attr) {
                    for (const key in realOpts.attr) {
                        if (Object.hasOwn(realOpts.attr, key)) el.setAttribute(key, realOpts.attr[key]);
                    }
                }
                return el;
            },
            container: this.contentEl
        };
        this.contentEl.empty();
        this._cleanupFn = await this._startCore(dv, this.app, this._storageAdapter, this._instanceId);
    }

    async onClose() { /* 可扩展 */ }
    async _startCore(dv, app, storageAdapter, instanceId) { throw new Error('Must override _startCore'); }
}

export function createTaskCard(task, app) {
    const prio = task.priority || 'none';
    const prioIcon = PRIORITY_ICONS[prio] || '';
    const prioLabel = PRIORITY_LABELS[prio] || 'None|无';

    let statusIcon = task.statusIcon;
    let statusName = task.statusName || task.statusText;
    if (!statusIcon || !statusName) {
        const statusKey = task.status || 'todo';
        statusIcon = STATUS_ICONS[statusKey] || '🔲';
        statusName = STATUS_NAMES[statusKey] || '未开始';
    }

    // 修改后的 meta 顺序：状态、优先级、循环、日期、ID、引用、标签、文件名
    const meta = [
        `<span>${statusIcon} ${statusName}</span>`,
        prioIcon ? `<span>${prioIcon} ${prioLabel}</span>` : `<span>${prioLabel}</span>`,
        task.recurrenceLabel ? `<span>${task.recurrenceLabel}</span>` : '',
        task.scheduled ? `<span>⏳ ${task.scheduled}</span>` : '',
        task.start ? `<span>🛫 ${task.start}</span>` : '',
        task.due ? `<span>📅 ${task.due}</span>` : '',
        task.id ? `<span>🆔 ${task.id}</span>` : '',
        task.forbid ? `<span>⛔ ${task.forbid}</span>` : '',
        task.tags && task.tags.length ? `<span>🏁 ${task.tags.join(', ')}</span>` : '',
        `<span>📄 ${task.fileName}</span>`
    ].filter(Boolean).join('');

    const li = document.createElement('li');
    li.className = 'task-item';
    li.setAttribute('data-path', task.path);
    li.setAttribute('data-line', task.lineNumber);
    li.style.cssText =
        'margin:6px 0; padding:8px 10px; background:var(--background-primary); ' +
        'border-radius:8px; font-size:0.9em; cursor:pointer; ' +
        'border-left:3px solid var(--interactive-accent); display:flex; flex-direction:column; ' +
        'color: var(--text-normal);';

    li.innerHTML = `
        <div class="task-desc" style="font-weight:500; margin-bottom:4px;">${task.description}</div>
        <div class="task-meta" style="font-size:0.8em; color:var(--text-muted); display:flex; gap:8px; flex-wrap:wrap;">${meta}</div>
    `;

    li.addEventListener('click', async () => {
        const file = app.vault.getAbstractFileByPath(task.path);
        if (file) {
            const leaf = app.workspace.getLeaf(false);
            await leaf.openFile(file);
            setTimeout(() => leaf.view?.editor?.setCursor({ line: parseInt(task.lineNumber), ch: 0 }), 30);
        }
    });

    return li;
}

export function normalizeTaskCardData(raw) {
    return {
        description: raw.description || '（无描述）',
        priority: raw.priority || 'none',
        status: raw.status || mapStatusTextToKey(raw.statusText),
        recurrenceLabel: raw.recurrenceLabel || '',
        scheduled: raw.scheduled || null,
        start: raw.start || null,
        due: raw.due || null,
        tags: raw.tags || [],
        id: raw.id || '',
        forbid: raw.forbid || '',
        fileName: raw.fileName || (raw.path ? raw.path.split('/').pop().replace(/\.md$/, '') : ''),
        path: raw.path || '',
        lineNumber: raw.lineNumber != null ? raw.lineNumber : 0
    };
}

function mapStatusTextToKey(statusText) {
    if (!statusText) return 'todo';
    const map = { '未开始': 'todo', '计划中': 'planned', '进行中': 'in-progress' };
    return map[statusText] || 'todo';
}

export function adaptTasksApiTask(task) {
    if (!task._fullLine) {
        const sym = task.status?.symbol || ' ';
        const text = task.description || '';
        task._fullLine = `- [${sym === ' ' ? ' ' : sym}] ${text}`;
    }
    const fullLine = task._fullLine;

    const m = (rx, idx) => (fullLine.match(rx) || [])[idx ?? 1] || null;

    task._id = m(RX.id);
    task._forbid = m(RX.forbid) ? m(RX.forbid).replace(/\s/g, '') : '';
    task._tag = m(RX.tag);
    task._repeat = m(RX.repeat);
    task._priorityIcon = (fullLine.match(RX.priority) || [null])[0];

    if (!task.tags) {
        task.tags = task._tag ? [task._tag] : [];
    } else if (task._tag && !task.tags.includes(task._tag)) {
        task.tags.push(task._tag);
    }

    return task;
}