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
		this.panelHost.addClass("panel-host-layout");

		this.buttonBarEl = document.createElement("div");
		this.buttonBarEl.className = "panel-header";
		this.buttonBarEl.addClass("panel-header-layout");

		this.headPanel = new HeadPanel(this.buttonBarEl, store);

		this.panelsContainer = document.createElement("div");
		this.panelsContainer.className = "panel-container";
		this.panelsContainer.addClass("panel-container-layout");

		this.panelContentInner = document.createElement("div");
		this.panelContentInner.addClass("panel-content-inner");
		this.panelContentInner.appendChild(this.buttonBarEl);
		this.panelsContainer.appendChild(this.panelContentInner);

		this.panelHost.appendChild(this.panelsContainer);

		this.resizeHandle = document.createElement("div");
		this.resizeHandle.className =
			"panel-resize-handle panel-resize-handle-layout";
		this.resizeHandle.title = "拖拽调整高度 / 点击中间箭头折叠";
		this.panelHost.appendChild(this.resizeHandle);

		const arrow = document.createElement("span");
		arrow.addClass("panel-resize-arrow");
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
			if (this.resizeHandle)
				this.resizeHandle.addClass("task-opacity-100");
		});
		this.resizeHandle.addEventListener("mouseleave", () => {
			if (this.resizeHandle)
				this.resizeHandle.removeClass("task-opacity-100");
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
					this.panelsContainer.setCssProps({
						"--panel-height": newHeight + "px",
					});
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
		this.resizeHandle.addClass("task-flex");
		if (this.isPanelsCollapsed) {
			this.panelsContainer.addClass("task-hidden");
			this.panelsContainer.setCssProps({
				"--panel-height": "0px",
				"--panel-padding": "0",
				"--panel-border": "none",
			});
		} else {
			this.panelsContainer.removeClass("task-hidden");
			this.panelsContainer.setCssProps({
				"--panel-height": this.panelHeight + "px",
				"--panel-border": "1px solid var(--background-modifier-border)",
			});
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

		const barVisibility = preset.barVisibility ?? {};
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
			this.viewEl.setCssProps({ "--view-padding-top": "0px" });
			return;
		}
		const handleHeight = 8;
		if (this.isPanelsCollapsed) {
			this.viewEl.setCssProps({
				"--view-padding-top": handleHeight + "px",
			});
		} else {
			this.viewEl.setCssProps({
				"--view-padding-top": this.panelHeight + handleHeight + "px",
			});
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
