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
	private toolbarHost!: HTMLElement;

	private buttonBarEl: HTMLElement | null = null;
	private panelsContainer: HTMLElement | null = null;
	private resizeHandle: HTMLElement | null = null;
	private headBar: HeadBar | null = null;
	private barPanels: Map<string, HTMLElement> = new Map();
	private styleEl: HTMLStyleElement | null = null;

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

		this.toolbarHost = container.createDiv({ cls: "toolbar-host" });
		this.toolbarHost.style.position = "absolute";
		this.toolbarHost.style.top = "0";
		this.toolbarHost.style.left = "0";
		this.toolbarHost.style.right = "0";
		this.toolbarHost.style.zIndex = "50";
		this.toolbarHost.style.pointerEvents = "auto";

		this.headBar = new HeadBar(container, store);
		this.buttonBarEl = this.headBar.getElement();
		if (this.buttonBarEl) {
			this.buttonBarEl.style.position = "relative";
			this.buttonBarEl.style.zIndex = "51";
			this.toolbarHost.appendChild(this.buttonBarEl);
		}

		this.panelsContainer = document.createElement("div");
		this.panelsContainer.className = "toolbar-panels";
		this.panelsContainer.style.position = "relative";
		this.panelsContainer.style.zIndex = "49";
		this.panelsContainer.style.background = "var(--background-primary)";
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
		this.toolbarHost.appendChild(this.panelsContainer);

		this.resizeHandle = document.createElement("div");
		this.resizeHandle.className = "panel-resize-handle";
		this.resizeHandle.style.position = "relative";
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
		this.toolbarHost.appendChild(this.resizeHandle);

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

		this.expandHandler = () => {
			const preset = this.store.getActivePreset();
			if (preset?.toolbarPanelsCollapsed) this.showPanels();
		};
		document.addEventListener("toolbar-expand", this.expandHandler);

		this.injectStyles();

		this.store.subscribe(() => this.syncState());

		setTimeout(() => this.syncState(), 0);
	}

	private injectStyles() {
		if (this.styleEl) return;
		this.styleEl = document.createElement("style");
		this.styleEl.textContent = `
			/* 面板内按钮 */
			.toolbar-panels .filter-btn,
			.toolbar-panels .bar-btn {
				padding: 6px 6px !important;
				font-family: var(--font-text) !important;
				font-size: var(--font-ui-small) !important;
				line-height: var(--line-height-normal) !important;
				margin: 2px 4px 2px 0 !important;
				text-align: left !important;
				white-space: nowrap;
				display: inline-flex !important;
				align-items: center;
				justify-content: flex-start;
				flex-grow: 0 !important;
				flex-shrink: 0 !important;
				width: auto !important;
				min-width: auto !important;
				height: auto !important;
			}
			/* 说明文字 */
			.toolbar-panels .filter-label {
				font-family: var(--font-text) !important;
				font-size: var(--font-ui-small) !important;
				font-weight: normal !important;
				color: var(--text-normal) !important;
				text-align: justify !important;
				text-align-last: justify !important;
				text-justify: inter-character !important;
				width: 4em;
				flex-shrink: 0;
				margin: 0 !important;
				padding: 0 !important;
				border: none !important;
				box-sizing: border-box !important;
				overflow: hidden;
				white-space: normal !important;
				word-break: keep-all;
			}
			.toolbar-panels .bar-row,
			.toolbar-panels .filter-row {
				display: flex;
				align-items: center;
				justify-content: flex-start;
				margin-bottom: 4px;
				flex-wrap: wrap;
			}
			.toolbar-panels .sub-panel {
				margin-left: 8px;
				gap: 4px;
			}
			/* 修复时间栏 section 造成的偏移 */
			.toolbar-panels .filter-section {
				margin: 0 !important;
				padding: 0 !important;
			}
			/* 标题栏按钮 */
			.toolbar-buttons .toolbar-btn-item {
				padding: 6px 6px;
				font-family: var(--font-text);
				font-size: var(--font-ui-small);
				line-height: var(--line-height-normal);
				color: var(--text-normal);
				display: inline-flex;
				align-items: center;
				gap: 4px;
				cursor: pointer;
				user-select: none;
				white-space: nowrap;
				margin: 0;
				border-radius: 4px;
				background: transparent;
				border: 1px solid transparent;
				transition: background 0.15s;
				flex-grow: 0;
				flex-shrink: 0;
				width: auto;
				min-width: auto;
			}
			.toolbar-buttons .toolbar-btn-item:hover {
				background: var(--background-modifier-hover);
			}
			.toolbar-buttons .toolbar-btn-item.active {
				background: var(--background-modifier-active);
			}
			.toolbar-buttons .toolbar-btn-label {
				font-family: inherit;
				font-size: inherit;
				line-height: inherit;
				color: inherit;
			}
			.toolbar-panels .view-btn {
				flex-grow: 0 !important;
				flex-shrink: 0 !important;
				width: auto !important;
			}
		`;
		document.head.appendChild(this.styleEl);
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
			this.updateViewPadding();
		} else {
			this.buttonBarEl.style.display = "none";
			this.panelsContainer.style.display = "none";
			this.resizeHandle.style.display = "none";
			this.viewEl.style.paddingTop = "0px";
		}
		this.updateArrow();
	}

	private refreshContent() {
		if (!this.panelsContainer) return;

		const preset = this.store.getActivePreset();
		if (!preset) return;

		const barVisibility = preset.barVisibility ?? {};
		const toolbarOrder = preset.toolbarOrder ?? [];
		const visibleKeys = toolbarOrder.filter((key) => barVisibility[key]);

		for (const [key, panel] of this.barPanels) {
			if (!visibleKeys.includes(key)) {
				panel.remove();
				this.barPanels.delete(key);
			}
		}

		for (const key of visibleKeys) {
			let panel = this.barPanels.get(key);
			if (!panel) {
				panel = document.createElement("div");
				panel.className = "toolbar-panel";
				panel.style.background = "var(--background-secondary)";
				panel.style.opacity = "1";
				panel.style.backdropFilter = "none";
				this.panelsContainer!.appendChild(panel);
				this.barPanels.set(key, panel);
			}
			panel.innerHTML = "";
			if (BAR_COMPONENTS[key]) {
				new BAR_COMPONENTS[key](panel, this.store);
			}
		}
	}

	private updateArrow() {
		const arrow = this.resizeHandle?.querySelector("span");
		if (arrow) {
			arrow.textContent = this.isPanelsHidden ? "▼" : "▲";
			arrow.title = this.isPanelsHidden ? "点击展开面板" : "点击折叠面板";
		}
	}

	private updateViewPadding() {
		if (!this.buttonBarEl) return;
		const barHeight = this.buttonBarEl.offsetHeight;
		if (this.isPanelsHidden) {
			this.viewEl.style.paddingTop = barHeight + 4 + "px";
		} else {
			this.viewEl.style.paddingTop =
				barHeight + this.panelHeight + 12 + "px";
		}
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

	destroy() {}

	cleanupAll() {
		if (this.headBar) {
			this.headBar.destroy();
			this.headBar = null;
		}
		this.barPanels.clear();
		if (this.expandHandler) {
			document.removeEventListener("toolbar-expand", this.expandHandler);
		}
		if (this.styleEl) {
			this.styleEl.remove();
			this.styleEl = null;
		}
	}
}
