// src/ui/main/chart/detail-chart.ts
// 详细统计图 — 堆叠柱状图

import {
	ALLOWED_STATUSES,
	getStatusColors,
	STATUS_ICONS,
	STATUS_NAMES,
} from "../../../core/config/config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { DateUtils } from "../../../util/date-utils";
import { getEChartsTooltipConfig } from "../../component/tooltip/tooltip";
import { echarts } from "./echart";

export function renderDetail(
	container: HTMLElement,
	nodes: TaskTreeNode[],
	options?: {
		dateRange?: {
			start: number | null;
			end: number | null;
			isAll: boolean;
		};
		intervalMode?: string;
	},
) {
	echarts.dispose(container);
	container.empty();

	const statusColors = getStatusColors();
	const dateRange = options?.dateRange;

	let minDate: Date;
	let maxDate: Date;

	if (
		dateRange &&
		!dateRange.isAll &&
		dateRange.start != null &&
		dateRange.end != null
	) {
		minDate = DateUtils.setStart(new Date(dateRange.start));
		maxDate = DateUtils.setEnd(new Date(dateRange.end));
	} else {
		const today = new Date();
		minDate = DateUtils.setStart(new Date(today.getFullYear() - 10, 0, 1));
		maxDate = DateUtils.setEnd(new Date(today.getFullYear() + 10, 11, 31));
	}

	const dates: string[] = [];
	let cur = DateUtils.setStart(minDate);
	const endTime = DateUtils.setEnd(maxDate).getTime();
	while (cur.getTime() <= endTime) {
		dates.push(DateUtils.formatDate(cur));
		cur.setDate(cur.getDate() + 1);
	}

	const seriesData: Record<string, number[]> = {};
	ALLOWED_STATUSES.forEach((st) => {
		seriesData[st] = new Array(dates.length).fill(0);
	});
	nodes.forEach((n) => {
		const dateStr = n.scheduled
			? DateUtils.formatDate(new Date(n.scheduled))
			: "";
		const idx = dates.indexOf(dateStr);
		if (idx >= 0) {
			const arr = seriesData[n.status];
			if (arr && idx < arr.length) arr[idx]++;
		}
	});

	const wrapper = document.createElement("div");
	wrapper.className = "detail-chart-wrapper";
	wrapper.style.width = "100%";
	wrapper.style.minHeight = "400px";
	wrapper.style.position = "relative";

	const chartDiv = document.createElement("div");
	chartDiv.style.width = "100%";
	chartDiv.style.height = "500px";
	wrapper.appendChild(chartDiv);

	const zoomBtn = document.createElement("button");
	zoomBtn.className = "zoom-btn";
	zoomBtn.textContent = "🔍";
	zoomBtn.style.cssText =
		"position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;";
	wrapper.appendChild(zoomBtn);
	container.appendChild(wrapper);

	let chart: any;
	try {
		chart = echarts.init(chartDiv);
	} catch (e) {
		console.error("[TaskManage] 详细统计图初始化失败:", e);
		chartDiv.textContent = "图表加载失败";
		chartDiv.style.cssText +=
			"display:flex;align-items:center;justify-content:center;color:var(--text-muted);";
		return;
	}

	const option = {
		tooltip: getEChartsTooltipConfig("axis"),
		xAxis: {
			type: "category",
			data: dates,
			axisLabel: { rotate: 30, fontSize: 10 },
		},
		yAxis: { type: "value" },
		series: ALLOWED_STATUSES.map((st) => ({
			name: STATUS_ICONS[st] + " " + STATUS_NAMES[st],
			type: "bar",
			stack: "total",
			data: seriesData[st],
			itemStyle: { color: statusColors[st] || undefined },
		})),
		grid: { left: "8%", right: "5%", top: "15%", bottom: "25%" },
		legend: { bottom: 0, textStyle: { fontSize: 10 } },
	};
	chart.setOption(option);

	zoomBtn.onclick = () => {
		const modal = document.createElement("div");
		modal.style.cssText =
			"position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;";

		const closeBtn = document.createElement("button");
		closeBtn.textContent = "✖";
		closeBtn.style.cssText =
			"position:absolute;top:20px;right:30px;font-size:24px;background:transparent;border:none;color:white;cursor:pointer;";

		const bigChartDiv = document.createElement("div");
		bigChartDiv.style.width = "90vw";
		bigChartDiv.style.height = "90vh";
		modal.appendChild(bigChartDiv);
		modal.appendChild(closeBtn);
		document.body.appendChild(modal);

		let bigChart: any;
		try {
			bigChart = echarts.init(bigChartDiv);
			bigChart.setOption(option);
		} catch (e) {
			console.error("[TaskManage] 放大图表初始化失败:", e);
			bigChartDiv.textContent = "图表加载失败";
			bigChartDiv.style.cssText +=
				"display:flex;align-items:center;justify-content:center;color:white;";
		}

		const closeModal = () => {
			if (bigChart) bigChart.dispose();
			modal.remove();
		};
		closeBtn.onclick = closeModal;
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeModal();
		});
	};
}
