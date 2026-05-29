// src/ui/ui.ts
import { Store } from "../store/store";
import { ToolbarManager } from "./bars/bars";
import { SideBar } from "./bars/side-bar";
import { ViewContainer } from "./panels/view-container";

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

	const toolbarEl = mainEl.createDiv({ cls: "navigator-toolbar" });
	toolbarEl.style.height = "0";
	toolbarEl.style.overflow = "visible";
	toolbarEl.style.position = "relative";
	toolbarEl.style.zIndex = "1";

	const viewEl = mainEl.createDiv({ cls: "navigator-view" });
	viewEl.style.flex = "1";
	viewEl.style.overflow = "auto";
	viewEl.style.minHeight = "0";
	viewEl.style.padding = "0";
	viewEl.style.paddingTop = "0px";

	new SideBar(sidebarEl, store, app);

	const manager = ToolbarManager.getInstance();
	manager.init(store, viewEl, toolbarEl);

	// 标签页切换时，返回视图需要完整同步状态
	let isViewActive = true;
	const checkActiveLeaf = () => {
		const activeLeaf = app.workspace.activeLeaf;
		const view = activeLeaf?.view;
		const isOurView = view?.getViewType() === "navigator-view";
		if (isOurView !== isViewActive) {
			isViewActive = isOurView;
			if (!isOurView) {
				manager.destroy();
			} else {
				// 强制从 Store 最新状态同步，恢复视图配置栏和面板状态
				manager.syncState();
			}
		}
	};

	app.workspace.on("active-leaf-change", checkActiveLeaf);

	new ViewContainer(viewEl, store, app);

	return () => {
		manager.cleanupAll();
		container.empty();
	};
}
