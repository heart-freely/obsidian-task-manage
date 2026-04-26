// src/echarts/echarts-utils.js
// ECharts 辅助工具（从本地文件加载）

export function ensureEcharts(callback) {
    if (window.echarts) {
        callback(window.echarts);
        return;
    }

    // 插件根目录下的 echarts.min.js
    const script = document.createElement('script');
    // __dirname 在 Obsidian 中指向当前插件目录
    script.src = __dirname + '/echarts.min.js';
    script.onload = () => {
        if (window.echarts) {
            callback(window.echarts);
        } else {
            console.error('ECharts 加载失败（本地文件可能不存在）');
            callback(null);
        }
    };
    script.onerror = () => {
        console.error('ECharts 本地文件加载失败');
        callback(null);
    };
    document.head.appendChild(script);
}