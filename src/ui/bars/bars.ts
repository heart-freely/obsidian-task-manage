// src/ui/bars/bars.ts
import { Store } from "../../store/store";
import { ConfigBar } from "./config-bar";
import { ExcutBar } from "./excut-bar";
import { HeadBar } from "./head-bar";
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

export class ToolbarManager {
	private static instance: ToolbarManager;
	private store!: Store;
	private viewEl!: HTMLElement;

	private buttonBarEl: HTMLElement | null = null;
	private panelsContainer: HTMLElement | null = null;
	private resizeHandle: HTMLElement | null = null;
	private headBar: HeadBar | null = null;

	private resizeObserver: ResizeObserver | null = null;
	private resizeHandler: (() => void) | null = null;
	private expandHandler: (() => void) | null = null;

	public isVisible: boolean = false;
	private isPanelsHidden: boolean = false;
	private panelHeight: number = 300;

	private constructor() {}

	static getInstance(): ToolbarManager {
		if (!ToolbarManager.instance) {
			ToolbarManager.instance = new ToolbarManager();
		}
		return ToolbarManager.instance;
	}

	init(store: Store, viewEl: HTMLElement, container: HTMLElement) {
		this.store = store;
		this.viewEl = viewEl;

		this.expandHandler = () => {
			const preset = this.store.getActivePreset();
			if (preset?.toolbarPanelsCollapsed) this.showPanels();
		};
		document.addEventListener("toolbar-expand", this.expandHandler);

		this.headBar = new HeadBar(container, store);
		this.buttonBarEl = this.headBar.getElement();
		if (this.buttonBarEl) {
			document.body.appendChild(this.buttonBarEl);
		}

		this.panelsContainer = document.createElement("div");
		this.panelsContainer.className = "toolbar-panels";
		this.panelsContainer.style.position = "fixed";
		this.panelsContainer.style.zIndex = "49";
		this.panelsContainer.style.background = "var(--background-primary)";
		this.panelsContainer.style.backgroundColor =
			"var(--background-primary)";
		this.panelsContainer.style.opacity = "1";
		this.panelsContainer.style.backdropFilter = "none";
		this.panelsContainer.style.border =
			"1px solid var(--background-modifier-border)";
		this.panelsContainer.style.borderRadius = "0 0 6px 6px";
		this.panelsContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
		this.panelsContainer.style.padding = "4px 4px 16px 4px";
		this.panelsContainer.style.display = "none";
		this.panelsContainer.style.flexDirection = "column";
		this.panelsContainer.style.gap = "4px";
		this.panelsContainer.style.overflowY = "auto";
		this.panelsContainer.style.boxSizing = "border-box";
		document.body.appendChild(this.panelsContainer);

		this.resizeHandle = document.createElement("div");
		this.resizeHandle.className = "panel-resize-handle";
		this.resizeHandle.style.position = "fixed";
		this.resizeHandle.style.zIndex = "60";
		this.resizeHandle.style.height = "8px";
		this.resizeHandle.style.cursor = "row-resize";
		this.resizeHandle.style.background = "rgba(128,128,128,0.4)";
		this.resizeHandle.style.borderRadius = "0 0 4px 4px";
		this.resizeHandle.style.display = "none";
		this.resizeHandle.style.alignItems = "center";
		this.resizeHandle.style.justifyContent = "center";
		this.resizeHandle.style.opacity = "0";
		this.resizeHandle.style.transition = "opacity 0.15s";
		this.resizeHandle.title = "拖拽调整高度 / 点击中间箭头折叠";
		this.resizeHandle.style.boxSizing = "border-box";
		document.body.appendChild(this.resizeHandle);

		const arrow = document.createElement("span");
		arrow.style.cursor = "pointer";
		arrow.style.fontSize = "10px";
		arrow.style.color = "rgba(255,255,255,0.8)";
		arrow.style.lineHeight = "1";
		arrow.addEventListener("mousedown", (e) => {
			e.stopPropagation();
			e.preventDefault();
		});
		arrow.addEventListener("click", (e) => {
			e.stopPropagation();
			this.togglePanels();
		});
		this.resizeHandle.appendChild(arrow);

		this.resizeHandle.addEventListener("mouseenter", () => {
			if (this.resizeHandle) this.resizeHandle.style.opacity = "1";
		});
		this.resizeHandle.addEventListener("mouseleave", () => {
			if (this.resizeHandle) this.resizeHandle.style.opacity = "0";
		});

		let startY = 0,
			startHeight = 0,
			dragging = false;
		this.resizeHandle.addEventListener("mousedown", (e) => {
			if (e.button !== 0 || e.target === arrow) return;
			e.preventDefault();
			dragging = true;
			startY = e.clientY;
			startHeight = this.panelHeight;
			const onMouseMove = (ev: MouseEvent) => {
				if (!dragging) return;
				const dy = ev.clientY - startY;
				let newHeight = startHeight + dy;
				newHeight = Math.min(
					window.innerHeight * 0.85,
					Math.max(30, newHeight),
				);
				if (this.panelsContainer) {
					this.panelsContainer.style.height = newHeight + "px";
				}
				this.panelHeight = newHeight;
				this.updatePreset({ toolbarPanelsHeight: newHeight });
				this.updateViewPadding();
			};
			const onMouseUp = () => {
				dragging = false;
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
			};
			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
		});

		this.setupObservers();

		// Store 变化时自动同步状态
		this.store.subscribe(() => this.syncState());

		// 延迟同步，确保 ViewContainer 等其他组件已就绪，避免状态被覆盖
		setTimeout(() => this.syncState(), 0);
	}

