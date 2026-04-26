// src/panel/panel-mark-bottons.js
import { CONFIG } from '../configs/configs-plugin';

export function buildMarkFilterPanel(container, dv, state, currentViewType) {
    const wrapper = dv.el('div', '', { cls: 'filter-section' });

    // 执行状态
    const statusDiv = dv.el('div', '');
    statusDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px;';
    statusDiv.appendChild(dv.el('span', '执行状态', { cls: 'filter-label' }));
    CONFIG.ALLOWED_STATUSES.forEach(st => {
        const active = state.markFilterState.statuses.includes(st);
        const btn = dv.el('button', CONFIG.STATUS_NAMES[st]);
        // 所有按钮均可点击，无禁用状态
        btn.style.cssText = 'padding:2px 10px; border-radius:16px; background:' +
            (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
            '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
        btn.onclick = () => {
            const idx = state.markFilterState.statuses.indexOf(st);
            if (idx === -1) {
                state.markFilterState.statuses.push(st);
                btn.style.background = 'var(--interactive-accent)';
                btn.style.color = 'white';
            } else {
                state.markFilterState.statuses.splice(idx, 1);
                btn.style.background = 'var(--interactive-normal)';
                btn.style.color = 'var(--text-normal)';
            }
            state.filterCache.fingerprint = '';
        };
        statusDiv.appendChild(btn);
    });
    wrapper.appendChild(statusDiv);

    // 包含标记
    const incDiv = dv.el('div', '');
    incDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:8px;';
    incDiv.appendChild(dv.el('span', '包含标记', { cls: 'filter-label' }));
    CONFIG.ALL_MARKS.forEach(mk => {
        const active = state.markFilterState.includeMarks.includes(mk);
        const btn = dv.el('button', CONFIG.MARK_NAMES[mk]);
        btn.style.cssText = 'padding:2px 8px; border-radius:16px; background:' +
            (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
            '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
        btn.dataset.mark = mk; btn.dataset.type = 'include';
        btn.onclick = () => {
            const incIdx = state.markFilterState.includeMarks.indexOf(mk);
            const excIdx = state.markFilterState.excludeMarks.indexOf(mk);
            if (incIdx === -1) {
                state.markFilterState.includeMarks.push(mk);
                if (excIdx !== -1) state.markFilterState.excludeMarks.splice(excIdx, 1);
                btn.style.background = 'var(--interactive-accent)'; btn.style.color = 'white';
                document.querySelectorAll(`button[data-mark="${mk}"][data-type="exclude"]`).forEach(b => {
                    b.style.background = 'var(--interactive-normal)'; b.style.color = 'var(--text-normal)';
                });
            } else {
                state.markFilterState.includeMarks.splice(incIdx, 1);
                btn.style.background = 'var(--interactive-normal)'; btn.style.color = 'var(--text-normal)';
            }
            state.filterCache.fingerprint = '';
        };
        incDiv.appendChild(btn);
    });
    wrapper.appendChild(incDiv);

    // 排除标记
    const excDiv = dv.el('div', '');
    excDiv.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:6px;';
    excDiv.appendChild(dv.el('span', '排除标记', { cls: 'filter-label' }));
    CONFIG.ALL_MARKS.forEach(mk => {
        const active = state.markFilterState.excludeMarks.includes(mk);
        const btn = dv.el('button', CONFIG.MARK_NAMES[mk]);
        btn.style.cssText = 'padding:2px 8px; border-radius:16px; background:' +
            (active ? 'var(--interactive-accent)' : 'var(--interactive-normal)') +
            '; color:' + (active ? 'white' : 'var(--text-normal)') + '; font-size:12px;';
        btn.dataset.mark = mk; btn.dataset.type = 'exclude';
        btn.onclick = () => {
            const excIdx = state.markFilterState.excludeMarks.indexOf(mk);
            const incIdx = state.markFilterState.includeMarks.indexOf(mk);
            if (excIdx === -1) {
                state.markFilterState.excludeMarks.push(mk);
                if (incIdx !== -1) state.markFilterState.includeMarks.splice(incIdx, 1);
                btn.style.background = 'var(--interactive-accent)'; btn.style.color = 'white';
                document.querySelectorAll(`button[data-mark="${mk}"][data-type="include"]`).forEach(b => {
                    b.style.background = 'var(--interactive-normal)'; b.style.color = 'var(--text-normal)';
                });
            } else {
                state.markFilterState.excludeMarks.splice(excIdx, 1);
                btn.style.background = 'var(--interactive-normal)'; btn.style.color = 'var(--text-normal)';
            }
            state.filterCache.fingerprint = '';
        };
        excDiv.appendChild(btn);
    });
    wrapper.appendChild(excDiv);

    container.appendChild(wrapper);
}