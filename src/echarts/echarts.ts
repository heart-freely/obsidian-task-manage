// src/echarts/echarts-utils.js
// 直接导入打包的 ECharts，无需动态加载
import * as echarts from 'echarts';

// 确保全局可用（兼容旧代码中 window.echarts 引用）
if (typeof window !== 'undefined') {
    window.echarts = echarts;
}

export { echarts };

// 保留 ensureEcharts 接口以兼容现有调用，但直接同步调用回调
export function ensureEcharts(callback) {
    // 立即调用，因为 echarts 已同步可用
    if (typeof callback === 'function') {
        callback(echarts);
    }
}