// src/ui/ui.ts
import { Store } from "../store/store";
import { FilterBar } from "./bars/filter-bar";
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

	// 筛选栏
	const filterEl = mainEl.createDiv({ cls: "navigator-filter" });
	// 视图区域（不再有全局工具栏，由每个业务视图自己渲染）
	const viewEl = mainEl.createDiv({ cls: "navigator-view" });

	new SideBar(sidebarEl, store);
	new FilterBar(filterEl, store);
	new ViewContainer(viewEl, store, app);

	return () => container.empty();
}
