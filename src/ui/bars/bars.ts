import { Store } from "../../store/store";
import { ConfigBar } from "./config-bar";
import { ExcutBar } from "./excut-bar";
import { HideBar } from "./hide-bar";
import { MarkBar } from "./mark-bar";
import { SearchBar } from "./search-bar";
import { SortBar } from "./sort-bar";
import { TimeBar } from "./time-bar";
import { ViewBar } from "./view-bar";

const BAR_COMPONENTS: Record<
	string,
	new (container: HTMLElement, store: Store) => any
> = {
	config: ConfigBar,
	time: TimeBar,
	excut: ExcutBar,
	search: SearchBar,
	mark: MarkBar,
	view: ViewBar,
	sort: SortBar,
	hide: HideBar,
};

const BAR_LABELS: Record<string, string> = {
	time: "任务时间",
	excut: "任务状态",
	search: "任务搜索",
	mark: "任务标记",
	view: "任务视图",
	hide: "视图隐藏",
	sort: "视图排序",
	config: "视图配置",
};

export class Toolbar {
	private container: HTMLElement;
	private store: Store;
	private buttonBar: HTMLElement | null = null;
	private panelsContainer: HTMLElement | null = null;
	private observer: IntersectionObserver | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.store.subscribe(() => this.render());
		this.render();
	}

	handleScroll() {
		// 悬浮切换由 IntersectionObserver 处理
	}

	render() {
		this.container.empty();
		this.removeObserver();

		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;

		const barVisibility = preset.barVisibility ?? {
			time: true,
			excut: true,
			search: true,
			mark: true,
			view: true,
			hide: true,
			sort: true,
			config: true,
		};
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

		this.buttonBar = this.container.createDiv({ cls: "toolbar-buttons" });
		this.buttonBar.style.position = "relative";
		this.buttonBar.style.transition = "box-shadow 0.2s";

		let draggedKey: string | null = null;

		toolbarOrder.forEach((barKey) => {
			const btnDiv = this.buttonBar!.createDiv({
				cls: "toolbar-btn-item",
				attr: { "data-key": barKey, draggable: "true" },
			});

			btnDiv.createSpan({
				cls: "toolbar-btn-label",
				text: BAR_LABELS[barKey] || barKey,
			});
			const eyeBtn = btnDiv.createSpan({
				cls: "toolbar-eye",
				text: "👁",
			});
			eyeBtn.title = barVisibility[barKey] ? "隐藏面板" : "显示面板";
			if (!barVisibility[barKey]) eyeBtn.style.opacity = "0.4";

			eyeBtn.onclick = (e: Event) => {
				e.stopPropagation();
				const newVisibility = {
					...barVisibility,
					[barKey]: !barVisibility[barKey],
				};
				this.updatePreset({ barVisibility: newVisibility });
			};

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

			btnDiv.addEventListener("dragleave", () => {
				btnDiv.classList.remove("drag-over");
			});

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
		});

		this.panelsContainer = document.createElement("div");
		this.panelsContainer.className = "toolbar-panels";
		this.container.appendChild(this.panelsContainer);
		this.renderPanels();

		if (this.buttonBar) {
			this.observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (!this.buttonBar) return;
						const rect = this.buttonBar.getBoundingClientRect();
						if (!entry.isIntersecting) {
							this.buttonBar.style.position = "fixed";
							this.buttonBar.style.top = "0";
							this.buttonBar.style.left = rect.left + "px";
							this.buttonBar.style.width = rect.width + "px";
							this.buttonBar.style.zIndex = "100";
							this.buttonBar.style.boxShadow =
								"0 2px 8px rgba(0,0,0,0.15)";
						} else {
							this.buttonBar.style.position = "relative";
							this.buttonBar.style.top = "";
							this.buttonBar.style.left = "";
							this.buttonBar.style.width = "";
							this.buttonBar.style.zIndex = "1";
							this.buttonBar.style.boxShadow = "";
						}
					});
				},
				{ threshold: 1.0 },
			);
			this.observer.observe(this.buttonBar);
		}

		// 修复：侧边栏宽度变化后，如果按钮条处于悬浮状态，强制更新其水平位置
		// 使用 requestAnimationFrame 确保布局计算完成
		requestAnimationFrame(() => {
			if (this.buttonBar && this.buttonBar.style.position === "fixed") {
				const rect = this.buttonBar.getBoundingClientRect();
				this.buttonBar.style.left = rect.left + "px";
				this.buttonBar.style.width = rect.width + "px";
			}
		});
	}

	private renderPanels() {
		if (!this.panelsContainer) return;
		this.panelsContainer.empty();
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;
		const barVisibility = preset.barVisibility ?? {};
		const toolbarOrder = preset.toolbarOrder ?? [];
		const visibleBars = toolbarOrder.filter((key) => barVisibility[key]);
		visibleBars.forEach((barKey) => {
			const panel = this.panelsContainer!.createDiv({
				cls: "toolbar-panel",
				attr: { "data-key": barKey },
			});
			if (BAR_COMPONENTS[barKey]) {
				new BAR_COMPONENTS[barKey](panel, this.store);
			}
		});
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

	private removeObserver() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}
}
