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
			const st = this.store.getState();
			const cp = st.presets.find((p) => p.id === st.activePresetId);
			if (!cp) return;
			const newPresets = st.presets.map((p) =>
				p.id === cp.id ? { ...p, showToolbar: !p.showToolbar } : p,
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
				const btn = iconBar.createEl("button", {
					text: preset.icon || preset.name.charAt(0),
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

	private adjustSidebarWidth() {
		if (this.store.getState().sidebarCollapsed) return;
		const buttons = this.container.querySelectorAll(
			".preset-btn",
		) as NodeListOf<HTMLElement>;
		if (buttons.length === 0) return;
		buttons.forEach((btn) => {
			btn.style.width = "auto";
			btn.style.boxSizing = "border-box";
			btn.style.padding = "4px 6px";
		});
		this.container.style.width = "auto";
		buttons[0].offsetHeight;
		let maxWidth = 0;
		buttons.forEach((btn) => {
			const w = btn.offsetWidth;
			if (w > maxWidth) maxWidth = w;
		});
		buttons.forEach((btn) => {
			btn.style.width = maxWidth + "px";
		});
		this.container.style.paddingRight = "0";
		const newWidth = maxWidth + 4;
		if (
			this.lastSidebarWidth === null ||
			Math.abs(this.lastSidebarWidth - newWidth) > 1
		) {
			this.container.style.width = newWidth + "px";
			this.lastSidebarWidth = newWidth;
		}
	}
}
