// src/core/edit/base-task-edit.ts

import { getEditContext, setEditContext } from "../../ui/main/card/card";
import { Panels } from "../../ui/panel/panel";
import { createEl } from "../../util/dom-utils";
import {
	createEditBar,
	createPreviewRow,
	hasContentBeenEdited,
} from "../../util/edit-utils";
import { flattenTree, TaskTreeNode } from "../task/task-tree";
import { EditStore } from "./task-edit-store";

interface DataManagerLike {
	getNodeByUid(uid: string): TaskTreeNode | undefined;
	getFullTree(): TaskTreeNode;
	invalidate(): void;
	loadData(
		app: unknown,
	): Promise<{ nodes: TaskTreeNode[]; fullTree: TaskTreeNode }>;
}

interface AppLike {
	vault: {
		getAbstractFileByPath(path: string): { path: string } | null;
		cachedRead(file: { path: string }): Promise<string>;
	};
}

export class BaseTaskEdit {
	protected editStore!: EditStore;
	protected dataManager!: DataManagerLike;
	protected container!: HTMLElement;
	protected rightContentContainer: HTMLElement | null = null;
	protected app!: AppLike;
	public previouslyEditedUids: Set<string> = new Set();
	public _needsEditRefresh: boolean = false;
	private _lastSyncMode: boolean = false;

	protected handleEnterEdit(node: TaskTreeNode) {
		if (node.type !== "list") return;
		const es = this.editStore;
		const state = es.getState();
		if (
			state.editMode &&
			!state.batchMode &&
			state.selectedTasks.has(node.uid)
		)
			return;
		if (state.batchMode) return;
		for (const prevUid of Array.from(this.previouslyEditedUids))
			this.setCardReadMode(prevUid);
		es.enterSingleEditMode(node);
		this.applyEditContext();
		this.setCardEditMode(node.uid);
		this.previouslyEditedUids = new Set([node.uid]);
	}

