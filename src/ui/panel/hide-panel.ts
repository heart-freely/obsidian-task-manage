// src/ui/panel/hide-panel.ts
// 视图隐藏面板 — 修改 hideConfig，不影响 filter

import {
	ALLOWED_STATUSES,
	MARK_NAMES,
	PRIORITY_ORDER,
	REPEAT_ORDER,
	STATUS_NAMES,
} from "../../process/config/config";
import { getDefaultHideConfig } from "../../process/config/panel-default-config";
import { Store } from "../../process/store/store";
import { HideConfig } from "../../types";

const PRIORITY_ICONS = [...PRIORITY_ORDER].reverse();

const HIDE_GROUPS = [
	{ label: "隐藏状态", type: "statuses" },
	{ label: "隐藏描述", type: "searchText" },
	{ label: "隐藏优先", type: "priorityValues" },
	{ label: "隐藏循环", type: "repeatCycles" },
	{
		label: "隐藏时间",
		type: "marks",
		keys: ["created", "scheduled", "starts", "cancel", "done", "due"],
	},
	{ label: "隐藏依赖", type: "marks", keys: ["id", "forbid"] },
	{ label: "隐藏标签", type: "marks", keys: ["tag"] },
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

			// 隐藏状态
			if (group.type === "statuses") {
				const hidden = hideConfig.hideStatuses || [];
				const noneHidden = hidden.length === 0;
				const mainBtn = row.createEl("button", {
					text: "状态",
					cls: "panel-btn",
				});
				if (!noneHidden) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateHideConfig({
						hideStatuses: noneHidden ? [...ALLOWED_STATUSES] : [],
					});
				};
				const subPanel = row.createDiv({ cls: "panel-sub" });
				subPanel.style.cssText =
					"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";
				ALLOWED_STATUSES.forEach((st) => {
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

			// 隐藏描述
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
					timer = setTimeout(() => {
						updateHideConfig({ hideSearchText: searchInput.value });
					}, 300);
				});
				return;
			}

			// 隐藏优先
			if (group.type === "priorityValues") {
				const hidden = hideConfig.hidePriorityValues || [];
				const noneHidden = hidden.length === 0;
				const mainBtn = row.createEl("button", {
					text: "优先",
					cls: "panel-btn",
				});
				if (!noneHidden) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateHideConfig({
						hidePriorityValues: noneHidden
							? [...PRIORITY_ICONS]
							: [],
					});
				};
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

			// 隐藏循环
			if (group.type === "repeatCycles") {
				const hidden = hideConfig.hideRepeatCycles || [];
				const noneHidden = hidden.length === 0;
				const mainBtn = row.createEl("button", {
					text: "循环",
					cls: "panel-btn",
				});
				if (!noneHidden) mainBtn.addClass("active");
				mainBtn.onclick = () => {
					updateHideConfig({
						hideRepeatCycles: noneHidden ? [...REPEAT_ORDER] : [],
					});
				};
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

			// 隐藏标记（日期/依赖）：多子按钮
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

			// 隐藏标签：单按钮
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
