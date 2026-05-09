//  <!-- SYNC_COMMENTS_START -->
/**
 * 文件：src/panel/bars/hide-botton-bar.js
 * 描述：显隐控制面板，切换日历/图表/甘特图/文件树/过期/未到期任务的显示状态
 * 所属模块：panel/bars
 * 依赖：
 *   - panel.js: 全局状态 state（hideCalendar, hideChart, hideGantt, hideFileTree, hideOverdueTasks, hideNotDueTasks, filterCache）
 * 对外导出：buildHidePanel, buildHideButtons
 * 注意事项：过期/未到期 toggle 影响筛选结果需清空 filterCache；日历/图表/甘特图/文件树仅 UI 显隐
 * @see .cline/skills/code/panel/bars/hide-botton-bar.md
 */

/* @skill-sig file src/panel/bars/hide-botton-bar.js - 显隐控制面板，切换日历/图表/甘特图/文件树/过期/未到期任务的显示状态 */
/* @skill-api
   panel.js (全局状态 state)
   state.hideCalendar / state.hideChart / state.hideGantt / state.hideFileTree
   state.hideOverdueTasks / state.hideNotDueTasks
   state.filterCache.fingerprint
*/
/* @skill-state
   state.hideCalendar : boolean   // 是否隐藏日历视图
   state.hideChart : boolean      // 是否隐藏图表视图
   state.hideGantt : boolean      // 是否隐藏甘特图视图
   state.hideFileTree : boolean   // 是否隐藏文件树视图
   state.hideOverdueTasks : boolean  // 是否隐藏已过期任务
   state.hideNotDueTasks : boolean   // 是否隐藏未到期任务
   state.filterCache.fingerprint : string  // 显隐变化后需清空
*/
/* @skill-func
   buildHidePanel(container, dv, state) : HTMLElement - 构建显隐控制面板，包含6个切换按钮
   buildHideButtons : HTMLElement - buildHidePanel 的别名导出
*/
/* @skill-dom
   .hide-row (容器 display:flex gap:12px)
   button.quick-btn / button.quick-btn-active
     📅 隐藏日历 | 📊 隐藏图表 | 📈 隐藏甘特图 | 📁 隐藏文件树 | ⏰ 隐藏过期 | 📆 隐藏未到期
*/
/* @skill-flow
   buildHidePanel(container, dv, state)
   创建 hideRow → 创建 6 个按钮，根据 state 初始化文本和激活样式
   → 每个按钮绑定 onclick 切换对应 state 属性
   → 同时切换按钮文本（显示/隐藏）和 active 样式
   → 过期/未到期按钮额外清空 filterCache.fingerprint
*/
/* @skill-condition
   按钮文本随 state 联动: state.hideXxx=true → "显示Xxx"，false → "隐藏Xxx"
   quick-btn-active 类名: !state.hideXxx 时添加
   过期和未到期 toggle 影响筛选结果 → 清空 filterCache.fingerprint
   日历/图表/甘特图/文件树 toggle 仅影响显隐 → 不清空缓存
*/
//  <!-- SYNC_COMMENTS_END -->

