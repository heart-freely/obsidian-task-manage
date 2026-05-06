// ============================================================================
// 控制按钮栏 (Control Button Bar)
// ============================================================================
// 功能：提供任务视图的全局控制按钮，包括刷新、间隔模式切换、循环/已完成/
//       已取消任务的显隐控制、文件夹显隐控制、以及重置清除操作。
// 依赖：CONFIG (plugin-configs.js) - 间隔模式常量
// 调用方：panel.js - 各视图初始化时调用 buildControlPanel
// ============================================================================

import { CONFIG } from "../../configs/plugin-configs";

/**
 * 构建控制按钮栏
 * @param {HTMLElement} container - 父容器
 * @param {Object} dv - Dataview 实例
 * @param {Object} state - 全局状态对象
 * @param {Object} callbacks - 回调函数集合
 * @param {Function} callbacks.onRenderAll - 重新渲染所有任务
 * @param {Function} callbacks.onToggleFolders - 切换文件夹显隐
 * @param {Function} callbacks.onResetAndClear - 重置并清除
 * @returns {HTMLElement} 控制栏 DOM 元素
 */
export function buildControlPanel(container, dv, state, callbacks = {}) {
	const ctrlRow = dv.el("div", "");
	ctrlRow.style.cssText =
		"display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;";

	// ── 刷新按钮 ──────────────────────────────────────────────────────
	// 无条件重新渲染所有任务视图
	const refreshBtn = dv.el("button", "🔄 刷新", { cls: "quick-btn" });
	refreshBtn.onclick = () => {
		if (callbacks.onRenderAll) callbacks.onRenderAll();
	};
	ctrlRow.appendChild(refreshBtn);

	// ── 间隔模式切换按钮 ──────────────────────────────────────────────
	// 在「计划-截止」与「开始-完成」两种日期交集模式间切换
	const intervalBtn = dv.el(
		"button",
		state.intervalMode !== CONFIG.INTERVAL_MODES.SCHEDULED_DUE
			? "⏱️ 开始-完成"
			: "⏱️ 计划-截止",
		{
			cls:
				"quick-btn" +
				(state.intervalMode !== CONFIG.INTERVAL_MODES.SCHEDULED_DUE
					? " quick-btn-active"
					: ""),
		},
	);
	intervalBtn.onclick = () => {
		state.intervalMode =
			state.intervalMode === CONFIG.INTERVAL_MODES.SCHEDULED_DUE
				? CONFIG.INTERVAL_MODES.STARTS_DONE
				: CONFIG.INTERVAL_MODES.SCHEDULED_DUE;
		intervalBtn.textContent =
			state.intervalMode === CONFIG.INTERVAL_MODES.SCHEDULED_DUE
				? "⏱️ 计划-截止"
				: "⏱️ 开始-完成";
		intervalBtn.classList.toggle(
			"quick-btn-active",
			state.intervalMode !== CONFIG.INTERVAL_MODES.SCHEDULED_DUE,
		);
		state.filterCache.fingerprint = "";
		if (callbacks.onRenderAll) callbacks.onRenderAll();
	};
	ctrlRow.appendChild(intervalBtn);

	// ── 循环任务显隐按钮 ──────────────────────────────────────────────
	// 控制是否显示循环任务，初始状态为显示（不隐藏）
	const repeatBtn = dv.el(
		"button",
		state.hideRepeatTasks ? "🔄 显示循环" : "🔄 隐藏循环",
		{
			cls:
				"quick-btn" +
				(!state.hideRepeatTasks ? " quick-btn-active" : ""),
		},
	);
	repeatBtn.onclick = () => {
		state.hideRepeatTasks = !state.hideRepeatTasks;
		repeatBtn.textContent = state.hideRepeatTasks
			? "🔄 显示循环"
			: "🔄 隐藏循环";
		repeatBtn.classList.toggle("quick-btn-active", !state.hideRepeatTasks);
		state.filterCache.fingerprint = "";
		if (callbacks.onRenderAll) callbacks.onRenderAll();
	};
	ctrlRow.appendChild(repeatBtn);

	// ── 已完成任务显隐按钮 ────────────────────────────────────────────
	// 控制是否显示已完成任务，初始状态为显示
	const completedBtn = dv.el(
		"button",
		state.hideCompletedTasks ? "✅ 显示已完成" : "✅ 隐藏已完成",
		{
			cls:
				"quick-btn" +
				(!state.hideCompletedTasks ? " quick-btn-active" : ""),
		},
	);
	completedBtn.onclick = () => {
		state.hideCompletedTasks = !state.hideCompletedTasks;
		completedBtn.textContent = state.hideCompletedTasks
			? "✅ 显示已完成"
			: "✅ 隐藏已完成";
		completedBtn.classList.toggle(
			"quick-btn-active",
			!state.hideCompletedTasks,
		);
		state.filterCache.fingerprint = "";
		if (callbacks.onRenderAll) callbacks.onRenderAll();
	};
	ctrlRow.appendChild(completedBtn);

	// ── 已取消任务显隐按钮 ────────────────────────────────────────────
	// 控制是否显示已取消任务，初始状态为显示
	const cancelledBtn = dv.el(
		"button",
		state.hideCancelledTasks ? "❎ 显示已取消" : "❎ 隐藏已取消",
		{
			cls:
				"quick-btn" +
				(!state.hideCancelledTasks ? " quick-btn-active" : ""),
		},
	);
	cancelledBtn.onclick = () => {
		state.hideCancelledTasks = !state.hideCancelledTasks;
		cancelledBtn.textContent = state.hideCancelledTasks
			? "❎ 显示已取消"
			: "❎ 隐藏已取消";
		cancelledBtn.classList.toggle(
			"quick-btn-active",
			!state.hideCancelledTasks,
		);
		state.filterCache.fingerprint = "";
		if (callbacks.onRenderAll) callbacks.onRenderAll();
	};
	ctrlRow.appendChild(cancelledBtn);

	// ── 文件夹显隐按钮 ────────────────────────────────────────────────
	// 控制是否按文件夹分组显示，初始状态为显示文件夹
	const folderBtn = dv.el(
		"button",
		state.hideFolders ? "📂 显示文件夹" : "📁 隐藏文件夹",
		{ cls: "quick-btn" + (!state.hideFolders ? " quick-btn-active" : "") },
	);
	folderBtn.onclick = () => {
		state.hideFolders = !state.hideFolders;
		folderBtn.textContent = state.hideFolders
			? "📂 显示文件夹"
			: "📁 隐藏文件夹";
		folderBtn.classList.toggle("quick-btn-active", !state.hideFolders);
		if (callbacks.onToggleFolders) callbacks.onToggleFolders();
	};
	ctrlRow.appendChild(folderBtn);

	// ── 重置并清除按钮 ────────────────────────────────────────────────
	// 重置所有筛选条件并清除当前视图
	const resetClearBtn = dv.el("button", "🗑️ 重置并清除", {
		cls: "quick-btn",
	});
	resetClearBtn.onclick = () => {
		if (callbacks.onResetAndClear) callbacks.onResetAndClear();
	};
	ctrlRow.appendChild(resetClearBtn);

	container.appendChild(ctrlRow);
	return ctrlRow;
}