	private setupObservers() {
		if (this.resizeObserver) this.resizeObserver.disconnect();
		this.resizeObserver = new ResizeObserver(() => {
			if (this.isVisible && !this.isPanelsHidden) {
				this.updateViewPadding();
				this.updateHandlePosition();
			}
			this.updatePositions();
		});

		if (this.panelsContainer)
			this.resizeObserver.observe(this.panelsContainer);
		if (this.buttonBarEl) this.resizeObserver.observe(this.buttonBarEl);

		const sidebarEl = document.querySelector(".navigator-sidebar");
		if (sidebarEl) this.resizeObserver.observe(sidebarEl);

		this.resizeHandler = () => this.updatePositions();
		window.addEventListener("resize", this.resizeHandler);
	}

	public syncState() {
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;

		this.isVisible = preset.showToolbar === true;
		this.isPanelsHidden = preset.toolbarPanelsCollapsed ?? false;
		this.panelHeight = preset.toolbarPanelsHeight ?? 300;

		this.applyVisibility();
		this.refreshContent();
	}

	public applyVisibility() {
		if (!this.buttonBarEl || !this.panelsContainer || !this.resizeHandle)
			return;

		if (this.isVisible) {
			this.buttonBarEl.style.display = "flex";
			if (this.isPanelsHidden) {
				this.panelsContainer.style.display = "none";
				this.resizeHandle.style.display = "flex";
				this.resizeHandle.style.height = "10px";
			} else {
				this.panelsContainer.style.display = "flex";
				this.panelsContainer.style.height = this.panelHeight + "px";
				this.resizeHandle.style.display = "flex";
				this.resizeHandle.style.height = "8px";
			}
			const barHeight = this.buttonBarEl.offsetHeight;
			if (this.isPanelsHidden) {
				this.viewEl.style.paddingTop = barHeight + 4 + "px";
			} else {
				this.viewEl.style.paddingTop =
					barHeight + this.panelHeight + 12 + "px";
			}
		} else {
			this.buttonBarEl.style.display = "none";
			this.panelsContainer.style.display = "none";
			this.resizeHandle.style.display = "none";
			this.viewEl.style.paddingTop = "0px";
		}
		this.updateArrow();
		requestAnimationFrame(() => this.updatePositions());
	}

	private refreshContent() {
		if (!this.panelsContainer) return;
		const arrow = this.resizeHandle?.querySelector("span");
		this.panelsContainer.innerHTML = "";
		if (arrow && this.resizeHandle) {
			this.resizeHandle.appendChild(arrow);
		}

		const preset = this.store.getActivePreset();
		if (!preset) return;
		const barVisibility = preset.barVisibility ?? {};
		const toolbarOrder = preset.toolbarOrder ?? [];
		const visibleBars = toolbarOrder.filter((key) => barVisibility[key]);
		visibleBars.forEach((barKey) => {
			const panel = document.createElement("div");
			panel.className = "toolbar-panel";
			panel.style.background = "var(--background-secondary)";
			panel.style.backgroundColor = "var(--background-secondary)";
			panel.style.opacity = "1";
			panel.style.backdropFilter = "none";
			this.panelsContainer!.appendChild(panel);
			if (BAR_COMPONENTS[barKey]) {
				new BAR_COMPONENTS[barKey](panel, this.store);
			}
		});

		this.updateArrow();
		this.updatePositions();
	}

