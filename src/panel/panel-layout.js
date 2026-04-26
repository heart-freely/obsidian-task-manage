// src/panel/panel-layout.js

/**
 * 构建主布局（左右面板 + 分隔条 + 图表区）
 * 返回布局元素和关键子元素
 */
export function buildLayout(dv) {
    const layout = dv.el('div', '', { cls: 'main-layout' });
    const leftDiv = dv.el('div', '', { cls: 'left-panel' });
    const resizer = dv.el('div', '', { cls: 'resizer' });
    const chartDiv = dv.el('div', '', { cls: 'chart-panel' });
    layout.append(leftDiv, resizer, chartDiv);
    return { leftDiv, resizer, chartDiv, layout };
}