	public toggleBatchMode() {
		const es = this.editStore;
		const state = es.getState();
		if (state.batchMode) {
			for (const prevUid of Array.from(this.previouslyEditedUids))
				this.setCardReadMode(prevUid);
			es.exitBatchToReading();
			this.applyEditContext();
			this.previouslyEditedUids.clear();
			this.refreshAllCardsForBatchMode();
		} else if (state.editMode) {
			const currentUid = state.selectedTasks.values().next().value;
			const node = currentUid
				? this.dataManager.getNodeByUid(currentUid)
				: undefined;
			node ? es.enterBatchModeFromSingle(node) : es.enterBatchMode();
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
				if (!node || node.type !== "list") return;
				const row1 = card.querySelector(
					":scope > div:first-child",
				) as HTMLElement;
				if (!row1) return;
				const checked = this.editStore
					.getState()
					.selectedTasks.has(uid);
				const cb = createEl("input");
				cb.type = "checkbox";
				cb.checked = checked;
				cb.className = "edit-checkbox";
				cb.addClass("task-flex-shrink-0", "task-clickable");
				cb.addEventListener("click", (e) => e.stopPropagation());
				cb.addEventListener("change", () => {
					this.editStore.toggleSelection(node);
					this._needsEditRefresh = true;
					window.requestAnimationFrame(() =>
						this.onEditStateChange(),
					);
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
		const visibleNodes: TaskTreeNode[] = [];
		cards.forEach((card) => {
			const uid = card.getAttribute("data-uid");
			if (uid) {
				const node = this.dataManager.getNodeByUid(uid);
				if (node && node.type === "list") visibleNodes.push(node);
			}
		});
		let allSelected = visibleNodes.length > 0;
		visibleNodes.forEach((n) => {
			if (!es.getState().selectedTasks.has(n.uid)) allSelected = false;
		});
		for (const prevUid of Array.from(this.previouslyEditedUids))
			this.setCardBatchUnselected(prevUid);
		es.getState().selectedTasks.clear();
		es.getState().previews.clear();
		es.getState().savedTasks.clear();
		if (!allSelected) {
			visibleNodes.forEach((n) => {
				es.getState().selectedTasks.add(n.uid);
				es.getState().previews.set(n.uid, n.rawLine || "");
				this.setCardEditMode(n.uid);
			});
		}
		cards.forEach((card) => {
			const uid = card.getAttribute("data-uid");
			const cb = card.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;
			if (cb && uid) cb.checked = es.getState().selectedTasks.has(uid);
		});
		this.previouslyEditedUids = new Set(es.getState().selectedTasks);
		es.syncToStore();
		this.applyEditContext();
		this.refreshEditPanel();
	}

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
				syncMode: state.syncMode,
				primaryTaskUid: state.primaryTaskUid,
				onEdit: (node, markKey, value) => {
					if (markKey.endsWith("_toggle"))
						this.editStore.toggleExpandedButton(
							markKey.replace("_toggle", ""),
						);
					else this.editStore.applyEdit(markKey, value, node.uid);
					this._needsEditRefresh = true;
					window.requestAnimationFrame(() =>
						this.onEditStateChange(),
					);
				},
				onContentEdit: (node, newContent) => {
					this.editStore.applyContentEdit(node, newContent);
					this._needsEditRefresh = true;
					window.requestAnimationFrame(() =>
						this.onEditStateChange(),
					);
				},
				onCheckChange: (node, checked) => {
					this.editStore.toggleSelection(node);
					this._needsEditRefresh = true;
					window.requestAnimationFrame(() =>
						this.onEditStateChange(),
					);
				},
				onSave: (node) => {
					void (async () => {
						await this.editStore.saveSingle(node);
						this.editStore.exitEditMode(false);
						this.applyEditContext();
						this.previouslyEditedUids.clear();
						this.dataManager.invalidate();
						await this.dataManager.loadData(this.app);
						const self = this as unknown as {
							selectedTreeNode?: TaskTreeNode;
							focusedTreeNode?: TaskTreeNode;
							findNodeByUidInTree?: (
								r: TaskTreeNode,
								u: string,
							) => TaskTreeNode | null;
							render(): Promise<void>;
						};
						if (self.selectedTreeNode) {
							const nt = this.dataManager.getFullTree();
							const nf = self.findNodeByUidInTree?.(
								nt,
								self.selectedTreeNode.uid,
							);
							if (nf) {
								self.selectedTreeNode = nf;
								self.focusedTreeNode = nf;
							}
						}
						await self.render();
					})();
				},
				onRevert: (node) => {
					void this.editStore.revertSingle(node);
					this.setCardReadMode(node.uid);
					this.previouslyEditedUids.delete(node.uid);
					this.editStore.getState().savedTasks.delete(node.uid);
					this.editStore.getState().selectedTasks.delete(node.uid);
					this.editStore.getState().previews.delete(node.uid);
					this.editStore.syncToStore();
				},
				onRestore: (node) => {
					const st = this.editStore.getState();
					st.previews.set(node.uid, node.rawLine || "");
					this.editStore.syncToStore();
					this._needsEditRefresh = true;
					window.requestAnimationFrame(() =>
						this.onEditStateChange(),
					);
				},
				getIdOptions: () => {
					const r: Array<{ id: string; desc: string }> = [];
					const ft = this.dataManager.getFullTree();
					const an = flattenTree(ft);
					const sn = new Set<string>();
					for (const tn of an) {
						if (tn.id && !sn.has(tn.id)) {
							sn.add(tn.id);
							r.push({
								id: tn.id,
								desc: tn.content || tn.text || "",
							});
						}
					}
					return r;
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
			this._lastSyncMode = false;
			this.applyEditContext();
			window.requestAnimationFrame(() => {
				this.restoreEditedCards();
				this.previouslyEditedUids.clear();
			});
			return;
		}
		if (state.syncMode !== this._lastSyncMode) {
			this._lastSyncMode = state.syncMode;
			this.applyEditContext();
			for (const uid of state.selectedTasks)
				this.refreshCardEditContent(uid);
			return;
		}
		for (const uid of this.previouslyEditedUids) {
			if (!currentUids.has(uid))
				state.batchMode
					? this.setCardBatchUnselected(uid)
					: this.setCardReadMode(uid);
		}
		for (const uid of currentUids) {
			if (!this.previouslyEditedUids.has(uid)) this.setCardEditMode(uid);
			else
				window.requestAnimationFrame(() =>
					this.refreshCardEditContent(uid),
				);
		}
		this.applyEditContext();
		this.previouslyEditedUids = new Set(currentUids);
		this.refreshEditPanel();
	}

	refreshEditCards() {
		this._needsEditRefresh = true;
		window.requestAnimationFrame(() => this.onEditStateChange());
	}
	protected getEditSearchRoot(): HTMLElement {
		return this.rightContentContainer || this.container;
	}

	protected setCardEditMode(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;
		card.addClass("task-item-editing", "task-cursor-default");
		this.refreshCardEditContent(uid);
	}

	protected setCardReadMode(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;
		card.removeClass("task-item-editing", "task-cursor-default");
		card.addClass("task-clickable");
		const checkbox = card.querySelector("input[type='checkbox']");
		if (checkbox) checkbox.remove();
		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			const nd = descEl.cloneNode(true) as HTMLElement;
			nd.className = "task-desc edit-desc-readonly";
			descEl.parentNode?.replaceChild(nd, descEl);
		}
		const editBar = card.querySelector(".task-edit-bar") as HTMLElement;
		if (editBar?.parentNode) {
			const node = this.dataManager.getNodeByUid(uid);
			if (node) {
				const neb = createEditBar(node, {
					expandedButton: null,
					previewText: null,
					isEditing: false,
					onEdit: () => {},
				});
				editBar.parentNode.replaceChild(neb, editBar);
			}
		}
		const previewRow = card.querySelector(
			".task-preview-row",
		) as HTMLElement;
		if (previewRow) {
			previewRow.replaceChildren();
			previewRow.addClass("task-hidden");
			previewRow.removeClass(
				"task-edit-preview-saved",
				"task-edit-preview-unsaved",
			);
		}
	}

	protected setCardBatchUnselected(uid: string) {
		const searchRoot = this.getEditSearchRoot();
		const card = searchRoot.querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;
		card.removeClass("task-item-editing", "task-cursor-default");
		card.addClass("task-clickable");
		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			descEl.removeAttribute("contenteditable");
			descEl.removeAttribute("data-edit-bound");
			const nd = descEl.cloneNode(true) as HTMLElement;
			nd.className = "task-desc edit-desc-readonly";
			descEl.parentNode?.replaceChild(nd, descEl);
		}
		const previewRow = card.querySelector(
			".task-preview-row",
		) as HTMLElement;
		if (previewRow) {
			previewRow.replaceChildren();
			previewRow.addClass("task-hidden");
			previewRow.removeClass(
				"task-edit-preview-saved",
				"task-edit-preview-unsaved",
			);
		}
		const editBar = card.querySelector(".task-edit-bar") as HTMLElement;
		if (editBar?.parentNode) {
			const node = this.dataManager.getNodeByUid(uid);
			if (node) {
				try {
					editBar.parentNode.replaceChild(
						createEditBar(node, {
							expandedButton: null,
							previewText: null,
							isEditing: false,
							onEdit: () => {},
						}),
						editBar,
					);
				} catch {
					/* DOM 已移除 */
				}
			}
		}
		const checkbox = card.querySelector(
			"input[type='checkbox']",
		) as HTMLInputElement;
		if (checkbox) checkbox.checked = false;
	}

