// src/ui/panel/edit-panel.ts
// 编辑面板 — 视图配置面板中的批量编辑按钮

import { Store } from "../../core/store/store";

export class EditPanel {
	private container: HTMLElement;
	private store: Store;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.render();
	}

	destroy() {}

	render() {
		const es = this.store.getEditStore();
		const isBatchMode = es ? es.getState().batchMode : false;
		const selectedCount = es ? es.getState().selectedTasks.size : 0;
		const hasSelected = selectedCount > 0;
		const allSelected = hasSelected;

		let snapshots: any[] = [];
		try {
			snapshots = this.store.getSnapshots();
		} catch (e) {
			// EditStore 未初始化时忽略
		}
		const hasSnapshots = snapshots.length > 0;

		const disabledStyle = "opacity: 0.5; cursor: not-allowed;";

		this.container.empty();

		// ========== 行1：批量编辑 ==========
		const row1 = this.container.createDiv({ cls: "panel-row" });
		row1.style.cssText = "flex-wrap:wrap;gap:6px;margin-bottom:4px;";
		row1.createSpan({ text: "批量编辑", cls: "panel-label" });

		const batchBtn = row1.createEl("button", {
			text: "批量编辑",
			cls: "panel-btn edit-batch-btn",
		});
		if (isBatchMode) batchBtn.addClass("active");
		batchBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.store.toggleBatchMode();
		});

		const subPanel1 = row1.createDiv({ cls: "panel-sub" });
		subPanel1.style.cssText =
			"display:flex;flex-wrap:wrap;gap:6px;margin-left:8px;";

		// 全选/全不选 — 批量模式下可用，不高亮
		const selectAllBtn = subPanel1.createEl("button", {
			text: allSelected && isBatchMode ? "全不选" : "全选",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode) {
			selectAllBtn.style.cssText += disabledStyle;
		}
		selectAllBtn.addEventListener("click", () => {
			if (!isBatchMode) return;
			this.store.toggleSelectAll([]);
		});

		// 任务时长输入 — 批量模式 + 有勾选任务 时可用
		const daysInput = subPanel1.createEl("input", {
			type: "number",
			value: "0",
			attr: { min: "0" },
		});
		daysInput.style.cssText =
			"width:48px;text-align:center;padding:3px 4px;border-radius:8px;border:1px solid var(--background-modifier-border);font-size:12px;";
		if (!isBatchMode || !hasSelected) {
			daysInput.disabled = true;
			daysInput.style.cssText += disabledStyle;
		}

		const daysLabel = subPanel1.createSpan({ text: "天" });
		daysLabel.style.cssText = "font-size:12px;color:var(--text-muted);";
		if (!isBatchMode || !hasSelected) {
			daysLabel.style.cssText += disabledStyle;
		}

		// 补全时间 — 批量模式 + 有勾选任务 时可用
		const autoCompleteBtn = subPanel1.createEl("button", {
			text: "补全时间",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected) {
			autoCompleteBtn.style.cssText += disabledStyle;
		}
		autoCompleteBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			const days = parseInt(daysInput.value, 10) || 0;
			this.store.applyAutoComplete(days);
			autoCompleteBtn.addClass("active");
			setTimeout(() => autoCompleteBtn.removeClass("active"), 300);
		});

		// 清空预览 — 批量模式 + 有勾选任务 时可用
		const clearBtn = subPanel1.createEl("button", {
			text: "清空预览",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected) {
			clearBtn.style.cssText += disabledStyle;
		}
		clearBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			this.store.clearPreviews();
			clearBtn.addClass("active");
			setTimeout(() => clearBtn.removeClass("active"), 300);
		});

		// 保存修改 — 批量模式 + 有勾选任务 时可用
		const saveBtn = subPanel1.createEl("button", {
			text: "保存修改",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected) {
			saveBtn.style.cssText += disabledStyle;
		}
		saveBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			this.store.saveCurrent();
			saveBtn.addClass("active");
			setTimeout(() => saveBtn.removeClass("active"), 300);
		});

		// ========== 行2：批量撤回 ==========
		const row2 = this.container.createDiv({ cls: "panel-row" });
		row2.style.cssText = "flex-wrap:wrap;gap:6px;";
		row2.createSpan({ text: "批量撤回", cls: "panel-label" });

		const snapshotSelect = row2.createEl("select");
		snapshotSelect.className = "panel-btn";
		snapshotSelect.style.cssText +=
			"max-width:220px;height:auto;min-height:unset;appearance:none;";
		if (!hasSnapshots) {
			snapshotSelect.createEl("option", {
				text: "无历史原文",
				disabled: true,
			});
		} else {
			snapshots.forEach((snap, index) => {
				const opt = snapshotSelect.createEl("option", {
					text: `${snap.time} (${Object.keys(snap.snapshot).length}个)`,
				});
				opt.value = String(index);
				if (index === 0) opt.selected = true;
			});
		}

		const revertBtn = row2.createEl("button", {
			text: "恢复原文",
			cls: "panel-btn",
		});
		if (!hasSnapshots) {
			revertBtn.style.cssText += disabledStyle;
		}
		revertBtn.addEventListener("click", () => {
			if (!hasSnapshots) return;
			const idx = parseInt(snapshotSelect.value, 10);
			if (!isNaN(idx)) {
				this.store.revertSnapshot(idx);
				revertBtn.addClass("active");
				setTimeout(() => revertBtn.removeClass("active"), 300);
			}
		});

		const clearSnapshotBtn = row2.createEl("button", {
			text: "清空历史",
			cls: "panel-btn",
		});
		if (!hasSnapshots) {
			clearSnapshotBtn.style.cssText += disabledStyle;
		}
		clearSnapshotBtn.addEventListener("click", () => {
			if (!hasSnapshots) return;
			if (confirm("确定清空所有历史原文？")) {
				localStorage.removeItem("organizeSnapshots");
				clearSnapshotBtn.addClass("active");
				setTimeout(() => clearSnapshotBtn.removeClass("active"), 300);
			}
		});
	}
}
