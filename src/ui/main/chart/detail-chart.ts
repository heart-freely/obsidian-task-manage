// src/ui/component/charts/detail-chart.ts

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
	container.empty();

	const statusColors = getStatusColors();

	// 确定时间范围：优先使用静态日历时间，否则从任务数据推断
	const intervalMode = options?.intervalMode ?? "any-date";
	const dateRange = options?.dateRange;

	let minDate: Date;
	let maxDate: Date;

	if (
		intervalMode !== "none" &&
		dateRange &&
		!dateRange.isAll &&
		dateRange.start != null &&
		dateRange.end != null
	) {
		minDate = DateUtils.setStart(new Date(dateRange.start));
		maxDate = DateUtils.setEnd(new Date(dateRange.end));
	} else {
		// 回退：从任务数据推断时间范围
		const today = new Date();
		minDate = new Date(today);
		maxDate = new Date(today);
		nodes.forEach((n) => {
			if (n.scheduled !== null) {
				const d = new Date(n.scheduled);
				if (d < minDate) minDate = d;
				if (d > maxDate) maxDate = d;
			}
		});
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
	const chart = echarts.init(chartDiv);
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
		const bigChart = echarts.init(bigChartDiv);
		bigChart.setOption(option);
		const closeModal = () => {
			bigChart.dispose();
			modal.remove();
		};
		closeBtn.onclick = closeModal;
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeModal();
		});
	};
}
