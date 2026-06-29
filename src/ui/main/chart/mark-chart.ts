// src/ui/main/chart/mark-chart.ts
// 标记统计图 — 独立饼图

import {
	DATE_MARK_ORDER,
	DEPENDS_COLOR_DEF,
	getDateMarkColors,
	getPriorityColors,
	getRepeatColors,
	getStatusColors,
	getTagPalette,
	ID_COLOR_DEF,
	PRIORITY_ORDER,
	REPEAT_ORDER,
	STATUS_ICONS,
	STATUS_NAMES,
	STATUS_SORT_ORDER,
	TAG_COLOR_DEF,
	TASK_ELEMENTS,
} from "../../../core/config/config";
import { getTaskMarks } from "../../../core/task/task-derived";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { getThemeColor } from "../../../util/color-utils";
import { getEChartsTooltipConfig } from "../../component/tooltip/tooltip";
import { echarts } from "./echart";

const PRIORITY_ZH_NAMES: Record<string, string> = {};
TASK_ELEMENTS.priority.children.forEach((c) => {
	PRIORITY_ZH_NAMES[c.icon] = c.zhName;
});

const DATE_MARK_ZH_NAMES: Record<string, string> = {};
DATE_MARK_ORDER.forEach((k) => {
	DATE_MARK_ZH_NAMES[k] = (TASK_ELEMENTS as any)[k].zhName;
});

const MISSING_COLOR = "rgba(128,128,128,0.5)";

