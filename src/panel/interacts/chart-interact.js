// src/panel/interacts/chart-interact.js
import { throttleByFrame } from '../../tasks/process/common-process';

/**
 * 初始化图表区域的交互（缩放、拖拽分隔条、ResizeObserver）
 * @returns {Function} 清理函数
 */
export function initChartInteractions(chartDiv, resizer, leftDiv, state, collapsedNodes, saveFilterState) {
    // ---------- 缩放更新 ----------
    function updateChartScale() {
        document.querySelectorAll('.chart-body').forEach(b => {
            b.style.transform = 'scale(' + state.chartScale + ')';
        });
    }

    // ---------- 图表实例 resize（防抖）----------
    let chartResizeTimer = null;
    function debouncedResize() {
        if (chartResizeTimer) clearTimeout(chartResizeTimer);
        chartResizeTimer = setTimeout(() => {
            state.chartInstances.forEach(c => { try { c.resize(); } catch (e) {} });
        }, 150);
    }

    // ---------- Alt + 滚轮缩放 ----------
    const onWheel = (e) => {
        if (!e.altKey) return;
        e.preventDefault();          // 阻止页面滚动
        if (!onWheel._throttleHandle) {
            // 节流处理缩放计算
            onWheel._throttleHandle = throttleByFrame((evt) => {
                const delta = evt.deltaY > 0 ? -0.1 : 0.1;
                state.chartScale = Math.max(0.5, Math.min(3, state.chartScale + delta));
                updateChartScale();
                debouncedResize();
                saveFilterState(state, collapsedNodes);
            });
        }
        onWheel._throttleHandle(e);
    };
    chartDiv.addEventListener('wheel', onWheel, { passive: false });

    // ---------- 缩放提示 ----------
    const hint = document.createElement('div');
    hint.className = 'scale-hint';
    hint.textContent = 'Alt+滚轮缩放';
    chartDiv.appendChild(hint);
    setTimeout(() => { hint.style.opacity = '0'; setTimeout(() => hint.remove(), 500); }, 5000);

    // ---------- 分隔条拖拽 ----------
    let startX, startWidth;
    const onMouseDown = (e) => {
        startX = e.clientX;
        startWidth = leftDiv.offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp, { once: true });
    };
    const onMouseMove = (e) => {
        const dx = e.clientX - startX;
        const newW = Math.max(200, Math.min(600, startWidth + dx));
        leftDiv.style.width = newW + 'px';
        state.leftPanelWidth = newW;
        debouncedResize();
    };
    const onMouseUp = (e) => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        saveFilterState(state, collapsedNodes);
    };
    resizer.addEventListener('mousedown', onMouseDown);

    // ---------- ResizeObserver ----------
    if (state.resizeObserver) state.resizeObserver.disconnect();
    state.resizeObserver = new ResizeObserver(() => { debouncedResize(); });
    state.resizeObserver.observe(chartDiv);

    // ---------- 清理 ----------
    return function cleanup() {
        chartDiv.removeEventListener('wheel', onWheel);
        resizer.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }
    };
}