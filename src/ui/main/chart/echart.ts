// src/ui/main/chart/echart.ts
// 直接导入打包的 ECharts，无需动态加载
import * as echarts from "echarts";

// 确保全局可用（兼容旧代码中 window.echarts 引用）
if (typeof window !== "undefined") {
	(window as unknown as Record<string, unknown>).echarts = echarts;
}

export { echarts };

// 保留 ensureEcharts 接口以兼容现有调用，但直接同步调用回调
export function ensureEcharts(callback: (ec: typeof echarts) => void): void {
	if (typeof callback === "function") {
		callback(echarts);
	}
}
