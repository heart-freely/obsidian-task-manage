// src/core/edit/base-task-edit.ts
// 编辑功能 Mixin — 编辑入口、模式切换、卡片状态、编辑上下文、全局点击

import { getEditContext, setEditContext } from "../../ui/main/card/card";
import { Panels } from "../../ui/panel/panel";
import {
	createEditBar,
	createPreviewRow,
	hasContentBeenEdited,
} from "../../util/edit-utils";
import { flattenTree, TaskTreeNode } from "../task/task-tree";
import { EditStore } from "./task-edit-store";

export class BaseTaskEdit {
	protected editStore!: EditStore;
	protected dataManager!: any;
	protected container!: HTMLElement;
	protected rightContentContainer: HTMLElement | null = null;

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
		const prevUids = Array.from(this.previouslyEditedUids);
		for (const prevUid of prevUids) this.setCardReadMode(prevUid);
		es.enterSingleEditMode(node);
		this.applyEditContext();
		this.setCardEditMode(node.uid);
		this.previouslyEditedUids = new Set([node.uid]);
	}

	private async loadYamlContent(node: TaskTreeNode): Promise<string | null> {
		if (!node.hasYaml) return "";
		if (node.yamlStartLine < 0 || node.yamlEndLine < 0) return "";
		try {
			const app = (this as any).app;
			if (!app) return null;
			const file = app.vault.getAbstractFileByPath(node.path);
			if (!file) return null;
			const content = await app.vault.cachedRead(file);
			const lines = content.split("\n");
			return lines
				.slice(node.yamlStartLine + 1, node.yamlEndLine)
				.join("\n");
		} catch {
			return null;
		}
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
			if (node) es.enterBatchModeFromSingle(node);
			else es.enterBatchMode();
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
				const cb = document.createElement("input");
				cb.type = "checkbox";
				cb.checked = checked;
				cb.className = "edit-checkbox";
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
		if (!allSelected)
			visibleNodes.forEach((n) => {
				es.getState().selectedTasks.add(n.uid);
				es.getState().previews.set(n.uid, n.rawLine || "");
				this.setCardEditMode(n.uid);
			});
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
				onSave: async (node) => {
					await this.editStore.saveSingle(node);
					this.editStore.exitEditMode(false);
					this.applyEditContext();
					this.previouslyEditedUids.clear();
					this.dataManager.invalidate();
					await this.dataManager.loadData(this.app);
					const self = this as any;
					if (self.selectedTreeNode) {
						const newTree = this.dataManager.getFullTree();
						const newFocus = self.findNodeByUidInTree?.(
							newTree,
							self.selectedTreeNode.uid,
						);
						if (newFocus) {
							self.selectedTreeNode = newFocus;
							self.focusedTreeNode = newFocus;
						}
					}
					this.render();
				},
				onRevert: async (node) => {
					await this.editStore.revertSingle(node);
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
					const result: Array<{ id: string; desc: string }> = [];
					const allNodes = flattenTree(
						this.dataManager.getFullTree(),
					);
					const seen = new Set<string>();
					for (const n of allNodes) {
						if (n.id && !seen.has(n.id)) {
							seen.add(n.id);
							result.push({
								id: n.id,
								desc: n.content || n.text || "",
							});
						}
					}
					return result;
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
			if (!currentUids.has(uid)) {
				if (state.batchMode) this.setCardBatchUnselected(uid);
				else this.setCardReadMode(uid);
			}
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
		const card = this.getEditSearchRoot().querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;
		card.classList.add("task-item-editing", "edit-card-editing");
		this.refreshCardEditContent(uid);
	}

	protected setCardReadMode(uid: string) {
		const card = this.getEditSearchRoot().querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;
		card.classList.remove("task-item-editing", "edit-card-editing");
		card.classList.add("edit-card-readonly");
		const checkbox = card.querySelector("input[type='checkbox']");
		if (checkbox) checkbox.remove();
		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			const newDescEl = descEl.cloneNode(true) as HTMLElement;
			newDescEl.className = "task-desc edit-desc-readonly";
			descEl.parentNode?.replaceChild(newDescEl, descEl);
		}
		const editBar = card.querySelector(".task-edit-bar") as HTMLElement;
		if (editBar?.parentNode) {
			const node = this.dataManager.getNodeByUid(uid);
			if (node) {
				const newEditBar = createEditBar(node, {
					expandedButton: null,
					previewText: null,
					isEditing: false,
					onEdit: () => {},
				});
				editBar.parentNode.replaceChild(newEditBar, editBar);
			}
		}
		const previewRow = card.querySelector(
			".task-preview-row",
		) as HTMLElement;
		if (previewRow) {
			previewRow.replaceChildren();
			previewRow.classList.add("edit-preview-hidden");
		}
	}

	protected setCardBatchUnselected(uid: string) {
		const card = this.getEditSearchRoot().querySelector(
			`[data-uid="${uid}"]`,
		) as HTMLElement;
		if (!card) return;
		card.classList.remove("task-item-editing", "edit-card-editing");
		card.classList.add("edit-card-readonly");
		const descEl = card.querySelector(".task-desc") as HTMLElement;
		if (descEl) {
			descEl.removeAttribute("contenteditable");
			descEl.removeAttribute("data-edit-bound");
			const newDescEl = descEl.cloneNode(true) as HTMLElement;
			newDescEl.className = "task-desc edit-desc-readonly";
			descEl.parentNode?.replaceChild(newDescEl, descEl);
		}
		const previewRow = card.querySelector(
			".task-preview-row",
		) as HTMLElement;
		if (previewRow) {
			previewRow.replaceChildren();
			previewRow.classList.add("edit-preview-hidden");
		}
		const editBar = card.querySelector(".task-edit-bar") as HTMLElement;
		if (editBar?.parentNode) {
			const nodeForBar = this.dataManager.getNodeByUid(uid);
			if (nodeForBar) {
				const newEditBar = createEditBar(nodeForBar, {
					expandedButton: null,
					previewText: null,
					isEditing: false,
					onEdit: () => {},
				});
				try {
					editBar.parentNode.replaceChild(newEditBar, editBar);
				} catch (e) {}
			}
		}
		const checkbox = card.querySelector(
			"input[type='checkbox']",
		) as HTMLInputElement;
		if (checkbox) checkbox.checked = false;
	}

	private refreshCardEditContent(uid: string) {
		const card = this.getEditSearchRoot().querySelector(
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
			descEl.classList.remove(
				"edit-desc-editing-normal",
				"edit-desc-editing",
			);
			descEl.classList.add(
				hasContentEdit
					? "edit-desc-editing"
					: "edit-desc-editing-normal",
			);
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
						)
							ctx.onContentEdit(node, newContent);
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
				if (markKey.endsWith("_toggle")) ctx.onEdit(n, markKey, null);
				else ctx.onEdit(n, markKey, value);
			},
		});
		if (editBar) {
			try {
				editBar.parentNode!.replaceChild(newEditBar, editBar);
			} catch (e) {}
		} else {
			card.appendChild(newEditBar);
		}

		let previewRow = card.querySelector(".task-preview-row") as HTMLElement;
		if (previewText !== null && previewText !== undefined) {
			const newPreviewRow = createPreviewRow(
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
					previewRow.parentNode!.replaceChild(
						newPreviewRow,
						previewRow,
					);
				} catch (e) {}
			} else {
				card.appendChild(newPreviewRow);
			}
		} else {
			if (!previewRow) {
				previewRow = document.createElement("div");
				previewRow.className = "task-preview-row edit-preview-hidden";
				card.appendChild(previewRow);
			} else {
				previewRow.replaceChildren();
				previewRow.classList.add("edit-preview-hidden");
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
		if (
			target.closest(".manage-sidebar") &&
			(target.closest(".side-top-row") ||
				target.closest("[title*='折叠']") ||
				target.closest("[title*='展开']"))
		)
			return;

		if (target.closest(".panel-host")) {
			if (state.batchMode) {
				if (target.closest("[data-panel-key='edit']")) {
					if (target.closest(".edit-batch-btn")) {
						for (const u of Array.from(this.previouslyEditedUids))
							this.setCardReadMode(u);
						es.exitBatchToReading();
						this.applyEditContext();
						this.previouslyEditedUids.clear();
						this.refreshAllCardsForBatchMode();
						this.refreshEditPanel();
					}
					return;
				}
				for (const u of Array.from(this.previouslyEditedUids))
					this.setCardReadMode(u);
				es.exitBatchToReading();
				this.applyEditContext();
				this.previouslyEditedUids.clear();
				this.refreshAllCardsForBatchMode();
				this.refreshEditPanel();
				return;
			} else {
				for (const u of Array.from(this.previouslyEditedUids))
					this.setCardReadMode(u);
				es.exitEditMode(false);
				window.requestAnimationFrame(() => this.onEditStateChange());
				return;
			}
		}

		if (target.closest(".manage-sidebar")) {
			for (const u of Array.from(this.previouslyEditedUids))
				this.setCardReadMode(u);
			if (state.batchMode) {
				es.exitBatchToReading();
				this.applyEditContext();
				this.previouslyEditedUids.clear();
				this.refreshAllCardsForBatchMode();
				this.refreshEditPanel();
			} else {
				es.exitEditMode(false);
				window.requestAnimationFrame(() => this.onEditStateChange());
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
			}
			if (state.selectedTasks.has(uid)) return;
			for (const u of Array.from(this.previouslyEditedUids))
				this.setCardReadMode(u);
			this.handleEnterEdit(node);
			return;
		}

		for (const u of Array.from(this.previouslyEditedUids))
			this.setCardReadMode(u);
		if (state.batchMode) {
			es.exitBatchToReading();
			this.applyEditContext();
			this.previouslyEditedUids.clear();
			this.refreshAllCardsForBatchMode();
			this.refreshEditPanel();
		} else {
			es.exitEditMode(false);
			window.requestAnimationFrame(() => this.onEditStateChange());
		}
	};
}

function toYamlValueCtx(key: string, value: string): string {
	const STATUS_TO_YAML: Record<string, string> = {
		none: "无状态",
		todo: "待办中",
		scheduled: "计划中",
		"in-progress": "进行中",
		cancelled: "已取消",
		completed: "已完成",
	};
	const PRIORITY_TO_YAML: Record<number, string> = {
		0: "最高",
		1: "高",
		2: "中",
		3: "低",
		4: "最低",
		5: "无",
	};
	switch (key) {
		case "status":
			return STATUS_TO_YAML[value] || value;
		case "priority": {
			const icons = ["🔺", "⏫", "🔼", "🔽", "⏬"];
			const idx = icons.indexOf(value);
			return idx >= 0 ? PRIORITY_TO_YAML[idx] : value;
		}
		case "repeat":
			return value.replace(/^🔁\s*/, "");
		default:
			return value;
	}
}
