// src/core/store/preset/base-task-edit.ts
// 编辑功能 Mixin — 编辑入口、模式切换、卡片状态、编辑上下文、全局点击

import { getEditContext, setEditContext } from "../../ui/main/card/card";
import { Panels } from "../../ui/panel/panel";
import {
	createEditBar,
	createPreviewRow,
	hasContentBeenEdited,
} from "../../util/edit-utils";
import { TaskTreeNode } from "../task/task-tree";
import { EditStore } from "./task-edit-store";
import { Op } from "./task-editor";

export class BaseTaskEdit {
	protected editStore!: EditStore;
	protected dataManager!: any;
	protected container!: HTMLElement;
	protected rightContentContainer: HTMLElement | null = null;

	private previouslyEditedUids: Set<string> = new Set();
	public _needsEditRefresh: boolean = false;

	// ========== 编辑入口 ==========

	protected handleEnterEdit(node: TaskTreeNode) {
		const es = this.editStore;
		const state = es.getState();

		if (
			state.editMode &&
			!state.batchMode &&
			state.selectedTasks.has(node.uid)
		)
			return;
		if (state.batchMode) return;

		const prevUids = Array.from(this.previouslyEditedUids);
		for (const prevUid of prevUids) {
			this.setCardReadMode(prevUid);
		}

		es.enterSingleEditMode(node);
		this.applyEditContext();
		this.setCardEditMode(node.uid);
		this.previouslyEditedUids = new Set([node.uid]);
	}

	public toggleBatchMode() {
		const es = this.editStore;
		const state = es.getState();

		if (state.batchMode) {
			const prevUids = Array.from(this.previouslyEditedUids);
			for (const prevUid of prevUids) {
				this.setCardReadMode(prevUid);
			}
			es.exitBatchToReading();
			this.applyEditContext();
			this.previouslyEditedUids.clear();
			this.refreshAllCardsForBatchMode();
		} else if (state.editMode) {
			const currentUid = state.selectedTasks.values().next().value;
			const node = currentUid
				? this.dataManager.getNodeByUid(currentUid)
				: undefined;
			if (node) {
				es.enterBatchModeFromSingle(node);
			} else {
				es.enterBatchMode();
			}
			this.applyEditContext();
			this.refreshAllCardsForBatchMode();
		} else {
			es.enterBatchMode();
			this.applyEditContext();
			this.previouslyEditedUids.clear();
			this.refreshAllCardsForBatchMode();
		}

		this.refreshEditPanel();
	}

	private refreshAllCardsForBatchMode() {
		const searchRoot = this.rightContentContainer || this.container;
		const cards = searchRoot.querySelectorAll(
			".task-item:not(.task-item-compact)",
		) as NodeListOf<HTMLElement>;

		const isBatchMode = this.editStore.getState().batchMode;

		cards.forEach((card) => {
			const uid = card.getAttribute("data-uid");
			if (!uid) return;

			if (isBatchMode) {
				if (card.querySelector("input[type='checkbox']")) return;

				const node = this.dataManager.getNodeByUid(uid);
				if (!node) return;

				const row1 = card.querySelector(
					":scope > div:first-child",
				) as HTMLElement;
				if (!row1) return;

				const checked = this.editStore
					.getState()
					.selectedTasks.has(uid);
				const cb = document.createElement("input");
				cb.type = "checkbox";
				cb.checked = checked;
				cb.style.cssText =
					"margin:0 2px 0 0;flex-shrink:0;cursor:pointer;width:12px;height:12px;";
				cb.addEventListener("click", (e) => e.stopPropagation());
				cb.addEventListener("change", () => {
					this.editStore.toggleSelection(node);
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				});
				row1.insertBefore(cb, row1.firstChild);
			} else {
				const cb = card.querySelector("input[type='checkbox']");
				if (cb) cb.remove();
			}
		});
	}

