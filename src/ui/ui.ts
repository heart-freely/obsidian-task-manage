// src/ui/ui.ts
// UI 统一入口

import { ItemView, WorkspaceLeaf } from "obsidian";
import { BaseTaskView } from "../core/store/preset/base-task-preset";
import { Store } from "../core/store/store";
import { Panels } from "./panel/panel";
import { SidebarPanel } from "./sidebar/sidebar";

export class ManageView extends ItemView {
	protected store: Store;
	protected cleanup?: () => void;

	constructor(leaf: WorkspaceLeaf, store: Store) {
		super(leaf);
		this.store = store;
	}

	getViewType(): string {
		return "manage-view";
	}

	getDisplayText(): string {
		return "任务管理";
	}

	getIcon(): string {
		return "list-checks";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		const viewHeader = this.containerEl.querySelector(".view-header");
		if (viewHeader)
			(viewHeader as HTMLElement).style.setProperty(
				"display",
				"none",
				"important",
			);
		this.cleanup = createManageLayout(container, this.store, this.app);
	}

	async onClose() {
		this.cleanup?.();
		this.cleanup = undefined;
	}
}

const VIEW_LOADERS: Record<
	string,
	() => Promise<{ new (c: HTMLElement, s: Store, a: any): BaseTaskView }>
> = {
	allTasks: () =>
		import("../core/store/preset/all-task-preset").then(
			(m) => m.AllTasksView,
		),
	inbox: () =>
		import("../core/store/preset/inbox-task-preset").then(
			(m) => m.InboxView,
		),
	important: () =>
		import("../core/store/preset/important-task-preset").then(
			(m) => m.ImportantView,
		),
	today: () =>
		import("../core/store/preset/today-task-preset").then(
			(m) => m.TodayView,
		),
	future: () =>
		import("../core/store/preset/future-task-preset").then(
			(m) => m.FutureView,
		),
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
		try {
			const ViewClass = await loader();
			this.currentView = new ViewClass(
				this.container,
				this.store,
				this.app,
			);
			await this.currentView.render();
		} catch (e) {
			console.warn("[TaskManage] 视图加载失败:", e);
			this.container.empty();
			this.container.createDiv({
				text: `视图加载失败: ${(e as Error).message}`,
			});
		}
	}
}

export function createManageLayout(
	container: HTMLElement,
	store: Store,
	app: any,
) {
	container.addClass("manage-root");
	container.style.display = "flex";
	container.style.height = "100%";

	const sidebarEl = container.createDiv({ cls: "manage-sidebar" });
	const mainEl = container.createDiv({ cls: "manage-main" });
	mainEl.style.cssText =
		"flex:1;display:flex;flex-direction:column;min-height:0;min-width:0;padding:0;margin:0;position:relative;";
	const toolbarEl = mainEl.createDiv({ cls: "manage-toolbar" });
	toolbarEl.style.cssText =
		"position:absolute;top:0;left:0;right:0;z-index:10;pointer-events:none;";

	const viewEl = mainEl.createDiv({ cls: "manage-view" });
	viewEl.style.cssText =
		"flex:1;overflow:hidden;min-height:0;padding:0;padding-top:0px;position:relative;";

	new SidebarPanel(sidebarEl, store, app);

	const panels = Panels.getInstance();
	panels.init(store, viewEl, toolbarEl, app);

	new ViewContainer(viewEl, store, app);

	return () => {
		panels.cleanupAll();
		container.empty();
	};
}
