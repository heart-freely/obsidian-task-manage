import { Store } from "../../store/store";
import { Preset } from "../../types";

export class SideBar {
	private app: any;
	private store: Store;
	private container: HTMLElement;
	private resizeCleanup: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store, app: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.store.subscribe(() => this.render());
		this.render();
	}

	private render() {
		this.resizeCleanup?.();
		this.resizeCleanup = null;

		// 关键修复：每次 render 前清除所有按钮内联宽度，防止残留导致错位
		const allBtns = this.container.querySelectorAll(".preset-btn");
		allBtns.forEach((btn) => ((btn as HTMLElement).style.width = ""));

		this.container.empty();
		const state = this.store.getState();
		const collapsed = state.sidebarCollapsed;

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
			cls: "preset-btn",
			title: collapsed ? "展开侧边栏" : "折叠侧边栏",
		});
		toggleBtn.onclick = () => {
			const newCollapsed = !state.sidebarCollapsed;
			this.store.update({
				sidebarCollapsed: newCollapsed,
				sidebarWidth: newCollapsed ? 40 : state.sidebarWidth || 160,
			});
		};

		const settingBtn = topRow.createEl("button", {
			text: "⚙️",
			cls: "preset-btn",
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
		contentDiv.style.overflowY = "auto";
		contentDiv.style.flex = "1";

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
			return;
		}

		// 展开模式
		this.container.style.width = (state.sidebarWidth || 160) + "px";
		this.container.style.minWidth = "48px";

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

		// 宽度调整手柄
		const handle = this.container.createDiv({
			cls: "sidebar-resize-handle",
		});
		handle.style.position = "absolute";
		handle.style.right = "0";
		handle.style.top = "0";
		handle.style.bottom = "0";
		handle.style.width = "4px";
		handle.style.cursor = "col-resize";
		handle.style.zIndex = "10";
		handle.style.background = "transparent";

		const onMouseDown = (e: MouseEvent) => {
			e.preventDefault();
			const startX = e.clientX;
			const startWidth = this.container.offsetWidth;
			const onMouseMove = (ev: MouseEvent) => {
				ev.preventDefault();
				const newWidth = Math.min(
					600,
					Math.max(48, startWidth + ev.clientX - startX),
				);
				this.store.update({ sidebarWidth: newWidth });
			};
			const onMouseUp = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
				this.resizeCleanup = null;
			};
			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("mouseup", onMouseUp);
			this.resizeCleanup = () => {
				document.removeEventListener("mousemove", onMouseMove);
				document.removeEventListener("mouseup", onMouseUp);
			};
		};
		handle.addEventListener("mousedown", onMouseDown);

		// 只均衡视图列表按钮宽度，排除顶部按钮
		this.equalizeButtonWidths();
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

	private equalizeButtonWidths() {
		if (this.store.getState().sidebarCollapsed) return;

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				// 只选择 preset-list 内的按钮，排除顶部按钮
				const buttons = this.container.querySelectorAll(
					".preset-list .preset-btn",
				);
				if (buttons.length === 0) return;
				// 先清除所有内联宽度
				buttons.forEach(
					(btn) => ((btn as HTMLElement).style.width = "auto"),
				);
				let maxWidth = 0;
				buttons.forEach((btn) => {
					const w = (btn as HTMLElement).offsetWidth;
					if (w > maxWidth) maxWidth = w;
				});
				buttons.forEach((btn) => {
					(btn as HTMLElement).style.width = maxWidth + "px";
					(btn as HTMLElement).style.boxSizing = "border-box";
				});
			});
		});
	}
}
