import { CONFIG } from "../../configs/plugin-configs";
import { echarts } from "../../echarts/echarts";
import {
	calcActualDuration,
	calcPlannedDuration,
	calcTotalSpanHours,
	prepareDailyStatusStack,
} from "../../tasks/process/calcul-chart-process";

/* @auto-flow
   drawCharts(container, tasks, context) → 清空容器（空则显示占位） → 清理旧 chartInstances → 创建 grid 容器 → 创建 10 个图表项（状态/优先级/循环/日期/依赖/标签/计划时长/执行时长/执行对比/状态堆叠柱状图） → 绑定 zoom 按钮弹窗事件 → 延迟 resize → 结束
*/

/* @auto-condition
   若 tasks 为空数组 → 显示 "📭 无任务数据"
   若某统计维度数据全部为 0 → 该图表渲染 "无数据" 占位扇形
*/

/* @auto-dom
  div.chart-grid (CSS Grid 布局)
    div.chart-item[style*="gridColumn: span N"]
      div.chart-header
        span (图表标题)
        button.zoom-btn (放大按钮，仅状态堆叠图有)
      div.chart-body (ECharts 挂载点)
*/

/* @auto-api
  echarts.init, setOption, dispose, resize (echarts)
  CONFIG.ALLOWED_STATUSES, PRIORITY_ORDER, REPEAT_ORDER, DATE_MARK_ORDER, STATUS_ICONS etc. (plugin-configs)
  calcPlannedDuration, calcActualDuration, calcTotalSpanHours, prepareDailyStatusStack (calcul-chart-process)
  context.dv, state, formatDate, setStart, setEnd, getEffectiveDateRange
*/

