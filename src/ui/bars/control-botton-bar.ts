// src/panel/panel-control-bottons.js
import { CONFIG } from '../../configs/plugin-configs';

export function buildControlPanel(container, dv, state, callbacks = {}) {
    const ctrlRow = dv.el('div', '');
    ctrlRow.style.cssText = 'display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;';

    // 刷新（无高亮）
    const refreshBtn = dv.el('button', '🔄 刷新', { cls: 'quick-btn' });
    refreshBtn.onclick = () => { if (callbacks.onRenderAll) callbacks.onRenderAll(); };
    ctrlRow.appendChild(refreshBtn);

    // 间隔模式（切换高亮）
    const intervalBtn = dv.el('button',
        state.intervalMode !== CONFIG.INTERVAL_MODES.SCHEDULED_DUE ? '⏱️ 开始-完成' : '⏱️ 计划-截止',
        { cls: 'quick-btn' + (state.intervalMode !== CONFIG.INTERVAL_MODES.SCHEDULED_DUE ? ' quick-btn-active' : '') }
    );
    intervalBtn.onclick = () => {
        state.intervalMode = state.intervalMode === CONFIG.INTERVAL_MODES.SCHEDULED_DUE
            ? CONFIG.INTERVAL_MODES.STARTS_DONE : CONFIG.INTERVAL_MODES.SCHEDULED_DUE;
        intervalBtn.textContent = state.intervalMode === CONFIG.INTERVAL_MODES.SCHEDULED_DUE ? '⏱️ 计划-截止' : '⏱️ 开始-完成';
        intervalBtn.classList.toggle('quick-btn-active', state.intervalMode !== CONFIG.INTERVAL_MODES.SCHEDULED_DUE);
        state.filterCache.fingerprint = ''; if (callbacks.onRenderAll) callbacks.onRenderAll();
    };
    ctrlRow.appendChild(intervalBtn);

    // 循环任务（切换高亮）
    const repeatBtn = dv.el('button',
        state.hideRepeatTasks ? '🔄 显示循环' : '🔄 隐藏循环',
        { cls: 'quick-btn' + (!state.hideRepeatTasks ? ' quick-btn-active' : '') }
    );
    repeatBtn.onclick = () => {
        state.hideRepeatTasks = !state.hideRepeatTasks;
        repeatBtn.textContent = state.hideRepeatTasks ? '🔄 显示循环' : '🔄 隐藏循环';
        repeatBtn.classList.toggle('quick-btn-active', !state.hideRepeatTasks);
        state.filterCache.fingerprint = ''; if (callbacks.onRenderAll) callbacks.onRenderAll();
    };
    ctrlRow.appendChild(repeatBtn);

    // 已完成（切换高亮）
    const completedBtn = dv.el('button',
        state.hideCompletedTasks ? '✅ 显示已完成' : '✅ 隐藏已完成',
        { cls: 'quick-btn' + (!state.hideCompletedTasks ? ' quick-btn-active' : '') }
    );
    completedBtn.onclick = () => {
        state.hideCompletedTasks = !state.hideCompletedTasks;
        completedBtn.textContent = state.hideCompletedTasks ? '✅ 显示已完成' : '✅ 隐藏已完成';
        completedBtn.classList.toggle('quick-btn-active', !state.hideCompletedTasks);
        state.filterCache.fingerprint = ''; if (callbacks.onRenderAll) callbacks.onRenderAll();
    };
    ctrlRow.appendChild(completedBtn);

    // 已取消（切换高亮）
    const cancelledBtn = dv.el('button',
        state.hideCancelledTasks ? '❎ 显示已取消' : '❎ 隐藏已取消',
        { cls: 'quick-btn' + (!state.hideCancelledTasks ? ' quick-btn-active' : '') }
    );
    cancelledBtn.onclick = () => {
        state.hideCancelledTasks = !state.hideCancelledTasks;
        cancelledBtn.textContent = state.hideCancelledTasks ? '❎ 显示已取消' : '❎ 隐藏已取消';
        cancelledBtn.classList.toggle('quick-btn-active', !state.hideCancelledTasks);
        state.filterCache.fingerprint = ''; if (callbacks.onRenderAll) callbacks.onRenderAll();
    };
    ctrlRow.appendChild(cancelledBtn);

    // 文件夹（切换高亮）
    const folderBtn = dv.el('button',
        state.hideFolders ? '📂 显示文件夹' : '📁 隐藏文件夹',
        { cls: 'quick-btn' + (!state.hideFolders ? ' quick-btn-active' : '') }
    );
    folderBtn.onclick = () => {
        state.hideFolders = !state.hideFolders;
        folderBtn.textContent = state.hideFolders ? '📂 显示文件夹' : '📁 隐藏文件夹';
        folderBtn.classList.toggle('quick-btn-active', !state.hideFolders);
        if (callbacks.onToggleFolders) callbacks.onToggleFolders();
    };
    ctrlRow.appendChild(folderBtn);

    // 重置并清除（无高亮）
    const resetClearBtn = dv.el('button', '🗑️ 重置并清除', { cls: 'quick-btn' });
    resetClearBtn.onclick = () => { if (callbacks.onResetAndClear) callbacks.onResetAndClear(); };
    ctrlRow.appendChild(resetClearBtn);

    container.appendChild(ctrlRow);
    return ctrlRow;
}