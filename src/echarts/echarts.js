import * as echarts from "echarts";

if (typeof window !== "undefined") {
	window.echarts = echarts;
}

export { echarts };

/**
 * 保留 ensureEcharts 接口以兼容现有调用，但直接同步调用回调
 * @param {Function} callback - 接收 echarts 实例的回调函数
 * @returns {void}
 */

export function ensureEcharts(callback) {
	if (typeof callback === "function") {
		callback(echarts);
	}
}
