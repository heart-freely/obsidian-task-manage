// src/store/store.ts
import { AppState, Preset } from "../types";

type Listener = (state: AppState) => void;

export class Store {
	protected state: AppState;
	protected listeners: Listener[] = [];
	protected saveFn?: (data: any) => Promise<void>;

	constructor(initial: AppState, saveFn?: (data: any) => Promise<void>) {
		this.state = initial;
		this.saveFn = saveFn;
	}

	getState(): Readonly<AppState> {
		return this.state;
	}

	update(partial: Partial<AppState>) {
		const oldActiveId = this.state.activePresetId;
		const newActiveId = partial.activePresetId;

		// 切换预设时，自动合并草稿到旧预设，并智能继承工具栏状态
		if (newActiveId !== undefined && newActiveId !== oldActiveId) {
			let presets = partial.presets ?? this.state.presets;

			// 1. 将草稿合并到旧预设
			if (this.state.draftFilter) {
				const oldPreset = presets.find((p) => p.id === oldActiveId);
				if (oldPreset) {
					presets = presets.map((p) =>
						p.id === oldActiveId
							? { ...p, filter: this.state.draftFilter! }
							: p,
					);
				}
			}

			// 2. 工具栏智能继承：如果当前预设工具栏是打开的，新预设从未显示过工具栏，则自动打开
			const currentPreset = this.state.presets.find(
				(p) => p.id === oldActiveId,
			);
			const targetPreset = presets.find((p) => p.id === newActiveId);
			if (currentPreset && targetPreset) {
				if (
					currentPreset.showToolbar === true &&
					targetPreset.showToolbar === false &&
					targetPreset.toolbarEverShown !== true
				) {
					presets = presets.map((p) =>
						p.id === newActiveId
							? {
									...p,
									showToolbar: true,
									toolbarEverShown: true,
								}
							: p,
					);
				}
			}

			// 3. 清除草稿
			this.state = {
				...this.state,
				...partial,
				presets,
				draftFilter: null,
			};
		} else {
			this.state = { ...this.state, ...partial };
		}

		this.notify();
		this.save();
	}

	subscribe(listener: Listener): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	protected notify() {
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
}
