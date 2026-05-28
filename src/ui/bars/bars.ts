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

export class Toolbar {
	private container: HTMLElement;
	private store: Store;
	private viewEl: HTMLElement;
	private headBar: HeadBar | null = null;
	private buttonBarEl: HTMLElement | null = null;
	private panelsContainer: HTMLElement | null = null;
	private resizeHandler: (() => void) | null = null;
	private observer: ResizeObserver | null = null;

	constructor(container: HTMLElement, store: Store, viewEl: HTMLElement) {
		this.container = container;
		this.store = store;
		this.viewEl = viewEl;
		this.store.subscribe(() => this.render());
		this.render();
	}

	handleScroll() {}

	render() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		this.removeResizeListener();
		this.removePanelsContainer();
		this.removeButtonBar();
		this.container.empty();

		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset || !preset.showToolbar) {
			this.viewEl.style.paddingTop = "0px";
			return;
		}

		this.headBar = new HeadBar(this.container, this.store);
		this.buttonBarEl = this.headBar.getElement();
		if (this.buttonBarEl) {
			document.body.appendChild(this.buttonBarEl);
		}

		this.panelsContainer = document.createElement("div");
		this.panelsContainer.className = "toolbar-panels";
		this.panelsContainer.style.position = "fixed";
		this.panelsContainer.style.background = "var(--background-primary)";
		this.panelsContainer.style.opacity = "1"; // 确保不透明
		this.panelsContainer.style.border =
			"1px solid var(--background-modifier-border)";
		this.panelsContainer.style.borderRadius = "0 0 6px 6px";
		this.panelsContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
		this.panelsContainer.style.padding = "4px";
		this.panelsContainer.style.display = "flex";
		this.panelsContainer.style.flexDirection = "column";
		this.panelsContainer.style.gap = "4px";
		document.body.appendChild(this.panelsContainer);

		this.renderPanels();
		this.updatePositions();

		this.observer = new ResizeObserver(() => this.updatePositions());
		if (this.buttonBarEl) {
			this.buttonBarEl.style.opacity = "1"; // 按钮条也不透明
			this.observer.observe(this.buttonBarEl);
		}
		if (this.panelsContainer) this.observer.observe(this.panelsContainer);

		this.resizeHandler = () => this.updatePositions();
		window.addEventListener("resize", this.resizeHandler);
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
			if (BAR_COMPONENTS[barKey])
				new BAR_COMPONENTS[barKey](panel, this.store);
		});
	}

	private updatePositions() {
		if (!this.buttonBarEl || !this.panelsContainer) return;

		const mainEl = document.querySelector(".navigator-main") as HTMLElement;
		if (!mainEl) return;
		const mainRect = mainEl.getBoundingClientRect();

		this.buttonBarEl.style.position = "fixed";
		this.buttonBarEl.style.top = mainRect.top + "px"; // 紧贴标签栏下方
		this.buttonBarEl.style.zIndex = "50";
		this.buttonBarEl.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
		this.buttonBarEl.style.opacity = "1"; // 不透明

		const left = mainRect.left;
		const width = mainRect.width;
		this.buttonBarEl.style.left = left + "px";
		this.buttonBarEl.style.width = width + "px";

		const barRect = this.buttonBarEl.getBoundingClientRect();
		this.panelsContainer.style.top = barRect.bottom + "px";
		this.panelsContainer.style.left = left + "px";
		this.panelsContainer.style.width = width + "px";
		this.panelsContainer.style.zIndex = "49";
		this.panelsContainer.style.opacity = "1"; // 不透明

		const barHeight = this.buttonBarEl.offsetHeight;
		const panelsHeight = this.panelsContainer.offsetHeight;
		this.viewEl.style.paddingTop = barHeight + panelsHeight + 4 + "px";
	}

	private removeButtonBar() {
		if (this.buttonBarEl && this.buttonBarEl.parentNode) {
			this.buttonBarEl.parentNode.removeChild(this.buttonBarEl);
		}
		this.buttonBarEl = null;
	}

	private removePanelsContainer() {
		if (this.panelsContainer && this.panelsContainer.parentNode) {
			this.panelsContainer.parentNode.removeChild(this.panelsContainer);
		}
		this.panelsContainer = null;
		document
			.querySelectorAll(".toolbar-panels")
			.forEach((el) => el.remove());
	}

	private removeResizeListener() {
		if (this.resizeHandler) {
			window.removeEventListener("resize", this.resizeHandler);
			this.resizeHandler = null;
		}
	}
}
