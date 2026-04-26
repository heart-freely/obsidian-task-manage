// src/panel/panel-sort-bottons.js
import { CONFIG } from '../configs/configs-plugin';

export const ALL_SORT_KEYS = [
    { type: 'status', label: '状态' },
    { type: 'priority', label: '优先级' },
    { type: 'scheduled', label: '计划' },
    { type: 'start', label: '开始' },
    { type: 'due', label: '截止' },
    { type: 'filename', label: '文件名' },
];

export function buildSortRow(container, dv, state, callbacks = {}, sortKeys = ALL_SORT_KEYS) {
    const row = dv.el('div', '', { cls: 'sort-row' });
    row.appendChild(dv.el('span', '排序:', { style: 'font-weight:bold;' }));
    sortKeys.forEach(({ type, label }) => {
        const btn = dv.el('button', label, { cls: 'sort-btn' });
        if (state.leftSort.type === type) {
            btn.textContent = label + (state.leftSort.order === 'asc' ? '↑' : '↓');
            btn.classList.add('sort-btn-active');
        }
        btn.onclick = () => {
            if (state.leftSort.type === type) state.leftSort.order = state.leftSort.order === 'asc' ? 'desc' : 'asc';
            else { state.leftSort.type = type; state.leftSort.order = 'asc'; }
            if (callbacks.onRenderAll) callbacks.onRenderAll();
            updateSortButtons(state, sortKeys);
        };
        row.appendChild(btn);
    });
    container.appendChild(row);
}

export function updateSortButtons(state, sortKeys = ALL_SORT_KEYS) {
    const btns = document.querySelectorAll('.sort-btn');
    btns.forEach((btn, index) => {
        const { type, label } = sortKeys[index] || {};
        if (!type) return;
        if (type === state.leftSort.type) {
            btn.textContent = label + (state.leftSort.order === 'asc' ? '↑' : '↓');
            btn.classList.add('sort-btn-active');
        } else {
            btn.textContent = label;
            btn.classList.remove('sort-btn-active');
        }
    });
}