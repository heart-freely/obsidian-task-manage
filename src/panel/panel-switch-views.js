// src/panel/panel-views.js
// 任务视图基类

import { ItemView } from 'obsidian';

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

    async onClose() {
        if (typeof this._cleanupFn === 'function') {
            this._cleanupFn();
            this._cleanupFn = null;
        }
        document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());
    }

    async _startCore(dv, app, storageAdapter, instanceId) {
        throw new Error('Must override _startCore(dv, app, storageAdapter, instanceId)');
    }
}