	private updateArrow() {
		const arrow = this.resizeHandle?.querySelector("span");
		if (arrow) {
			arrow.textContent = this.isPanelsHidden ? "▼" : "▲";
			arrow.title = this.isPanelsHidden ? "点击展开面板" : "点击折叠面板";
		}
	}

	private updatePositions() {
		if (!this.buttonBarEl || !this.panelsContainer || !this.resizeHandle)
			return;

		const mainEl = document.querySelector(".navigator-main") as HTMLElement;
		if (!mainEl) return;
		const mainRect = mainEl.getBoundingClientRect();
		const left = mainRect.left;
		const width = mainRect.width;

		if (this.isVisible) {
			this.buttonBarEl.style.position = "fixed";
			this.buttonBarEl.style.top = mainRect.top + "px";
			this.buttonBarEl.style.left = left + "px";
			this.buttonBarEl.style.width = width + "px";
			this.buttonBarEl.style.zIndex = "50";
			this.buttonBarEl.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
			this.buttonBarEl.style.opacity = "1";
			this.buttonBarEl.style.backdropFilter = "none";
			this.buttonBarEl.style.boxSizing = "border-box";

			const barRect = this.buttonBarEl.getBoundingClientRect();
			if (!this.isPanelsHidden) {
				this.panelsContainer.style.top = barRect.bottom + "px";
				this.panelsContainer.style.left = left + "px";
				this.panelsContainer.style.width = width + "px";
				this.panelsContainer.style.zIndex = "49";

				const panelsRect = this.panelsContainer.getBoundingClientRect();
				this.resizeHandle.style.top = panelsRect.bottom + "px";
				this.resizeHandle.style.left = left + "px";
				this.resizeHandle.style.width = width + "px";
			} else {
				this.resizeHandle.style.top = barRect.bottom + "px";
				this.resizeHandle.style.left = left + "px";
				this.resizeHandle.style.width = width + "px";
			}

			// 强制锁定手柄的显示状态，避免被外部样式意外修改
			if (this.isPanelsHidden) {
				this.resizeHandle.style.display = "flex";
				this.resizeHandle.style.height = "10px";
			} else {
				this.resizeHandle.style.display = "flex";
				this.resizeHandle.style.height = "8px";
			}
		}
	}

	private updateViewPadding() {
		const barHeight = this.buttonBarEl?.offsetHeight ?? 0;
		const panelsHeight = this.panelsContainer?.offsetHeight ?? 0;
		this.viewEl.style.paddingTop = barHeight + panelsHeight + 12 + "px";
	}

	private updateHandlePosition() {
		if (!this.resizeHandle || !this.panelsContainer) return;
		const panelsRect = this.panelsContainer.getBoundingClientRect();
		this.resizeHandle.style.top = panelsRect.bottom + "px";
	}

	private togglePanels() {
		this.isPanelsHidden = !this.isPanelsHidden;
		this.updatePreset({ toolbarPanelsCollapsed: this.isPanelsHidden });
		this.applyVisibility();
		this.refreshContent();
	}

	private showPanels() {
		if (this.isPanelsHidden) {
			this.togglePanels();
		}
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

	destroy() {
		this.isVisible = false;
		this.applyVisibility();
	}

	cleanupAll() {
		if (this.buttonBarEl && this.buttonBarEl.parentNode) {
			this.buttonBarEl.parentNode.removeChild(this.buttonBarEl);
		}
		if (this.panelsContainer && this.panelsContainer.parentNode) {
			this.panelsContainer.parentNode.removeChild(this.panelsContainer);
		}
		if (this.resizeHandle && this.resizeHandle.parentNode) {
			this.resizeHandle.parentNode.removeChild(this.resizeHandle);
		}
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
		if (this.resizeHandler) {
			window.removeEventListener("resize", this.resizeHandler);
		}
		if (this.expandHandler) {
			document.removeEventListener("toolbar-expand", this.expandHandler);
		}
		if (this.headBar) {
			this.headBar.destroy();
			this.headBar = null;
		}
	}
}
