// src/ui/panel/edit-panel.ts
// 编辑面板 — 直接持有 EditStore 和 TaskView 引用

import { Store } from "../../core/store/store";

export class EditPanel {
	private container: HTMLElement;
	private store: Store;
	private savedDaysValue: string = "0";
	private editStore: any;
	private taskView: any;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.editStore = store.getEditStore();
		this.taskView = store.getTaskView();
		this.render();

		if (this.editStore) {
			this.editStore.subscribePanel(() => this.render());
		}
	}

	destroy() {}

	private refreshRefs() {
		this.editStore = this.store.getEditStore();
		this.taskView = this.store.getTaskView();
	}

	render() {
		this.refreshRefs();
		const es = this.editStore;
		const isBatchMode = es ? es.getState().batchMode : false;
		const selectedCount = es ? es.getState().selectedTasks.size : 0;
		const hasSelected = selectedCount > 0;
		const allSelected = hasSelected;
		const isSyncMode = es ? es.getState().syncMode : false;

		let snapshots: any[] = [];
		try {
			snapshots = es ? es.getSnapshots() : [];
		} catch (e) {}
		const hasSnapshots = snapshots.length > 0;

		const disabledStyle = "opacity: 0.5; cursor: not-allowed;";

		this.container.empty();

		// ========== 行1：批量编辑 ==========
		const row1 = this.container.createDiv({ cls: "panel-row" });
		row1.addClass("task-flex-wrap", "task-gap-1", "task-mb-1");
		row1.createSpan({ text: "批量编辑", cls: "panel-label" });

		const batchBtn = row1.createEl("button", {
			text: "批量编辑",
			cls: "panel-btn edit-batch-btn",
		});
		if (isBatchMode) batchBtn.addClass("active");
		batchBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.taskView?.toggleBatchMode();
		});

		const subPanel1 = row1.createDiv({ cls: "panel-sub" });
		subPanel1.addClass(
			"task-flex",
			"task-flex-wrap",
			"task-gap-1",
			"task-ml-2",
			"task-items-center",
		);

		const syncBtn = subPanel1.createEl("button", {
			text: "同步模式",
			cls: "panel-btn sub-btn",
			title: "开启后，编辑操作将同步到所有勾选任务",
		});
		if (!isBatchMode) syncBtn.style.cssText += disabledStyle;
		if (isSyncMode) syncBtn.addClass("active");
		syncBtn.addEventListener("click", () => {
			if (!isBatchMode) return;
			es?.toggleSyncMode();
			syncBtn.toggleClass("active", es?.getState().syncMode ?? false);
			this.taskView?.refreshEditCards?.();
		});

		const selectAllBtn = subPanel1.createEl("button", {
			text: allSelected && isBatchMode ? "全不选" : "全选",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode) selectAllBtn.style.cssText += disabledStyle;
		selectAllBtn.addEventListener("click", () => {
			if (!isBatchMode) return;
			this.taskView?.toggleSelectAll([]);
		});

		const sortBtn = subPanel1.createEl("button", {
			text: "标记排序",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected)
			sortBtn.style.cssText += disabledStyle;
		sortBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			es?.applySortTags();
			sortBtn.addClass("active");
			setTimeout(() => sortBtn.removeClass("active"), 300);
		});

		const autoCompleteRow = subPanel1.createDiv();
		autoCompleteRow.addClass(
			"task-inline-flex",
			"task-items-center",
			"task-gap-1",
		);

		const autoCompleteBtn = document.createElement("button");
		autoCompleteBtn.textContent = "补全时间";
		autoCompleteBtn.className = "panel-btn sub-btn";
		if (!isBatchMode || !hasSelected)
			autoCompleteBtn.style.cssText += disabledStyle;
		autoCompleteBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			const rawValue = daysInput.value.trim();
			const days =
				rawValue === "" ? undefined : parseInt(rawValue, 10) || 0;
			es?.applyAutoComplete(days);
			autoCompleteBtn.addClass("active");
			setTimeout(() => autoCompleteBtn.removeClass("active"), 300);
		});
		autoCompleteRow.appendChild(autoCompleteBtn);

		const daysInput = document.createElement("input");
		daysInput.type = "number";
		daysInput.value = this.savedDaysValue;
		daysInput.min = "0";
		daysInput.addClass(
			"task-w-12",
			"task-h-5",
			"task-text-center",
			"task-px-1",
			"task-py-0",
			"task-rounded-full",
			"task-border",
			"task-text-smaller",
			"task-leading-normal",
			"task-box-border",
		);
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
		daysLabel.addClass(
			"task-text-smaller",
			"task-text-muted",
			"task-leading-normal",
			"task-inline-flex",
			"task-items-center",
		);
		if (!isBatchMode || !hasSelected)
			daysLabel.style.cssText += disabledStyle;
		autoCompleteRow.appendChild(daysLabel);
		subPanel1.appendChild(autoCompleteRow);

		const clearBtn = subPanel1.createEl("button", {
			text: "恢复原文",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected)
			clearBtn.style.cssText += disabledStyle;
		clearBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			es?.clearPreviews();
			clearBtn.addClass("active");
			setTimeout(() => clearBtn.removeClass("active"), 300);
		});

		const saveBtn = subPanel1.createEl("button", {
			text: "保存编辑",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected)
			saveBtn.style.cssText += disabledStyle;
		saveBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			es?.saveCurrent();
			saveBtn.addClass("active");
			setTimeout(() => saveBtn.removeClass("active"), 300);
		});

		// ========== 行2：批量撤回 ==========
		const row2 = this.container.createDiv({ cls: "panel-row" });
		row2.addClass("task-flex-wrap", "task-gap-1");
		row2.createSpan({ text: "批量撤回", cls: "panel-label" });

		const snapshotSelect = row2.createEl("select");
		snapshotSelect.className = "panel-btn";
		snapshotSelect.addClass(
			"task-max-w-55",
			"task-h-auto",
			"task-min-h-unset",
			"task-appearance-none",
		);
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
		if (!hasSnapshots) revertBtn.style.cssText += disabledStyle;
		revertBtn.addEventListener("click", () => {
			if (!hasSnapshots) return;
			const idx = parseInt(snapshotSelect.value, 10);
			if (!isNaN(idx)) {
				es?.revertSnapshot(idx);
				revertBtn.addClass("active");
				setTimeout(() => revertBtn.removeClass("active"), 300);
			}
		});

		const clearSnapshotBtn = row2.createEl("button", {
			text: "清空备份",
			cls: "panel-btn",
		});
		if (!hasSnapshots) clearSnapshotBtn.style.cssText += disabledStyle;
		clearSnapshotBtn.addEventListener("click", () => {
			if (!hasSnapshots) return;
			es?.clearAllSnapshots();
			clearSnapshotBtn.addClass("active");
			setTimeout(() => clearSnapshotBtn.removeClass("active"), 300);
			this.render();
		});
	}
}
