//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file src/panel/interacts/chart-interact.js - 图表区交互模块，提供 Alt+滚轮缩放、分隔条拖拽、ResizeObserver 自适应 */
/* @skill-api
   common-process: throttleByFrame (节流函数)
   state: chartScale, chartInstances, leftPanelWidth, resizeObserver
   collapsedNodes: 折叠节点映射表
   saveFilterState: 持久化保存回调
*/
/* @skill-func
   initChartInteractions(chartDiv, resizer, leftDiv, state, collapsedNodes, saveFilterState) : Function
   - 初始化图表交互（缩放、拖拽、resize 监听）
   - 返回 cleanup 函数用于卸载
*/
/* @skill-flow
   initChartInteractions()
   → 注册 Alt+wheel 缩放(节流) → 显示缩放提示 5s 后消失
   → 注册分隔条 mousedown → 全局 mousemove/mouseup 拖拽逻辑
   → 创建 ResizeObserver 监听 chartDiv 变化
   → 返回 cleanup 函数
*/
/* @skill-condition
   Alt+wheel: e.altKey 检测 + deltaY 正负 / chartScale 范围 0.5~3
   分隔条: startWidth 记录 + 限制 200~600px
   ResizeObserver: 防抖 150ms 调用 chart.resize()
   cleanup 清理: wheel / mousedown / mousemove / resizeObserver
*/
//  <!-- SYNC_COMMENTS_END -->

import { throttleByFrame } from "../../tasks/process/common-process";

/**
 * 初始化图表区域的交互（缩放、拖拽分隔条、ResizeObserver）
 *
 * @param {HTMLElement} chartDiv - 图表容器 DOM 元素
 * @param {HTMLElement} resizer - 分隔条元素，拖拽改变左右面板宽度
 * @param {HTMLElement} leftDiv - 左侧面板元素，宽度会在拖拽中变化
 * @param {Object} state - 全局状态对象（含 chartScale、chartInstances、leftPanelWidth）
 * @param {Object} collapsedNodes - 折叠节点映射表
 * @param {Function} saveFilterState - 持久化保存回调
 * @returns {Function} cleanup - 清理函数，卸载所有事件监听和 ResizeObserver
 */
export function initChartInteractions(
	chartDiv,
	resizer,
	leftDiv,
	state,
	collapsedNodes,
	saveFilterState,
) {
	// ---------- 缩放更新 ----------
	/** 更新所有 .chart-body 元素的 CSS transform scale */
	function updateChartScale() {
		document.querySelectorAll(".chart-body").forEach((b) => {
			b.style.transform = "scale(" + state.chartScale + ")";
		});
	}

	// ---------- 图表实例 resize（防抖）----------
	let chartResizeTimer = null;
	/**
	 * 防抖处理所有图表实例的 resize 调用
	 * 避免频繁触发 resize 导致性能问题
	 */
	function debouncedResize() {
		if (chartResizeTimer) clearTimeout(chartResizeTimer);
		chartResizeTimer = setTimeout(() => {
			state.chartInstances.forEach((c) => {
				try {
					c.resize();
				} catch (e) {}
			});
		}, 150);
	}

	// ---------- Alt + 滚轮缩放 ----------
	/**
	 * Alt + 滚轮缩放图表
	 * 使用 requestAnimationFrame 节流，避免高频触发
	 */
	const onWheel = (e) => {
		if (!e.altKey) return;
		e.preventDefault(); // 阻止页面滚动
		if (!onWheel._throttleHandle) {
			// 节流处理缩放计算
			onWheel._throttleHandle = throttleByFrame((evt) => {
				const delta = evt.deltaY > 0 ? -0.1 : 0.1;
				state.chartScale = Math.max(
					0.5,
					Math.min(3, state.chartScale + delta),
				);
				updateChartScale();
				debouncedResize();
				saveFilterState(state, collapsedNodes);
			});
		}
		onWheel._throttleHandle(e);
	};
	chartDiv.addEventListener("wheel", onWheel, { passive: false });

	// ---------- 缩放提示 ----------
	const hint = document.createElement("div");
	hint.className = "scale-hint";
	hint.textContent = "Alt+滚轮缩放";
	chartDiv.appendChild(hint);
	setTimeout(() => {
		hint.style.opacity = "0";
		setTimeout(() => hint.remove(), 500);
	}, 5000);

	// ---------- 分隔条拖拽 ----------
	let startX, startWidth;
	/** 分隔条 mousedown：记录起始位置并绑定全局 move/up 事件 */
	const onMouseDown = (e) => {
		startX = e.clientX;
		startWidth = leftDiv.offsetWidth;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp, { once: true });
	};
	/** 全局 mousemove：计算宽度变化并更新左面板宽度 */
	const onMouseMove = (e) => {
		const dx = e.clientX - startX;
		const newW = Math.max(200, Math.min(600, startWidth + dx));
		leftDiv.style.width = newW + "px";
		state.leftPanelWidth = newW;
		debouncedResize();
	};
	/** 全局 mouseup：重置样式并持久化 */
	const onMouseUp = (e) => {
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
		window.removeEventListener("mousemove", onMouseMove);
		saveFilterState(state, collapsedNodes);
	};
	resizer.addEventListener("mousedown", onMouseDown);

	// ---------- ResizeObserver ----------
	if (state.resizeObserver) state.resizeObserver.disconnect();
	state.resizeObserver = new ResizeObserver(() => {
		debouncedResize();
	});
	state.resizeObserver.observe(chartDiv);

	// ---------- 清理 ----------
	/**
	 * 清理函数：移除所有事件监听和 ResizeObserver
	 * @returns {void}
	 */
	return function cleanup() {
		chartDiv.removeEventListener("wheel", onWheel);
		resizer.removeEventListener("mousedown", onMouseDown);
		window.removeEventListener("mousemove", onMouseMove);
		if (state.resizeObserver) {
			state.resizeObserver.disconnect();
			state.resizeObserver = null;
		}
	};
}
