// src/ui/panel/sort-panel.ts

import { Store } from "../../core/store/store";

const SORT_OPTIONS = [
	{ type: "status", label: "状态" },
	{ type: "description", label: "描述" },
	{ type: "priority", label: "优先级" },
	{ type: "repeat", label: "循环" },
	{ type: "created", label: "创建" },
	{ type: "scheduled", label: "计划" },
	{ type: "starts", label: "开始" },
	{ type: "cancelled", label: "取消" },
	{ type: "done", label: "完成" },
	{ type: "due", label: "截止" },
	{ type: "id", label: "唯一ID" },
	{ type: "forbid", label: "引用ID" },
	{ type: "tag", label: "标签" },
	{ type: "filename", label: "文件名" },
];

export class SortPanel {
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
		const preset = this.store.getActivePreset();
		if (!preset) return;
		const cs = preset?.sort ?? { type: "", order: "asc" };
		const row = this.container.createDiv({ cls: "panel-row" });
		row.createSpan({ text: "任务排序", cls: "panel-label" });
		const defBtn = row.createEl("button", {
			text: "原始",
			cls: "panel-btn",
		});
		if (cs.type === "") defBtn.addClass("active");
		defBtn.onclick = () => {
			const st = this.store.getState();
			const pr = this.store.getActivePreset();
			if (!pr) return;
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id
						? { ...p, sort: { type: "", order: "asc" as const } }
						: p,
				),
			});
		};
		SORT_OPTIONS.forEach((opt) => {
			const btn = row.createEl("button", {
				text: opt.label,
				cls: "panel-btn",
			});
			if (cs.type === opt.type) {
				btn.setText(opt.label + (cs.order === "asc" ? " ↑" : " ↓"));
				btn.addClass("active");
			}
			btn.onclick = () => {
				const st = this.store.getState();
				const pr = this.store.getActivePreset();
				if (!pr) return;
				const no =
					cs.type === opt.type
						? cs.order === "asc"
							? "desc"
							: "asc"
						: "asc";
				const ns: { type: string; order: "asc" | "desc" } = {
					type: opt.type,
					order: no,
				};
				this.store.update({
					presets: st.presets.map((p) =>
						p.id === pr.id ? { ...p, sort: ns } : p,
					),
				});
			};
		});
	}
}