export function renderMarkChart(container: HTMLElement, nodes: TaskTreeNode[]) {
	container.empty();

	const statusColors = getStatusColors();
	const priorityColors = getPriorityColors();
	const repeatColors = getRepeatColors();
	const dateMarkColors = getDateMarkColors();
	const idColor = getThemeColor(ID_COLOR_DEF);
	const dependsColor = getThemeColor(DEPENDS_COLOR_DEF);
	const tagColor = getThemeColor(TAG_COLOR_DEF);
	const tagPalette = getTagPalette();

	const totalCount = nodes.length;

	const grid = document.createElement("div");
	grid.className = "chart-grid";
	grid.style.cssText =
		"display:grid;grid-template-columns:repeat(3,1fr);gap:16px;width:100%;";
	container.appendChild(grid);

	const theme = getComputedStyle(document.body);
	const textColor = theme.getPropertyValue("--text-normal") || "#333";

	function getChartHeight(dataLength: number): string {
		if (dataLength <= 3) return "300px";
		if (dataLength <= 5) return "340px";
		return "380px";
	}

	function makePieChart(
		title: string,
		data: { name: string; value: number; color?: string }[],
	) {
		const item = document.createElement("div");
		item.className = "chart-item";
		item.style.cssText = "min-width:0;";

		const header = document.createElement("div");
		header.className = "chart-header";
		header.style.cssText =
			"text-align:center;font-weight:600;margin-bottom:4px;font-size:var(--font-ui-small);";
		header.textContent = title;
		item.appendChild(header);

		const chartHeight = getChartHeight(data.length);
		const chartDiv = document.createElement("div");
		chartDiv.className = "chart-body";
		chartDiv.style.cssText = `width:100%;height:${chartHeight};`;
		item.appendChild(chartDiv);

		grid.appendChild(item);

		const chart = echarts.init(chartDiv);
		chart.setOption({
			backgroundColor: "transparent",
			textStyle: { color: textColor },
			tooltip: getEChartsTooltipConfig("item"),
			legend: {
				orient: "horizontal",
				bottom: 0,
				textStyle: { color: textColor, fontSize: 10 },
				itemWidth: 8,
				itemHeight: 8,
				itemGap: 8,
				type: "plain",
			},
			series: [
				{
					type: "pie",
					data: data.length
						? data.map((d) => ({
								name: d.name,
								value: d.value,
								itemStyle: { color: d.color, borderRadius: 4 },
							}))
						: [
								{
									name: "无数据",
									value: 1,
									itemStyle: { color: "#ccc" },
								},
							],
					radius: ["35%", "60%"],
					center: ["50%", "45%"],
					label: {
						show: true,
						position: "outside",
						color: textColor,
						fontSize: 10,
						formatter: "{d}%",
					},
					labelLine: {
						show: true,
						length: 8,
						length2: 6,
						lineStyle: { width: 1 },
					},
				},
			],
		});
	}

	function makeHasNonePie(title: string, hasCount: number, hasColor: string) {
		const noneCount = totalCount - hasCount;
		makePieChart(title, [
			{ name: "无", value: noneCount, color: MISSING_COLOR },
			{ name: "有", value: hasCount, color: hasColor },
		]);
	}

	// ========== 第 1 行：状态、优先级、循环周期 ==========

	const statusCounts: Record<string, number> = {};
	STATUS_SORT_ORDER.forEach((s) => (statusCounts[s] = 0));
	nodes.forEach((n) => {
		if (statusCounts[n.status] !== undefined) statusCounts[n.status]++;
	});

	makePieChart(
		"📊 状态",
		STATUS_SORT_ORDER.map((s) => ({
			name: STATUS_ICONS[s] + " " + STATUS_NAMES[s],
			value: statusCounts[s],
			color: statusColors[s],
		})).filter((d) => d.value > 0),
	);

	const prioCounts: Record<string, number> = {};
	PRIORITY_ORDER.forEach((p) => (prioCounts[p] = 0));
	prioCounts["none"] = 0;
	nodes.forEach((n) => {
		const prioIcons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
		const icon = prioIcons[n.priority] || "";
		if (icon && prioCounts[icon] !== undefined) prioCounts[icon]++;
		else prioCounts["none"]++;
	});

	makePieChart(
		"🎯 优先级",
		[
			{
				name: "无优先级",
				value: prioCounts["none"] || 0,
				color: MISSING_COLOR,
			},
			...PRIORITY_ORDER.map((p, i) => ({
				name: p + " " + (PRIORITY_ZH_NAMES[p] || ""),
				value: prioCounts[p] || 0,
				color: priorityColors[i],
			})),
		].filter((d) => d.value > 0),
	);

	const repeatCounts: Record<string, number> = {};
	REPEAT_ORDER.forEach((r) => (repeatCounts[r] = 0));
	repeatCounts["none"] = 0;
	nodes.forEach((n) => {
		if (n.repeat) {
			let matched = false;
			REPEAT_ORDER.forEach((r) => {
				if (n.repeat.toLowerCase().includes(r)) {
					repeatCounts[r]++;
					matched = true;
				}
			});
			if (!matched) repeatCounts["none"]++;
		} else {
			repeatCounts["none"]++;
		}
	});

	// 循环周期饼图数据顺序调整
	makePieChart(
		"🔄 循环周期",
		[
			{
				name: "无循环",
				value: repeatCounts["none"] || 0,
				color: MISSING_COLOR,
			},
			...REPEAT_ORDER.map((r, i) => ({
				name: "🔁 " + r,
				value: repeatCounts[r],
				color: repeatColors[i],
			})),
		].filter((d) => d.value > 0),
	);
	// ========== 第 2-3 行：6 个日期标记 ==========

	const dateMarks = [
		"created",
		"scheduled",
		"starts",
		"due",
		"done",
		"cancelled",
	];
	const dateIcons: Record<string, string> = {
		created: "➕",
		scheduled: "⏳",
		starts: "🛫",
		due: "📅",
		done: "✅",
		cancelled: "❌",
	};

	dateMarks.forEach((mk) => {
		const count = nodes.filter((n) => {
			const marks = getTaskMarks(n);
			return marks[mk as keyof typeof marks];
		}).length;
		makeHasNonePie(
			dateIcons[mk] + " " + DATE_MARK_ZH_NAMES[mk],
			count,
			dateMarkColors[mk],
		);
	});

	// ========== 第 4 行：唯一ID、引用ID、标签 ==========

	const idCount = nodes.filter((n) => !!n.id).length;
	makeHasNonePie("🆔 唯一ID", idCount, idColor);

	const forbidCount = nodes.filter((n) => !!n.forbid).length;
	makeHasNonePie("⛔ 引用ID", forbidCount, dependsColor);

	let tagCount = 0;
	nodes.forEach((n) => {
		if (n.tag) tagCount++;
	});
	makeHasNonePie("🏁 标签", tagCount, tagColor);
}
