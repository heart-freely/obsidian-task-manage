// src/ui/panel/edit-panel.ts
// 编辑面板 — 视图配置面板中的批量编辑按钮

import { Store } from "../../core/store/store";

export class EditPanel {
	private container: HTMLElement;
	private store: Store;
	private savedDaysValue: string = "0";

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.render();

		// 注册面板更新
		const es = this.store.getEditStore();
		if (es) {
			es.subscribePanel(() => this.render());
		}
	}

	destroy() {}

	render() {
		const es = this.store.getEditStore();
		const isBatchMode = es ? es.getState().batchMode : false;
		const selectedCount = es ? es.getState().selectedTasks.size : 0;
		console.log(
			"[EditPanel.render] isBatchMode:",
			isBatchMode,
			"selectedCount:",
			selectedCount,
		);
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
			"display:flex;flex-wrap:wrap;gap:6px;margin-left:8px;align-items:center;";

		// 全选/全不选
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

		// 标记排序
		const sortBtn = subPanel1.createEl("button", {
			text: "标记排序",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected) {
			sortBtn.style.cssText += disabledStyle;
		}
		sortBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			this.store.applySortTags();
			sortBtn.addClass("active");
			setTimeout(() => sortBtn.removeClass("active"), 300);
		});

		// 补全时间按钮和输入框在同一行对齐
		const autoCompleteRow = subPanel1.createDiv();
		autoCompleteRow.style.cssText =
			"display:inline-flex;align-items:center;gap:4px;";

		const autoCompleteBtn = document.createElement("button");
		autoCompleteBtn.textContent = "补全时间";
		autoCompleteBtn.className = "panel-btn sub-btn";
		if (!isBatchMode || !hasSelected) {
			autoCompleteBtn.style.cssText += disabledStyle;
		}
		autoCompleteBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			const rawValue = daysInput.value.trim();
			const days =
				rawValue === "" ? undefined : parseInt(rawValue, 10) || 0;
			this.store.applyAutoComplete(days);
			autoCompleteBtn.addClass("active");
			setTimeout(() => autoCompleteBtn.removeClass("active"), 300);
		});
		autoCompleteRow.appendChild(autoCompleteBtn);

		const daysInput = document.createElement("input");
		daysInput.type = "number";
		daysInput.value = this.savedDaysValue;
		daysInput.min = "0";
		daysInput.style.cssText =
			"width:48px;height:22px;text-align:center;padding:0 4px;border-radius:12px;border:1px solid var(--background-modifier-border);font-size:var(--font-ui-smaller);line-height:22px;box-sizing:border-box;";
		if (!isBatchMode || !hasSelected) {
			daysInput.disabled = true;
			daysInput.style.cssText += disabledStyle;
		}
		daysInput.addEventListener("input", () => {
			this.savedDaysValue = daysInput.value;
		});
		autoCompleteRow.appendChild(daysInput);

		const daysLabel = document.createElement("span");
		daysLabel.textContent = "天";
		daysLabel.style.cssText =
			"font-size:var(--font-ui-smaller);color:var(--text-muted);line-height:22px;display:inline-flex;align-items:center;";
		if (!isBatchMode || !hasSelected) {
			daysLabel.style.cssText += disabledStyle;
		}
		autoCompleteRow.appendChild(daysLabel);

		subPanel1.appendChild(autoCompleteRow);

		// 恢复原文
		const clearBtn = subPanel1.createEl("button", {
			text: "恢复原文",
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

		// 保存编辑
		const saveBtn = subPanel1.createEl("button", {
			text: "保存编辑",
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
				text: "无编辑备份",
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
			text: "备份恢复",
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
			text: "清空备份",
			cls: "panel-btn",
		});
		if (!hasSnapshots) {
			clearSnapshotBtn.style.cssText += disabledStyle;
		}
		clearSnapshotBtn.addEventListener("click", () => {
			if (!hasSnapshots) return;
			if (confirm("确定清空所有编辑备份？")) {
				localStorage.removeItem("organizeSnapshots");
				this.store.getEditStore()?.syncToStore();
				clearSnapshotBtn.addClass("active");
				setTimeout(() => clearSnapshotBtn.removeClass("active"), 300);
			}
		});
	}
}
