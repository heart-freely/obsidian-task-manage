// src/ui/panel/panel.ts

import { Store } from "../../core/store/store";
import { createEl } from "../../util/dom-utils";
import { EditPanel } from "./edit-panel";
import { FilterPanel } from "./filter-panel";
import { HeadPanel } from "./head-panel";
import { HidePanel } from "./hide-panel";
import { SidebarPanel } from "./sidebar-panel";
import { SortPanel } from "./sort-panel";
import { TimePanel } from "./time-panel";
import { ViewPanel } from "./view-panel";

type PanelComponentClass = new (
	container: HTMLElement,
	store: Store,
	app?: unknown,
) => PanelComponent;
interface PanelComponent {
	render(): void;
	destroy(): void;
}

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
	private app!: unknown;
	private buttonBarEl: HTMLElement | null = null;
	private panelsContainer: HTMLElement | null = null;
	private panelContentInner: HTMLElement | null = null;
	private resizeHandle: HTMLElement | null = null;
	private headPanel: HeadPanel | null = null;
	private panelEls = new Map<string, HTMLElement>();
	private panelInstances = new Map<string, PanelComponent>();
	private isPanelsCollapsed = false;
	private panelHeight = 300;
	private constructor() {}
	static getInstance(): Panels {
		if (!Panels.instance) Panels.instance = new Panels();
		return Panels.instance;
	}

	init(
		store: Store,
		viewEl: HTMLElement,
		container: HTMLElement,
		app: unknown,
	) {
		this.store = store;
		this.viewEl = viewEl;
		this.app = app;
		this.panelHost = container.createDiv({ cls: "panel-host" });
		this.panelHost.addClass("panel-host-layout");
		this.buttonBarEl = createEl("div");
		this.buttonBarEl.className = "panel-header";
		this.buttonBarEl.addClass("panel-header-layout");
		this.headPanel = new HeadPanel(this.buttonBarEl, store);
		this.panelsContainer = createEl("div");
		this.panelsContainer.className = "panel-container";
		this.panelsContainer.addClass("panel-container-layout");
		this.panelContentInner = createEl("div");
		this.panelContentInner.addClass("panel-content-inner");
		this.panelContentInner.appendChild(this.buttonBarEl);
		this.panelsContainer.appendChild(this.panelContentInner);
		this.panelHost.appendChild(this.panelsContainer);
		this.resizeHandle = createEl("div");
		this.resizeHandle.className =
			"panel-resize-handle panel-resize-handle-layout";
		this.resizeHandle.title = "拖拽调整高度 / 点击中间箭头折叠";
		this.panelHost.appendChild(this.resizeHandle);
		const arrow = createEl("span");
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
				this.resizeHandle.setCssProps({ "--resize-opacity": "1" });
		});
		this.resizeHandle.addEventListener("mouseleave", () => {
			if (this.resizeHandle)
				this.resizeHandle.setCssProps({ "--resize-opacity": "0" });
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
			const onMove = (ev: MouseEvent) => {
				if (!dragging) return;
				const dy = ev.clientY - startY;
				let nh = startHeight + dy;
				nh = Math.min(window.innerHeight * 0.85, Math.max(30, nh));
				if (this.panelsContainer)
					this.panelsContainer.setCssProps({
						"--panel-height": nh + "px",
					});
				this.panelHeight = nh;
				this.updatePreset({ toolbarPanelsHeight: nh });
				this.updateViewPadding();
			};
			const onUp = () => {
				dragging = false;
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		});
		this.store.subscribe(() => this.syncState());
		window.requestAnimationFrame(() => this.syncState());
	}

	public syncState() {
		try {
			const state = this.store.getState();
			const preset = state.presets.find(
				(p) => p.id === state.activePresetId,
			);
			if (!preset) return;
			const ppi = (this as unknown as { _prevPresetId?: string })
				._prevPresetId;
			if (ppi && ppi !== state.activePresetId) {
				const inst = this.panelInstances.get("time");
				if (
					inst &&
					typeof (inst as unknown as { onPresetChanged?: () => void })
						.onPresetChanged === "function"
				)
					(
						inst as unknown as { onPresetChanged: () => void }
					).onPresetChanged();
			}
			(this as unknown as { _prevPresetId?: string })._prevPresetId =
				state.activePresetId;
			this.isPanelsCollapsed = preset.toolbarPanelsCollapsed ?? false;
			this.panelHeight = preset.toolbarPanelsHeight ?? 300;
			this.applyVisibility();
			this.refreshContent();
			window.requestAnimationFrame(() => this.updateViewPadding());
		} catch (e: unknown) {
			console.warn("[TaskManage] 面板状态同步失败:", e);
		}
	}
	public refreshTimePanel() {
		const inst = this.panelInstances.get("time");
		if (
			inst &&
			typeof (inst as unknown as { onPresetChanged?: () => void })
				.onPresetChanged === "function"
		)
			(
				inst as unknown as { onPresetChanged: () => void }
			).onPresetChanged();
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
		const ae = document.activeElement as HTMLElement | null;
		if (
			ae &&
			(ae.tagName === "INPUT" ||
				ae.tagName === "TEXTAREA" ||
				ae.isContentEditable)
		)
			return;
		const nk = new Set(visibleKeys);
		for (const [key, panel] of this.panelEls) {
			if (!nk.has(key)) {
				panel.remove();
				this.panelEls.delete(key);
				const inst = this.panelInstances.get(key);
				if (inst?.destroy) inst.destroy();
				this.panelInstances.delete(key);
			}
		}
		for (const key of visibleKeys) {
			if (!this.panelEls.has(key)) {
				const panel = createEl("div");
				panel.className = "panel-content";
				panel.setAttribute("data-panel-key", key);
				this.panelEls.set(key, panel);
				if (PANEL_COMPONENTS[key])
					this.panelInstances.set(
						key,
						new PANEL_COMPONENTS[key](panel, this.store, this.app),
					);
			}
		}
		const cc = Array.from(this.panelContentInner.children);
		const eo = visibleKeys
			.map((key) => this.panelEls.get(key))
			.filter((el): el is HTMLElement => el !== undefined);
		let nr = false;
		for (let i = 0; i < eo.length; i++) {
			if (cc[i + 1] !== eo[i]) {
				nr = true;
				break;
			}
		}
		if (nr) {
			const f = document.createDocumentFragment();
			for (const p of eo) f.appendChild(p);
			this.panelContentInner.appendChild(f);
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
		const hh = 8;
		this.viewEl.setCssProps({
			"--view-padding-top":
				(this.isPanelsCollapsed ? hh : this.panelHeight + hh) + "px",
		});
	}
	private togglePanels() {
		this.isPanelsCollapsed = !this.isPanelsCollapsed;
		this.updatePreset({ toolbarPanelsCollapsed: this.isPanelsCollapsed });
		this.applyVisibility();
		this.refreshContent();
	}
	private updatePreset(changes: Record<string, unknown>) {
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;
		this.store.update({
			presets: state.presets.map((p) =>
				p.id === preset.id ? { ...p, ...changes } : p,
			),
		});
	}
	public initPanelSubscriptions() {
		for (const [, inst] of this.panelInstances) {
			if (
				inst &&
				typeof (inst as unknown as { initSubscription?: () => void })
					.initSubscription === "function"
			)
				(
					inst as unknown as { initSubscription: () => void }
				).initSubscription();
		}
	}
	public getEditPanel(): EditPanel | undefined {
		return this.panelInstances.get("edit") as EditPanel | undefined;
	}
	destroy() {}
	cleanupAll() {
		for (const [, inst] of this.panelInstances) {
			if (inst?.destroy) inst.destroy();
		}
		this.panelInstances.clear();
		this.headPanel?.destroy();
		this.headPanel = null;
		this.panelEls.clear();
	}
}
