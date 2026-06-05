// src/ui/panel/panel.ts
// 面板管理器

import { Store } from "../../process/store/store";
import { HeadPanel } from "./head-panel";
import { HidePanel } from "./hide-panel";
import { MarkPanel } from "./mark-panel";
import { PresetPanel } from "./preset-panel";
import { SearchPanel } from "./search-panel";
import { SortPanel } from "./sort-panel";
import { StatusPanel } from "./status-panel";
import { TimePanel } from "./time-panel";
import { ViewPanel } from "./view-panel";

const PANEL_COMPONENTS: Record<
	string,
	new (container: HTMLElement, store: Store) => any
> = {
	config: PresetPanel,
	time: TimePanel,
	excut: StatusPanel,
	search: SearchPanel,
	mark: MarkPanel,
	view: ViewPanel,
	sort: SortPanel,
	hide: HidePanel,
};

export class Panels {
	private static instance: Panels;
	private store!: Store;
	private viewEl!: HTMLElement;
	private panelHost!: HTMLElement;

	private buttonBarEl: HTMLElement | null = null;
	private panelsContainer: HTMLElement | null = null;
	private resizeHandle: HTMLElement | null = null;
	private headPanel: HeadPanel | null = null;
	private panelEls: Map<string, HTMLElement> = new Map();
	private panelInstances: Map<string, any> = new Map();
	private styleEl: HTMLStyleElement | null = null;

	public isVisible: boolean = false;
	private isPanelsCollapsed: boolean = false;
	private panelHeight: number = 300;

	private constructor() {}

	static getInstance(): Panels {
		if (!Panels.instance) {
			Panels.instance = new Panels();
		}
		return Panels.instance;
	}

	init(store: Store, viewEl: HTMLElement, container: HTMLElement) {
		this.store = store;
		this.viewEl = viewEl;

		this.panelHost = container.createDiv({ cls: "panel-host" });
		this.panelHost.style.position = "absolute";
		this.panelHost.style.top = "0";
		this.panelHost.style.left = "0";
		this.panelHost.style.right = "0";
		this.panelHost.style.zIndex = "50";
		this.panelHost.style.pointerEvents = "auto";

		this.headPanel = new HeadPanel(container, store);
		this.buttonBarEl = this.headPanel.getElement();
		if (this.buttonBarEl) {
			this.buttonBarEl.style.position = "relative";
			this.buttonBarEl.style.zIndex = "51";
			this.buttonBarEl.style.marginBottom = "0";
			this.panelHost.appendChild(this.buttonBarEl);
		}

		this.panelsContainer = document.createElement("div");
		this.panelsContainer.className = "panel-container";
		this.panelsContainer.style.position = "relative";
		this.panelsContainer.style.zIndex = "49";
		this.panelsContainer.style.background = "var(--background-primary)";
		this.panelsContainer.style.border =
			"1px solid var(--background-modifier-border)";
		this.panelsContainer.style.borderTop = "none";
		this.panelsContainer.style.borderRadius = "0 0 6px 6px";
		this.panelsContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
		this.panelsContainer.style.padding = "4px 4px 0 4px";
		this.panelsContainer.style.marginBottom = "0";
		this.panelsContainer.style.marginTop = "0";
		this.panelsContainer.style.display = "none";
		this.panelsContainer.style.flexDirection = "column";
		this.panelsContainer.style.gap = "4px";
		this.panelsContainer.style.overflowY = "auto";
		this.panelsContainer.style.boxSizing = "border-box";
		this.panelHost.appendChild(this.panelsContainer);

		this.resizeHandle = document.createElement("div");
		this.resizeHandle.className = "panel-resize-handle";
		this.resizeHandle.style.cssText =
			"height:8px;min-height:8px;cursor:row-resize;background:rgba(128,128,128,0.4);border-radius:0 0 4px 4px;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;box-sizing:border-box;position:relative;z-index:60;flex-shrink:0;margin-top:0;";
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
		document.addEventListener("panel-expand", this.expandHandler);

		this.injectStyles();
		this.store.subscribe(() => this.syncState());
		requestAnimationFrame(() => this.syncState());
	}

	private injectStyles() {
		if (this.styleEl) return;
		this.styleEl = document.createElement("style");
		this.styleEl.textContent = `
        .panel-btn {
            padding: 3px 6px !important;
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
            border-radius: 16px;
            background: var(--interactive-normal);
            border: none;
            cursor: pointer;
        }
        .panel-btn.active {
            background: var(--interactive-accent) !important;
            color: white !important;
        }
        .panel-label {
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
            margin-right: 6px !important;
            padding: 0 !important;
            border: none !important;
            box-sizing: border-box !important;
            overflow: hidden;
            white-space: normal !important;
            word-break: keep-all;
        }
        .panel-row {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            margin-bottom: 4px;
            flex-wrap: wrap;
        }
        .panel-sub { margin-left: 8px; gap: 4px; }
        .panel-section { margin: 0 !important; padding: 0 !important; }
        .panel-header-btn {
            flex-shrink: 0; display: flex; align-items: center; gap: 4px;
            cursor: grab; padding: 4px 8px; border-radius: 6px;
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            user-select: none; font-size: 12px; white-space: nowrap;
        }
        .panel-header-btn:hover { background: var(--background-modifier-hover); }
        .panel-header-btn.active { background: var(--background-modifier-active); }
        .panel-header-label {
            font-family: inherit;
            font-size: inherit;
            line-height: inherit;
            color: inherit;
        }
        .panel-view-btn { min-width: 80px; }
        .panel-input {
            padding: 4px 8px; border-radius: 12px;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-primary);
            color: var(--text-normal); font-size: 13px; min-width: 200px;
        }
        .panel-input-sm {
            width: 48px;
            min-width: 48px;
            padding: 3px 4px;
            font-size: 14px;
            text-align: center;
        }
    `;
		document.head.appendChild(this.styleEl);
	}

