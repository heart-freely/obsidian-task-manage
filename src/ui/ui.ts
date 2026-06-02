// src/ui/ui.ts
// UI 统一入口：布局、视图容器、侧边栏、工具栏

import { ItemView, WorkspaceLeaf } from "obsidian";
import { Store } from "../store/store";
import { ToolbarManager } from "./bars/bars";
import { SideBar } from "./bars/side-bar";
import { BaseTaskView } from "./views/base-view";

// ========== NavigatorView（原 layout.ts） ==========

export class NavigatorView extends ItemView {
	protected store: Store;
	protected cleanup?: () => void;

	constructor(leaf: WorkspaceLeaf, store: Store) {
		super(leaf);
		this.store = store;
	}

	getViewType(): string {
		return "navigator-view";
	}

	getDisplayText(): string {
		return "任务导航中心";
	}

	getIcon(): string {
		return "compass";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		const viewHeader = this.containerEl.querySelector(".view-header");
		if (viewHeader) {
			(viewHeader as HTMLElement).style.setProperty(
				"display",
				"none",
				"important",
			);
		}

		this.cleanup = createNavigatorLayout(container, this.store, this.app);
	}

	async onClose() {
		this.cleanup?.();
		this.cleanup = undefined;
	}
}

// ========== ViewContainer（原 panel.ts） ==========

const VIEW_LOADERS: Record<
	string,
	() => Promise<{ new (c: HTMLElement, s: Store, a: any): BaseTaskView }>
> = {
	allTasks: () => import("./views/all-view").then((m) => m.AllTasksView),
	inbox: () => import("./views/inbox-view").then((m) => m.InboxView),
	important: () =>
		import("./views/important-view").then((m) => m.ImportantView),
	today: () => import("./views/today-view").then((m) => m.TodayView),
	overdue: () => import("./views/overdue-view").then((m) => m.OverdueView),
	future: () => import("./views/future-view").then((m) => m.FutureView),
};

export class ViewContainer {
	protected container: HTMLElement;
	protected store: Store;
	protected app: any;
	protected currentView: BaseTaskView | null = null;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		store.subscribe(() => this.refresh());
		this.refresh();
	}

	async refresh() {
		const preset = this.store.getActivePreset();
		if (!preset) {
			this.container.empty();
			this.container.createDiv({ text: "请从侧边栏选择一个方案" });
			return;
		}

		const loader = VIEW_LOADERS[preset.businessView];
		if (!loader) {
			this.container.empty();
			this.container.createDiv({
				text: `未知视图: ${preset.businessView}`,
			});
			return;
		}

		if (this.currentView) {
			this.currentView.destroy();
			this.container.empty();
		}

		const ViewClass = await loader();
		this.currentView = new ViewClass(this.container, this.store, this.app);
		(this.currentView as any)._presetId = preset.id;
		await this.currentView.render();
	}
}

// ========== 布局工厂函数 ==========

export function createNavigatorLayout(
	container: HTMLElement,
	store: Store,
	app: any,
) {
	container.addClass("navigator-root");
	container.style.display = "flex";
	container.style.height = "100%";

	const sidebarEl = container.createDiv({ cls: "navigator-sidebar" });
	const mainEl = container.createDiv({ cls: "navigator-main" });
	mainEl.style.flex = "1";
	mainEl.style.display = "flex";
	mainEl.style.flexDirection = "column";
	mainEl.style.minHeight = "0";
	mainEl.style.padding = "0";
	mainEl.style.margin = "0";
	mainEl.style.position = "relative";

	const toolbarEl = mainEl.createDiv({ cls: "navigator-toolbar" });
	toolbarEl.style.position = "absolute";
	toolbarEl.style.top = "0";
	toolbarEl.style.left = "0";
	toolbarEl.style.right = "0";
	toolbarEl.style.zIndex = "10";
	toolbarEl.style.pointerEvents = "none";

	const viewEl = mainEl.createDiv({ cls: "navigator-view" });
	viewEl.style.flex = "1";
	viewEl.style.overflow = "auto";
	viewEl.style.minHeight = "0";
	viewEl.style.padding = "0";
	viewEl.style.paddingTop = "0px";

	new SideBar(sidebarEl, store, app);

	const manager = ToolbarManager.getInstance();
	manager.init(store, viewEl, toolbarEl);

	new ViewContainer(viewEl, store, app);

	return () => {
		manager.cleanupAll();
		container.empty();
	};
}
