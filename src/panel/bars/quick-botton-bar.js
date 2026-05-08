//  <!-- SYNC_COMMENTS_START -->
// ============================================================================
// 快速日期筛选面板 (Quick Date Filter Panel)
// ============================================================================
// 功能：提供常用日期范围的快速筛选按钮（今天、昨天、本周、本月等），
//       以及上周/下周、上月/下月的快捷切换。支持从缓存状态恢复按钮高亮。
// 依赖：DateUtils (common-process.js) - 日期范围计算工具
// 调用方：panel.js - 各视图初始化时调用 buildQuickDatePanel
// ============================================================================

/* @skill-sig file src/panel/bars/quick-botton-bar.js - 快速日期筛选面板，提供常用日期范围的快速筛选按钮及缓存状态恢复 */
/* @skill-api
   DateUtils (common-process.js) - getDayRange / getWeekRange / getMonthRange 日期范围计算工具
   panel.js (全局状态 state 和回调 callbacks)
   state.quickBtns / state.activeQuickBtn / state.dateState.selections / state.dateFilterState (isAll, start, end) / state.filterCache.fingerprint
   callbacks.onQuery - 执行查询回调
*/
/* @skill-state
   state.quickBtns          : HTMLElement[] // 当前面板所有快速按钮的引用数组
   state.activeQuickBtn     : string|null   // 当前高亮的按钮文本（如 "今天"）
   state.dateState.selections : Object      // 日期选择器状态（年/季/月/周/周日）
   state.dateFilterState    : { isAll, start, end } // 日期筛选条件
   state.filterCache.fingerprint : string    // 筛选缓存指纹，切换后清空
*/
/* @skill-func
   clearQuickHighlights(state) : void                 - 清除所有按钮的 quick-btn-active 类
   resetQuickDateUI(state)     : void                 - 重置快速日期 UI（调用 clearQuickHighlights）
   restoreQuickButton(state, label) : void            - 根据 label 恢复指定按钮的高亮样式
   buildQuickDatePanel(container, dv, state, callbacks) : void - 构建面板，渲染按钮并绑定事件
*/
/* @skill-dom
   .quick-bar (容器 flex-wrap:wrap gap:8px)
   button.quick-btn / button.quick-btn-active
     今天 | 昨天 | 明天 | 本周 上周 下周 | 本月 上月 下月 | 所有任务
*/
/* @skill-flow
   buildQuickDatePanel(container, dv, state, callbacks)
   定义 quickDefs 按钮配置数组 → 遍历创建按钮 → 本周/本月附近附加上周/下周/上月/下月 → 追加"执行查询"按钮 → 若 state.activeQuickBtn 非空则 restoreQuickButton
   点击按钮 → clearQuickHighlights → 按钮添加 active 类 → 设置 dateFilterState 范围 → 清空 filterCache.fingerprint
*/
/* @skill-condition
   按钮 label="所有任务" 时 → dateFilterState.isAll=true, start/end=null
   点击上周/下周 → 当前日期 ±7 天后再计算周范围
   点击上月/下月 → 当前月份 ±1 个月后再计算月范围
   state.activeQuickBtn 残留 → 面板重建后自动恢复该按钮高亮
*/
//  <!-- SYNC_COMMENTS_END -->

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
