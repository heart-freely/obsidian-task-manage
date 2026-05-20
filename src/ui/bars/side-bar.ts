import { Store } from "../../store/store";
import { Preset } from "../../types";

export class SideBar {
	constructor(container: HTMLElement, store: Store) {
		const render = () => {
			container.empty();
			const state = store.getState();
			const collapsed = state.sidebarCollapsed;

			const toggleBtn = container.createEl("button", {
				text: collapsed ? "▶" : "◀",
				cls: "side-toggle-btn",
			});
			toggleBtn.onclick = () => {
				const newCollapsed = !state.sidebarCollapsed;
				store.update({
					sidebarCollapsed: newCollapsed,
					sidebarWidth: newCollapsed ? 0 : 200,
				});
			};

			if (collapsed) {
				container.style.width = "0";
				container.style.minWidth = "0";
				return;
			}

			container.style.width = (state.sidebarWidth || 200) + "px";
			container.style.minWidth = "48px";

			const addBtn = container.createEl("button", {
				text: "➕ 新建方案",
				cls: "side-btn",
			});
			addBtn.onclick = () => {
				const now = Date.now().toString();
				const newPreset: Preset = {
					id: now,
					name: "新方案",
					groupId: "basic",
					businessView: "allTasks",
					viewStyle: "table",
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
				store.update({
					presets: [...state.presets, newPreset],
					activePresetId: newPreset.id,
				});
			};

			const groups = state.presetGroups ?? [];
			groups.forEach((group) => {
				const groupDiv = container.createDiv({ cls: "preset-group" });
				groupDiv.createEl("div", {
					text: group.name,
					cls: "preset-group-label",
				});
				const groupPresets = state.presets.filter(
					(p) => p.groupId === group.id,
				);
				groupPresets.forEach((preset) => {
					const row = groupDiv.createDiv({ cls: "preset-row" });
					const btn = row.createEl("button", {
						text: preset.name,
						cls: "preset-btn",
					});
					if (state.activePresetId === preset.id)
						btn.addClass("active");
					btn.onclick = () =>
						store.update({ activePresetId: preset.id });
					const delBtn = row.createEl("button", {
						text: "🗑️",
						cls: "preset-del",
					});
					delBtn.onclick = (e) => {
						e.stopPropagation();
						const newPresets = state.presets.filter(
							(p) => p.id !== preset.id,
						);
						const newActive =
							state.activePresetId === preset.id
								? (newPresets[0]?.id ?? null)
								: state.activePresetId;
						store.update({
							presets: newPresets,
							activePresetId: newActive,
						});
					};
				});
			});
		};

		store.subscribe(render);
		render();
	}
}
