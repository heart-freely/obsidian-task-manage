// src/ui/panel/edit-panel.ts

import { Store } from "../../core/store/store";
import { EditStoreLike, TaskViewLike } from "../../type/type";
import { createEl } from "../../util/dom-utils";

interface SnapshotItem {
	time: string;
	snapshot: Record<string, string>;
}

export class EditPanel {
	private container: HTMLElement;
	private store: Store;
	private savedDaysValue = "0";
	private editStore: EditStoreLike | null = null;
	private taskView: TaskViewLike | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.editStore = store.getEditStore();
		this.taskView = store.getTaskView();
		this.render();

		const es = store.getEditStore();
		if (es && typeof es.subscribePanel === "function") {
			es.subscribePanel(() => this.render());
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
		const tv = this.taskView;
		const isBatchMode = es?.getState?.()?.batchMode ?? false;
		const state = es?.getState?.();
		const selectedCount = state?.selectedTasks?.size ?? 0;
		const hasSelected = selectedCount > 0;
		const isSyncMode = state?.syncMode ?? false;
		let snapshots: SnapshotItem[] = [];
		try {
			snapshots = es?.getSnapshots?.() ?? [];
		} catch {
			snapshots = [];
		}
		const hasSnapshots = snapshots.length > 0;
		const ds = "opacity: 0.5; cursor: not-allowed;";
		this.container.empty();

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
			tv?.toggleBatchMode?.();
		});

		const sub = row1.createDiv({ cls: "panel-sub" });
		sub.addClass(
			"task-flex",
			"task-flex-wrap",
			"task-gap-1",
			"task-ml-2",
			"task-items-center",
		);
		const syncBtn = sub.createEl("button", {
			text: "同步模式",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode) syncBtn.style.cssText += ds;
		if (isSyncMode) syncBtn.addClass("active");
		syncBtn.addEventListener("click", () => {
			if (!isBatchMode) return;
			es?.toggleSyncMode?.();
			syncBtn.toggleClass("active", es?.getState?.()?.syncMode ?? false);
			tv?.refreshEditCards?.();
		});
		const selBtn = sub.createEl("button", {
			text: hasSelected && isBatchMode ? "全不选" : "全选",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode) selBtn.style.cssText += ds;
		selBtn.addEventListener("click", () => {
			if (!isBatchMode) return;
			tv?.toggleSelectAll?.([]);
		});
		const srtBtn = sub.createEl("button", {
			text: "标记排序",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected) srtBtn.style.cssText += ds;
		srtBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			es?.applySortTags?.();
			srtBtn.addClass("active");
			window.setTimeout(() => srtBtn.removeClass("active"), 300);
		});

		const acRow = sub.createDiv();
		acRow.addClass("task-inline-flex", "task-items-center", "task-gap-1");
		const acBtn = createEl("button");
		acBtn.textContent = "补全时间";
		acBtn.className = "panel-btn sub-btn";
		if (!isBatchMode || !hasSelected) acBtn.style.cssText += ds;
		acBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			const days =
				daysInput.value.trim() === ""
					? undefined
					: parseInt(daysInput.value, 10) || 0;
			es?.applyAutoComplete?.(days);
			acBtn.addClass("active");
			window.setTimeout(() => acBtn.removeClass("active"), 300);
		});
		acRow.appendChild(acBtn);

		const daysInput = createEl(
			"input",
			{
				type: "number",
			},
			(el) => {
				el.value = this.savedDaysValue;
				el.min = "0";
				el.addClass(
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
					el.disabled = true;
					el.style.cssText += ds;
				}
				el.addEventListener("input", () => {
					this.savedDaysValue = el.value;
				});
			},
		);
		acRow.appendChild(daysInput);
		const daysLabel = createEl("span");
		daysLabel.textContent = "天";
		daysLabel.addClass(
			"task-text-smaller",
			"task-text-muted",
			"task-leading-normal",
			"task-inline-flex",
			"task-items-center",
		);
		if (!isBatchMode || !hasSelected) daysLabel.style.cssText += ds;
		acRow.appendChild(daysLabel);
		sub.appendChild(acRow);

		const clrBtn = sub.createEl("button", {
			text: "恢复原文",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected) clrBtn.style.cssText += ds;
		clrBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			es?.clearPreviews?.();
			clrBtn.addClass("active");
			window.setTimeout(() => clrBtn.removeClass("active"), 300);
		});
		const savBtn = sub.createEl("button", {
			text: "保存编辑",
			cls: "panel-btn sub-btn",
		});
		if (!isBatchMode || !hasSelected) savBtn.style.cssText += ds;
		savBtn.addEventListener("click", () => {
			if (!isBatchMode || !hasSelected) return;
			es?.saveCurrent?.();
			savBtn.addClass("active");
			window.setTimeout(() => savBtn.removeClass("active"), 300);
		});

		const row2 = this.container.createDiv({ cls: "panel-row" });
		row2.addClass("task-flex-wrap", "task-gap-1");
		row2.createSpan({ text: "批量撤回", cls: "panel-label" });

		const ss = createEl(
			"select",
			{
				cls: "panel-btn",
			},
			(el) => {
				el.addClass(
					"task-max-w-55",
					"task-h-auto",
					"task-min-h-unset",
					"task-appearance-none",
				);
				if (!hasSnapshots) {
					el.createEl("option", {
						text: "无编辑备份",
						disabled: true,
					});
				} else {
					snapshots.forEach((snap, i) => {
						const opt = el.createEl("option", {
							text: `${snap.time} (${Object.keys(snap.snapshot).length}个)`,
							value: String(i),
						});
						if (i === 0) opt.selected = true;
					});
				}
			},
		);
		row2.appendChild(ss);

		const revBtn = row2.createEl("button", {
			text: "备份恢复",
			cls: "panel-btn",
		});
		if (!hasSnapshots) revBtn.style.cssText += ds;
		revBtn.addEventListener("click", () => {
			if (!hasSnapshots) return;
			const idx = parseInt(ss.value, 10);
			if (!isNaN(idx)) {
				es?.revertSnapshot?.(idx);
				revBtn.addClass("active");
				window.setTimeout(() => revBtn.removeClass("active"), 300);
			}
		});
		const clsSnapBtn = row2.createEl("button", {
			text: "清空备份",
			cls: "panel-btn",
		});
		if (!hasSnapshots) clsSnapBtn.style.cssText += ds;
		clsSnapBtn.addEventListener("click", () => {
			if (!hasSnapshots) return;
			es?.clearAllSnapshots?.();
			clsSnapBtn.addClass("active");
			window.setTimeout(() => clsSnapBtn.removeClass("active"), 300);
			this.render();
		});
	}
}