	public toggleSelectAll(nodes: TaskTreeNode[]) {
		const es = this.editStore;
		if (!es.getState().batchMode) return;

		const searchRoot = this.rightContentContainer || this.container;
		const cards = searchRoot.querySelectorAll(
			".task-item:not(.task-item-compact)",
		) as NodeListOf<HTMLElement>;

		let allSelected = true;
		cards.forEach((card) => {
			const cb = card.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;
			if (cb && !cb.checked) {
				allSelected = false;
			}
		});

		const visibleNodes: TaskTreeNode[] = [];
		cards.forEach((card) => {
			const uid = card.getAttribute("data-uid");
			if (uid) {
				const node = this.dataManager.getNodeByUid(uid);
				if (node) visibleNodes.push(node);
			}
		});

		const prevUids = Array.from(this.previouslyEditedUids);
		for (const prevUid of prevUids) {
			this.setCardBatchUnselected(prevUid);
		}
		es.getState().selectedTasks.clear();
		es.getState().previews.clear();
		es.getState().savedTasks.clear();

		if (!allSelected) {
			visibleNodes.forEach((node) => {
				es.getState().selectedTasks.add(node.uid);
				es.getState().previews.set(node.uid, node.rawLine || "");
				this.setCardEditMode(node.uid);
			});
		}

		cards.forEach((card) => {
			const uid = card.getAttribute("data-uid");
			const cb = card.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;
			if (cb && uid) {
				cb.checked = es.getState().selectedTasks.has(uid);
			}
		});

		this.previouslyEditedUids = new Set(es.getState().selectedTasks);
		es.syncToStore();
		this.applyEditContext();
		this.refreshEditPanel();
	}

	// ========== 编辑上下文 ==========

	protected applyEditContext() {
		const state = this.editStore.getState();
		if (state.editMode) {
			setEditContext({
				editMode: true,
				batchMode: state.batchMode,
				selectedTasks: state.selectedTasks,
				previews: state.previews,
				savedTasks: state.savedTasks,
				expandedButton: state.expandedButton,
				onEdit: (node, markKey, value) => {
					if (markKey.endsWith("_toggle")) {
						this.editStore.toggleExpandedButton(
							markKey.replace("_toggle", ""),
						);
					} else {
						const es = this.editStore;
						const st = es.getState();
						if (st.batchMode) {
							for (const uid of st.selectedTasks) {
								if (st.savedTasks.has(uid)) continue;
								const n = this.dataManager.getNodeByUid(uid);
								if (!n) continue;
								const preview =
									st.previews.get(uid) || n.rawLine || "";
								let newPreview = preview;
								switch (markKey) {
									case "status":
										newPreview = value
											? Op.setStatus(preview, value)
											: preview;
										break;
									case "priority":
										newPreview = value
											? Op.setPriority(preview, value)
											: Op.delPriority(preview);
										break;
									case "repeat":
										newPreview = value
											? Op.setRepeat(preview, value)
											: Op.delRepeat(preview);
										break;
									case "created":
										newPreview = value
											? Op.setCreated(preview, value)
											: Op.delCreated(preview);
										break;
									case "scheduled":
										newPreview = value
											? Op.setScheduled(preview, value)
											: Op.delScheduled(preview);
										break;
									case "starts":
										newPreview = value
											? Op.setStarts(preview, value)
											: Op.delStarts(preview);
										break;
									case "due":
										newPreview = value
											? Op.setDue(preview, value)
											: Op.delDue(preview);
										break;
									case "done":
										newPreview = value
											? Op.setDone(preview, value)
											: Op.delDone(preview);
										break;
									case "cancelled":
										newPreview = value
											? Op.setCancelled(preview, value)
											: Op.delCancelled(preview);
										break;
									case "tag":
										newPreview = value
											? Op.setTag(preview, value)
											: Op.delTag(preview);
										break;
									case "id":
										newPreview = value
											? Op.setId(preview, value)
											: Op.delId(preview);
										break;
									case "forbid":
										newPreview = value
											? Op.setForbid(preview, value)
											: Op.delForbid(preview);
										break;
								}
								if (newPreview !== preview) {
									newPreview = Op.sortTags(newPreview);
									st.previews.set(uid, newPreview);
								}
							}
							es.syncToStore();
						} else {
							es.applyEdit(markKey, value);
						}
					}
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				},
				onContentEdit: (node, newContent) => {
					this.editStore.applyContentEdit(node, newContent);
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				},
				onCheckChange: (node, checked) => {
					this.editStore.toggleSelection(node);
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				},
				onSave: (node) => {
					this.editStore.saveSingle(node);
				},
				onRevert: (node) => {
					this.editStore.revertSingle(node);
				},
				onRestore: (node) => {
					const st = this.editStore.getState();
					st.previews.set(node.uid, node.rawLine || "");
					this.editStore.syncToStore();
					this._needsEditRefresh = true;
					requestAnimationFrame(() => this.onEditStateChange());
				},
			});
		} else {
			setEditContext(null);
		}
	}

