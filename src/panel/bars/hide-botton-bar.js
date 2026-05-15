export function buildHidePanel(container, dv, state) {
	const hideRow = dv.el("div", "");
	hideRow.style.cssText =
		"display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;";

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

export const buildHideButtons = buildHidePanel;
