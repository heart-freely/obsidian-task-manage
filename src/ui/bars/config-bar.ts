import { Store } from "../../store/store";
import { Preset } from "../../types";

const VIEW_STYLES = [
	{ key: "list", label: "列表" },
	{ key: "table", label: "表格" },
	{ key: "timeline", label: "时间轴" },
	{ key: "kanban", label: "看板" },
	{ key: "matrix", label: "矩阵" },
	{ key: "calendar", label: "日历图" },
	{ key: "tree", label: "任务树" },
	{ key: "gantt", label: "甘特图" },
	{ key: "statistics", label: "基础统计" },
	{ key: "detail", label: "详细统计" },
];

export class ConfigBar {
	private container: HTMLElement;
	private store: Store;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.store.subscribe(() => this.render());
		this.render();
	}

	render() {
		this.container.empty();
		const state = this.store.getState();
		const preset = state.presets.find((p) => p.id === state.activePresetId);
		if (!preset) return;

		// 导入/导出
		const row1 = this.container.createDiv({ cls: "bar-row" });
		row1.createSpan({ text: "配置：", cls: "filter-label" });
		const exportBtn = row1.createEl("button", {
			text: "📤 导出",
			cls: "bar-btn",
		});
		exportBtn.onclick = () => {
			const dataStr = JSON.stringify(preset, null, 2);
			const blob = new Blob([dataStr], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `task-view-${preset.name}.json`;
			a.click();
			URL.revokeObjectURL(url);
		};
		const importBtn = row1.createEl("button", {
			text: "📥 导入",
			cls: "bar-btn",
		});
		importBtn.onclick = () => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json";
			input.onchange = async () => {
				if (!input.files?.length) return;
				const file = input.files[0];
				const text = await file.text();
				try {
					const imported = JSON.parse(text) as Partial<Preset>;
					const newPresets = state.presets.map((p) =>
						p.id === preset.id ? { ...p, ...imported } : p,
					);
					this.store.update({ presets: newPresets });
				} catch (e) {
					alert("导入失败：无效的 JSON 文件");
				}
			};
			input.click();
		};

		// 侧边栏视图图标
		const row2 = this.container.createDiv({ cls: "bar-row" });
		row2.createSpan({ text: "视图图标：", cls: "filter-label" });
		const iconInput = row2.createEl("input", {
			type: "text",
			cls: "filter-input",
			attr: { style: "max-width: 80px;", placeholder: "Emoji" },
		});
		iconInput.value = preset.icon || "";
		iconInput.addEventListener("change", () => {
			const newIcon = iconInput.value.trim();
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, icon: newIcon || undefined } : p,
			);
			this.store.update({ presets: newPresets });
		});

		// 通用视图 emoji 自定义（每个样式一个文本框）
		const row3 = this.container.createDiv({ cls: "bar-row" });
		row3.createSpan({ text: "视图图标：", cls: "filter-label" });
		const customIcons = preset.viewIcons || {};
		VIEW_STYLES.forEach((style) => {
			const input = row3.createEl("input", {
				type: "text",
				cls: "filter-input",
				attr: {
					style: "max-width: 60px; margin-right: 4px;",
					placeholder: style.label,
				},
			});
			input.value = customIcons[style.key] || "";
			input.addEventListener("change", () => {
				const newIcons = {
					...preset.viewIcons,
					[style.key]: input.value.trim() || undefined,
				};
				const newPresets = state.presets.map((p) =>
					p.id === preset.id ? { ...p, viewIcons: newIcons } : p,
				);
				this.store.update({ presets: newPresets });
			});
		});

		// 重置/保存
		const row4 = this.container.createDiv({ cls: "bar-row" });
		const resetBtn = row4.createEl("button", {
			text: "🔄 重置",
			cls: "bar-btn",
		});
		resetBtn.onclick = () => {
			this.store.update({ draftFilter: null });
		};
		const saveBtn = row4.createEl("button", {
			text: "💾 保存配置",
			cls: "bar-btn",
		});
		saveBtn.onclick = () => {
			const currentFilter = state.draftFilter ?? preset.filter;
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, filter: currentFilter } : p,
			);
			this.store.update({ presets: newPresets, draftFilter: null });
		};

		// 删除
		const row5 = this.container.createDiv({ cls: "bar-row" });
		const delBtn = row5.createEl("button", {
			text: "🗑️ 删除视图",
			cls: "bar-btn",
		});
		delBtn.onclick = () => {
			const newPresets = state.presets.filter((p) => p.id !== preset.id);
			const newActive = newPresets.length > 0 ? newPresets[0].id : null;
			this.store.update({
				presets: newPresets,
				activePresetId: newActive,
			});
		};
	}
}
