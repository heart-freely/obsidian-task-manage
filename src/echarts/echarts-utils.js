// src/echarts/echarts-utils.js
// ECharts 辅助工具（动态加载 CDN）

export function ensureEcharts(callback) {
    if (window.echarts) return callback(window.echarts);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
    script.onload = () => { callback(window.echarts); };
    script.onerror = () => {
        console.warn('ECharts 加载失败');
        callback(null);   // 回调 null 表示失败
    };
    document.head.appendChild(script);
}