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
	sidebarEl.style.position = "relative";
	sidebarEl.style.zIndex = "150"; // 高于工具栏

	const mainEl = container.createDiv({ cls: "navigator-main" });
	mainEl.style.position = "relative";
	mainEl.style.zIndex = "1";

	const toolbarEl = mainEl.createDiv({ cls: "navigator-toolbar" });
	const viewEl = mainEl.createDiv({ cls: "navigator-view" });

	new SideBar(sidebarEl, store, app);

	const renderToolbar = () => {
		toolbarEl.empty();
		const state = store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (preset?.showToolbar) {
			new Toolbar(toolbarEl, store);
			toolbarEl.style.display = "";
		} else {
			toolbarEl.style.display = "none";
		}
	};
	store.subscribe(renderToolbar);
	renderToolbar();

	new ViewContainer(viewEl, store, app);
	return () => container.empty();
}
