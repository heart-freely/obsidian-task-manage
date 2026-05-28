import { ItemView, WorkspaceLeaf } from "obsidian";
import { Store } from "../../store/store";
import { createNavigatorLayout } from "../ui";

export class NavigatorView extends ItemView {
	protected store: Store;
	protected cleanup?: () => void;

	constructor(leaf: WorkspaceLeaf, store: Store) {
		super(leaf);
		this.store = store;
	}

	getViewType(): string {
		return "navigator-view";
	}

	getDisplayText(): string {
		return "任务导航中心"; // 标签页标题保留
	}

	getIcon(): string {
		return "compass";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		// 强制隐藏 Obsidian 自动生成的视图内标题栏，只保留标签页上的标题
		const viewHeader = this.containerEl.querySelector(".view-header");
		if (viewHeader) {
			(viewHeader as HTMLElement).style.setProperty(
				"display",
				"none",
				"important",
			);
		}

		this.cleanup = createNavigatorLayout(container, this.store, this.app);
	}

	async onClose() {
		this.cleanup?.();
		this.cleanup = undefined;
	}
}
