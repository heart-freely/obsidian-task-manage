// src/core/store/store.ts

import { AppState, EditPanelState, Preset } from "../../type/type";

type Listener = (state: AppState) => void;

export class Store {
	protected state: AppState;
	protected listeners: Listener[] = [];
	protected saveFn?: (data: any) => Promise<void>;
	protected editStore: EditStoreInterface | null = null;
	private taskView: TaskViewInterface | null = null;
	private _onEditCardsChanged: (() => void) | null = null;
	private _onFullRender: (() => void) | null = null;
	private _onApplyEditContext: (() => void) | null = null;
	private _onFullInvalidate: (() => void) | null = null;

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
			logger.error("Store 持久化失败", e);
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

	updateEditPanelState(panelState: EditPanelState) {
		this.state = { ...this.state, editPanelState: panelState };
	}

	setEditStore(es: EditStoreInterface) {
		this.editStore = es;
	}

	getEditStore(): EditStoreInterface | null {
		return this.editStore;
	}

	setTaskView(view: TaskViewInterface) {
		this.taskView = view;
	}

	getTaskView(): TaskViewInterface | null {
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
