import { Store } from "../../store/store";

export const BAR_LABELS: Record<string, string> = {
	time: "任务时间",
	excut: "任务状态",
	search: "任务搜索",
	mark: "任务标记",
	view: "任务视图",
	hide: "视图隐藏",
	sort: "视图排序",
	config: "视图配置",
};

export class HeadBar {
	private container: HTMLElement; // 不再用于挂载，仅用于占位
	private store: Store;
	private buttonBar: HTMLElement | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		// 初始化时创建一个 buttonBar，但不挂载到任何地方
		this.buttonBar = document.createElement("div");
		this.buttonBar.className = "toolbar-buttons";
		this.renderContent();
		this.store.subscribe(() => this.renderContent());
	}

	/** 重新生成按钮条内容，但保留元素本身，避免外部引用丢失 */
	private renderContent() {
		if (!this.buttonBar) return;
		// 清空现有内容
		this.buttonBar.innerHTML = "";

		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;

		const barVisibility = preset.barVisibility ?? {};
		const toolbarOrder = preset.toolbarOrder ?? [
			"time",
			"excut",
			"search",
			"mark",
			"view",
			"hide",
			"sort",
			"config",
		];

		// 设置容器样式
		this.buttonBar.style.paddingLeft = "0";
		this.buttonBar.style.display = "flex";
		this.buttonBar.style.flexWrap = "nowrap";
		this.buttonBar.style.overflowX = "auto";
		this.buttonBar.style.background = "var(--background-secondary)";
		this.buttonBar.style.border =
			"1px solid var(--background-modifier-border)";
		this.buttonBar.style.borderRadius = "6px";
		this.buttonBar.style.boxSizing = "border-box";
		this.buttonBar.style.gap = "0";

		let draggedKey: string | null = null;

		toolbarOrder.forEach((barKey, index, arr) => {
			const btnDiv = document.createElement("div");
			btnDiv.className = "toolbar-btn-item";
			btnDiv.setAttribute("data-key", barKey);
			btnDiv.draggable = true;

			if (index < arr.length - 1) {
				btnDiv.style.marginRight = "6px";
			}

			const label = document.createElement("span");
			label.className = "toolbar-btn-label";
			label.textContent = BAR_LABELS[barKey] || barKey;
			btnDiv.appendChild(label);

			const eyeBtn = document.createElement("span");
			eyeBtn.className = "toolbar-eye";
			eyeBtn.textContent = "👁";
			const isVisible = barVisibility[barKey];
			eyeBtn.style.opacity = isVisible ? "1" : "0.4";
			if (isVisible) btnDiv.classList.add("active");
			eyeBtn.title = isVisible ? "隐藏面板" : "显示面板";

			eyeBtn.onclick = (e: Event) => {
				e.stopPropagation();
				const newVisibility = {
					...barVisibility,
					[barKey]: !isVisible,
				};
				this.updatePreset({ barVisibility: newVisibility });
			};
			btnDiv.appendChild(eyeBtn);

			// 拖拽排序
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
					const fromIndex = toolbarOrder.indexOf(draggedKey);
					const toIndex = toolbarOrder.indexOf(barKey);
					const newOrder = [...toolbarOrder];
					newOrder.splice(fromIndex, 1);
					newOrder.splice(toIndex, 0, draggedKey);
					this.updatePreset({ toolbarOrder: newOrder });
				}
			});

			this.buttonBar.appendChild(btnDiv);
		});
	}

	/** 返回当前的按钮条元素，供外部挂载到 DOM */
	getElement(): HTMLElement | null {
		return this.buttonBar;
	}

	private updatePreset(changes: Partial<any>) {
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;
		const newPresets = state.presets.map((p) =>
			p.id === preset.id ? { ...p, ...changes } : p,
		);
		this.store.update({ presets: newPresets });
	}
}
