import { ItemView } from "obsidian";
import { Store } from "../../store/store";
import { NavigatorLayout } from "./navigator-layout-impl";

export class NavigatorView extends ItemView {
	protected store: Store;
	protected layout?: NavigatorLayout;

	constructor(leaf: WorkspaceLeaf, store: Store) {
		super(leaf);
		this.store = store;
	}

	getViewType() {
		return "navigator-view";
	}
	getDisplayText() {
		return "任务导航中心";
	}
	getIcon() {
		return "compass";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		this.layout = new NavigatorLayout(container, this.store, this.app);
	}

	async onClose() {
		this.layout?.destroy();
		this.layout = undefined;
	}
}
