// src/ui/ui.ts
// UI 统一入口

import { ItemView, WorkspaceLeaf } from "obsidian";
import { Store } from "../core/store/store";
import { Panels } from "./panel/panel";
import { SidebarPanel } from "./sidebar/sidebar";
import { BaseTaskView } from "./view/base-task-view";

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
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		const viewHeader = this.containerEl.querySelector(
			".view-header",
		) as HTMLElement | null;
		if (viewHeader) viewHeader.addClass("task-hidden-important");
		this.cleanup = createManageLayout(container, this.store, this.app);
	}

	async onClose() {
		this.cleanup?.();
		this.cleanup = undefined;
	}

	refreshView() {
		this.store.triggerFullRender();
	}
}

/** 业务视图加载器类型 */
type ViewLoader = () => Promise<{
	new (c: HTMLElement, s: Store, a: unknown): BaseTaskView;
}>;

const VIEW_LOADERS: Record<string, ViewLoader> = {
	allTasks: () => import("./view/all-task-view").then((m) => m.AllTasksView),
	inbox: () => import("./view/inbox-task-view").then((m) => m.InboxView),
	important: () =>
		import("./view/important-task-view").then((m) => m.ImportantView),
	today: () => import("./view/today-task-view").then((m) => m.TodayView),
	future: () => import("./view/future-task-view").then((m) => m.FutureView),
};

export class ViewContainer {
	protected container: HTMLElement;
	protected store: Store;
	protected app: unknown;
	protected currentView: BaseTaskView | null = null;

	constructor(container: HTMLElement, store: Store, app: unknown) {
		this.container = container;
		this.store = store;
		this.app = app;
		store.subscribe(() => {
			void this.refresh();
		});
		void this.refresh();
	}

	async refresh(): Promise<void> {
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
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : String(e);
			logger.warn("[TaskManage] 视图加载失败:", message);
			this.container.empty();
			this.container.createDiv({
				text: `视图加载失败: ${message}`,
			});
		}
	}
}

export function createManageLayout(
	container: HTMLElement,
	store: Store,
	app: unknown,
): () => void {
	container.addClass("manage-root");
	container.addClass("task-flex", "task-h-full");

	const sidebarEl = container.createDiv({ cls: "manage-sidebar" });
	const mainEl = container.createDiv({ cls: "manage-main" });
	mainEl.addClass(
		"task-flex-1",
		"task-flex",
		"task-flex-col",
		"task-min-h-0",
		"task-min-w-0",
		"task-p-0",
		"task-m-0",
		"task-relative",
	);
	const toolbarEl = mainEl.createDiv({ cls: "manage-toolbar" });
	toolbarEl.addClass(
		"task-absolute",
		"task-top-0",
		"task-left-0",
		"task-right-0",
		"task-z-10",
		"task-pointer-none",
	);

	const viewEl = mainEl.createDiv({ cls: "manage-view" });
	viewEl.addClass(
		"task-flex-1",
		"task-overflow-hidden",
		"task-min-h-0",
		"task-p-0",
		"task-relative",
		"task-pt-0",
	);

	new SidebarPanel(sidebarEl, store, app);

	const panels = Panels.getInstance();
	panels.init(store, viewEl, toolbarEl, app);

	new ViewContainer(viewEl, store, app);

	return () => {
		panels.cleanupAll();
		container.empty();
	};
}
