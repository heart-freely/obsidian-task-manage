// ============================================================================
// 快速日期筛选面板 (Quick Date Filter Panel)
// ============================================================================
// 功能：提供常用日期范围的快速筛选按钮（今天、昨天、本周、本月等），
//       以及上周/下周、上月/下月的快捷切换。支持从缓存状态恢复按钮高亮。
// 依赖：DateUtils (common-process.js) - 日期范围计算工具
// 调用方：panel.js - 各视图初始化时调用 buildQuickDatePanel
// ============================================================================

import { DateUtils } from "../../tasks/process/common-process";

/**
 * 清除所有快速日期按钮的高亮样式
 * @param {Object} state - 全局状态对象（需包含 quickBtns 数组）
 */
export function clearQuickHighlights(state) {
	state.quickBtns.forEach((b) => (b.className = "quick-btn"));
}

/**
 * 重置快速日期 UI（清除高亮状态）
 * @param {Object} state - 全局状态对象
 */
export function resetQuickDateUI(state) {
	clearQuickHighlights(state);
}

/**
 * 从缓存状态恢复某个快速按钮的高亮样式
 * @param {Object} state - 全局状态对象（需包含 quickBtns 数组）
 * @param {string} label - 要恢复高亮的按钮文本（如 "今天"、"本周"）
 */
export function restoreQuickButton(state, label) {
	if (!label) return;
	state.quickBtns.forEach((b) => {
		b.className =
			b.textContent === label
				? "quick-btn quick-btn-active"
				: "quick-btn";
	});
}

/**
 * 构建快速日期筛选面板
 * @param {HTMLElement} container - 父容器
 * @param {Object} dv - Dataview 实例
 * @param {Object} state - 全局状态对象（需包含 quickBtns, dateState, dateFilterState, filterCache, activeQuickBtn 等）
 * @param {Object} [callbacks] - 可选的回调函数集合
 * @param {Function} [callbacks.onQuery] - 执行查询回调
 * @returns {void} 直接修改 container 内容
 */

export function buildQuickDatePanel(container, dv, state, callbacks = {}) {
	container.style.cssText =
		"display:flex; align-items:center; flex-wrap:wrap; gap:8px;";

	const quickDefs = [
		{ label: "今天", range: () => DateUtils.getDayRange(new Date()) },
		{
			label: "昨天",
			range: () => {
				const d = new Date();
				d.setDate(d.getDate() - 1);
				return DateUtils.getDayRange(d);
			},
		},
		{
			label: "明天",
			range: () => {
				const d = new Date();
				d.setDate(d.getDate() + 1);
				return DateUtils.getDayRange(d);
			},
		},
		{ label: "本周", range: () => DateUtils.getWeekRange(new Date()) },
		{ label: "本月", range: () => DateUtils.getMonthRange(new Date()) },
		{ label: "所有任务", range: null },
	];
	state.quickBtns = [];

	quickDefs.forEach((def) => {
		const btn = dv.el("button", def.label, { cls: "quick-btn" });
		btn.onclick = () => {
			clearQuickHighlights(state);
			btn.classList.add("quick-btn-active");
			state.activeQuickBtn = def.label;
			state.dateState.selections = {
				years: {},
				quarters: {},
				months: {},
				weeks: {},
				weekdays: {},
			};
			if (def.label === "所有任务") {
				state.dateFilterState.isAll = true;
				state.dateFilterState.start = state.dateFilterState.end = null;
			} else {
				state.dateFilterState.isAll = false;
				const r = def.range();
				state.dateFilterState.start = r.start;
				state.dateFilterState.end = r.end;
			}
			state.filterCache.fingerprint = "";
		};
		container.appendChild(btn);
		state.quickBtns.push(btn);

		if (def.label === "本周") {
			const prevBtn = dv.el("button", "上周", { cls: "quick-btn" });
			prevBtn.onclick = () => {
				clearQuickHighlights(state);
				state.activeQuickBtn = "上周";
				const now = new Date();
				now.setDate(now.getDate() - 7);
				const r = DateUtils.getWeekRange(now);
				state.dateFilterState.isAll = false;
				state.dateFilterState.start = r.start;
				state.dateFilterState.end = r.end;
				state.filterCache.fingerprint = "";
				prevBtn.classList.add("quick-btn-active");
			};
			container.appendChild(prevBtn);
			state.quickBtns.push(prevBtn);
			const nextBtn = dv.el("button", "下周", { cls: "quick-btn" });
			nextBtn.onclick = () => {
				clearQuickHighlights(state);
				state.activeQuickBtn = "下周";
				const now = new Date();
				now.setDate(now.getDate() + 7);
				const r = DateUtils.getWeekRange(now);
				state.dateFilterState.isAll = false;
				state.dateFilterState.start = r.start;
				state.dateFilterState.end = r.end;
				state.filterCache.fingerprint = "";
				nextBtn.classList.add("quick-btn-active");
			};
			container.appendChild(nextBtn);
			state.quickBtns.push(nextBtn);
		}

		if (def.label === "本月") {
			const prevBtn = dv.el("button", "上月", { cls: "quick-btn" });
			prevBtn.onclick = () => {
				clearQuickHighlights(state);
				state.activeQuickBtn = "上月";
				const now = new Date();
				now.setMonth(now.getMonth() - 1);
				const r = DateUtils.getMonthRange(now);
				state.dateFilterState.isAll = false;
				state.dateFilterState.start = r.start;
				state.dateFilterState.end = r.end;
				state.filterCache.fingerprint = "";
				prevBtn.classList.add("quick-btn-active");
			};
			container.appendChild(prevBtn);
			state.quickBtns.push(prevBtn);
			const nextBtn = dv.el("button", "下月", { cls: "quick-btn" });
			nextBtn.onclick = () => {
				clearQuickHighlights(state);
				state.activeQuickBtn = "下月";
				const now = new Date();
				now.setMonth(now.getMonth() + 1);
				const r = DateUtils.getMonthRange(now);
				state.dateFilterState.isAll = false;
				state.dateFilterState.start = r.start;
				state.dateFilterState.end = r.end;
				state.filterCache.fingerprint = "";
				nextBtn.classList.add("quick-btn-active");
			};
			container.appendChild(nextBtn);
			state.quickBtns.push(nextBtn);
		}
	});

	// 执行查询按钮（不高亮）
	const queryBtn = dv.el("button", "🔍 执行查询", {
		cls: "quick-btn",
		style: "margin-left:auto;",
	});
	queryBtn.onclick = () => {
		if (callbacks.onQuery) callbacks.onQuery();
	};
	container.appendChild(queryBtn);

	if (state.activeQuickBtn) restoreQuickButton(state, state.activeQuickBtn);
}
