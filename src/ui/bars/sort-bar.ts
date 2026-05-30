// src/ui/bars/sort-bar.ts
import { Store } from "../../store/store";

const SORT_OPTIONS = [
	{ type: "status", label: "状态" },
	{ type: "description", label: "描述" },
	{ type: "priority", label: "优先级" },
	{ type: "repeat", label: "循环" },
	{ type: "created", label: "创建" },
	{ type: "scheduled", label: "计划" },
	{ type: "starts", label: "开始" },
	{ type: "due", label: "截止" },
	{ type: "cancel", label: "取消" },
	{ type: "done", label: "完成" },
	{ type: "tag", label: "标签" },
	{ type: "id", label: "唯一ID" },
	{ type: "forbid", label: "引用ID" },
	{ type: "filename", label: "文件名" },
];

export class SortBar {
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

		const currentSort = preset?.sort ?? { type: "status", order: "asc" };
		const row = this.container.createDiv({ cls: "bar-row" });
		row.createSpan({ text: "排序", cls: "filter-label" });

		SORT_OPTIONS.forEach((opt) => {
			const btn = row.createEl("button", {
				text: opt.label,
				cls: "bar-btn",
			});
			if (currentSort.type === opt.type) {
				btn.setText(
					opt.label + (currentSort.order === "asc" ? " ↑" : " ↓"),
				);
				btn.addClass("active");
			}
			btn.onclick = () => {
				const newOrder =
					currentSort.type === opt.type
						? currentSort.order === "asc"
							? "desc"
							: "asc"
						: "asc";
				const newSort = {
					type: opt.type,
					order: newOrder as "asc" | "desc",
				};
				const newPresets = state.presets.map((p) =>
					p.id === preset.id ? { ...p, sort: newSort } : p,
				);
				this.store.update({ presets: newPresets });
			};
		});
	}
}
