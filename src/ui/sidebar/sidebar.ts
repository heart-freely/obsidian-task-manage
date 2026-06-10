// src/ui/panel/sidebar-panel.ts
// 侧边栏面板

import { Store } from "../../core/store/store";
import { Preset } from "../../type/type";

export class SidebarPanel {
	private app: any;
	private store: Store;
	private container: HTMLElement;
	private lastSidebarWidth: number | null = null;
	private unsub: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.unsub = store.subscribe(() => this.render());
		this.render();
	}

	destroy() {
		if (this.unsub) {
			this.unsub();
			this.unsub = null;
		}
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
			const st = this.store.getState();
			const nc = !st.sidebarCollapsed;
			this.store.update({
				sidebarCollapsed: nc,
				sidebarWidth: nc ? 40 : st.sidebarWidth || 100,
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
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === cp.id ? { ...p, showToolbar: !p.showToolbar } : p,
				),
			});
		};

		const contentDiv = this.container.createDiv({ cls: "side-content" });
		contentDiv.style.cssText = "overflow-y:auto;flex:1;overflow-x:hidden;";

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
		const template = state.presets.find((p) => p.id === "all-tasks");
		const now = Date.now().toString();
		const newPreset: Preset = {
			...(template || {}),
			id: now,
			name: "新视图",
			icon: "📋",
		} as Preset;
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
