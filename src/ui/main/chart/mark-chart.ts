// src/ui/main/chart/mark-chart.ts

import {
	DATE_MARK_ORDER,
	DEPENDS_COLOR_DEF,
	getDateMarkColors,
	getMissingColor,
	getPriorityColors,
	getRepeatColors,
	getStatusColors,
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
import { EChartsInstance } from "../../../type/type";
import { getThemeColor } from "../../../util/color-utils";
import { getEChartsTooltipConfig } from "../../component/tooltip/tooltip";
import { echarts } from "./echart";

const PRIORITY_ZH_NAMES: Record<string, string> = {};
TASK_ELEMENTS.priority.children?.forEach((c) => {
	if (c.icon) PRIORITY_ZH_NAMES[c.icon] = c.zhName;
});
const DATE_MARK_ZH_NAMES: Record<string, string> = {};
DATE_MARK_ORDER.forEach((k) => {
	DATE_MARK_ZH_NAMES[k] = TASK_ELEMENTS[k]?.zhName || k;
});
const MISSING_COLOR = getMissingColor();

export function renderMarkChart(container: HTMLElement, nodes: TaskTreeNode[]) {
	container.querySelectorAll(".task-chart-body").forEach((el) => {
		const instance = echarts.getInstanceByDom(el as HTMLElement) as
			| EChartsInstance
			| undefined;
		if (instance) instance.dispose();
	});
	echarts.dispose(container);
	container.empty();
	const statusColors = getStatusColors();
	const priorityColors = getPriorityColors();
	const repeatColors = getRepeatColors();
	const dateMarkColors = getDateMarkColors();
	const idColor = getThemeColor(ID_COLOR_DEF);
	const dependsColor = getThemeColor(DEPENDS_COLOR_DEF);
	const tagColor = getThemeColor(TAG_COLOR_DEF);
	const totalCount = nodes.length;
	const grid = createDiv();
	grid.className = "task-chart-grid";
	grid.addClass("task-grid", "task-grid-cols-3", "task-gap-4", "task-w-full");
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
		const item = createDiv();
		item.className = "task-chart-item";
		item.addClass("task-min-w-0");
		const header = createDiv();
		header.className = "task-chart-header";
		header.addClass(
			"task-text-center",
			"task-font-semibold",
			"task-mb-1",
			"task-text-sm",
		);
		header.textContent = title;
		item.appendChild(header);
		const chartHeight = getChartHeight(data.length);
		const chartDiv = createDiv();
		chartDiv.className = "task-chart-body task-chart-dynamic-height task-w-full";
		chartDiv.setCssProps({ "--task-chart-height": chartHeight });
		item.appendChild(chartDiv);
		grid.appendChild(item);
		try {
			const chart = echarts.init(
				chartDiv,
			);
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
							lineStyle: { width: 1 },
						},
					},
				],
			} as Record<string, unknown>);
		} catch (e: unknown) {
			console.error("[TaskManage] 图表初始化失败:", e);
			chartDiv.textContent = "图表加载失败";
			chartDiv.addClass(
				"task-flex",
				"task-items-center",
				"task-justify-center",
				"task-text-muted",
			);
		}
	}

	function makeHasNonePie(title: string, hasCount: number, hasColor: string) {
		makePieChart(title, [
			{ name: "无", value: totalCount - hasCount, color: MISSING_COLOR },
			{ name: "有", value: hasCount, color: hasColor },
		]);
	}

	const statusCounts: Record<string, number> = {};
	STATUS_SORT_ORDER.forEach((s) => {
		statusCounts[s] = 0;
	});
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
	PRIORITY_ORDER.forEach((p) => {
		prioCounts[p] = 0;
	});
	prioCounts["none"] = 0;
	nodes.forEach((n) => {
		const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
		const icon = icons[n.priority] || "";
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
	REPEAT_ORDER.forEach((r) => {
		repeatCounts[r] = 0;
	});
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
		} else repeatCounts["none"]++;
	});
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
			return marks[mk];
		}).length;
		makeHasNonePie(
			dateIcons[mk] + " " + DATE_MARK_ZH_NAMES[mk],
			count,
			dateMarkColors[mk],
		);
	});
	makeHasNonePie("🆔 唯一ID", nodes.filter((n) => !!n.id).length, idColor);
	makeHasNonePie(
		"⛔ 引用ID",
		nodes.filter((n) => !!n.forbid).length,
		dependsColor,
	);
	let tagCount = 0;
	nodes.forEach((n) => {
		if (n.tag) tagCount++;
	});
	makeHasNonePie("🏁 标签", tagCount, tagColor);
}
