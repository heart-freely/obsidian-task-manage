import { Store } from "../store/store";
import { Toolbar } from "./bars/bars";
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

	const toolbarEl = mainEl.createDiv({ cls: "navigator-toolbar" });
	// 关键：工具栏容器本身不占据任何空间，因为按钮和面板都是 fixed 定位
	toolbarEl.style.height = "0";
	toolbarEl.style.overflow = "visible";
	toolbarEl.style.position = "relative";
	toolbarEl.style.zIndex = "1";

	const viewEl = mainEl.createDiv({ cls: "navigator-view" });
	viewEl.style.flex = "1";
	viewEl.style.overflow = "auto";

	new SideBar(sidebarEl, store, app);

	const renderToolbar = () => {
		toolbarEl.empty();
		const state = store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (preset?.showToolbar) {
			new Toolbar(toolbarEl, store, viewEl);
			toolbarEl.style.display = "";
		} else {
			toolbarEl.style.display = "none";
			viewEl.style.paddingTop = "0px";
		}
	};
	store.subscribe(renderToolbar);
	renderToolbar();

	new ViewContainer(viewEl, store, app);
	return () => container.empty();
}
