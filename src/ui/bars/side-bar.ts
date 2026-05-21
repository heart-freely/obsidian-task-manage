import { Store } from "../../store/store";
import { Preset } from "../../types";

export class SideBar {
	private app: any;
	private store: Store;
	private container: HTMLElement;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.store.subscribe(() => this.render());
		this.render();
	}

	private render() {
		this.container.empty();
		const state = this.store.getState();
		const collapsed = state.sidebarCollapsed;

		// 顶部按钮行改为纵向排列（展开状态下）
		const topRow = this.container.createDiv({
			cls:
				"side-top-row" +
				(collapsed
					? " side-top-row-collapsed"
					: " side-top-row-vertical"),
		});

		// 展开模式中，顶部按钮使用 preset-btn 样式
		const toggleBtn = topRow.createEl("button", {
			text: collapsed ? "▶" : "◀",
			cls: "side-toggle-btn preset-btn",
			title: collapsed ? "展开侧边栏" : "折叠侧边栏",
		});
		const settingBtn = topRow.createEl("button", {
			text: "⚙️",
			cls: "side-setting-btn preset-btn",
			title: "切换工具栏",
		});
		settingBtn.onclick = () => {
			const currentPreset = state.presets.find(
				(p) => p.id === state.activePresetId,
			);
			if (!currentPreset) return;
			const newPresets = state.presets.map((p) =>
				p.id === currentPreset.id
					? { ...p, showToolbar: !p.showToolbar }
					: p,
			);
			this.store.update({ presets: newPresets });
		};

		// 侧边栏内容容器（支持滚动）
		const contentDiv = this.container.createDiv({ cls: "side-content" });
		contentDiv.style.overflowY = "auto";
		contentDiv.style.flex = "1";

		if (collapsed) {
			this.container.style.width = "40px";
			this.container.style.minWidth = "40px";
			const iconBar = contentDiv.createDiv({ cls: "side-icon-bar" });
			state.presets.forEach((preset) => {
				const icon = preset.icon || preset.name.charAt(0);
				const btn = iconBar.createEl("button", {
					text: icon,
					cls: "side-icon-btn",
					title: preset.name,
				});
				if (state.activePresetId === preset.id) btn.addClass("active");
				btn.onclick = () => {
					if (!preset.toolbarEverShown) {
						const newPresets = state.presets.map((p) =>
							p.id === preset.id
								? {
										...p,
										showToolbar: true,
										toolbarEverShown: true,
									}
								: p,
						);
						this.store.update({
							presets: newPresets,
							activePresetId: preset.id,
						});
					} else {
						this.store.update({ activePresetId: preset.id });
					}
				};
			});
			// 折叠状态下保留新建按钮
			const newViewBtn = contentDiv.createEl("button", {
				text: "➕",
				cls: "side-icon-btn",
				title: "新建视图",
			});
			newViewBtn.onclick = () => {
				/* 新建视图逻辑同下 */
			};
			return;
		}

		// 展开模式
		this.container.style.width = (state.sidebarWidth || 160) + "px";
		this.container.style.minWidth = "48px";

		// 视图列表
		const listDiv = contentDiv.createDiv({ cls: "preset-list" });
		state.presets.forEach((preset) => {
			const row = listDiv.createDiv({ cls: "preset-row" });
			const btn = row.createEl("button", {
				text: (preset.icon || "📋") + " " + preset.name,
				cls: "preset-btn",
			});
			if (state.activePresetId === preset.id) btn.addClass("active");
			btn.onclick = () => {
				if (!preset.toolbarEverShown) {
					const newPresets = state.presets.map((p) =>
						p.id === preset.id
							? {
									...p,
									showToolbar: true,
									toolbarEverShown: true,
								}
							: p,
					);
					this.store.update({
						presets: newPresets,
						activePresetId: preset.id,
					});
				} else {
					this.store.update({ activePresetId: preset.id });
				}
			};
		});

		// 新建视图按钮
		const newViewBtn = contentDiv.createEl("button", {
			text: "➕ 新建视图",
			cls: "side-btn",
			attr: { style: "margin-top: auto;" },
		});
		newViewBtn.onclick = () => {
			const now = Date.now().toString();
			const newPreset: Preset = {
				id: now,
				name: "新视图",
				groupId: "basic",
				businessView: "allTasks",
				viewStyle: "table",
				icon: "📋",
				showToolbar: true,
				toolbarEverShown: true,
				toolbarOrder: [
					"time",
					"excut",
					"search",
					"mark",
					"view",
					"hide",
					"sort",
					"config",
				],
				barVisibility: {
					time: true,
					excut: true,
					search: true,
					mark: true,
					view: true,
					hide: true,
					sort: true,
					config: true,
				},
				filter: {
					dateRange: { start: null, end: null, isAll: true },
					statuses: [
						"todo",
						"planned",
						"in-progress",
						"completed",
						"cancelled",
					],
					includeMarks: [],
					excludeMarks: [],
					hideRepeat: false,
					hideCompleted: false,
					hideCancelled: false,
					rootPath: null,
					hideFolders: false,
				},
				sort: { type: "status", order: "asc" },
			};
			this.store.update({
				presets: [...state.presets, newPreset],
				activePresetId: newPreset.id,
			});
		};

		// 统一所有按钮宽度为最宽按钮的宽度
		this.equalizeButtonWidths();
	}

	private equalizeButtonWidths() {
		requestAnimationFrame(() => {
			const buttons = this.container.querySelectorAll(
				".preset-btn, .side-btn",
			);
			if (buttons.length === 0) return;

			let maxWidth = 0;
			// 先重置宽度为 auto，以便测量真实内容宽度
			buttons.forEach((btn) => {
				(btn as HTMLElement).style.width = "auto";
			});
			// 测量最大宽度
			buttons.forEach((btn) => {
				const w = (btn as HTMLElement).offsetWidth;
				if (w > maxWidth) maxWidth = w;
			});
			// 统一设置宽度
			buttons.forEach((btn) => {
				(btn as HTMLElement).style.width = maxWidth + "px";
				(btn as HTMLElement).style.boxSizing = "border-box";
			});
		});
	}
}
