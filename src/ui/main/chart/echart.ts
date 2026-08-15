// src/ui/main/chart/echart.ts
// 按需引入 ECharts，仅注册 pie/bar 与所需组件。
// 避免打包 geo 等未用模块（GeoJSONResource 中含 new Function 兜底，静态审计会告警）。
import * as echarts from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import {
	GridComponent,
	LegendComponent,
	TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
	BarChart,
	PieChart,
	GridComponent,
	LegendComponent,
	TooltipComponent,
	CanvasRenderer,
]);

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
