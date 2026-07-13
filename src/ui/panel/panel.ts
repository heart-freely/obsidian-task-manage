// src/ui/panel/panel.ts
// 面板管理器

import { Store } from "../../core/store/store";
import { EditPanel } from "./edit-panel";
import { FilterPanel } from "./filter-panel";
import { HeadPanel } from "./head-panel";
import { HidePanel } from "./hide-panel";
import { SidebarPanel } from "./sidebar-panel";
import { SortPanel } from "./sort-panel";
import { TimePanel } from "./time-panel";
import { ViewPanel } from "./view-panel";

const logger = {
	warn: (...args: any[]) => console.warn("[TaskManage]", ...args),
	error: (...args: any[]) => console.error("[TaskManage]", ...args),
	info: (...args: any[]) => console.log("[TaskManage]", ...args),
};

type PanelComponentClass = new (
	container: HTMLElement,
	store: Store,
	app?: any,
) => any;

const PANEL_COMPONENTS: Record<string, PanelComponentClass> = {
	config: SidebarPanel,
	time: TimePanel,
	filter: FilterPanel,
	view: ViewPanel,
	sort: SortPanel,
	hide: HidePanel,
	edit: EditPanel,
};

export class Panels {
	private static instance: Panels;
	private store!: Store;
	private viewEl!: HTMLElement;
	private panelHost!: HTMLElement;
	private app!: any;

	private buttonBarEl: HTMLElement | null = null;
	private panelsContainer: HTMLElement | null = null;
	private panelContentInner: HTMLElement | null = null;
	private resizeHandle: HTMLElement | null = null;
	private headPanel: HeadPanel | null = null;
	private panelEls: Map<string, HTMLElement> = new Map();
	private panelInstances: Map<string, any> = new Map();
	private styleEl: HTMLStyleElement | null = null;

	private isPanelsCollapsed: boolean = false;
	private panelHeight: number = 300;

	private constructor() {}

	static getInstance(): Panels {
		if (!Panels.instance) {
			Panels.instance = new Panels();
		}
		return Panels.instance;
	}

	init(store: Store, viewEl: HTMLElement, container: HTMLElement, app: any) {
		this.store = store;
		this.viewEl = viewEl;
		this.app = app;

		this.panelHost = container.createDiv({ cls: "panel-host" });
		this.panelHost.style.position = "absolute";
		this.panelHost.style.top = "0";
		this.panelHost.style.left = "0";
		this.panelHost.style.right = "0";
		this.panelHost.style.zIndex = "50";
		this.panelHost.style.pointerEvents = "auto";

		this.buttonBarEl = document.createElement("div");
		this.buttonBarEl.className = "panel-header";
		this.buttonBarEl.style.cssText =
			"padding:4px 6px;display:flex;flex-wrap:nowrap;overflow-x:auto;background-color:var(--background-primary);border:none;border-bottom:1px solid var(--background-modifier-border);border-radius:0;box-sizing:border-box;gap:0;flex-shrink:0;";

		this.headPanel = new HeadPanel(this.buttonBarEl, store);

		this.panelsContainer = document.createElement("div");
		this.panelsContainer.className = "panel-container";
		this.panelsContainer.style.position = "relative";
		this.panelsContainer.style.zIndex = "49";
		this.panelsContainer.style.background = "var(--background-primary)";
		this.panelsContainer.style.border =
			"1px solid var(--background-modifier-border)";
		this.panelsContainer.style.borderRadius = "6px";
		this.panelsContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
		this.panelsContainer.style.padding = "0";
		this.panelsContainer.style.marginBottom = "0";
		this.panelsContainer.style.marginTop = "0";
		this.panelsContainer.style.display = "flex";
		this.panelsContainer.style.flexDirection = "column";
		this.panelsContainer.style.gap = "0";
		this.panelsContainer.style.overflowY = "auto";
		this.panelsContainer.style.overflowX = "hidden";
		this.panelsContainer.style.boxSizing = "border-box";

		this.panelContentInner = document.createElement("div");
		this.panelContentInner.style.cssText =
			"display:flex;flex-direction:column;gap:0;";
		this.panelContentInner.appendChild(this.buttonBarEl);
		this.panelsContainer.appendChild(this.panelContentInner);

		this.panelHost.appendChild(this.panelsContainer);

		this.resizeHandle = document.createElement("div");
		this.resizeHandle.className = "panel-resize-handle";
		this.resizeHandle.style.cssText =
			"height:8px;min-height:8px;cursor:row-resize;background:rgba(128,128,128,0.4);border-radius:0 0 4px 4px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;box-sizing:border-box;position:relative;z-index:60;flex-shrink:0;margin-top:0;";
		this.resizeHandle.title = "拖拽调整高度 / 点击中间箭头折叠";
		this.panelHost.appendChild(this.resizeHandle);

		const arrow = document.createElement("span");
		arrow.style.cssText =
			"cursor:pointer;font-size:10px;color:rgba(255,255,255,0.8);line-height:1;";
		arrow.textContent = "▲";
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
				if (this.panelsContainer)
					this.panelsContainer.style.height = newHeight + "px";
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

		this.store.subscribe(() => this.syncState());
		requestAnimationFrame(() => this.syncState());
	}