export function drawCharts(container, tasks, context) {
	const { dv, state, formatDate, setStart, setEnd, getEffectiveDateRange } =
		context;

	container.innerHTML = "";
	if (!tasks.length) {
		container.appendChild(
			dv.el("div", "📭 无任务数据", { cls: "empty-message" }),
		);
		return;
	}

	if (!Array.isArray(state.chartInstances)) state.chartInstances = [];
	state.chartInstances.forEach((c) => {
		try {
			c.dispose();
		} catch (e) {}
	});
	state.chartInstances = [];

	const grid = dv.el("div", "", { cls: "chart-grid" });
	container.appendChild(grid);
	const theme = getComputedStyle(document.body);
	const textColor = theme.getPropertyValue("--text-normal") || "#333";
	const bgColor = theme.getPropertyValue("--background-primary") || "#fff";

	function createChartItem(title, showZoom, spanCols) {
		if (showZoom === undefined) showZoom = false;
		if (spanCols === undefined) spanCols = 1;
		const item = dv.el("div", "", { cls: "chart-item" });
		if (spanCols > 1) item.style.gridColumn = "span " + spanCols;
		const header = dv.el("div", "", { cls: "chart-header" });
		header.appendChild(
			dv.el("span", title, {
				style: "font-weight:bold;color:" + textColor,
			}),
		);
		if (showZoom) {
			const zoomBtn = dv.el("button", "🔍", { cls: "zoom-btn" });
			header.appendChild(zoomBtn);
			item._zoomBtn = zoomBtn;
		}
		item.appendChild(header);
		const chartDiv = dv.el("div", "", { cls: "chart-body" });
		item.appendChild(chartDiv);
		grid.appendChild(item);
		return { chartDiv, item };
	}

	function makePieOption(data) {
		return {
			backgroundColor: bgColor,
			textStyle: { color: textColor },
			tooltip: { trigger: "item" },
			legend: {
				orient: "horizontal",
				bottom: 0,
				textStyle: { color: textColor, fontSize: 10 },
			},
			series: [
				{
					type: "pie",
					data: data.length
						? data
						: [
								{
									name: "无数据",
									value: 1,
									itemStyle: { color: "#ccc" },
								},
							],
					radius: ["40%", "65%"],
					label: {
						show: true,
						color: textColor,
						fontSize: 10,
						formatter: "{b}\n{d}%",
					},
					itemStyle: { borderRadius: 4 },
				},
			],
		};
	}

	function openChartModal(chartInst) {
		if (!echarts || state.modalOpen) return;
		state.modalOpen = true;
		if (state.tooltipDiv) state.tooltipDiv.style.display = "none";
		const modal = document.createElement("div");
		modal.style.cssText =
			"position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;";
		const closeBtn = document.createElement("button");
		closeBtn.textContent = "✖";
		closeBtn.style.cssText =
			"position:absolute;top:20px;right:30px;font-size:24px;background:transparent;border:none;color:white;cursor:pointer;";
		const chartDiv = document.createElement("div");
		chartDiv.style.width = "90vw";
		chartDiv.style.height = "90vh";
		modal.appendChild(chartDiv);
		modal.appendChild(closeBtn);
		function closeModal() {
			modal.remove();
			newInst.dispose();
			state.modalOpen = false;
		}
		closeBtn.onclick = closeModal;
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeModal();
		});
		document.body.appendChild(modal);
		const newInst = echarts.init(chartDiv);
		const opt = chartInst.getOption();
		opt.tooltip = { show: false };
		newInst.setOption(opt);
	}

	const statusCounts = {};
	CONFIG.ALLOWED_STATUSES.forEach((s) => (statusCounts[s] = 0));
	const prioCounts = {};
	CONFIG.PRIORITY_ORDER.forEach((p) => (prioCounts[p] = 0));
	const repeatCounts = {};
	CONFIG.REPEAT_ORDER.forEach((r) => (repeatCounts[r] = 0));
	const dateCounts = {};
	CONFIG.DATE_MARK_ORDER.forEach((m) => (dateCounts[m] = 0));
	let idCnt = 0,
		forbidCnt = 0,
		bothCnt = 0;
	const tagMap = {};
	tasks.forEach((t) => {
		statusCounts[t._status]++;
		if (t._priorityIcon) prioCounts[t._priorityIcon]++;
		if (t._repeat) {
			CONFIG.REPEAT_ORDER.forEach((r) => {
				if (t._repeat.toLowerCase().includes(r)) repeatCounts[r]++;
			});
		}
		CONFIG.DATE_MARK_ORDER.forEach((m) => {
			if (t["_" + m]) dateCounts[m]++;
		});
		const hi = !!t._id,
			hf = !!t._forbid;
		if (hi && hf) bothCnt++;
		else if (hi) idCnt++;
		else if (hf) forbidCnt++;
		if (t._tag) tagMap[t._tag] = (tagMap[t._tag] || 0) + 1;
	});

	const ch1 = createChartItem("📊 执行状态");
	const i1 = echarts.init(ch1.chartDiv);
	i1.setOption(
		makePieOption(
			CONFIG.ALLOWED_STATUSES.map((s) => ({
				name: CONFIG.STATUS_ICONS[s] + " " + CONFIG.STATUS_NAMES[s],
				value: statusCounts[s],
				itemStyle: { color: CONFIG.STATUS_COLORS[s] },
			})).filter((d) => d.value > 0),
		),
	);
	state.chartInstances.push(i1);

	const ch2 = createChartItem("🎯 优先级");
	const i2 = echarts.init(ch2.chartDiv);
	i2.setOption(
		makePieOption(
			CONFIG.PRIORITY_ORDER.map((p, i) => ({
				name: p,
				value: prioCounts[p] || 0,
				itemStyle: { color: CONFIG.PRIORITY_COLORS[i] },
			})).filter((d) => d.value > 0),
		),
	);
	state.chartInstances.push(i2);

	const ch3 = createChartItem("🔄 循环周期");
	const i3 = echarts.init(ch3.chartDiv);
	i3.setOption(
		makePieOption(
			CONFIG.REPEAT_ORDER.map((r, i) => ({
				name: "🔁 " + r,
				value: repeatCounts[r],
				itemStyle: { color: CONFIG.REPEAT_COLORS[i] },
			})).filter((d) => d.value > 0),
		),
	);
	state.chartInstances.push(i3);

	const ch4 = createChartItem("📅 日期标记");
	const i4 = echarts.init(ch4.chartDiv);
	i4.setOption(
		makePieOption(
			CONFIG.DATE_MARK_ORDER.map((m, i) => ({
				name: CONFIG.DATE_MARK_NAMES[m],
				value: dateCounts[m],
				itemStyle: { color: CONFIG.DATE_MARK_COLORS[i] },
			})).filter((d) => d.value > 0),
		),
	);
	state.chartInstances.push(i4);

	const ch5 = createChartItem("🔗 依赖关系");
	const i5 = echarts.init(ch5.chartDiv);
	i5.setOption(
		makePieOption(
			[
				{ name: "🆔 唯一ID", value: idCnt },
				{ name: "⛔ 依赖", value: forbidCnt },
				{ name: "🆔+⛔ 两者", value: bothCnt },
			].filter((d) => d.value > 0),
		),
	);
	state.chartInstances.push(i5);

	const ch6 = createChartItem("🏷️ 标签");
	const i6 = echarts.init(ch6.chartDiv);
	i6.setOption(
		makePieOption(
			Object.keys(tagMap).map((k) => ({
				name: "🏁 " + k,
				value: tagMap[k],
			})),
		),
	);
	state.chartInstances.push(i6);

	const plannedDays = calcPlannedDuration(tasks);
	const plannedSpanHours = calcTotalSpanHours(tasks, "_scheduled", "_due");
	const actualDays = calcActualDuration(tasks);
	const actualSpanHours = calcTotalSpanHours(tasks, "_starts", "_done");

	const ch7 = createChartItem("⏳ 计划时长", false);
	const i7 = echarts.init(ch7.chartDiv);
	i7.setOption(
		makePieOption([
			{ name: "计划时长(天)", value: plannedDays },
			{ name: "总跨度(时)", value: plannedSpanHours },
		]),
	);
	state.chartInstances.push(i7);

	const ch8 = createChartItem("✅ 执行时长", false);
	const i8 = echarts.init(ch8.chartDiv);
	i8.setOption(
		makePieOption([
			{ name: "执行时长(天)", value: actualDays },
			{ name: "总跨度(时)", value: actualSpanHours },
		]),
	);
	state.chartInstances.push(i8);

	const ch9 = createChartItem("⚖️ 计划执行对比", false);
	const i9 = echarts.init(ch9.chartDiv);
	i9.setOption(
		makePieOption([
			{ name: "计划时长(天)", value: plannedDays },
			{ name: "执行时长(天)", value: actualDays },
		]),
	);
	state.chartInstances.push(i9);

	const dateRange = getEffectiveDateRange();
	let chartTitle = "📊 状态详细（日）";
	if (dateRange)
		chartTitle +=
			" [" +
			formatDate(dateRange.start) +
			" ~ " +
			formatDate(dateRange.end) +
			"]";
	const ch10 = createChartItem(chartTitle, true, 3);
	const i10 = echarts.init(ch10.chartDiv);
	const stackData = prepareDailyStatusStack(
		tasks,
		dateRange,
		formatDate,
		setStart,
		setEnd,
	);
	i10.setOption({
		backgroundColor: bgColor,
		textStyle: { color: textColor },
		tooltip: { trigger: "axis" },
		legend: {
			data: stackData.statusOrder.map(
				(s) => CONFIG.STATUS_ICONS[s] + CONFIG.STATUS_NAMES[s],
			),
			bottom: 0,
			textStyle: { color: textColor },
		},
		xAxis: {
			type: "category",
			data: stackData.dates,
			axisLabel: { rotate: 30, color: textColor },
		},
		yAxis: { type: "value", min: 0, axisLabel: { color: textColor } },
		series: stackData.statusOrder.map((s) => ({
			name: CONFIG.STATUS_ICONS[s] + CONFIG.STATUS_NAMES[s],
			type: "bar",
			stack: "total",
			data: stackData.seriesData[s],
			itemStyle: { color: CONFIG.STATUS_COLORS[s] },
		})),
		grid: { left: "10%", right: "5%", top: "15%", bottom: "25%" },
	});
	state.chartInstances.push(i10);
	if (ch10.item._zoomBtn)
		ch10.item._zoomBtn.onclick = () => openChartModal(i10);

	setTimeout(() => {
		state.chartInstances.forEach((c) => {
			try {
				c.resize();
			} catch (e) {}
		});
	}, 50);
}