// @skill-anchor buildHidePanel - 显隐控制面板主入口，创建日历/图表/甘特图/文件树/过期/未到期6个切换按钮
export function buildHidePanel(container, dv, state) {
	const hideRow = dv.el("div", "");
	hideRow.style.cssText =
		"display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;";

	// ── 日历显隐按钮 ──────────────────────────────────────────────────
	// 控制日历视图的显示/隐藏
	const calendarBtn = dv.el(
		"button",
		state.hideCalendar ? "📅 显示日历" : "📅 隐藏日历",
		{ cls: "quick-btn" + (!state.hideCalendar ? " quick-btn-active" : "") },
	);
	calendarBtn.onclick = () => {
		state.hideCalendar = !state.hideCalendar;
		calendarBtn.textContent = state.hideCalendar
			? "📅 显示日历"
			: "📅 隐藏日历";
		calendarBtn.classList.toggle("quick-btn-active", !state.hideCalendar);
	};
	hideRow.appendChild(calendarBtn);

	// ── 图表显隐按钮 ──────────────────────────────────────────────────
	// 控制图表（echarts）视图的显示/隐藏
	const chartBtn = dv.el(
		"button",
		state.hideChart ? "📊 显示图表" : "📊 隐藏图表",
		{ cls: "quick-btn" + (!state.hideChart ? " quick-btn-active" : "") },
	);
	chartBtn.onclick = () => {
		state.hideChart = !state.hideChart;
		chartBtn.textContent = state.hideChart ? "📊 显示图表" : "📊 隐藏图表";
		chartBtn.classList.toggle("quick-btn-active", !state.hideChart);
	};
	hideRow.appendChild(chartBtn);

	// ── 甘特图显隐按钮 ────────────────────────────────────────────────
	// 控制甘特图视图的显示/隐藏
	const ganttBtn = dv.el(
		"button",
		state.hideGantt ? "📈 显示甘特图" : "📈 隐藏甘特图",
		{ cls: "quick-btn" + (!state.hideGantt ? " quick-btn-active" : "") },
	);
	ganttBtn.onclick = () => {
		state.hideGantt = !state.hideGantt;
		ganttBtn.textContent = state.hideGantt
			? "📈 显示甘特图"
			: "📈 隐藏甘特图";
		ganttBtn.classList.toggle("quick-btn-active", !state.hideGantt);
	};
	hideRow.appendChild(ganttBtn);

	// ── 文件树显隐按钮 ────────────────────────────────────────────────
	// 控制文件树（文件夹分组）视图的显示/隐藏
	const folderBtn = dv.el(
		"button",
		state.hideFileTree ? "📁 显示文件树" : "📁 隐藏文件树",
		{
			cls: "quick-btn" + (!state.hideFileTree ? " quick-btn-active" : ""),
		},
	);
	folderBtn.onclick = () => {
		state.hideFileTree = !state.hideFileTree;
		folderBtn.textContent = state.hideFileTree
			? "📁 显示文件树"
			: "📁 隐藏文件树";
		folderBtn.classList.toggle("quick-btn-active", !state.hideFileTree);
	};
	hideRow.appendChild(folderBtn);

	// ── 已过期任务显隐按钮 ────────────────────────────────────────────
	// 控制是否显示已过期任务
	const overdueBtn = dv.el(
		"button",
		state.hideOverdueTasks ? "⏰ 显示过期" : "⏰ 隐藏过期",
		{
			cls:
				"quick-btn" +
				(!state.hideOverdueTasks ? " quick-btn-active" : ""),
		},
	);
	overdueBtn.onclick = () => {
		state.hideOverdueTasks = !state.hideOverdueTasks;
		overdueBtn.textContent = state.hideOverdueTasks
			? "⏰ 显示过期"
			: "⏰ 隐藏过期";
		overdueBtn.classList.toggle(
			"quick-btn-active",
			!state.hideOverdueTasks,
		);
		state.filterCache.fingerprint = "";
	};
	hideRow.appendChild(overdueBtn);

	// ── 未到期任务显隐按钮 ────────────────────────────────────────────
	// 控制是否显示未到期任务
	const notDueBtn = dv.el(
		"button",
		state.hideNotDueTasks ? "📆 显示未到期" : "📆 隐藏未到期",
		{
			cls:
				"quick-btn" +
				(!state.hideNotDueTasks ? " quick-btn-active" : ""),
		},
	);
	notDueBtn.onclick = () => {
		state.hideNotDueTasks = !state.hideNotDueTasks;
		notDueBtn.textContent = state.hideNotDueTasks
			? "📆 显示未到期"
			: "📆 隐藏未到期";
		notDueBtn.classList.toggle("quick-btn-active", !state.hideNotDueTasks);
		state.filterCache.fingerprint = "";
	};
	hideRow.appendChild(notDueBtn);

	container.appendChild(hideRow);
	return hideRow;
}

// @skill-anchor buildHideButtons - buildHidePanel 的别名导出（兼容旧引用）
export const buildHideButtons = buildHidePanel;
