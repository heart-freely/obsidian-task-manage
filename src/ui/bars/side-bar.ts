// src/ui/bars/side-bar.ts
import { Store } from "../../store/store";
import { Preset } from "../../types";

export class SideBar {
	private app: any;
	private store: Store;
	private container: HTMLElement;
	private lastSidebarWidth: number | null = null;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.store.subscribe(() => this.render());
		this.render();
	}

	private render() {
		const allBtns = this.container.querySelectorAll(".preset-btn");
		allBtns.forEach((btn) => ((btn as HTMLElement).style.width = ""));

		this.container.empty();
		const state = this.store.getState();
		const collapsed = state.sidebarCollapsed;

		this.container.style.overflow = "hidden";
		this.container.style.position = "relative";
		this.container.style.zIndex = "1";

		const topRow = this.container.createDiv({
			cls:
				"side-top-row" +
				(collapsed
					? " side-top-row-collapsed"
					: " side-top-row-vertical"),
		});

		const toggleBtn = topRow.createEl("button", {
			text: collapsed ? "▶" : "◀",
			cls: "preset-btn",
			title: collapsed ? "展开侧边栏" : "折叠侧边栏",
		});
		if (collapsed) toggleBtn.className = "preset-btn side-icon-btn";
		toggleBtn.onclick = () => {
			const newCollapsed = !state.sidebarCollapsed;
			this.store.update({
				sidebarCollapsed: newCollapsed,
				sidebarWidth: newCollapsed ? 40 : state.sidebarWidth || 100,
			});
		};

		const settingBtn = topRow.createEl("button", {
			text: "⚙️",
			cls: "preset-btn",
			title: "视图配置栏",
		});
		if (collapsed) settingBtn.className = "preset-btn side-icon-btn";
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
		contentDiv.style.overflowY = "auto";
		contentDiv.style.flex = "1";
		contentDiv.style.overflowX = "hidden";

		if (collapsed) {
			this.container.style.width = "40px";
			this.container.style.minWidth = "40px";

			const iconBar = contentDiv.createDiv({ cls: "preset-list" });
			state.presets.forEach((preset) => {
				const icon = preset.icon || preset.name.charAt(0);
				const btn = iconBar.createEl("button", {
					text: icon,
					cls: "preset-btn side-icon-btn",
					title: preset.name,
				});
				if (state.activePresetId === preset.id) btn.addClass("active");
				btn.onclick = () =>
					this.store.update({ activePresetId: preset.id });
			});

			const newViewBtn = contentDiv.createEl("button", {
				text: "➕",
				cls: "preset-btn side-icon-btn",
				title: "新建视图",
			});
			newViewBtn.onclick = () => this.createNewPreset();
			return;
		}

		// 展开模式
		this.container.style.minWidth = "48px";

		const listDiv = contentDiv.createDiv({ cls: "preset-list" });
		state.presets.forEach((preset) => {
			const row = listDiv.createDiv({ cls: "preset-row" });
			const btn = row.createEl("button", {
				text: (preset.icon || "📋") + " " + preset.name,
				cls: "preset-btn",
			});
			if (state.activePresetId === preset.id) btn.addClass("active");
			btn.onclick = () =>
				this.store.update({ activePresetId: preset.id });
		});

		const newViewBtn = contentDiv.createEl("button", {
			text: "➕ 新建视图",
			cls: "preset-btn",
			attr: { style: "margin-top: auto;" },
		});
		newViewBtn.onclick = () => this.createNewPreset();

		// 下一帧调整宽度
		requestAnimationFrame(() => this.adjustSidebarWidth());
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
			showToolbar: false,
			toolbarEverShown: false,
			toolbarPanelsCollapsed: false,
			toolbarPanelsHeight: 300,
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

	/**
	 * 根据按钮内容自适应侧边栏宽度。
	 * 按钮左右内边距各 6px，容器紧贴按钮右边缘。
	 */
	private adjustSidebarWidth() {
		if (this.store.getState().sidebarCollapsed) return;

		const buttons = this.container.querySelectorAll(
			".preset-btn",
		) as NodeListOf<HTMLElement>;
		if (buttons.length === 0) return;

		// 1. 重置按钮样式，使内容自然展开，并设置目标内边距
		buttons.forEach((btn) => {
			btn.style.width = "auto";
			btn.style.boxSizing = "border-box";
			// 左右内边距 6px，上下保持 4px
			btn.style.padding = "4px 6px";
		});

		// 容器宽度设为 auto，以便准确测量
		this.container.style.width = "auto";
		// 强制回流
		buttons[0].offsetHeight;

		// 2. 测量最大按钮宽度（已包含 6px 左右内边距）
		let maxWidth = 0;
		buttons.forEach((btn) => {
			const w = btn.offsetWidth;
			if (w > maxWidth) maxWidth = w;
		});

		// 3. 统一按钮宽度，保持视觉整齐
		buttons.forEach((btn) => {
			btn.style.width = maxWidth + "px";
		});

		// 4. 容器右内边距清零，使按钮右边缘紧贴容器
		this.container.style.paddingRight = "0";

		// 容器宽度 = 按钮最大宽度 + 左 padding (4px)
		const newWidth = maxWidth + 4;

		// 5. 仅当宽度变化超过1px时才更新，避免抖动
		if (
			this.lastSidebarWidth === null ||
			Math.abs(this.lastSidebarWidth - newWidth) > 1
		) {
			this.container.style.width = newWidth + "px";
			this.lastSidebarWidth = newWidth;
		}
	}
}
