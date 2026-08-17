// src/ui/sidebar/sidebar.ts

import type { App } from "obsidian";
import { Store } from "../../core/store/store";
import { Preset } from "../../type/type";

export class SidebarPanel {
	private app: App;
	private store: Store;
	private container: HTMLElement;
	private lastSidebarWidth: number | null = null;
	private unsub: (() => void) | null = null;
	private resizeRafId: number | null = null;

	constructor(container: HTMLElement, store: Store, app: App) {
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
		if (this.resizeRafId !== null) {
			cancelAnimationFrame(this.resizeRafId);
			this.resizeRafId = null;
		}
	}

	private render() {
		if (this.resizeRafId !== null) {
			cancelAnimationFrame(this.resizeRafId);
			this.resizeRafId = null;
		}

		const existingButtons =
			this.container.querySelectorAll<HTMLElement>(".task-preset-btn");
		const buttonsToReset: HTMLElement[] = [];
		existingButtons.forEach((btn) => {
			buttonsToReset.push(btn);
		});

		this.container.empty();
		const state = this.store.getState();
		const collapsed = state.sidebarCollapsed;
		this.container.addClass(
			"task-overflow-hidden",
			"task-relative",
			"task-z-1",
		);
		const topRow = this.container.createDiv({
			cls:
				"side-top-row" +
				(collapsed
					? " task-side-top-row-collapsed"
					: " task-side-top-row-vertical"),
		});
		const toggleBtn = topRow.createEl("button", {
			text: collapsed ? "▶" : "◀",
			cls: "task-preset-btn",
			title: collapsed ? "展开侧边栏" : "折叠侧边栏",
		});
		if (collapsed) toggleBtn.className = "task-preset-btn task-side-icon-btn";
		toggleBtn.addEventListener("click", () => {
			const st = this.store.getState();
			const nc = !st.sidebarCollapsed;
			this.store.update({
				sidebarCollapsed: nc,
				sidebarWidth: nc ? 40 : st.sidebarWidth || 100,
			});
		});
		const contentDiv = this.container.createDiv({ cls: "task-side-content" });
		contentDiv.addClass(
			"task-overflow-y-auto",
			"task-flex-1",
			"task-overflow-x-hidden",
		);
		if (collapsed) {
			this.container.setCssProps({
				"--task-sidebar-width": "40px",
				"--task-sidebar-min-width": "40px",
			});
			this.container.addClass("task-sidebar-dynamic-width");
			const iconBar = contentDiv.createDiv({ cls: "preset-list" });
			state.presets.forEach((preset) => {
				const btn = iconBar.createEl("button", {
					text: preset.icon || preset.name.charAt(0),
					cls: "task-preset-btn task-side-icon-btn",
					title: preset.name,
				});
				if (state.activePresetId === preset.id) btn.addClass("active");
				btn.addEventListener("click", () =>
					this.store.update({ activePresetId: preset.id }),
				);
			});
			contentDiv
				.createEl("button", {
					text: "➕",
					cls: "task-preset-btn task-side-icon-btn",
					title: "新建视图",
				})
				.addEventListener("click", () => this.createNewPreset());
			return;
		}
		this.container.setCssProps({ "--task-sidebar-min-width": "48px" });
		this.container.addClass("task-sidebar-dynamic-min-width");
		const listDiv = contentDiv.createDiv({ cls: "preset-list" });
		state.presets.forEach((preset) => {
			const row = listDiv.createDiv({ cls: "task-preset-row" });
			const btn = row.createEl("button", {
				text: (preset.icon || "📋") + " " + preset.name,
				cls: "task-preset-btn",
			});
			if (state.activePresetId === preset.id) btn.addClass("active");
			btn.addEventListener("click", () =>
				this.store.update({ activePresetId: preset.id }),
			);
		});
		contentDiv
			.createEl("button", {
				text: "➕ 新建视图",
				cls: "task-preset-btn",
				attr: { style: "margin-top: auto;" },
			})
			.addEventListener("click", () => this.createNewPreset());

		this.resizeRafId = window.requestAnimationFrame(() => {
			this.resizeRafId = null;
			this.adjustSidebarWidth();
		});
	}

	private createNewPreset() {
		const state = this.store.getState();
		const template = state.presets.find((p) => p.id === "all-tasks");
		const np: Preset = {
			id: Date.now().toString(),
			name: "新视图",
			icon: "📋",
			groupId: template?.groupId || "basic",
			businessView: template?.businessView || "allTasks",
			viewStyle: template?.viewStyle || "table",
			filter: template?.filter || {
				dateRange: { start: null, end: null, isAll: true },
				statuses: [],
				includeMarks: [],
				excludeMarks: [],
				rootPath: null,
			},
			sort: template?.sort || { type: "", order: "asc" },
		};
		this.store.update({
			presets: [...state.presets, np],
			activePresetId: np.id,
		});
	}

	private adjustSidebarWidth() {
		if (this.store.getState().sidebarCollapsed) return;
		const buttons =
			this.container.querySelectorAll<HTMLElement>(".task-preset-btn");
		if (buttons.length === 0) return;
		buttons.forEach((btn) => {
			btn.removeClass("task-sidebar-btn-fixed");
			btn.addClass("task-sidebar-btn-auto");
		});
		this.container.setCssProps({ "--task-sidebar-width": "auto" });
		let maxWidth = 0;
		buttons.forEach((btn) => {
			const w = btn.offsetWidth;
			if (w > maxWidth) maxWidth = w;
		});
		buttons.forEach((btn) => {
			btn.removeClass("task-sidebar-btn-auto");
			btn.addClass("task-sidebar-btn-fixed");
			btn.setCssProps({ "--task-sidebar-btn-width": maxWidth + "px" });
		});
		this.container.addClass("task-pr-0");
		const newWidth = maxWidth + 4;
		if (
			this.lastSidebarWidth === null ||
			Math.abs(this.lastSidebarWidth - newWidth) > 1
		) {
			this.container.setCssProps({
				"--task-sidebar-width": newWidth + "px",
			});
			this.lastSidebarWidth = newWidth;
		}
	}
}
