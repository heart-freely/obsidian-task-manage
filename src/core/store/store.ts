// src/core/store/store.ts

import { AppState, EditPanelState, Preset } from "../../type/type";

type Listener = (state: AppState) => void;

interface EditStoreRef {
	getState(): {
		batchMode: boolean;
		selectedTasks: Set<string>;
		syncMode: boolean;
	};
	subscribePanel(listener: () => void): () => void;
	applyEdit(markKey: string, value: string | null, sourceUid: string): void;
	applyAutoComplete(days?: number): void;
	applySortTags(): void;
	clearPreviews(): void;
	saveCurrent(): Promise<void>;
	revertSnapshot(index: number): Promise<void>;
	getSnapshots(): Array<{ time: string; snapshot: Record<string, string> }>;
	clearAllSnapshots(): void;
	toggleSyncMode(): void;
	toggleBatchMode(): void;
	toggleSelection(node: { uid: string }): void;
	toggleSelectAll(nodes: Array<{ uid: string }>): void;
	enterSingleEditMode(node: { uid: string }): void;
	enterBatchMode(): void;
	enterBatchModeFromSingle(node: { uid: string }): void;
	exitBatchToReading(): void;
	exitEditMode(save?: boolean, keepSelection?: boolean): void;
	setPrimaryTask(uid: string): void;
	syncToStore(): void;
}

interface TaskViewRef {
	toggleBatchMode(): void;
	toggleSelectAll(nodes: Array<{ uid: string }>): void;
	refreshEditCards(): void;
	refreshSingleCard(node: { uid: string }): void;
	updateFocusAfterSave(): void;
	render(): Promise<void>;
}

export class Store {
	protected state: AppState;
	protected listeners: Listener[] = [];
	protected saveFn?: (data: Record<string, unknown>) => Promise<void>;
	protected editStore: EditStoreRef | null = null;
	private taskView: TaskViewRef | null = null;
	private _onEditCardsChanged: (() => void) | null = null;
	private _onFullRender: (() => void) | null = null;
	private _onApplyEditContext: (() => void) | null = null;
	private _onFullInvalidate: (() => void) | null = null;

	constructor(
		initial: AppState,
		saveFn?: (data: Record<string, unknown>) => Promise<void>,
	) {
		this.state = initial;
		this.saveFn = saveFn;
	}

	getState(): Readonly<AppState> {
		return this.state;
	}

	update(partial: Partial<AppState>) {
		this.state = { ...this.state, ...partial };
		this.notify();
		void this.save();
	}

	updateSilent(partial: Partial<AppState>) {
		this.state = { ...this.state, ...partial };
	}

	saveSilent() {
		void this.save();
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

	protected async save(): Promise<void> {
		if (!this.saveFn) return;
		try {
			await this.saveFn(this.state as unknown as Record<string, unknown>);
		} catch (e: unknown) {
			logger.error("Store 持久化失败", e);
		}
	}

	setSaveFn(fn: (data: Record<string, unknown>) => Promise<void>) {
		this.saveFn = fn;
	}

	getActivePreset(): Preset | undefined {
		return this.state.presets.find(
			(p) => p.id === this.state.activePresetId,
		);
	}

	updateEditPanelState(panelState: EditPanelState) {
		this.state = { ...this.state, editPanelState: panelState };
	}

	setEditStore(es: EditStoreRef) {
		this.editStore = es;
	}

	getEditStore(): EditStoreRef | null {
		return this.editStore;
	}

	setTaskView(view: TaskViewRef) {
		this.taskView = view;
	}

	getTaskView(): TaskViewRef | null {
		return this.taskView;
	}

	setOnEditCardsChanged(cb: () => void) {
		this._onEditCardsChanged = cb;
	}
	triggerEditCardsChanged() {
		this._onEditCardsChanged?.();
	}

	setOnFullRender(cb: () => void) {
		this._onFullRender = cb;
	}
	triggerFullRender() {
		this._onFullRender?.();
	}

	setOnApplyEditContext(cb: () => void) {
		this._onApplyEditContext = cb;
	}
	triggerApplyEditContext() {
		this._onApplyEditContext?.();
	}

	setOnFullInvalidate(cb: () => void) {
		this._onFullInvalidate = cb;
	}
	triggerFullInvalidate() {
		this._onFullInvalidate?.();
	}
}
