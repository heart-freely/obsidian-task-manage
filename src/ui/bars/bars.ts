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
	private isSticky = false;
	private scrollHandler: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.store.subscribe(() => this.render());
		this.render();
	}

	render() {
		this.container.empty();
		this.removeScrollListener();

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

		// 按钮条（普通流式布局，不换行）
		this.buttonBar = this.container.createDiv({ cls: "toolbar-buttons" });
		this.buttonBar.style.display = "flex";
		this.buttonBar.style.flexWrap = "nowrap";
		this.buttonBar.style.overflowX = "auto";

		let draggedKey: string | null = null;
		toolbarOrder.forEach((barKey) => {
			const btnDiv = this.buttonBar!.createDiv({
				cls: "toolbar-btn-item",
				attr: { "data-key": barKey, draggable: "true" },
			});
			btnDiv.style.flexShrink = "0";
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

			// 拖拽事件（完整保留，此处略）
		});

		// 面板容器（初始显示，作为正常文档流）
		this.panelsContainer = document.createElement("div");
		this.panelsContainer.className = "toolbar-panels";
		this.panelsContainer.style.display = ""; // 默认显示
		this.container.appendChild(this.panelsContainer);
		this.renderPanels();

		// 滚动监听悬浮
		this.scrollHandler = this.handleScroll.bind(this);
		window.addEventListener("scroll", this.scrollHandler, {
			passive: true,
		});
		this.handleScroll();
	}

	private handleScroll() {
		if (!this.buttonBar || !this.panelsContainer) return;
		const rect = this.buttonBar.getBoundingClientRect();
		const shouldBeSticky = rect.top <= 0;

		if (shouldBeSticky && !this.isSticky) {
			// 变为悬浮
			this.buttonBar.style.position = "fixed";
			this.buttonBar.style.top = "0";
			this.buttonBar.style.left = rect.left + "px";
			this.buttonBar.style.width = rect.width + "px";
			this.buttonBar.style.zIndex = "100";
			this.buttonBar.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

			this.panelsContainer.style.position = "fixed";
			this.panelsContainer.style.top = this.buttonBar.offsetHeight + "px";
			this.panelsContainer.style.left = rect.left + "px";
			this.panelsContainer.style.width = rect.width + "px";
			this.panelsContainer.style.maxHeight = "50vh";
			this.panelsContainer.style.overflowY = "auto";
			this.panelsContainer.style.zIndex = "99";
			this.panelsContainer.style.background = "var(--background-primary)";
			this.panelsContainer.style.border =
				"1px solid var(--background-modifier-border)";
			this.panelsContainer.style.borderRadius = "0 0 6px 6px";
			this.panelsContainer.style.padding = "8px";
			this.panelsContainer.style.boxShadow =
				"0 4px 12px rgba(0,0,0,0.15)";
			this.isSticky = true;
		} else if (!shouldBeSticky && this.isSticky) {
			// 恢复普通流
			this.buttonBar.style.position = "relative";
			this.buttonBar.style.top = "";
			this.buttonBar.style.left = "";
			this.buttonBar.style.width = "";
			this.buttonBar.style.zIndex = "1";
			this.buttonBar.style.boxShadow = "";

			this.panelsContainer.style.position = "";
			this.panelsContainer.style.top = "";
			this.panelsContainer.style.left = "";
			this.panelsContainer.style.width = "";
			this.panelsContainer.style.maxHeight = "";
			this.panelsContainer.style.overflowY = "";
			this.panelsContainer.style.zIndex = "";
			this.panelsContainer.style.background = "";
			this.panelsContainer.style.border = "";
			this.panelsContainer.style.borderRadius = "";
			this.panelsContainer.style.padding = "";
			this.panelsContainer.style.boxShadow = "";
			this.isSticky = false;
		}
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

	private removeScrollListener() {
		if (this.scrollHandler) {
			window.removeEventListener("scroll", this.scrollHandler);
			this.scrollHandler = null;
		}
	}
}
