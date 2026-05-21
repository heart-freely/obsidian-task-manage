import { Store } from "../store/store";
import { SideBar } from "./bars/side-bar";
import { Toolbar } from "./bars/bars";
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

	// 工具栏区域（所有可显隐的bar，包括ViewBar）
	const toolbarEl = mainEl.createDiv({ cls: "navigator-toolbar" });
	// 视图内容
	const viewEl = mainEl.createDiv({ cls: "navigator-view" });

	new SideBar(sidebarEl, store, app);

	// 根据预设的 showToolbar 显示/隐藏整个工具栏
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
