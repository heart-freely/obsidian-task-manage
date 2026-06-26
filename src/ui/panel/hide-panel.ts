// src/ui/panel/hide-panel.ts
// 视图隐藏面板 — 修改 hideConfig

import {
	MARK_NAMES,
	PRIORITY_ORDER,
	REPEAT_ORDER,
	STATUS_NAMES,
} from "../../core/config/config";
import { getDefaultHideConfig } from "../../core/store/preset/panel-preset";
import { Store } from "../../core/store/store";
import { HideConfig } from "../../type/type";

const PRIORITY_ICONS = [...PRIORITY_ORDER].reverse();

const BASIC_STATUSES = [
	"todo",
	"scheduled",
	"in-progress",
	"completed",
	"cancelled",
];

const HIDE_GROUPS = [
	{ label: "隐藏状态", type: "statuses" },
	{ label: "隐藏描述", type: "searchText" },
	{ label: "隐藏优先", type: "priorityValues" },
	{ label: "隐藏循环", type: "repeatCycles" },
	{
		label: "隐藏时间",
		type: "marks",
		keys: ["created", "scheduled", "starts", "cancelled", "done", "due"],
	},
	{ label: "隐藏依赖", type: "marks", keys: ["id", "forbid"] },
	{ label: "隐藏标签", type: "marks", 优先: ["tag"] },
];

export class HidePanel {
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
		const hideConfig = preset.hideConfig ?? getDefaultHideConfig();

		const updateHideConfig = (changes: Partial<HideConfig>) => {
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (!pr) return;
			const newHideConfig = {
				...(pr.hideConfig ?? getDefaultHideConfig()),
				...changes,
			};
			this.store.update({
				presets: st.presets.map((p) =>
					p.id === pr.id ? { ...p, hideConfig: newHideConfig } : p,
				),
			});
		};

