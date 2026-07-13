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
	wrapper.addClass("task-w-full", "task-min-h-100", "task-relative");

	const chartDiv = document.createElement("div");
	chartDiv.addClass("task-w-full", "task-h-125");
	wrapper.appendChild(chartDiv);

	const zoomBtn = document.createElement("button");
	zoomBtn.className = "zoom-btn";
	zoomBtn.textContent = "🔍";
	zoomBtn.addClass(
		"task-absolute",
		"task-top-2",
		"task-right-2",
		"task-bg-none",
		"task-border-none",
		"task-clickable",
		"task-text-base",
	);
	wrapper.appendChild(zoomBtn);
	container.appendChild(wrapper);

	let chart: any;
	try {
		chart = echarts.init(chartDiv);
	} catch (e) {
		console.error("[TaskManage] 详细统计图初始化失败:", e);
		chartDiv.textContent = "图表加载失败";
		chartDiv.addClass(
			"task-flex",
			"task-items-center",
			"task-justify-center",
			"task-text-muted",
		);
		return;
	}

	const theme = getComputedStyle(document.body);
	const textColor = theme.getPropertyValue("--text-normal") || "#333";

	const option = {
		tooltip: getEChartsTooltipConfig("axis"),
		xAxis: {
			type: "category",
			data: dates,
			axisLabel: { rotate: 30, fontSize: 10, color: textColor },
		},
		yAxis: { type: "value", nameTextStyle: { color: textColor } },
		series: ALLOWED_STATUSES.map((st) => ({
			name: STATUS_ICONS[st] + " " + STATUS_NAMES[st],
			type: "bar",
			stack: "total",
			data: seriesData[st],
			itemStyle: { color: statusColors[st] || undefined },
		})),
		grid: { left: "8%", right: "5%", top: "15%", bottom: "25%" },
		legend: {
			bottom: 0,
			textStyle: { fontSize: 10, color: textColor },
		},
		textStyle: { color: textColor },
	};
	chart.setOption(option);

	zoomBtn.onclick = () => {
		const modal = document.createElement("div");
		modal.addClass(
			"task-fixed",
			"task-inset-0",
			"task-bg-overlay",
			"task-z-9999",
			"task-flex",
			"task-items-center",
			"task-justify-center",
		);

		const closeBtn = document.createElement("button");
		closeBtn.textContent = "✖";
		closeBtn.addClass(
			"task-absolute",
			"task-top-5",
			"task-right-8",
			"task-text-2xl",
			"task-bg-transparent",
			"task-border-none",
			"task-text-white",
			"task-clickable",
		);

		const bigChartDiv = document.createElement("div");
		bigChartDiv.addClass("task-w-90", "task-h-90");
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
			bigChartDiv.addClass(
				"task-flex",
				"task-items-center",
				"task-justify-center",
				"task-text-white",
			);
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
