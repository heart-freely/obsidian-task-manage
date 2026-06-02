import { CONFIG, DEFAULT_SETTINGS } from "../../../configs/configs";
import { DateUtils } from "../../../process/process";
import { echarts } from "./echarts";

export function renderDetail(container: HTMLElement, tasks: any[]) {
	container.empty();

	const today = new Date();
	let minDate = new Date(today);
	let maxDate = new Date(today);
	tasks.forEach((task) => {
		if (task._scheduled) {
			const d = new Date(task._scheduled);
			if (d < minDate) minDate = d;
			if (d > maxDate) maxDate = d;
		}
	});

	const dates: string[] = [];
	let cur = DateUtils.setStart(minDate);
	const endTime = DateUtils.setEnd(maxDate).getTime();
	while (cur.getTime() <= endTime) {
		dates.push(DateUtils.formatDate(cur));
		cur.setDate(cur.getDate() + 1);
	}

	const seriesData: Record<string, number[]> = {};
	CONFIG.ALLOWED_STATUSES.forEach((st) => {
		seriesData[st] = new Array(dates.length).fill(0);
	});

	tasks.forEach((task) => {
		const idx = dates.indexOf(task._scheduled || "");
		if (idx >= 0) {
			const arr = seriesData[task._status];
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
	zoomBtn.style.position = "absolute";
	zoomBtn.style.top = "8px";
	zoomBtn.style.right = "8px";
	zoomBtn.style.background = "none";
	zoomBtn.style.border = "none";
	zoomBtn.style.cursor = "pointer";
	zoomBtn.style.fontSize = "16px";
	wrapper.appendChild(zoomBtn);

	container.appendChild(wrapper);

	const chart = echarts.init(chartDiv);

	const statusNames: any = CONFIG.STATUS_NAMES || {};
	const statusColors: any = DEFAULT_SETTINGS.STATUS_COLORS || {};

	const option = {
		tooltip: { trigger: "axis" },
		xAxis: {
			type: "category",
			data: dates,
			axisLabel: { rotate: 30, fontSize: 10 },
		},
		yAxis: { type: "value" },
		series: CONFIG.ALLOWED_STATUSES.map((st) => ({
			name: statusNames[st] || st,
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
