// src/ui/panel/head-panel.ts
// 面板标题栏 — 合并筛选按钮

import { Store } from "../../core/store/store";

const PANEL_LABELS: Record<string, string> = {
	filter: "筛选内容",
	time: "筛选时间",
	view: "任务视图",
	hide: "视图隐藏",
	edit: "视图编辑",
	sort: "视图排序",
	config: "视图配置",
};

export class HeadPanel {
	private buttonBar: HTMLElement;
	private store: Store;
	private unsub: (() => void) | null = null;

	constructor(buttonBar: HTMLElement, store: Store) {
		this.buttonBar = buttonBar;
		this.store = store;
		this.unsub = store.subscribe(() => this.renderContent());
		this.renderContent();
	}

	destroy() {
		this.unsub?.();
		this.unsub = null;
	}

	renderContent() {
		this.buttonBar.innerHTML = "";
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;

		const barVisibility = preset.barVisibility ?? {};
		const toolbarOrder = preset.toolbarOrder ?? [
			"filter",
			"time",
			"view",
			"hide",
			"edit",
			"sort",
			"config",
		];

		// 原代码：Object.assign(this.buttonBar.style, { ... })
		this.buttonBar.addClass(
			"task-head-bar",
			"task-flex",
			"task-flex-nowrap",
			"task-overflow-x-auto",
			"task-bg-secondary",
			"task-border-bottom",
			"task-p-1",
			"task-gap-0",
		);

		let draggedKey: string | null = null;

		toolbarOrder.forEach((barKey, index, arr) => {
			const btnDiv = document.createElement("div");
			btnDiv.className = "panel-header-btn";
			btnDiv.setAttribute("data-key", barKey);
			btnDiv.draggable = true;
			// 原代码：if (index < arr.length - 1) btnDiv.style.marginRight = "6px";
			if (index < arr.length - 1) btnDiv.addClass("task-mr-1");

			const label = document.createElement("span");
			label.className = "panel-header-label";
			label.textContent = PANEL_LABELS[barKey] || barKey;
			btnDiv.appendChild(label);

			const eyeBtn = document.createElement("span");
			eyeBtn.className = "panel-eye";
			eyeBtn.textContent = "👁";
			const isVisible = barVisibility[barKey];
			// 原代码：eyeBtn.style.opacity = isVisible ? "1" : "0.4";
			eyeBtn.addClass(isVisible ? "task-opacity-100" : "task-opacity-40");
			if (isVisible) btnDiv.classList.add("active");
			eyeBtn.title = isVisible ? "隐藏面板" : "显示面板";
			eyeBtn.onclick = (e: Event) => {
				e.stopPropagation();
				document.dispatchEvent(new CustomEvent("panel-expand"));
				const st = this.store.getState();
				const pr = st.presets.find((p) => p.id === st.activePresetId);
				if (!pr) return;
				const newVisibility = {
					...pr.barVisibility,
					[barKey]: !isVisible,
				};
				this.store.update({
					presets: st.presets.map((p) =>
						p.id === pr.id
							? { ...p, barVisibility: newVisibility }
							: p,
					),
				});
			};
			btnDiv.appendChild(eyeBtn);

			btnDiv.addEventListener("dragstart", (e) => {
				draggedKey = barKey;
				e.dataTransfer!.effectAllowed = "move";
				btnDiv.classList.add("dragging");
			});
			btnDiv.addEventListener("dragend", () => {
				btnDiv.classList.remove("dragging");
				draggedKey = null;
				this.buttonBar
					?.querySelectorAll(".drag-over")
					.forEach((el) => el.classList.remove("drag-over"));
			});
			btnDiv.addEventListener("dragover", (e) => {
				e.preventDefault();
				e.dataTransfer!.dropEffect = "move";
				btnDiv.classList.add("drag-over");
			});
			btnDiv.addEventListener("dragleave", () =>
				btnDiv.classList.remove("drag-over"),
			);
			btnDiv.addEventListener("drop", (e) => {
				e.preventDefault();
				btnDiv.classList.remove("drag-over");
				if (draggedKey && draggedKey !== barKey) {
					const st = this.store.getState();
					const pr = st.presets.find(
						(p) => p.id === st.activePresetId,
					);
					if (!pr) return;
					const order = pr.toolbarOrder ?? toolbarOrder;
					const fromIndex = order.indexOf(draggedKey);
					const toIndex = order.indexOf(barKey);
					const newOrder = [...order];
					newOrder.splice(fromIndex, 1);
					newOrder.splice(toIndex, 0, draggedKey);
					this.store.update({
						presets: st.presets.map((p) =>
							p.id === pr.id
								? { ...p, toolbarOrder: newOrder }
								: p,
						),
					});
				}
			});

			this.buttonBar.appendChild(btnDiv);
		});
	}
}
