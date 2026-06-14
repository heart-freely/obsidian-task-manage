// src/core/store/store.ts

import { AppState, EditPanelState, Preset } from "../../type/type";

type Listener = (state: AppState) => void;

export class Store {
	protected state: AppState;
	protected listeners: Listener[] = [];
	protected saveFn?: (data: any) => Promise<void>;
	protected editStore: any = null;

	constructor(initial: AppState, saveFn?: (data: any) => Promise<void>) {
		this.state = initial;
		this.saveFn = saveFn;
	}

	getState(): Readonly<AppState> {
		return this.state;
	}

	update(partial: Partial<AppState>) {
		this.state = { ...this.state, ...partial };
		this.notify();
		this.save();
	}

	updateSilent(partial: Partial<AppState>) {
		this.state = { ...this.state, ...partial };
	}

	saveSilent() {
		this.save();
	}

	subscribe(listener: Listener): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	notify() {
		this.listeners.forEach((l) => l(this.state));
	}

	protected async save() {
		if (!this.saveFn) return;
		try {
			await this.saveFn(this.state);
		} catch (e) {
			console.error("Store 持久化失败", e);
		}
	}

	setSaveFn(fn: (data: any) => Promise<void>) {
		this.saveFn = fn;
	}

	getActivePreset(): Preset | undefined {
		return this.state.presets.find(
			(p) => p.id === this.state.activePresetId,
		);
	}

	// ========== 编辑面板状态（静默更新）==========

	updateEditPanelState(panelState: EditPanelState) {
		this.state = { ...this.state, editPanelState: panelState };
		// 不调用 notify()
	}
	// ========== 编辑状态管理 ==========

	setEditStore(es: any) {
		this.editStore = es;
	}

	getEditStore(): any {
		return this.editStore;
	}

	toggleBatchMode() {
		this.editStore?.toggleBatchMode();
	}

	toggleSelectAll(nodes: any[]) {
		this.editStore?.toggleSelectAll(nodes);
	}

	applyEdit(markKey: string, value: string | null) {
		this.editStore?.applyEdit(markKey, value);
	}

	applyAutoComplete(days: number) {
		this.editStore?.applyAutoComplete(days);
	}

	applySortTags() {
		this.editStore?.applySortTags();
	}

	clearPreviews() {
		this.editStore?.clearPreviews();
	}

	async saveCurrent() {
		await this.editStore?.saveCurrent();
	}

	async revertSnapshot(snapshotIndex: number) {
		await this.editStore?.revertSnapshot(snapshotIndex);
	}

	getSnapshots() {
		return this.editStore?.getSnapshots() ?? [];
	}
}