		HIDE_GROUPS.forEach((group) => {
			const row = this.container.createDiv({ cls: "panel-row" });
			row.createSpan({ text: group.label, cls: "panel-label" });

			if (group.type === "repeatTasks") {
				const isHidden = hideConfig.hideRepeatTasks ?? true;
				const btn = row.createEl("button", {
					text: isHidden ? "显示循环" : "隐藏循环",
					cls: "panel-btn",
				});
				if (isHidden) btn.addClass("active");
				btn.onclick = () =>
					updateHideConfig({ hideRepeatTasks: !isHidden });
				return;
			}

			if (group.type === "completedTasks") {
				const isHidden = hideConfig.hideCompletedTasks ?? true;
				const btn = row.createEl("button", {
					text: isHidden ? "显示已完成" : "隐藏已完成",
					cls: "panel-btn",
				});
				if (isHidden) btn.addClass("active");
				btn.onclick = () =>
					updateHideConfig({ hideCompletedTasks: !isHidden });
				return;
			}

			if (group.type === "cancelledTasks") {
				const isHidden = hideConfig.hideCancelledTasks ?? true;
				const btn = row.createEl("button", {
					text: isHidden ? "显示已取消" : "隐藏已取消",
					cls: "panel-btn",
				});
				if (isHidden) btn.addClass("active");
				btn.onclick = () =>
					updateHideConfig({ hideCancelledTasks: !isHidden });
				return;
			}

			if (group.type === "statuses") {
				const hidden = hideConfig.hideStatuses || [];
				const noneHidden = hidden.length === 0;
				const mainBtn = row.createEl("button", {
					text: "状态",
					cls: "panel-btn",
				});
				if (!noneHidden) mainBtn.addClass("active");
				mainBtn.onclick = () =>
					updateHideConfig({
						hideStatuses: noneHidden ? [...BASIC_STATUSES] : [],
					});
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				BASIC_STATUSES.forEach((st) => {
					const isHidden = hidden.includes(st);
					const btn = subPanel.createEl("button", {
						text: STATUS_NAMES[st] || st,
						cls: "panel-btn sub-btn",
					});
					if (isHidden) btn.addClass("active");
					btn.onclick = () => {
						const nh = isHidden
							? hidden.filter((s) => s !== st)
							: [...hidden, st];
						updateHideConfig({ hideStatuses: nh });
					};
				});
				return;
			}

			if (group.type === "searchText") {
				const searchInput = row.createEl("input", {
					type: "text",
					cls: "panel-input",
					attr: {
						placeholder:
							"输入关键词匹配隐藏任务，多个关键词用空格分隔，回车搜索",
					},
				});
				searchInput.style.width = "380px";
				searchInput.value = hideConfig.hideSearchText || "";
				let timer: ReturnType<typeof setTimeout> | null = null;
				searchInput.addEventListener("input", () => {
					if (timer) clearTimeout(timer);
					timer = setTimeout(
						() =>
							updateHideConfig({
								hideSearchText: searchInput.value,
							}),
						300,
					);
				});
				return;
			}

			if (group.type === "priorityValues") {
				const hidden = hideConfig.hidePriorityValues || [];
				const noneHidden = hidden.length === 0;
				const mainBtn = row.createEl("button", {
					text: "优先级",
					cls: "panel-btn",
				});
				if (!noneHidden) mainBtn.addClass("active");
				mainBtn.onclick = () =>
					updateHideConfig({
						hidePriorityValues: noneHidden
							? [...PRIORITY_ICONS]
							: [],
					});
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				PRIORITY_ICONS.forEach((icon) => {
					const isHidden = hidden.includes(icon);
					const btn = subPanel.createEl("button", {
						text: icon,
						cls: "panel-btn sub-btn",
					});
					if (isHidden) btn.addClass("active");
					btn.onclick = () => {
						const nh = isHidden
							? hidden.filter((i) => i !== icon)
							: [...hidden, icon];
						updateHideConfig({ hidePriorityValues: nh });
					};
				});
				return;
			}

			if (group.type === "repeatCycles") {
				const hidden = hideConfig.hideRepeatCycles || [];
				const noneHidden = hidden.length === 0;
				const mainBtn = row.createEl("button", {
					text: "循环",
					cls: "panel-btn",
				});
				if (!noneHidden) mainBtn.addClass("active");
				mainBtn.onclick = () =>
					updateHideConfig({
						hideRepeatCycles: noneHidden ? [...REPEAT_ORDER] : [],
					});
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				REPEAT_ORDER.forEach((cycle) => {
					const isHidden = hidden.includes(cycle);
					const btn = subPanel.createEl("button", {
						text: `🔁 ${cycle}`,
						cls: "panel-btn sub-btn",
					});
					if (isHidden) btn.addClass("active");
					btn.onclick = () => {
						const nh = isHidden
							? hidden.filter((c) => c !== cycle)
							: [...hidden, cycle];
						updateHideConfig({ hideRepeatCycles: nh });
					};
				});
				return;
			}

			if (group.type === "marks" && group.keys && group.keys.length > 1) {
				const hidden = hideConfig.hideMarks || [];
				const noneHidden = group.keys.every((k) => !hidden.includes(k));
				const mainBtn = row.createEl("button", {
					text: group.label.replace("隐藏", ""),
					cls: "panel-btn",
				});
				if (!noneHidden) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					const others = hidden.filter(
						(m) => !group.keys!.includes(m),
					);
					updateHideConfig({
						hideMarks: noneHidden
							? [...others, ...group.keys!]
							: others,
					});
				};
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				group.keys.forEach((markKey) => {
					const isHidden = hidden.includes(markKey);
					const btn = subPanel.createEl("button", {
						text: MARK_NAMES[markKey] || markKey,
						cls: "panel-btn sub-btn",
					});
					if (isHidden) btn.addClass("active");
					btn.onclick = () => {
						const nh = isHidden
							? hidden.filter((m) => m !== markKey)
							: [...hidden, markKey];
						updateHideConfig({ hideMarks: nh });
					};
				});
				return;
			}

			if (
				group.type === "marks" &&
				group.keys &&
				group.keys.length === 1
			) {
				const markKey = group.keys[0];
				const isHidden = (hideConfig.hideMarks || []).includes(markKey);
				const btn = row.createEl("button", {
					text: MARK_NAMES[markKey] || markKey,
					cls: "panel-btn",
				});
				if (isHidden) btn.addClass("active");
				btn.onclick = () => {
					const hidden = hideConfig.hideMarks || [];
					const nh = isHidden
						? hidden.filter((m) => m !== markKey)
						: [...hidden, markKey];
					updateHideConfig({ hideMarks: nh });
				};
				return;
			}
		});
	}
}
