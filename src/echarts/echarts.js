//  <!-- SYNC_COMMENTS_START -->

/* @skill-sig file src/echarts/echarts.js - ECharts 封装模块，导入 ECharts 库并确保全局可用，兼容旧代码中 window.echarts 引用 */
/* @skill-func
   echarts : Object - 从 echarts npm 包导入的 ECharts 核心库(命名导出)
   ensureEcharts(callback) : void - 工具函数，立即同步调用回调函数并传入 echarts 实例(兼容旧代码)
*/
/* @skill-flow
   模块加载 → import echarts → window.echarts赋值(全局兼容) → 导出echarts和ensureEcharts
   ensureEcharts → 检查callback类型 → 立即执行callback(echarts)，无需等待
*/
/* @skill-param
   callback: Function - 接收 echarts 实例的回调函数(旧代码接口，直接同步调用)
*/
/* @skill-condition
   所属模块: echarts - 图表库包装
   依赖: echarts npm 包(已通过 esbuild 打包到 main.js 中)
   兼容性: 设置 window.echarts 以支持旧代码中的 window.echarts 引用
   同步接口: ensureEcharts 是同步函数(非异步)，因为 echarts 已通过 import 同步可用
   关联模块: src/panel/interacts/chart-interact.js(图表交互)、src/tasks/process/calcul-chart-process.js(图表数据处理)
*/

//  <!-- SYNC_COMMENTS_END -->
/**
 * 文件：src/echarts/echarts.js
 * 描述：ECharts 封装模块——导入 ECharts 库并确保全局可用，兼容旧代码中 window.echarts 引用
 * 所属模块：echarts
 * 依赖：echarts（npm 包）
 * 对外导出：echarts（命名导出），ensureEcharts（工具函数）
 *
 * @module echarts
 */

// src/echarts/echarts-utils.js
// 直接导入打包的 ECharts，无需动态加载
import * as echarts from "echarts";

// 确保全局可用（兼容旧代码中 window.echarts 引用）
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
	// 立即调用，因为 echarts 已同步可用
	if (typeof callback === "function") {
		callback(echarts);
	}
}
