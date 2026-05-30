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
	mainEl.style.position = "relative"; // 重要：为绝对定位提供包含块

	const toolbarEl = mainEl.createDiv({ cls: "navigator-toolbar" });
	toolbarEl.style.position = "absolute";
	toolbarEl.style.top = "0";
	toolbarEl.style.left = "0";
	toolbarEl.style.right = "0";
	toolbarEl.style.zIndex = "10";
	toolbarEl.style.pointerEvents = "none"; // 穿透点击到下方视图（按钮条自身内部会开启 auto）

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
