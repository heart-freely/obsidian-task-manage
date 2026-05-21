import { Store } from "../../store/store";

const VIEW_STYLES = [
	{ key: "list", label: "列表", defaultIcon: "📋" },
	{ key: "table", label: "表格", defaultIcon: "📊" },
	{ key: "timeline", label: "时间轴", defaultIcon: "⏳" },
	{ key: "kanban", label: "看板", defaultIcon: "📌" },
	{ key: "matrix", label: "矩阵", defaultIcon: "🧩" },
	{ key: "calendar", label: "日历图", defaultIcon: "📅" },
	{ key: "tree", label: "任务树", defaultIcon: "🌲" },
	{ key: "gantt", label: "甘特图", defaultIcon: "📊" },
	{ key: "statistics", label: "基础统计", defaultIcon: "📈" },
	{ key: "detail", label: "详细统计", defaultIcon: "📉" },
];

const GROUP_NAMES: Record<string, string> = {
	基础: "基础视图：",
	组织: "组织视图：",
	日历: "日历视图：",
	高级: "高级视图：",
	统计: "统计视图：",
};

export class ViewBar {
	private container: HTMLElement;
	private store: Store;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.store.subscribe(() => this.render());
		this.render();
	}

	render() {
		this.container.empty();
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		if (!preset) return;

		const currentStyle = preset?.viewStyle ?? "table";
		const customIcons = preset.viewIcons || {}; // 每个样式可自定义图标

		// 按分组显示
		const groups = new Map<string, typeof VIEW_STYLES>();
		VIEW_STYLES.forEach((s) => {
			const group =
				s.key === "calendar"
					? "日历"
					: s.key === "tree" || s.key === "gantt"
						? "高级"
						: s.key === "statistics" || s.key === "detail"
							? "统计"
							: s.key === "kanban" || s.key === "matrix"
								? "组织"
								: "基础";
			if (!groups.has(group)) groups.set(group, []);
			groups.get(group)!.push(s);
		});

		groups.forEach((styles, group) => {
			const groupRow = this.container.createDiv({ cls: "bar-row" });
			groupRow.createSpan({
				text: GROUP_NAMES[group] || group + "：",
				cls: "filter-label",
			});
			styles.forEach(({ key, label, defaultIcon }) => {
				const icon = customIcons[key] || defaultIcon;
				const btn = groupRow.createEl("button", {
					text: icon + " " + label,
					cls: "bar-btn",
				});
				if (key === currentStyle) btn.addClass("active");
				btn.onclick = () => {
					const newPresets = state.presets.map((p) =>
						p.id === preset.id ? { ...p, viewStyle: key } : p,
					);
					this.store.update({ presets: newPresets });
				};
			});
		});
	}
}
