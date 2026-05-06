// ============================================================================
// 隐藏按钮栏 (Hide/Filter Toggle Bar)
// ============================================================================
// 功能：提供任务视图的显隐控制按钮，用于切换日历视图、图表视图、甘特图、
//       文件夹分组、已过期任务隐藏等视觉元素的显示状态。
// 依赖：无
// 调用方：panel.js - 各视图初始化时调用 buildHidePanel
// ============================================================================

/**
 * 构建隐藏/显隐控制面板
 * @param {HTMLElement} container - 父容器
 * @param {Object} dv - Dataview 实例
 * @param {Object} state - 全局状态对象
 * @returns {HTMLElement} 控制面板 DOM 元素
 */
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
