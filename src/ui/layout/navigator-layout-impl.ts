import { Store } from "../../store/store";
import { createNavigatorLayout } from "../ui";

export class NavigatorLayout {
	protected cleanup: (() => void) | undefined;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.cleanup = createNavigatorLayout(container, store, app);
	}

	destroy() {
		this.cleanup?.();
	}
}
