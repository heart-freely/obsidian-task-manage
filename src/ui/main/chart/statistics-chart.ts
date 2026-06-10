// src/ui/component/charts/statistics-charts.ts

import {
	ALLOWED_STATUSES,
	DATE_MARK_COLORS,
	DATE_MARK_NAMES,
	DATE_MARK_ORDER,
	PRIORITY_COLORS,
	PRIORITY_ORDER,
	REPEAT_COLORS,
	REPEAT_ORDER,
	STATUS_COLORS,
	STATUS_ICONS,
	STATUS_NAMES,
} from "../../../core/config/config";
import { getTaskMarks } from "../../../core/task/task-derived";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { echarts } from "./echart";

export function renderStatistics(
	container: HTMLElement,
	nodes: TaskTreeNode[],
) {
	container.empty();
	const grid = document.createElement("div");
	grid.className = "chart-grid";
	container.appendChild(grid);
	const theme = getComputedStyle(document.body);
	const textColor = theme.getPropertyValue("--text-normal") || "#333";
	const bgColor = theme.getPropertyValue("--background-primary") || "#fff";

	function makePieChart(
		title: string,
		data: { name: string; value: number; color?: string }[],
	) {
		const item = document.createElement("div");
		item.className = "chart-item";
		const header = document.createElement("div");
		header.className = "chart-header";
		header.textContent = title;
		item.appendChild(header);
		const chartDiv = document.createElement("div");
		chartDiv.className = "chart-body";
		item.appendChild(chartDiv);
		grid.appendChild(item);
		const chart = echarts.init(chartDiv);
		chart.setOption({
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
		});
	}

	const statusCounts: Record<string, number> = {};
	ALLOWED_STATUSES.forEach((s) => (statusCounts[s] = 0));
	nodes.forEach((n) => {
		statusCounts[n.status]++;
	});

	const prioIcons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
	const prioCounts: Record<string, number> = {};
	PRIORITY_ORDER.forEach((p) => (prioCounts[p] = 0));
	nodes.forEach((n) => {
		const icon = prioIcons[n.priority] || "";
		if (icon) prioCounts[icon]++;
	});

	const repeatCounts: Record<string, number> = {};
	REPEAT_ORDER.forEach((r) => (repeatCounts[r] = 0));
	nodes.forEach((n) => {
		if (n.repeat) {
			REPEAT_ORDER.forEach((r) => {
				if (n.repeat.toLowerCase().includes(r)) repeatCounts[r]++;
			});
		}
	});

	const dateCounts: Record<string, number> = {};
	DATE_MARK_ORDER.forEach((m) => (dateCounts[m] = 0));
	nodes.forEach((n) => {
		const marks = getTaskMarks(n);
		DATE_MARK_ORDER.forEach((m) => {
			if (marks[m as keyof typeof marks]) dateCounts[m]++;
		});
	});

	let idCnt = 0,
		forbidCnt = 0,
		bothCnt = 0;
	nodes.forEach((n) => {
		const hi = !!n.id,
			hf = !!n.forbid;
		if (hi && hf) bothCnt++;
		else if (hi) idCnt++;
		else if (hf) forbidCnt++;
	});

	const tagMap: Record<string, number> = {};
	nodes.forEach((n) => {
		if (n.tag) tagMap[n.tag] = (tagMap[n.tag] || 0) + 1;
	});

	makePieChart(
		"📊 执行状态",
		ALLOWED_STATUSES.map((s) => ({
			name: STATUS_ICONS[s] + " " + STATUS_NAMES[s],
			value: statusCounts[s],
			color: STATUS_COLORS[s],
		})).filter((d) => d.value > 0),
	);
	makePieChart(
		"🎯 优先级",
		PRIORITY_ORDER.map((p, i) => ({
			name: p,
			value: prioCounts[p] || 0,
			color: PRIORITY_COLORS[i],
		})).filter((d) => d.value > 0),
	);
	makePieChart(
		"🔄 循环周期",
		REPEAT_ORDER.map((r, i) => ({
			name: "🔁 " + r,
			value: repeatCounts[r],
			color: REPEAT_COLORS[i],
		})).filter((d) => d.value > 0),
	);
	makePieChart(
		"📅 日期标记",
		DATE_MARK_ORDER.map((m) => ({
			name: DATE_MARK_NAMES[m],
			value: dateCounts[m],
			color: DATE_MARK_COLORS[m],
		})).filter((d) => d.value > 0),
	);
	makePieChart(
		"🔗 依赖关系",
		[
			{ name: "🆔 唯一ID", value: idCnt },
			{ name: "⛔ 依赖", value: forbidCnt },
			{ name: "🆔+⛔ 两者", value: bothCnt },
		].filter((d) => d.value > 0),
	);
	makePieChart(
		"🏷️ 标签",
		Object.keys(tagMap)
			.map((k) => ({ name: "🏁 " + k, value: tagMap[k] }))
			.filter((d) => d.value > 0),
	);
}
