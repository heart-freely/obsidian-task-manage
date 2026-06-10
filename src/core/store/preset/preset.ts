// src/store/preset-manager.ts
import { Preset } from "../../../type/type";
import { Store } from "../store";

// 添加方案
export function addPreset(
	store: Store,
	preset: Omit<Preset, "id"> & { id?: string },
) {
	const newPreset: Preset = {
		...preset,
		id: preset.id || generateId(),
	};
	const presets = [...store.getState().presets, newPreset];
	store.update({ presets });
}

// 删除方案
export function removePreset(store: Store, presetId: string) {
	const presets = store.getState().presets.filter((p) => p.id !== presetId);
	const active =
		store.getState().activePresetId === presetId
			? null
			: store.getState().activePresetId;
	store.update({ presets, activePresetId: active });
}

// 更新方案（部分字段）
export function updatePreset(
	store: Store,
	presetId: string,
	changes: Partial<Preset>,
) {
	const presets = store
		.getState()
		.presets.map((p) => (p.id === presetId ? { ...p, ...changes } : p));
	store.update({ presets });
}

// 设置当前激活方案
export function activatePreset(store: Store, presetId: string) {
	store.update({ activePresetId: presetId });
}

// 辅助：生成唯一 ID
function generateId(): string {
	return Math.random().toString(36).substr(2, 9);
}
