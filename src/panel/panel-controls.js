// src/panel/panel-controls.js
// 控制栏 & 排序栏 & 排序按钮样式更新

import { CONFIG } from '../configs/configs-plugin';

export function buildControlPanel(container, dv, state, callbacks = {}) {
    const ctrlRow = dv.el('div', '');
    ctrlRow.style.cssText = 'display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;';

    const intervalBtn = dv.el('button',
        state.intervalMode === CONFIG.INTERVAL_MODES.SCHEDULED_DUE ? '⏱️ 计划-截止' : '⏱️ 开始-完成',
        { cls: 'quick-btn' }
    );
    intervalBtn.onclick = () => {
        state.intervalMode = state.intervalMode === CONFIG.INTERVAL_MODES.SCHEDULED_DUE
            ? CONFIG.INTERVAL_MODES.STARTS_DONE
            : CONFIG.INTERVAL_MODES.SCHEDULED_DUE;
        intervalBtn.textContent = state.intervalMode === CONFIG.INTERVAL_MODES.SCHEDULED_DUE
            ? '⏱️ 计划-截止'
            : '⏱️ 开始-完成';
        state.filterCache.fingerprint = '';
        if (callbacks.onRenderAll) callbacks.onRenderAll();
    };
    ctrlRow.appendChild(intervalBtn);

    const repeatBtn = dv.el('button',
        state.hideRepeatTasks ? '🔄 显示循环' : '🔄 隐藏循环',
        { cls: 'quick-btn' }
    );
    repeatBtn.onclick = () => {
        state.hideRepeatTasks = !state.hideRepeatTasks;
        repeatBtn.textContent = state.hideRepeatTasks ? '🔄 显示循环' : '🔄 隐藏循环';
        state.filterCache.fingerprint = '';
        if (callbacks.onRenderAll) callbacks.onRenderAll();
    };
    ctrlRow.appendChild(repeatBtn);

    const completedBtn = dv.el('button',
        state.hideCompletedTasks ? '✅ 显示已完成' : '✅ 隐藏已完成',
        { cls: 'quick-btn' }
    );
    completedBtn.onclick = () => {
        state.hideCompletedTasks = !state.hideCompletedTasks;
        completedBtn.textContent = state.hideCompletedTasks ? '✅ 显示已完成' : '✅ 隐藏已完成';
        state.filterCache.fingerprint = '';
        if (callbacks.onRenderAll) callbacks.onRenderAll();
    };
    ctrlRow.appendChild(completedBtn);

    const cancelledBtn = dv.el('button',
        state.hideCancelledTasks ? '❎ 显示已取消' : '❎ 隐藏已取消',
        { cls: 'quick-btn' }
    );
    cancelledBtn.onclick = () => {
        state.hideCancelledTasks = !state.hideCancelledTasks;
        cancelledBtn.textContent = state.hideCancelledTasks ? '❎ 显示已取消' : '❎ 隐藏已取消';
        state.filterCache.fingerprint = '';
        if (callbacks.onRenderAll) callbacks.onRenderAll();
    };
    ctrlRow.appendChild(cancelledBtn);

    const folderBtn = dv.el('button',
        state.hideFolders ? '📂 显示文件夹' : '📁 隐藏文件夹',
        { cls: 'quick-btn' }
    );
    folderBtn.onclick = () => {
        state.hideFolders = !state.hideFolders;
        folderBtn.textContent = state.hideFolders ? '📂 显示文件夹' : '📁 隐藏文件夹';
        if (callbacks.onToggleFolders) callbacks.onToggleFolders();
    };
    ctrlRow.appendChild(folderBtn);

    const clearCacheBtn = dv.el('button', '🗑️ 清除缓存', { cls: 'quick-btn' });
    clearCacheBtn.onclick = () => {
        if (callbacks.onClearCache) callbacks.onClearCache();
    };
    ctrlRow.appendChild(clearCacheBtn);
    container.appendChild(ctrlRow);
}

export function buildSortRow(container, dv, state, callbacks = {}) {
    const row = dv.el('div', '', { cls: 'sort-row' });
    row.appendChild(dv.el('span', '排序:', { style: 'font-weight:bold;' }));
    const makeSortBtn = (label, type) => {
        const btn = dv.el('button', label, { cls: 'sort-btn' });
        btn.onclick = () => {
            if (state.leftSort.type === type) {
                state.leftSort.order = state.leftSort.order === 'asc' ? 'desc' : 'asc';
            } else {
                state.leftSort.type = type;
                state.leftSort.order = 'asc';
            }
            if (callbacks.onRenderAll) callbacks.onRenderAll();
            updateSortButtons(state);
        };
        return btn;
    };
    row.appendChild(makeSortBtn('状态', CONFIG.SORT_TYPES.STATUS));
    row.appendChild(makeSortBtn('优先级', CONFIG.SORT_TYPES.PRIORITY));
    row.appendChild(makeSortBtn('时间', CONFIG.SORT_TYPES.TIME));
    container.appendChild(row);
}

export function updateSortButtons(state) {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        const text = btn.textContent;
        const type = text.includes('状态') ? CONFIG.SORT_TYPES.STATUS
            : text.includes('优先级') ? CONFIG.SORT_TYPES.PRIORITY
            : CONFIG.SORT_TYPES.TIME;
        if (type === state.leftSort.type) {
            const label = type === CONFIG.SORT_TYPES.STATUS ? '状态'
                : type === CONFIG.SORT_TYPES.PRIORITY ? '优先级'
                : '时间';
            btn.textContent = label + (state.leftSort.order === 'asc' ? '↑' : '↓');
            btn.classList.add('sort-btn-active');
        } else {
            btn.classList.remove('sort-btn-active');
        }
    });
}