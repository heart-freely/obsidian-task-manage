// src/ui/panel/view-panel.ts
// 任务视图面板

import { Store } from "../../core/store/store";

const VIEW_STYLES = [
	{ key: "list", label: "列表", group: "基础" },
	{ key: "cards", label: "卡片", group: "基础" },
	{ key: "table", label: "表格", group: "基础" },
	{ key: "status", label: "状态", group: "标记" },
	{ key: "priority", label: "优先级", group: "标记" },
	{ key: "recurring", label: "循环", group: "标记" },
	{ key: "time", label: "日期", group: "标记" },
	{ key: "uniqueId", label: "唯一ID", group: "标记" },
	{ key: "depends", label: "引用ID", group: "标记" },
	{ key: "tag", label: "标签", group: "标记" },
	{ key: "kanban", label: "看板", group: "管理" },
	{ key: "matrix", label: "矩阵", group: "管理" },
	{ key: "overdue", label: "逾期", group: "管理" },
	{ key: "timeline", label: "时间轴", group: "管理" },
	{ key: "calendar", label: "日历图", group: "管理" },
	{ key: "tree", label: "任务树", group: "管理" },
	{ key: "gantt", label: "甘特图", group: "管理" },
	{ key: "statistics", label: "基础统计", group: "统计" },
	{ key: "detail", label: "详细统计", group: "统计" },
];

const GROUP_NAMES: Record<string, string> = {
	基础: "基础视图",
	标记: "标记视图",
	管理: "管理视图",
	统计: "统计视图",
};

export class ViewPanel {
	private container: HTMLElement;
	private store: Store;
	private unsub: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.unsub = store.subscribe(() => this.render());
		this.render();
	}

	destroy() {
		if (this.unsub) {
			this.unsub();
			this.unsub = null;
		}
	}

	render() {
		this.container.empty();
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		if (!preset) return;
		const currentStyle = preset?.viewStyle ?? "list";
		const groups = new Map<string, typeof VIEW_STYLES>();
		VIEW_STYLES.forEach((s) => {
			if (!groups.has(s.group)) groups.set(s.group, []);
			groups.get(s.group)!.push(s);
		});

		groups.forEach((styles, group) => {
			const groupRow = this.container.createDiv({ cls: "panel-row" });
			groupRow.createSpan({
				text: GROUP_NAMES[group] || group,
				cls: "panel-label",
			});
			const btnsContainer = groupRow.createDiv({
				cls: "view-btns-container",
			});
			styles.forEach(({ key, label }) => {
				const btn = btnsContainer.createEl("button", {
					text: label,
					cls: "panel-btn panel-view-btn",
				});
				if (key === currentStyle) btn.addClass("active");
				btn.onclick = () => {
					const st = this.store.getState();
					const pr = this.store.getActivePreset();
					if (!pr) return;
					this.store.update({
						presets: st.presets.map((p) =>
							p.id === pr.id ? { ...p, viewStyle: key } : p,
						),
					});
				};
			});
		});
	}
}
