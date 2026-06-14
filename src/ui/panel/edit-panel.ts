// src/ui/panel/edit-panel.ts
// src/ui/panel/edit-panel.ts
// 编辑面板 — 视图配置面板中的批量编辑按钮

import { Store } from "../../core/store/store";

export class EditPanel {
	private container: HTMLElement;
	private store: Store;
	private unsubEdit: (() => void) | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.render();

		// 重试订阅 EditStore，直到成功
		const trySubscribe = () => {
			const es = this.store.getEditStore();
			console.log("[DEBUG] EditPanel.trySubscribe", {
				hasEditStore: !!es,
			});
			if (es) {
				this.unsubEdit = es.subscribePanel(() => {
					console.log("[DEBUG] EditPanel notifyPanel 触发");
					this.render();
				});
				console.log("[DEBUG] EditPanel 订阅成功");
			} else {
				setTimeout(trySubscribe, 50);
			}
		};
		setTimeout(trySubscribe, 50);
	}

	destroy() {
		if (this.unsubEdit) {
			this.unsubEdit();
			this.unsubEdit = null;
		}
	}

	render() {
		this.container.empty();
		const editPanelState = this.store.getState().editPanelState;
		const isBatchMode = editPanelState?.batchMode ?? false;
		const selectedCount = editPanelState?.selectedCount ?? 0;
		const allSelected = selectedCount > 0;
		const snapshots = this.store.getSnapshots();
		const hasSnapshots = snapshots.length > 0;

		const row1 = this.container.createDiv({ cls: "panel-row" });
		row1.style.cssText = "flex-wrap:wrap;gap:6px;margin-bottom:4px;";
		row1.createSpan({ text: "批量编辑", cls: "panel-label" });

		const batchBtn = row1.createEl("button", {
			text: isBatchMode ? "取消批量" : "批量编辑",
			cls: "panel-btn",
		});
		if (isBatchMode) batchBtn.addClass("active");
		batchBtn.addEventListener("click", () => {
			this.store.toggleBatchMode();
		});

		const subPanel1 = row1.createDiv({ cls: "panel-sub" });
		subPanel1.style.cssText =
			"display:flex;flex-wrap:wrap;gap:6px;margin-left:8px;";

		const selectAllBtn = subPanel1.createEl("button", {
			text: allSelected && isBatchMode ? "全不选" : "全选",
			cls: "panel-btn sub-btn",
		});
		if (allSelected && isBatchMode) selectAllBtn.addClass("active");
		selectAllBtn.addEventListener("click", () => {
			if (isBatchMode) this.store.toggleSelectAll([]);
		});

		const daysInput = subPanel1.createEl("input", {
			type: "number",
			value: "0",
			attr: { min: "0" },
		});
		daysInput.style.cssText =
			"width:48px;text-align:center;padding:3px 4px;border-radius:8px;border:1px solid var(--background-modifier-border);font-size:12px;";
		const daysLabel = subPanel1.createSpan({ text: "天" });
		daysLabel.style.cssText = "font-size:12px;color:var(--text-muted);";

		const autoCompleteBtn = subPanel1.createEl("button", {
			text: "补全时间",
			cls: "panel-btn sub-btn",
		});
		autoCompleteBtn.addEventListener("click", () => {
			if (isBatchMode) {
				const days = parseInt(daysInput.value, 10) || 0;
				this.store.applyAutoComplete(days);
				autoCompleteBtn.addClass("active");
				setTimeout(() => autoCompleteBtn.removeClass("active"), 300);
			}
		});

		const clearBtn = subPanel1.createEl("button", {
			text: "清空预览",
			cls: "panel-btn sub-btn",
		});
		clearBtn.addEventListener("click", () => {
			if (isBatchMode) {
				this.store.clearPreviews();
				clearBtn.addClass("active");
				setTimeout(() => clearBtn.removeClass("active"), 300);
			}
		});

		const saveBtn = subPanel1.createEl("button", {
			text: "保存修改",
			cls: "panel-btn sub-btn",
		});
		saveBtn.addEventListener("click", () => {
			if (isBatchMode) {
				this.store.saveCurrent();
				saveBtn.addClass("active");
				setTimeout(() => saveBtn.removeClass("active"), 300);
			}
		});

		const row2 = this.container.createDiv({ cls: "panel-row" });
		row2.style.cssText = "flex-wrap:wrap;gap:6px;";
		row2.createSpan({ text: "批量撤回", cls: "panel-label" });

		const snapshotSelect = row2.createEl("select");
		snapshotSelect.style.cssText =
			"padding:3px 6px;border-radius:16px;border:none;background:var(--interactive-normal);color:var(--text-normal);font-size:var(--font-ui-small);line-height:var(--line-height-normal);cursor:pointer;max-width:220px;";
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
			revertBtn.style.opacity = "0.5";
			revertBtn.style.cursor = "not-allowed";
		}
		revertBtn.addEventListener("click", () => {
			if (hasSnapshots) {
				const idx = parseInt(snapshotSelect.value, 10);
				if (!isNaN(idx)) {
					this.store.revertSnapshot(idx);
					revertBtn.addClass("active");
					setTimeout(() => revertBtn.removeClass("active"), 300);
				}
			}
		});

		const clearSnapshotBtn = row2.createEl("button", {
			text: "清空历史",
			cls: "panel-btn",
		});
		if (!hasSnapshots) {
			clearSnapshotBtn.style.opacity = "0.5";
			clearSnapshotBtn.style.cursor = "not-allowed";
		}
		clearSnapshotBtn.addEventListener("click", () => {
			if (hasSnapshots && confirm("确定清空所有历史原文？")) {
				localStorage.removeItem("organizeSnapshots");
				clearSnapshotBtn.addClass("active");
				setTimeout(() => clearSnapshotBtn.removeClass("active"), 300);
			}
		});
	}
}
