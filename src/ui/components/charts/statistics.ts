import { CONFIG, DEFAULT_SETTINGS } from "../../../configs/configs";
import { echarts } from "./echarts";

export function renderStatistics(container: HTMLElement, tasks: any[]) {
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

	// 数据统计视图
	const statusCounts: Record<string, number> = {};
	CONFIG.ALLOWED_STATUSES.forEach((s) => (statusCounts[s] = 0));
	tasks.forEach((t) => {
		statusCounts[t._status]++;
	});

	const prioCounts: Record<string, number> = {};
	CONFIG.PRIORITY_ORDER.forEach((p) => (prioCounts[p] = 0));
	tasks.forEach((t) => {
		if (t._priorityIcon) prioCounts[t._priorityIcon]++;
	});

	const repeatCounts: Record<string, number> = {};
	CONFIG.REPEAT_ORDER.forEach((r) => (repeatCounts[r] = 0));
	tasks.forEach((t) => {
		if (t._repeat) {
			CONFIG.REPEAT_ORDER.forEach((r) => {
				if (t._repeat.toLowerCase().includes(r)) repeatCounts[r]++;
			});
		}
	});

	const dateCounts: Record<string, number> = {};
	CONFIG.DATE_MARK_ORDER.forEach((m) => (dateCounts[m] = 0));
	tasks.forEach((t) => {
		CONFIG.DATE_MARK_ORDER.forEach((m) => {
			if (t["_" + m]) dateCounts[m]++;
		});
	});

	let idCnt = 0,
		forbidCnt = 0,
		bothCnt = 0;
	tasks.forEach((t) => {
		const hi = !!t._id,
			hf = !!t._forbid;
		if (hi && hf) bothCnt++;
		else if (hi) idCnt++;
		else if (hf) forbidCnt++;
	});

	const tagMap: Record<string, number> = {};
	tasks.forEach((t) => {
		if (t._tag) tagMap[t._tag] = (tagMap[t._tag] || 0) + 1;
	});

	// 执行状态
	makePieChart(
		"📊 执行状态",
		CONFIG.ALLOWED_STATUSES.map((s) => ({
			name: CONFIG.STATUS_ICONS[s] + " " + CONFIG.STATUS_NAMES[s],
			value: statusCounts[s],
			color: DEFAULT_SETTINGS.STATUS_COLORS[s],
		})).filter((d) => d.value > 0),
	);

	// 优先级
	makePieChart(
		"🎯 优先级",
		CONFIG.PRIORITY_ORDER.map((p, i) => ({
			name: p,
			value: prioCounts[p] || 0,
			color: CONFIG.PRIORITY_COLORS[i],
		})).filter((d) => d.value > 0),
	);

	// 循环周期
	makePieChart(
		"🔄 循环周期",
		CONFIG.REPEAT_ORDER.map((r, i) => ({
			name: "🔁 " + r,
			value: repeatCounts[r],
			color: CONFIG.REPEAT_COLORS[i],
		})).filter((d) => d.value > 0),
	);

	// 日期标记
	makePieChart(
		"📅 日期标记",
		CONFIG.DATE_MARK_ORDER.map((m, i) => ({
			name: CONFIG.DATE_MARK_NAMES[m],
			value: dateCounts[m],
			color: DEFAULT_SETTINGS.DATE_MARK_COLORS[i],
		})).filter((d) => d.value > 0),
	);

	// 依赖关系
	makePieChart(
		"🔗 依赖关系",
		[
			{ name: "🆔 唯一ID", value: idCnt },
			{ name: "⛔ 依赖", value: forbidCnt },
			{ name: "🆔+⛔ 两者", value: bothCnt },
		].filter((d) => d.value > 0),
	);

	// 标签
	makePieChart(
		"🏷️ 标签",
		Object.keys(tagMap)
			.map((k) => ({
				name: "🏁 " + k,
				value: tagMap[k],
			}))
			.filter((d) => d.value > 0),
	);
}
