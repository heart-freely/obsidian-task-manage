// src/core/store/preset/preset.ts

import { Preset } from "../../../type/type";
import logger from "../../../util/logger";
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
	const state = store.getState();
	// 禁止删除最后一个方案
	if (state.presets.length <= 1) {
		logger.warn("[TaskManage] 至少保留一个方案，无法删除");
		return;
	}
	const presets = state.presets.filter((p) => p.id !== presetId);
	// 如果删除的是当前激活方案，自动切换到剩余第一个
	let activePresetId = state.activePresetId;
	if (activePresetId === presetId) {
		activePresetId = presets[0].id;
	}
	store.update({ presets, activePresetId });
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
	return Math.random().toString(36).substring(2, 11);
}
