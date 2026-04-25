// src/panel/views/view-base-tasks.js
// 任务视图基类 —— 封装通用生命周期和 dv 对象构建

import { ItemView } from 'obsidian';

export class BaseTaskView extends ItemView {
    constructor(leaf) {
        super(leaf);
        this._cleanupFn = null;
    }

    // 子类必须覆盖
    getViewType() { throw new Error('Must override getViewType()'); }
    getDisplayText() { return 'Task View'; }
    getIcon() { return 'bar-chart-3'; }

    async onOpen() {
        const dvPlugin = this.app.plugins.plugins.dataview;
        if (!dvPlugin || !dvPlugin.api) {
            this.contentEl.createEl('div', { text: '⚠️ 请先安装并启用 Dataview 插件。' });
            return;
        }

        // 构造 dv 对象（所有视图共用）
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
        // 调用子类的核心启动逻辑，返回清理函数
        this._cleanupFn = await this._startCore(dv, this.app);
    }

    async onClose() {
        if (typeof this._cleanupFn === 'function') {
            this._cleanupFn();
            this._cleanupFn = null;
        }
        document.querySelectorAll('.dataview-tooltip').forEach(el => el.remove());
    }

    // 子类必须实现：启动核心逻辑，返回清理函数
    async _startCore(dv, app) {
        throw new Error('Must override _startCore(dv, app)');
    }
}