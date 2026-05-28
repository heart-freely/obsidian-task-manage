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

		// 切换 activePresetId 时自动保存 draftFilter 到旧预设
		if (
			newActiveId !== undefined &&
			newActiveId !== oldActiveId &&
			this.state.draftFilter
		) {
			const presets = partial.presets ?? this.state.presets;
			const oldPreset = presets.find((p) => p.id === oldActiveId);
			if (oldPreset) {
				const newPresets = presets.map((p) =>
					p.id === oldActiveId
						? { ...p, filter: this.state.draftFilter! }
						: p,
				);
				this.state = {
					...this.state,
					...partial,
					presets: newPresets,
					draftFilter: null,
				};
				this.notify();
				this.save();
				return;
			} else {
				this.state = { ...this.state, draftFilter: null };
			}
		}

		this.state = { ...this.state, ...partial };
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