	public syncState() {
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;
		const prevPresetId = (this as any)._prevPresetId;
		if (prevPresetId && prevPresetId !== state.activePresetId) {
			const instance = this.panelInstances.get("time");
			if (instance && typeof instance.onPresetChanged === "function")
				instance.onPresetChanged();
		}
		(this as any)._prevPresetId = state.activePresetId;
		this.isVisible = preset.showToolbar === true;
		this.isPanelsCollapsed = preset.toolbarPanelsCollapsed ?? false;
		this.panelHeight = preset.toolbarPanelsHeight ?? 300;
		this.applyVisibility();
		this.refreshContent();
		requestAnimationFrame(() => this.updateViewPadding());
	}

	public refreshTimePanel() {
		const instance = this.panelInstances.get("time");
		if (instance && typeof instance.onPresetChanged === "function")
			instance.onPresetChanged();
	}

	public applyVisibility() {
		if (!this.buttonBarEl || !this.panelsContainer || !this.resizeHandle)
			return;
		if (this.isVisible) {
			this.buttonBarEl.style.display = "flex";
			this.buttonBarEl.style.marginBottom = "0";
			this.resizeHandle.style.display = "flex";
			if (this.isPanelsCollapsed) {
				this.panelsContainer.style.display = "none";
				this.panelsContainer.style.height = "0px";
				this.panelsContainer.style.padding = "0";
				this.panelsContainer.style.border = "none";
				this.panelsContainer.style.borderTop = "none";
			} else {
				this.panelsContainer.style.display = "flex";
				this.panelsContainer.style.height = this.panelHeight + "px";
				this.panelsContainer.style.padding = "4px 4px 0 4px";
				this.panelsContainer.style.border =
					"1px solid var(--background-modifier-border)";
				this.panelsContainer.style.borderTop = "none";
				this.panelsContainer.style.marginTop = "0";
				this.panelsContainer.style.marginBottom = "0";
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
		const activeEl = document.activeElement;
		const isInputFocused =
			activeEl &&
			(activeEl.tagName === "INPUT" ||
				activeEl.tagName === "TEXTAREA" ||
				(activeEl as HTMLElement).isContentEditable);
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
		if (isInputFocused) {
			for (const key of visibleKeys) {
				if (!this.panelEls.has(key)) {
					const panel = document.createElement("div");
					panel.className = "panel-content";
					panel.style.background = "var(--background-secondary)";
					panel.style.opacity = "1";
					panel.style.backdropFilter = "none";
					this.panelsContainer!.appendChild(panel);
					this.panelEls.set(key, panel);
					if (PANEL_COMPONENTS[key])
						this.panelInstances.set(
							key,
							new PANEL_COMPONENTS[key](panel, this.store),
						);
				}
			}
			return;
		}
		for (const key of visibleKeys) {
			if (!this.panelEls.has(key)) {
				const panel = document.createElement("div");
				panel.className = "panel-content";
				panel.style.background = "var(--background-secondary)";
				panel.style.opacity = "1";
				panel.style.backdropFilter = "none";
				this.panelsContainer!.appendChild(panel);
				this.panelEls.set(key, panel);
				if (PANEL_COMPONENTS[key])
					this.panelInstances.set(
						key,
						new PANEL_COMPONENTS[key](panel, this.store),
					);
			}
		}
	}

	private updateArrow() {
		const arrow = this.resizeHandle?.querySelector("span");
		if (arrow) {
			arrow.textContent = this.isPanelsCollapsed ? "▼" : "▲";
			arrow.title = this.isPanelsCollapsed
				? "点击展开面板"
				: "点击折叠面板";
		}
	}

	private updateViewPadding() {
		if (!this.buttonBarEl) return;
		const barHeight = this.buttonBarEl.offsetHeight;
		const handleHeight = 8;
		this.viewEl.style.paddingTop = this.isPanelsCollapsed
			? barHeight + handleHeight + "px"
			: barHeight + this.panelHeight + handleHeight + "px";
	}

	private togglePanels() {
		this.isPanelsCollapsed = !this.isPanelsCollapsed;
		this.updatePreset({ toolbarPanelsCollapsed: this.isPanelsCollapsed });
		this.applyVisibility();
		this.refreshContent();
	}

	private showPanels() {
		if (this.isPanelsCollapsed) this.togglePanels();
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
		if (this.expandHandler)
			document.removeEventListener("panel-expand", this.expandHandler);
		if (this.styleEl) {
			this.styleEl.remove();
			this.styleEl = null;
		}
	}
}