	protected onEditStateChange() {
		const state = this.editStore.getState();
		const currentUids = new Set(state.selectedTasks);

		if (!state.editMode) {
			requestAnimationFrame(() => {
				this.restoreEditedCards();
				this.previouslyEditedUids.clear();
			});
			return;
		}

		for (const uid of this.previouslyEditedUids) {
			if (!currentUids.has(uid)) {
				if (state.batchMode) {
					this.setCardBatchUnselected(uid);
				} else {
					this.setCardReadMode(uid);
				}
			}
		}

		for (const uid of currentUids) {
			if (!this.previouslyEditedUids.has(uid)) {
				this.setCardEditMode(uid);
			} else {
				requestAnimationFrame(() => {
					this.refreshCardEditContent(uid);
				});
			}
		}

		this.applyEditContext();
		this.previouslyEditedUids = new Set(currentUids);

		this.refreshEditPanel();
	}

	// ========== 卡片状态 ==========

	protected getEditSearchRoot(): HTMLElement {
		return this.rightContentContainer || this.container;
	}

	protected setCardEditMode(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;

		const node = this.dataManager.getNodeByUid(uid);
		if (!node) return;

		card.classList.add("task-item-editing");
		card.style.cursor = "default";
		this.refreshCardEditContent(uid);
	}

	protected setCardReadMode(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"].task-item-editing`,
		) as HTMLElement;
		if (!card) return;

		const node = this.dataManager.getNodeByUid(uid);
		if (!node) return;

		card.classList.remove("task-item-editing");
		card.style.cursor = "pointer";

