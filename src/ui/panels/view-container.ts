import { Store } from "../../store/store";
import { BaseTaskView } from "../views/base-view";

const VIEW_LOADERS: Record<
	string,
	() => Promise<{ new (c: HTMLElement, s: Store, a: any): BaseTaskView }>
> = {
	allTasks: () =>
		import("../views/all-tasks-view").then((m) => m.AllTasksView),
	inbox: () => import("../views/inbox-view").then((m) => m.InboxView),
	important: () =>
		import("../views/important-view").then((m) => m.ImportantView),
	today: () => import("../views/today-view").then((m) => m.TodayView),
	overdue: () => import("../views/overdue-view").then((m) => m.OverdueView),
	future: () => import("../views/future-view").then((m) => m.FutureView),
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

		// 始终销毁重建视图，确保状态最新（避免因异步导致的内容未更新）
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