	public syncState() {
		try {
			const state = this.store.getState();
			const preset = state.presets.find(
				(p) => p.id === state.activePresetId,
			);
			if (!preset) return;
			const prevPresetId = (this as any)._prevPresetId;
			if (prevPresetId && prevPresetId !== state.activePresetId) {
				const instance = this.panelInstances.get("time");
				if (instance && typeof instance.onPresetChanged === "function")
					instance.onPresetChanged();
			}
			(this as any)._prevPresetId = state.activePresetId;
			this.isPanelsCollapsed = preset.toolbarPanelsCollapsed ?? false;
			this.panelHeight = preset.toolbarPanelsHeight ?? 300;
			this.applyVisibility();
			this.refreshContent();
			requestAnimationFrame(() => this.updateViewPadding());
		} catch (e) {
			console.warn("[TaskManage] 面板状态同步失败:", e);
		}
	}

	public refreshTimePanel() {
		const instance = this.panelInstances.get("time");
		if (instance && typeof instance.onPresetChanged === "function")
			instance.onPresetChanged();
	}

	public applyVisibility() {
		if (!this.panelsContainer || !this.resizeHandle) return;
		this.resizeHandle.style.display = "flex";
		if (this.isPanelsCollapsed) {
			this.panelsContainer.style.display = "none";
			this.panelsContainer.style.height = "0px";
			this.panelsContainer.style.padding = "0";
			this.panelsContainer.style.border = "none";
		} else {
			this.panelsContainer.style.display = "flex";
			this.panelsContainer.style.height = this.panelHeight + "px";
			this.panelsContainer.style.border =
				"1px solid var(--background-modifier-border)";
		}
		this.updateArrow();
		this.updateViewPadding();
	}

	private refreshContent() {
		if (!this.panelsContainer || !this.panelContentInner) return;
		const preset = this.store.getActivePreset();
		if (!preset) return;

		const toolbarOrder = preset.toolbarOrder ?? [
			"filter",
			"time",
			"view",
			"hide",
			"edit",
			"sort",
			"config",
		];

		// ===== 根据 barVisibility 过滤可见面板 =====
		const barVisibility = preset.barVisibility ?? {};
		// 默认显示：如果 barVisibility 中没有设置，默认显示
		const visibleKeys = toolbarOrder.filter(
			(key) => barVisibility[key] !== false,
		);

		const activeEl = document.activeElement;
		const isInputFocused =
			activeEl &&
			(activeEl.tagName === "INPUT" ||
				activeEl.tagName === "TEXTAREA" ||
				(activeEl as HTMLElement).isContentEditable);

		if (isInputFocused) return;

		const newKeys = new Set(visibleKeys);

		for (const [key, panel] of this.panelEls) {
			if (!newKeys.has(key)) {
				panel.remove();
				this.panelEls.delete(key);
				const instance = this.panelInstances.get(key);
				if (instance && typeof instance.destroy === "function")
					instance.destroy();
				this.panelInstances.delete(key);
			}
		}

		for (const key of visibleKeys) {
			if (!this.panelEls.has(key)) {
				const panel = document.createElement("div");
				panel.className = "panel-content";
				panel.setAttribute("data-panel-key", key);
				this.panelEls.set(key, panel);
				if (PANEL_COMPONENTS[key]) {
					const instance = new PANEL_COMPONENTS[key](
						panel,
						this.store,
						this.app,
					);
					this.panelInstances.set(key, instance);
				}
			}
		}

		const currentChildren = Array.from(this.panelContentInner.children);
		const expectedOrder = visibleKeys
			.map((key) => this.panelEls.get(key))
			.filter(Boolean);

		let needReorder = false;
		for (let i = 0; i < expectedOrder.length; i++) {
			if (currentChildren[i + 1] !== expectedOrder[i]) {
				needReorder = true;
				break;
			}
		}

		if (needReorder) {
			const fragment = document.createDocumentFragment();
			for (const panel of expectedOrder) {
				fragment.appendChild(panel);
			}
			this.panelContentInner.appendChild(fragment);
		}
	}

	private updateArrow() {
		const arrow = this.resizeHandle?.querySelector("span");
		if (arrow) {
			arrow.textContent = this.isPanelsCollapsed ? "▼" : "▲";
			arrow.title = this.isPanelsCollapsed
				? "展开视图配置面板"
				: "折叠视图配置面板";
		}
	}

	private updateViewPadding() {
		if (!this.panelsContainer) {
			this.viewEl.style.paddingTop = "0px";
			return;
		}
		const handleHeight = 8;
		if (this.isPanelsCollapsed) {
			this.viewEl.style.paddingTop = handleHeight + "px";
		} else {
			this.viewEl.style.paddingTop =
				this.panelHeight + handleHeight + "px";
		}
	}

	private togglePanels() {
		this.isPanelsCollapsed = !this.isPanelsCollapsed;
		this.updatePreset({ toolbarPanelsCollapsed: this.isPanelsCollapsed });
		this.applyVisibility();
		this.refreshContent();
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

	public initPanelSubscriptions() {
		for (const [key, instance] of this.panelInstances) {
			if (instance && typeof instance.initSubscription === "function") {
				instance.initSubscription();
			}
		}
	}

	public getEditPanel(): EditPanel | undefined {
		return this.panelInstances.get("edit") as EditPanel | undefined;
	}

	destroy() {}

	cleanupAll() {
		for (const [, instance] of this.panelInstances) {
			if (instance && typeof instance.destroy === "function")
				instance.destroy();
		}
		this.panelInstances.clear();
		if (this.headPanel) {
			this.headPanel.destroy();
			this.headPanel = null;
		}
		this.panelEls.clear();
		if (this.styleEl) {
			this.styleEl.remove();
			this.styleEl = null;
		}
	}
}