	private refreshCardEditContent(uid: string) {
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
			previewText !== undefined &&
			hasContentBeenEdited(node.rawLine, previewText);
		const saved = editCtx.savedTasks.has(node.uid);
		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			descEl.removeClass("task-text-accent", "task-text-normal");
			descEl.addClass(
				hasContentEdit ? "task-text-accent" : "task-text-normal",
			);
			descEl.removeClass("task-cursor-pointer");
			descEl.addClass("task-cursor-text");
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
					window.getSelection()?.removeAllRanges();
					window.getSelection()?.addRange(range);
					const onBlur = () => {
						descEl.removeAttribute("contenteditable");
						const nc = descEl.textContent?.trim();
						const ctx = getEditContext();
						if (nc && ctx && nc !== (node.content || node.text))
							ctx.onContentEdit(node, nc);
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
						() => descEl.removeEventListener("keydown", onKeyDown),
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
			onEdit: (n, mk, v) => {
				const ctx = getEditContext();
				if (!ctx) return;
				mk.endsWith("_toggle")
					? ctx.onEdit(n, mk, null)
					: ctx.onEdit(n, mk, v);
			},
		});
		if (editBar) {
			try {
				editBar.parentNode!.replaceChild(newEditBar, editBar);
			} catch {
				/* DOM 已移除 */
			}
		} else {
			card.appendChild(newEditBar);
		}
		let previewRow = card.querySelector(".task-preview-row") as HTMLElement;
		if (previewText !== null && previewText !== undefined) {
			const npr = createPreviewRow(
				previewText,
				saved,
				saved
					? null
					: editCtx.batchMode
						? null
						: () => editCtx.onSave(node),
				saved ? () => editCtx.onRevert(node) : null,
				hasContentEdit,
				editCtx?.onRestore ? () => editCtx.onRestore!(node) : null,
			);
			if (previewRow) {
				try {
					previewRow.parentNode!.replaceChild(npr, previewRow);
				} catch {
					/* DOM 已移除 */
				}
			} else {
				card.appendChild(npr);
			}
		} else {
			if (!previewRow) {
				previewRow = createEl("div");
				previewRow.className = "task-preview-row task-hidden";
				card.appendChild(previewRow);
			} else {
				previewRow.replaceChildren();
				previewRow.addClass("task-hidden");
				previewRow.removeClass(
					"task-edit-preview-saved",
					"task-edit-preview-unsaved",
				);
			}
		}
	}

	protected restoreEditedCards() {
		for (const uid of Array.from(this.previouslyEditedUids))
			this.setCardReadMode(uid);
	}
	protected refreshEditPanel() {
		window.requestAnimationFrame(() => {
			const ep = Panels.getInstance().getEditPanel();
			if (ep) ep.render();
		});
	}

	protected onGlobalClick = (e: MouseEvent) => {
		const target = e.target as HTMLElement;
		const es = this.editStore;
		const state = es.getState();
		if (!state.editMode) return;
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
			if (state.batchMode) {
				if (target.closest("[data-panel-key='edit']")) {
					if (target.closest(".edit-batch-btn")) {
						for (const pu of Array.from(this.previouslyEditedUids))
							this.setCardReadMode(pu);
						es.exitBatchToReading();
						this.applyEditContext();
						this.previouslyEditedUids.clear();
						this.refreshAllCardsForBatchMode();
						this.refreshEditPanel();
						return;
					}
					return;
				}
				for (const pu of Array.from(this.previouslyEditedUids))
					this.setCardReadMode(pu);
				es.exitBatchToReading();
				this.applyEditContext();
				this.previouslyEditedUids.clear();
				this.refreshAllCardsForBatchMode();
				this.refreshEditPanel();
				return;
			} else {
				for (const pu of Array.from(this.previouslyEditedUids))
					this.setCardReadMode(pu);
				es.exitEditMode(false);
				window.requestAnimationFrame(() => this.onEditStateChange());
				return;
			}
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
			if (state.batchMode && es.getState().syncMode) {
				es.setPrimaryTask(uid);
				this._needsEditRefresh = true;
				window.requestAnimationFrame(() => this.onEditStateChange());
				return;
			}
			if (state.batchMode) {
				es.toggleSelection(node);
				this._needsEditRefresh = true;
				window.requestAnimationFrame(() => this.onEditStateChange());
				return;
			} else {
				if (state.selectedTasks.has(uid)) return;
				for (const pu of Array.from(this.previouslyEditedUids))
					this.setCardReadMode(pu);
				this.handleEnterEdit(node);
				return;
			}
		}
		for (const pu of Array.from(this.previouslyEditedUids))
			this.setCardReadMode(pu);
		state.batchMode
			? (es.exitBatchToReading(),
				this.applyEditContext(),
				this.previouslyEditedUids.clear(),
				this.refreshAllCardsForBatchMode(),
				this.refreshEditPanel())
			: (es.exitEditMode(false),
				window.requestAnimationFrame(() => this.onEditStateChange()));
	};
}
