// src/ui/component/charts/mark-chart.ts
import {
	BOTH_COLOR_DEF,
	DATE_MARK_ICONS,
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
// 优先级中文名映射 — 从 TASK_ELEMENTS 动态生成
const PRIORITY_ZH_NAMES: Record<string, string> = {};
TASK_ELEMENTS.priority.children.forEach((c) => {
	PRIORITY_ZH_NAMES[c.icon] = c.zhName;
});

// 日期标记中文名映射 — 从 TASK_ELEMENTS 动态生成
const DATE_MARK_ZH_NAMES: Record<string, string> = {};
DATE_MARK_ORDER.forEach((k) => {
	DATE_MARK_ZH_NAMES[k] = (TASK_ELEMENTS as any)[k].zhName;
});

export function renderMarkChart(container: HTMLElement, nodes: TaskTreeNode[]) {
	container.empty();

	// 直接获取当前主题颜色，与卡片色条等 UI 组件使用完全相同的颜色
	const statusColors = getStatusColors();
	const priorityColors = getPriorityColors();
	const repeatColors = getRepeatColors();
	const dateMarkColors = getDateMarkColors();
	const idColor = getThemeColor(ID_COLOR_DEF);
	const dependsColor = getThemeColor(DEPENDS_COLOR_DEF);
	const tagColor = getThemeColor(TAG_COLOR_DEF);
	const bothColor = getThemeColor(BOTH_COLOR_DEF);
	const tagPalette = getTagPalette();

	// ========== 图表网格布局 ==========
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
								itemStyle: {
									color: d.color,
									borderRadius: 4,
								},
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
						lineStyle: {
							width: 1,
						},
					},
				},
			],
		});
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
	nodes.forEach((n) => {
		const prioIcons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
		const icon = prioIcons[n.priority] || "";
		if (icon && prioCounts[icon] !== undefined) prioCounts[icon]++;
	});

	makePieChart(
		"🎯 优先级",
		PRIORITY_ORDER.map((p, i) => ({
			name: p + " " + (PRIORITY_ZH_NAMES[p] || ""),
			value: prioCounts[p] || 0,
			color: priorityColors[i],
		})).filter((d) => d.value > 0),
	);

	const repeatCounts: Record<string, number> = {};
	REPEAT_ORDER.forEach((r) => (repeatCounts[r] = 0));
	nodes.forEach((n) => {
		if (n.repeat) {
			REPEAT_ORDER.forEach((r) => {
				if (n.repeat.toLowerCase().includes(r)) repeatCounts[r]++;
			});
		}
	});

	makePieChart(
		"🔄 循环周期",
		REPEAT_ORDER.map((r, i) => ({
			name: "🔁 " + r,
			value: repeatCounts[r],
			color: repeatColors[i],
		})).filter((d) => d.value > 0),
	);

	// ========== 第 2 行：时间、依赖、标签 ==========

	const dateCounts: Record<string, number> = {};
	DATE_MARK_ORDER.forEach((m) => (dateCounts[m] = 0));
	nodes.forEach((n) => {
		const marks = getTaskMarks(n);
		DATE_MARK_ORDER.forEach((m) => {
			if (marks[m as keyof typeof marks]) dateCounts[m]++;
		});
	});

	makePieChart(
		"📅 时间",
		DATE_MARK_ORDER.map((m) => ({
			name:
				(DATE_MARK_ICONS[m] || "") + " " + (DATE_MARK_ZH_NAMES[m] || m),
			value: dateCounts[m],
			color: dateMarkColors[m],
		})).filter((d) => d.value > 0),
	);

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

	makePieChart(
		"🔗 依赖",
		[
			{ name: "🆔 唯一ID", value: idCnt, color: idColor },
			{ name: "⛔ 引用ID", value: forbidCnt, color: dependsColor },
			{ name: "🆔+⛔ 两者", value: bothCnt, color: bothColor },
		].filter((d) => d.value > 0),
	);

	const tagMap: Record<string, number> = {};
	nodes.forEach((n) => {
		if (n.tag) tagMap[n.tag] = (tagMap[n.tag] || 0) + 1;
	});

	const tagEntries = Object.keys(tagMap);
	makePieChart(
		"🏷️ 标签",
		tagEntries
			.map((k, i) => ({
				name: "🏁 " + k,
				value: tagMap[k],
				color: i === 0 ? tagColor : tagPalette[i % tagPalette.length],
			}))
			.filter((d) => d.value > 0),
	);
}