		const checkbox = card.querySelector("input[type='checkbox']");
		if (checkbox) checkbox.remove();

		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			descEl.removeAttribute("contenteditable");
			descEl.removeAttribute("data-edit-bound");
			const newDescEl = descEl.cloneNode(true) as HTMLElement;
			newDescEl.style.cssText =
				"font-weight:500;flex:1;cursor:pointer;margin-bottom:4px;color:var(--text-normal);";
			descEl.parentNode?.replaceChild(newDescEl, descEl);
		}

		const previewRow = card.querySelector(
			".task-preview-row",
		) as HTMLElement;
		if (previewRow) {
			previewRow.innerHTML = "";
			previewRow.style.display = "none";
			previewRow.style.background = "";
		}

		const editBar = card.querySelector(".task-edit-bar") as HTMLElement;
		if (editBar && editBar.parentNode) {
			const newEditBar = createEditBar(node, {
				expandedButton: null,
				previewText: null,
				isEditing: false,
				onEdit: () => {},
			});
			try {
				editBar.parentNode.replaceChild(newEditBar, editBar);
			} catch (e) {
				// 忽略
			}
		}
	}

	protected setCardBatchUnselected(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;

		const node = this.dataManager.getNodeByUid(uid);
		if (!node) return;

		card.classList.remove("task-item-editing");
		card.style.cursor = "pointer";

		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			descEl.removeAttribute("contenteditable");
			descEl.removeAttribute("data-edit-bound");
			const newDescEl = descEl.cloneNode(true) as HTMLElement;
			newDescEl.style.cssText =
				"font-weight:500;flex:1;cursor:pointer;margin-bottom:4px;color:var(--text-normal);";
			descEl.parentNode?.replaceChild(newDescEl, descEl);
		}

		const previewRow = card.querySelector(
			".task-preview-row",
		) as HTMLElement;
		if (previewRow) {
			previewRow.innerHTML = "";
			previewRow.style.display = "none";
			previewRow.style.background = "";
		}

		const editBar = card.querySelector(".task-edit-bar") as HTMLElement;
		if (editBar && editBar.parentNode) {
			const newEditBar = createEditBar(node, {
				expandedButton: null,
				previewText: null,
				isEditing: false,
				onEdit: () => {},
			});
			try {
				editBar.parentNode.replaceChild(newEditBar, editBar);
			} catch (e) {
				// 忽略
			}
		}

		const checkbox = card.querySelector(
			"input[type='checkbox']",
		) as HTMLInputElement;
		if (checkbox) {
			checkbox.checked = false;
		}
	}

	protected refreshCardEditContent(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"].task-item-editing`,
		) as HTMLElement;
		if (!card) return;

		const node = this.dataManager.getNodeByUid(uid);
		if (!node) return;

		const editCtx = getEditContext();
		if (!editCtx) return;

		const previewText = editCtx.previews.get(uid);
		const hasContentEdit =
			previewText !== null &&
			hasContentBeenEdited(node.rawLine, previewText);
		const saved = editCtx.savedTasks.has(node.uid);

		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			descEl.style.color = hasContentEdit
				? "var(--text-accent)"
				: "var(--text-normal)";
			descEl.style.setProperty("cursor", "text", "important");

			if (!descEl.hasAttribute("data-edit-bound")) {
				descEl.setAttribute("data-edit-bound", "true");
				descEl.addEventListener("click", (e) => {
					e.stopPropagation();
					if (descEl.getAttribute("contenteditable") === "true")
						return;
					descEl.setAttribute("contenteditable", "true");
					descEl.textContent = node.content || node.text || "";
					descEl.focus();
					const range = document.createRange();
					range.selectNodeContents(descEl);
					const sel = window.getSelection();
					sel?.removeAllRanges();
					sel?.addRange(range);
					const onBlur = () => {
						descEl.removeAttribute("contenteditable");
						const newContent = descEl.textContent?.trim();
						const ctx = getEditContext();
						if (
							newContent &&
							ctx &&
							newContent !== (node.content || node.text)
						) {
							ctx.onContentEdit(node, newContent);
						}
						descEl.removeEventListener("blur", onBlur);
					};
					descEl.addEventListener("blur", onBlur);
					const onKeyDown = (ke: KeyboardEvent) => {
						if (ke.key === "Enter" && !ke.shiftKey) {
							ke.preventDefault();
							descEl.blur();
						}
						if (ke.key === "Escape") {
							descEl.textContent = node.content || node.text;
							descEl.blur();
						}
					};
					descEl.addEventListener("keydown", onKeyDown);
					descEl.addEventListener(
						"blur",
						() => {
							descEl.removeEventListener("keydown", onKeyDown);
						},
						{ once: true },
					);
				});
			}
		}

		let editBar = card.querySelector(".task-edit-bar") as HTMLElement;
		const newEditBar = createEditBar(node, {
			expandedButton: editCtx.expandedButton,
			previewText: previewText ?? null,
			isEditing: true,
			onEdit: (n, markKey, value) => {
				const ctx = getEditContext();
				if (!ctx) return;
				if (markKey.endsWith("_toggle")) {
					ctx.onEdit(n, markKey, null);
				} else {
					ctx.onEdit(n, markKey, value);
				}
			},
		});

		if (editBar) {
			try {
				editBar.parentNode!.replaceChild(newEditBar, editBar);
			} catch (e) {
				// 忽略
			}
		} else {
			card.appendChild(newEditBar);
		}

		let previewRow = card.querySelector(".task-preview-row") as HTMLElement;
		if (previewText) {
			const newPreviewRow = createPreviewRow(
				previewText,
				saved,
				saved ? null : () => editCtx.onSave(node),
				saved ? () => editCtx.onRevert(node) : null,
				hasContentEdit,
				hasContentEdit && editCtx.onRestore
					? () => editCtx.onRestore!(node)
					: null,
			);
			if (previewRow) {
				try {
					previewRow.parentNode!.replaceChild(
						newPreviewRow,
						previewRow,
					);
				} catch (e) {
					// 忽略
				}
			} else {
				card.appendChild(newPreviewRow);
			}
		} else {
			if (!previewRow) {
				previewRow = document.createElement("div");
				previewRow.className = "task-preview-row";
				previewRow.style.display = "none";
				card.appendChild(previewRow);
			} else {
				previewRow.innerHTML = "";
				previewRow.style.display = "none";
				previewRow.style.background = "";
			}
		}
	}

	protected restoreEditedCards() {
		const searchRoot = this.getEditSearchRoot();
		const uids = Array.from(this.previouslyEditedUids);
		for (const uid of uids) {
			this.setCardReadMode(uid);
		}
	}

	protected refreshEditPanel() {
		requestAnimationFrame(() => {
			const panels = Panels.getInstance();
			const editPanel = panels.getEditPanel();
			if (editPanel) {
				editPanel.render();
			}
		});
	}

	// ========== 全局点击 ==========

	protected onGlobalClick = (e: MouseEvent) => {
		const target = e.target as HTMLElement;
		const es = this.editStore;
		const state = es.getState();
		const isEditMode = state.editMode;
		const isBatchMode = state.batchMode;

		if (!isEditMode) return;

		if (
			target.closest(".task-edit-bar") ||
			target.closest(".task-preview-row") ||
			target.getAttribute("contenteditable") === "true"
		)
			return;

		if (target.closest(".manage-sidebar")) {
			if (
				target.closest(".side-top-row") ||
				target.closest("[title*='折叠']") ||
				target.closest("[title*='展开']")
			)
				return;
		}

		if (target.closest(".panel-host")) {
			if (isBatchMode) {
				if (target.closest("[data-panel-key='edit']")) {
					if (target.closest(".edit-batch-btn")) {
						const prevUids = Array.from(this.previouslyEditedUids);
						for (const prevUid of prevUids) {
							this.setCardReadMode(prevUid);
						}
						es.exitBatchToReading();
						this.applyEditContext();
						this.previouslyEditedUids.clear();
						this.refreshAllCardsForBatchMode();
						this.refreshEditPanel();
						return;
					}
					return;
				}
				const prevUids = Array.from(this.previouslyEditedUids);
				for (const prevUid of prevUids) {
					this.setCardReadMode(prevUid);
				}
				es.exitBatchToReading();
				this.applyEditContext();
				this.previouslyEditedUids.clear();
				this.refreshAllCardsForBatchMode();
				this.refreshEditPanel();
				return;
			} else {
				const prevUids = Array.from(this.previouslyEditedUids);
				for (const prevUid of prevUids) {
					this.setCardReadMode(prevUid);
				}
				es.exitEditMode(false);
				requestAnimationFrame(() => this.onEditStateChange());
				return;
			}
		}

		if (target.closest(".manage-sidebar")) {
			const prevUids = Array.from(this.previouslyEditedUids);
			for (const prevUid of prevUids) {
				this.setCardReadMode(prevUid);
			}
			if (isBatchMode) {
				es.exitBatchToReading();
				this.applyEditContext();
				this.previouslyEditedUids.clear();
				this.refreshAllCardsForBatchMode();
				this.refreshEditPanel();
			} else {
				es.exitEditMode(false);
				requestAnimationFrame(() => this.onEditStateChange());
			}
			return;
		}

		const editTaskItem = target.closest(".task-item") as HTMLElement;
		if (
			editTaskItem &&
			!editTaskItem.classList.contains("task-item-compact")
		) {
			const uid = editTaskItem.getAttribute("data-uid");
			if (!uid) return;

			const node = this.dataManager.getNodeByUid(uid);
			if (!node) return;

			if (isBatchMode) {
				es.toggleSelection(node);
				this._needsEditRefresh = true;
				requestAnimationFrame(() => this.onEditStateChange());
				return;
			} else {
				if (state.selectedTasks.has(uid)) return;

				const prevUids = Array.from(this.previouslyEditedUids);
				for (const prevUid of prevUids) {
					this.setCardReadMode(prevUid);
				}
				es.enterSingleEditMode(node);
				this.applyEditContext();
				this.setCardEditMode(uid);
				this.previouslyEditedUids = new Set([uid]);
				return;
			}
		}

		const prevUids = Array.from(this.previouslyEditedUids);
		for (const prevUid of prevUids) {
			this.setCardReadMode(prevUid);
		}
		if (isBatchMode) {
			es.exitBatchToReading();
			this.applyEditContext();
			this.previouslyEditedUids.clear();
			this.refreshAllCardsForBatchMode();
			this.refreshEditPanel();
		} else {
			es.exitEditMode(false);
			requestAnimationFrame(() => this.onEditStateChange());
		}
	};
}
