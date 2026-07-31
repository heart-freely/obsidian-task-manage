// src/ui/panel/sidebar-panel.ts

import { getDefaultPresets } from "../../core/store/preset/panel-preset";
import { Store } from "../../core/store/store";
import { Preset } from "../../type/type";
import { createEl } from "../../util/dom-utils";
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

		const rowName = this.container.createDiv({ cls: "panel-row" });
		rowName.createSpan({ text: "视图名称", cls: "panel-label" });
		const nameInput = rowName.createEl("input", {
			type: "text",
			attr: { placeholder: "输入视图名称" },
		});
		nameInput.addClass("task-max-w-150");
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
		importBtn.addEventListener("click", () => {
			const input = createEl("input") as HTMLInputElement;
			input.type = "file";
			input.accept = ".json";
			input.addEventListener("change", () => {
				if (!input.files?.length) return;
				input.files[0]
					.text()
					.then((text: string) => {
						try {
							const data: unknown = JSON.parse(text);
							if (!data || typeof data !== "object") return;
							const st = this.store.getState();
							const pr = st.presets.find(
								(p) => p.id === st.activePresetId,
							);
							if (!pr) return;
							const merged: Preset = {
								...pr,
								...(data as Partial<Preset>),
								id: pr.id,
							};
							this.store.update({
								presets: st.presets.map((p) =>
									p.id === pr.id ? merged : p,
								),
							});
							Panels.getInstance().refreshTimePanel();
							this.render();
						} catch {
							/* JSON 解析失败 */
						}
					})
					.catch(() => {
						/* 读取失败 */
					});
			});
			input.click();
		});
		const exportBtn = row4.createEl("button", {
			text: "📤 导出配置",
			cls: "panel-btn",
		});
		exportBtn.addEventListener("click", () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const blob = new Blob([JSON.stringify(pr, null, 2)], {
				type: "application/json",
			});
			const a = createEl("a") as HTMLAnchorElement;
			a.href = URL.createObjectURL(blob);
			a.download = `task-view-${pr.name}.json`;
			a.click();
		});
		const resetBtn = row4.createEl("button", {
			text: "🔄 恢复默认",
			cls: "panel-btn",
		});
		resetBtn.addEventListener("click", () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const def = getDefaultPresets().find((dp) => dp.id === pr.id);
			if (!def) return;
			updatePreset({ ...def, id: pr.id, name: pr.name });
			Panels.getInstance().refreshTimePanel();
			this.render();
		});
		const delBtn = row4.createEl("button", {
			text: "🗑️ 删除视图",
			cls: "panel-btn",
		});
		delBtn.addEventListener("click", () => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const np = st.presets.filter((p) => p.id !== pr.id);
			this.store.update({
				presets: np,
				activePresetId: np.length > 0 ? np[0].id : null,
			});
		});
	}
}
