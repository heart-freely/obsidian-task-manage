// src/ui/panels/head-panel.ts
// 面板标题栏

import { Store } from "../../core/store/store";

const PANEL_LABELS: Record<string, string> = {
	time: "任务时间",
	excut: "任务状态",
	search: "任务描述",
	mark: "任务标记",
	view: "任务视图",
	hide: "视图隐藏",
	sort: "视图排序",
	config: "视图配置",
};

export class HeadPanel {
	private container: HTMLElement;
	private store: Store;
	private buttonBar: HTMLElement | null = null;
	private unsub: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.unsub = store.subscribe(() => this.renderContent());
		this.renderContent();
	}

	destroy() {
		this.unsub?.();
		this.unsub = null;
		if (this.buttonBar?.parentNode)
			this.buttonBar.parentNode.removeChild(this.buttonBar);
		this.buttonBar = null;
	}

	renderContent() {
		if (!this.buttonBar) {
			this.buttonBar = document.createElement("div");
			this.buttonBar.className = "panel-header";
		}
		this.buttonBar.innerHTML = "";
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;

		const barVisibility = preset.barVisibility ?? {};
		const toolbarOrder = preset.toolbarOrder ?? [
			"excut",
			"search",
			"mark",
			"time",
			"view",
			"hide",
			"sort",
			"config",
		];

		Object.assign(this.buttonBar.style, {
			paddingLeft: "0",
			display: "flex",
			flexWrap: "nowrap",
			overflowX: "auto",
			background: "var(--background-secondary)",
			border: "1px solid var(--background-modifier-border)",
			borderRadius: "6px",
			boxSizing: "border-box",
			gap: "0",
		});

		let draggedKey: string | null = null;

		toolbarOrder.forEach((barKey, index, arr) => {
			const btnDiv = document.createElement("div");
			btnDiv.className = "panel-header-btn";
			btnDiv.setAttribute("data-key", barKey);
			btnDiv.draggable = true;
			if (index < arr.length - 1) btnDiv.style.marginRight = "6px";

			const label = document.createElement("span");
			label.className = "panel-header-label";
			label.textContent = PANEL_LABELS[barKey] || barKey;
			btnDiv.appendChild(label);

			const eyeBtn = document.createElement("span");
			eyeBtn.className = "panel-eye";
			eyeBtn.textContent = "👁";
			const isVisible = barVisibility[barKey];
			eyeBtn.style.opacity = isVisible ? "1" : "0.4";
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

	getElement(): HTMLElement | null {
		return this.buttonBar;
	}
}
