// src/panel/bars/quick-botton-bar.js
import { DateUtils } from '../../tasks/process/common-process';

export function clearQuickHighlights(state) { state.quickBtns.forEach(b => b.className = 'quick-btn'); }
export function resetQuickDateUI(state) { clearQuickHighlights(state); }

export function restoreQuickButton(state, label) {
    if (!label) return;
    state.quickBtns.forEach(b => { b.className = b.textContent === label ? 'quick-btn quick-btn-active' : 'quick-btn'; });
}

export function buildQuickDatePanel(container, dv, state, callbacks = {}) {
    container.style.cssText = 'display:flex; align-items:center; flex-wrap:wrap; gap:8px;';

    const quickDefs = [
        { label: '今天', range: () => DateUtils.getDayRange(new Date()) },
        { label: '昨天', range: () => { const d = new Date(); d.setDate(d.getDate() - 1); return DateUtils.getDayRange(d); } },
        { label: '明天', range: () => { const d = new Date(); d.setDate(d.getDate() + 1); return DateUtils.getDayRange(d); } },
        { label: '本周', range: () => DateUtils.getWeekRange(new Date()) },
        { label: '本月', range: () => DateUtils.getMonthRange(new Date()) },
        { label: '所有任务', range: null }
    ];
    state.quickBtns = [];

    quickDefs.forEach(def => {
        const btn = dv.el('button', def.label, { cls: 'quick-btn' });
        btn.onclick = () => {
            clearQuickHighlights(state);
            btn.classList.add('quick-btn-active');
            state.activeQuickBtn = def.label;
            state.dateState.selections = { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} };
            if (def.label === '所有任务') {
                state.dateFilterState.isAll = true;
                state.dateFilterState.start = state.dateFilterState.end = null;
            } else {
                state.dateFilterState.isAll = false;
                const r = def.range();
                state.dateFilterState.start = r.start;
                state.dateFilterState.end = r.end;
            }
            state.filterCache.fingerprint = '';
        };
        container.appendChild(btn);
        state.quickBtns.push(btn);

        if (def.label === '本周') {
            const prevBtn = dv.el('button', '上周', { cls: 'quick-btn' });
            prevBtn.onclick = () => {
                clearQuickHighlights(state);
                state.activeQuickBtn = '上周';
                const now = new Date(); now.setDate(now.getDate() - 7);
                const r = DateUtils.getWeekRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; prevBtn.classList.add('quick-btn-active');
            };
            container.appendChild(prevBtn); state.quickBtns.push(prevBtn);
            const nextBtn = dv.el('button', '下周', { cls: 'quick-btn' });
            nextBtn.onclick = () => {
                clearQuickHighlights(state);
                state.activeQuickBtn = '下周';
                const now = new Date(); now.setDate(now.getDate() + 7);
                const r = DateUtils.getWeekRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; nextBtn.classList.add('quick-btn-active');
            };
            container.appendChild(nextBtn); state.quickBtns.push(nextBtn);
        }

        if (def.label === '本月') {
            const prevBtn = dv.el('button', '上月', { cls: 'quick-btn' });
            prevBtn.onclick = () => {
                clearQuickHighlights(state);
                state.activeQuickBtn = '上月';
                const now = new Date(); now.setMonth(now.getMonth() - 1);
                const r = DateUtils.getMonthRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; prevBtn.classList.add('quick-btn-active');
            };
            container.appendChild(prevBtn); state.quickBtns.push(prevBtn);
            const nextBtn = dv.el('button', '下月', { cls: 'quick-btn' });
            nextBtn.onclick = () => {
                clearQuickHighlights(state);
                state.activeQuickBtn = '下月';
                const now = new Date(); now.setMonth(now.getMonth() + 1);
                const r = DateUtils.getMonthRange(now);
                state.dateFilterState.isAll = false; state.dateFilterState.start = r.start; state.dateFilterState.end = r.end;
                state.filterCache.fingerprint = ''; nextBtn.classList.add('quick-btn-active');
            };
            container.appendChild(nextBtn); state.quickBtns.push(nextBtn);
        }
    });

    // 执行查询按钮（不高亮）
    const queryBtn = dv.el('button', '🔍 执行查询', {
        cls: 'quick-btn',
        style: 'margin-left:auto;'
    });
    queryBtn.onclick = () => { if (callbacks.onQuery) callbacks.onQuery(); };
    container.appendChild(queryBtn);

    if (state.activeQuickBtn) restoreQuickButton(state, state.activeQuickBtn);
}