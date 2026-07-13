// src/ui/panel/sidebar-panel.ts
// 视图配置面板

import { getDefaultPresets } from "../../core/store/preset/panel-preset";
import { Store } from "../../core/store/store";
import { Preset } from "../../type/type";
import { Panels } from "./panel";

export class SidebarPanel {
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

		// 行1：视图名称
		const rowName = this.container.createDiv({ cls: "panel-row" });
		rowName.createSpan({ text: "视图名称", cls: "panel-label" });

		const nameInput = rowName.createEl("input", {
			type: "text",
			attr: { placeholder: "输入视图名称" },
		});
		// 原代码：nameInput.style.maxWidth = "150px";
		// 替换为 CSS 类
		nameInput.addClass("task-max-w-150");
		nameInput.value = preset.name || "";
		nameInput.addEventListener("change", () =>
			updatePreset({ name: nameInput.value.trim() || "未命名" }),
		);

		// 行2：视图图标
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

		// 行3：视图配置（按钮）
		const row4 = this.container.createDiv({ cls: "panel-row" });
		row4.createSpan({ text: "视图配置", cls: "panel-label" });

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
			updatePreset({ ...def, id: pr.id, name: pr.name } as any);
			Panels.getInstance().refreshTimePanel();
			this.render();
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
