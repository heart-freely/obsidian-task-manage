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
		this.container.style.zIndex = "1";
		const state = this.store.getState();
		const collapsed = state.sidebarCollapsed;

		this.container.style.display = "flex";
		this.container.style.flexDirection = "column";
		this.container.style.overflow = "hidden";

		if (collapsed) {
			this.container.style.width = "40px";
			this.container.style.minWidth = "40px";
			this.container.style.alignItems = "center";
		} else {
			// 1. 获取保存的宽度（若合理则使用，否则使用默认 90px）
			const savedWidth = state.sidebarWidth || 90;
			const baseWidth = savedWidth > 40 ? savedWidth : 90;

			// 2. 可选：根据当前按钮最长文字自动计算最小宽度（取消注释启用）
			// const optimalWidth = this.calculateOptimalWidth();
			// const expandedWidth = Math.max(baseWidth, optimalWidth);

			const expandedWidth = baseWidth; // 固定宽度模式
			this.container.style.width = expandedWidth + "px";
			this.container.style.minWidth = "48px";
			this.container.style.alignItems = "stretch";
		}

		// 顶部按钮行
		const topRow = this.container.createDiv({
			cls:
				"side-top-row" +
				(collapsed
					? " side-top-row-collapsed"
					: " side-top-row-vertical"),
		});

		const toggleBtn = topRow.createEl("button", {
			text: collapsed ? "▶" : "◀",
			cls: "preset-btn" + (collapsed ? " side-icon-btn" : ""),
			title: collapsed ? "展开侧边栏" : "折叠侧边栏",
		});
		toggleBtn.onclick = () => {
			const newCollapsed = !state.sidebarCollapsed;
			const currentWidth = state.sidebarWidth || 90;
			this.store.update({
				sidebarCollapsed: newCollapsed,
				sidebarWidth: newCollapsed
					? 40
					: currentWidth > 40
						? currentWidth
						: 90,
			});
		};

		const settingBtn = topRow.createEl("button", {
			text: "⚙️",
			cls: "preset-btn" + (collapsed ? " side-icon-btn" : ""),
			title: "视图配置栏",
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

		const contentDiv = this.container.createDiv({ cls: "side-content" });
		contentDiv.style.flex = "1";
		contentDiv.style.overflowY = "auto";
		contentDiv.style.overflowX = "hidden";

		if (collapsed) {
			const iconBar = contentDiv.createDiv({ cls: "preset-list" });
			state.presets.forEach((preset) => {
				const icon = preset.icon || preset.name.charAt(0);
				const btn = iconBar.createEl("button", {
					text: icon,
					cls: "preset-btn side-icon-btn",
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

			const newViewBtn = contentDiv.createEl("button", {
				text: "➕",
				cls: "preset-btn side-icon-btn",
				title: "新建视图",
			});
			newViewBtn.onclick = () => this.createNewPreset();
		} else {
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

			const newViewBtn = contentDiv.createEl("button", {
				text: "➕ 新建视图",
				cls: "preset-btn",
				attr: { style: "margin-top: auto;" },
			});
			newViewBtn.onclick = () => this.createNewPreset();
		}
	}

	/**
	 * 根据所有 preset-btn 的文本宽度计算最小合适宽度（+内边距）
	 */
	private calculateOptimalWidth(): number {
		let maxTextWidth = 0;
		const buttons = this.container.querySelectorAll(".preset-btn");
		const tempSpan = document.createElement("span");
		tempSpan.style.visibility = "hidden";
		tempSpan.style.position = "absolute";
		tempSpan.style.whiteSpace = "nowrap";
		tempSpan.style.fontSize = "14px"; // 与 preset-btn 字体一致
		document.body.appendChild(tempSpan);

		buttons.forEach((btn) => {
			tempSpan.textContent = btn.textContent || "";
			const textWidth = tempSpan.offsetWidth;
			if (textWidth > maxTextWidth) maxTextWidth = textWidth;
		});

		document.body.removeChild(tempSpan);
		// 加上左右内边距 + 滚动条余量
		const paddingAndMargin = 24 + 12; // 约 24px padding, 12px 余量
		return maxTextWidth + paddingAndMargin;
	}

	private createNewPreset() {
		const state = this.store.getState();
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
	}
}
