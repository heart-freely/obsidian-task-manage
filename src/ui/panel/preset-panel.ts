// src/ui/panel/preset-panel.ts
// 视图配置面板

import { getDefaultPresets } from "../../core/config/panel-default-config";
import { Store } from "../../core/store/store";
import { Preset } from "../../type/type";
import { Panels } from "./panel";

export class PresetPanel {
	private container: HTMLElement;
	private store: Store;
	private unsub: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.unsub = store.subscribe(() => this.render());
		this.render();
	}

	destroy() {
		if (this.unsub) {
			this.unsub();
			this.unsub = null;
		}
	}

	render() {
		this.container.empty();
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;

		const updatePreset = (changes: Partial<Preset>) => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id ? { ...p, ...changes } : p,
				),
			});
		};

		const rowName = this.container.createDiv({ cls: "panel-row" });
		rowName.createSpan({ text: "视图名称", cls: "panel-label" });
		const nameInput = rowName.createEl("input", {
			type: "text",
			attr: { placeholder: "输入视图名称" },
		});
		nameInput.style.maxWidth = "150px";
		nameInput.value = preset.name || "";
		nameInput.addEventListener("change", () =>
			updatePreset({ name: nameInput.value.trim() || "未命名" }),
		);

		const row2 = this.container.createDiv({ cls: "panel-row" });
		row2.createSpan({ text: "视图图标", cls: "panel-label" });
		const iconInput = row2.createEl("input", {
			type: "text",
			cls: "panel-input panel-input-sm",
			attr: { placeholder: "Emoji" },
		});
		iconInput.value = preset.icon || "";
		iconInput.addEventListener("change", () =>
			updatePreset({ icon: iconInput.value.trim() || undefined }),
		);

		const row4 = this.container.createDiv({ cls: "panel-row" });
		row4.createSpan({ text: "视图配置", cls: "panel-label" });

		const importBtn = row4.createEl("button", {
			text: "📥 导入配置",
			cls: "panel-btn",
		});
		importBtn.onclick = () => {
			const i = document.createElement("input");
			i.type = "file";
			i.accept = ".json";
			i.onchange = async () => {
				if (!i.files?.length) return;
				try {
					updatePreset(
						JSON.parse(await i.files[0].text()) as Partial<Preset>,
					);
				} catch {
					alert("导入失败");
				}
			};
			i.click();
		};

		const exportBtn = row4.createEl("button", {
			text: "📤 导出配置",
			cls: "panel-btn",
		});
		exportBtn.onclick = () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const blob = new Blob([JSON.stringify(pr, null, 2)], {
				type: "application/json",
			});
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = `task-view-${pr.name}.json`;
			a.click();
		};

		const resetBtn = row4.createEl("button", {
			text: "🔄 恢复默认",
			cls: "panel-btn",
		});
		resetBtn.onclick = () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const defaultPresets = getDefaultPresets();
			const def = defaultPresets.find((dp) => dp.id === pr.id);
			if (!def) return;
			updatePreset({
				...def,
				id: pr.id,
				name: pr.name,
			} as any);
			Panels.getInstance().refreshTimePanel();
		};

		const delBtn = row4.createEl("button", {
			text: "🗑️ 删除视图",
			cls: "panel-btn",
		});
		delBtn.onclick = () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const np = st.presets.filter((p) => p.id !== pr.id);
			const na = np.length > 0 ? np[0].id : null;
			this.store.update({ presets: np, activePresetId: na });
		};
	}
}
