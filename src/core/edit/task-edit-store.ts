// src/core/edit/task-edit-store.ts
// 编辑状态管理器

import { Notice } from "obsidian";
import { EditState } from "../../type/type";
import { parseTaskLine } from "../parser/tasks-parser";
import { Store } from "../store/store";
import { TaskTreeNode } from "../task/task-tree";
import {
	loadSnapshots,
	Op,
	revertSingleTask,
	saveAllChanges,
	saveSingleTask,
	saveSnapshots,
	writeToFiles,
} from "./task-editor";

export class EditStore {
	private state: EditState;
	private app: any;
	private getNode: (uid: string) => TaskTreeNode | undefined;
	private store: Store | null = null;
	private panelListeners: Array<() => void> = [];
	private _pendingNotify: boolean = false;

	constructor(
		app: any,
		getNode: (uid: string) => TaskTreeNode | undefined,
		store?: Store,
	) {
		this.state = createEditState();
		this.app = app;
		this.getNode = getNode;
		this.store = store || null;
	}

	subscribePanel(listener: () => void): () => void {
		this.panelListeners.push(listener);
		return () => {
			this.panelListeners = this.panelListeners.filter(
				(l) => l !== listener,
			);
		};
	}

	private notifyPanel() {
		this.panelListeners.forEach((l) => l());
	}

	public syncToStore() {
		if (this.store) {
			this.store.updateEditPanelState({
				batchMode: this.state.batchMode,
				selectedCount: this.state.selectedTasks.size,
				hasSnapshots: loadSnapshots().length > 0,
			});
		}
		if (!this._pendingNotify) {
			this._pendingNotify = true;
			requestAnimationFrame(() => {
				this._pendingNotify = false;
				this.notifyPanel();
			});
		}
	}

	getState(): EditState {
		return this.state;
	}

	// ========== 模式切换 ==========

	enterSingleEditMode(node: TaskTreeNode) {
		this.state.editMode = true;
		this.state.batchMode = false;
		this.state.selectedTasks.clear();
		this.state.previews.clear();
		this.state.savedTasks.clear();
		this.state.selectedTasks.add(node.uid);
		this.state.previews.set(node.uid, node.rawLine || "");
		this.state.expandedButton = null;
		this.syncToStore();
	}

	enterBatchMode() {
		this.state.editMode = true;
		this.state.batchMode = true;
		this.state.selectedTasks.clear();
		this.state.previews.clear();
		this.state.savedTasks.clear();
		this.state.expandedButton = null;
		this.syncToStore();
	}

	enterBatchModeFromSingle(node: TaskTreeNode) {
		this.state.editMode = true;
		this.state.batchMode = true;
		this.state.selectedTasks.clear();
		this.state.previews.clear();
		this.state.savedTasks.clear();
		this.state.selectedTasks.add(node.uid);
		this.state.previews.set(node.uid, node.rawLine || "");
		this.state.expandedButton = null;
		this.syncToStore();
	}

	exitBatchToReading() {
		this.state.editMode = false;
		this.state.batchMode = false;
		this.state.selectedTasks.clear();
		this.state.previews.clear();
		this.state.savedTasks.clear();
		this.state.expandedButton = null;
		this.syncToStore();
	}

	toggleBatchMode() {
		if (this.state.batchMode) {
			this.exitBatchToReading();
		} else if (this.state.editMode && !this.state.batchMode) {
			const currentUid = this.state.selectedTasks.values().next().value;
			const node = currentUid ? this.getNode(currentUid) : undefined;
			if (node) {
				this.enterBatchModeFromSingle(node);
			} else {
				this.enterBatchMode();
			}
		} else {
			this.enterBatchMode();
		}
	}

	enterEditMode(node?: TaskTreeNode) {
		this.state.editMode = true;
		if (node && node.uid !== "__task_root__") {
			if (this.state.batchMode) {
				if (this.state.selectedTasks.has(node.uid)) {
					this.state.selectedTasks.delete(node.uid);
					this.state.previews.delete(node.uid);
					this.state.savedTasks.delete(node.uid);
				} else {
					this.state.selectedTasks.add(node.uid);
					if (!this.state.previews.has(node.uid)) {
						this.state.previews.set(node.uid, node.rawLine || "");
					}
				}
			} else {
				this.state.selectedTasks.clear();
				this.state.previews.clear();
				this.state.savedTasks.clear();
				this.state.selectedTasks.add(node.uid);
				if (!this.state.previews.has(node.uid)) {
					this.state.previews.set(node.uid, node.rawLine || "");
				}
			}
		}
		this.state.expandedButton = null;
		this.syncToStore();
	}

	exitEditMode(save: boolean = false, keepSelection: boolean = false) {
		if (!save && !keepSelection) {
			this.state.selectedTasks.clear();
			this.state.previews.clear();
			this.state.savedTasks.clear();
		}
		this.state.editMode = false;
		this.state.batchMode = false;
		this.state.expandedButton = null;
		this.syncToStore();
	}

	// ========== 选择操作 ==========

	toggleSelection(node: TaskTreeNode) {
		if (!this.state.batchMode) return;
		if (this.state.selectedTasks.has(node.uid)) {
			this.state.selectedTasks.delete(node.uid);
			this.state.previews.delete(node.uid);
			this.state.savedTasks.delete(node.uid);
		} else {
			this.state.selectedTasks.add(node.uid);
			if (!this.state.previews.has(node.uid)) {
				this.state.previews.set(node.uid, node.rawLine || "");
			}
		}
		this.syncToStore();
	}

	toggleSelectAll(nodes: TaskTreeNode[]) {
		if (!this.state.batchMode) return;
		const allSelected = nodes.every((n) =>
			this.state.selectedTasks.has(n.uid),
		);
		if (allSelected) {
			nodes.forEach((n) => {
				this.state.selectedTasks.delete(n.uid);
				this.state.previews.delete(n.uid);
				this.state.savedTasks.delete(n.uid);
			});
		} else {
			nodes.forEach((n) => {
				if (n.uid !== "__task_root__") {
					this.state.selectedTasks.add(n.uid);
					if (!this.state.previews.has(n.uid)) {
						this.state.previews.set(n.uid, n.rawLine || "");
					}
				}
			});
		}
		this.syncToStore();
	}

	toggleExpandedButton(buttonKey: string) {
		this.state.expandedButton =
			this.state.expandedButton === buttonKey ? null : buttonKey;
		this.syncToStore();
	}

	// ========== 编辑操作 ==========

	applyEdit(markKey: string, value: string | null) {
		if (this.state.selectedTasks.size === 0) return;

		for (const uid of this.state.selectedTasks) {
			if (this.state.savedTasks.has(uid)) continue;

			const node = this.getNode(uid);
			if (!node) continue;

			const currentPreview =
				this.state.previews.get(uid) || node.rawLine || "";
			let newPreview = currentPreview;

			if (node.type === "file" || node.type === "heading") {
				const yamlValue =
					value !== null ? toYamlValue(markKey, value) : null;
				newPreview =
					value !== null
						? Op.setYamlField(currentPreview, markKey, yamlValue)
						: Op.delYamlField(currentPreview, markKey);
			} else {
				switch (markKey) {
					case "status":
						newPreview = value
							? Op.setStatus(currentPreview, value)
							: currentPreview;
						break;
					case "priority":
						newPreview = value
							? Op.setPriority(currentPreview, value)
							: Op.delPriority(currentPreview);
						break;
					case "repeat":
						newPreview = value
							? Op.setRepeat(currentPreview, value)
							: Op.delRepeat(currentPreview);
						break;
					case "created":
						newPreview = value
							? Op.setCreated(currentPreview, value)
							: Op.delCreated(currentPreview);
						break;
					case "scheduled":
						newPreview = value
							? Op.setScheduled(currentPreview, value)
							: Op.delScheduled(currentPreview);
						break;
					case "starts":
						newPreview = value
							? Op.setStarts(currentPreview, value)
							: Op.delStarts(currentPreview);
						break;
					case "due":
						newPreview = value
							? Op.setDue(currentPreview, value)
							: Op.delDue(currentPreview);
						break;
					case "done":
						newPreview = value
							? Op.setDone(currentPreview, value)
							: Op.delDone(currentPreview);
						break;
					case "cancelled":
						newPreview = value
							? Op.setCancelled(currentPreview, value)
							: Op.delCancelled(currentPreview);
						break;
					case "tag":
						newPreview = value
							? Op.setTag(currentPreview, value)
							: Op.delTag(currentPreview);
						break;
					case "id":
						newPreview = value
							? Op.setId(currentPreview, value)
							: Op.delId(currentPreview);
						break;
					case "forbid":
						newPreview = value
							? Op.setForbid(currentPreview, value)
							: Op.delForbid(currentPreview);
						break;
				}
			}

			if (newPreview !== currentPreview) {
				if (node.type === "list") {
					newPreview = Op.sortTags(newPreview);
				}
				this.state.previews.set(uid, newPreview);
			}
		}
		this.syncToStore();
	}

	applyContentEdit(node: TaskTreeNode, newContent: string) {
		let cleanContent = newContent;
		const prefixes = ["📄 ", "● "];
		for (const prefix of prefixes) {
			if (cleanContent.startsWith(prefix)) {
				cleanContent = cleanContent.substring(prefix.length);
				break;
			}
		}
		cleanContent = cleanContent.replace(/^H\d+\s+/, "");

		const currentPreview =
			this.state.previews.get(node.uid) || node.rawLine || "";

		let newPreview: string;
		if (node.type === "file" || node.type === "heading") {
			newPreview = Op.setYamlContent(currentPreview, cleanContent);
		} else {
			newPreview = Op.setContent(currentPreview, cleanContent);
		}

		this.state.previews.set(node.uid, newPreview);
		if (!this.state.selectedTasks.has(node.uid)) {
			this.state.selectedTasks.add(node.uid);
		}
		this.syncToStore();
	}

	applyAutoComplete(days?: number) {
		for (const uid of this.state.selectedTasks) {
			if (this.state.savedTasks.has(uid)) continue;
			const node = this.getNode(uid);
			if (!node) continue;
			if (node.type !== "list") continue;
			const currentPreview =
				this.state.previews.get(uid) || node.rawLine || "";
			const newPreview = Op.autoComplete(currentPreview, days);
			if (newPreview !== currentPreview) {
				this.state.previews.set(uid, newPreview);
			}
		}
		this.syncToStore();
		this.store?.triggerEditCardsChanged?.();
	}

	applySortTags() {
		for (const uid of this.state.selectedTasks) {
			if (this.state.savedTasks.has(uid)) continue;
			const node = this.getNode(uid);
			if (!node) continue;
			if (node.type !== "list") continue;
			const currentPreview =
				this.state.previews.get(uid) || node.rawLine || "";
			const newPreview = Op.sortTags(currentPreview);
			if (newPreview !== currentPreview) {
				this.state.previews.set(uid, newPreview);
			}
		}
		this.syncToStore();
		this.store?.triggerEditCardsChanged?.();
	}

	clearPreviews() {
		for (const uid of this.state.selectedTasks) {
			const node = this.getNode(uid);
			if (node) {
				this.state.previews.set(uid, node.rawLine || "");
			}
		}
		this.syncToStore();
		this.store?.triggerEditCardsChanged?.();
	}

	// ========== 保存与撤回 ==========

	async saveCurrent() {
		if (this.state.batchMode) {
			await this.saveAll();
		} else {
			const uids = Array.from(this.state.selectedTasks);
			if (uids.length === 1) {
				const node = this.getNode(uids[0]);
				if (node) await this.saveSingle(node);
			}
		}
	}

	async saveSingle(node: TaskTreeNode) {
		this.state = await saveSingleTask(
			this.state,
			this.app,
			this.getNode,
			node,
		);
		this.syncToStore();
	}

	async saveAll() {
		const { nodeMap, previewMap } = this.getNodesAndPreviews();

		await saveAllChanges(this.state, this.app, this.getNode);
		new Notice(`✅ 已保存修改`);

		this.applyUpdatesToNodes(nodeMap, previewMap);

		this.exitEditMode(false);
		this.store?.triggerApplyEditContext?.();

		const taskView = this.store?.getTaskView?.();
		taskView?.updateFocusAfterSave?.();
		this.refreshCardsAfterSave(nodeMap);

		this.store?.triggerFullRender?.();
	}

	async revertSingle(node: TaskTreeNode) {
		this.state = await revertSingleTask(
			this.state,
			this.app,
			this.getNode,
			node,
		);
		this.syncToStore();
	}

	async revertSnapshot(snapshotIndex: number) {
		const snapshots = loadSnapshots();
		if (snapshotIndex < 0 || snapshotIndex >= snapshots.length) return;

		const snap = snapshots[snapshotIndex];
		const taskIds = Object.keys(snap.snapshot);
		const linesMap: Record<string, string> = {};
		const nodeMap = new Map<string, TaskTreeNode>();
		const previewMap = new Map<string, string>();

		for (const uid of taskIds) {
			linesMap[uid] = snap.snapshot[uid];
			const node = this.getNode(uid);
			if (node) {
				nodeMap.set(uid, node);
				previewMap.set(uid, snap.snapshot[uid]);
			}
		}

		await writeToFiles(this.app, this.getNode, taskIds, linesMap);

		snapshots.splice(0, snapshotIndex + 1);
		saveSnapshots(snapshots);

		this.state.savedTasks.clear();
		this.state.previews.clear();
		this.state.selectedTasks.clear();

		this.applyUpdatesToNodes(nodeMap, previewMap);

		this.exitEditMode(false);
		this.store?.triggerApplyEditContext?.();

		const taskView = this.store?.getTaskView?.();
		taskView?.updateFocusAfterSave?.();
		this.refreshCardsAfterSave(nodeMap);

		new Notice(`↩️ 已撤回快照`);
		this.store?.triggerFullRender?.();
	}

	getSnapshots() {
		return loadSnapshots();
	}

	// ========== 私有辅助方法 ==========

	private getNodesAndPreviews(): {
		nodeMap: Map<string, TaskTreeNode>;
		previewMap: Map<string, string>;
	} {
		const nodeMap = new Map<string, TaskTreeNode>();
		const previewMap = new Map<string, string>();

		for (const uid of this.state.selectedTasks) {
			if (this.state.savedTasks.has(uid)) continue;
			const node = this.getNode(uid);
			const preview = this.state.previews.get(uid);
			if (node && preview && preview !== node.rawLine) {
				nodeMap.set(uid, node);
				previewMap.set(uid, preview);
			}
		}

		return { nodeMap, previewMap };
	}

	private applyUpdatesToNodes(
		nodeMap: Map<string, TaskTreeNode>,
		previewMap: Map<string, string>,
	) {
		for (const [uid, node] of nodeMap) {
			const preview = previewMap.get(uid);
			if (preview) {
				const parsed = parseTaskLine(preview, node.path, node.line);
				if (parsed) {
					Object.assign(node, parsed, {
						rawLine: preview,
						text: parsed.content,
					});
				}
			}
		}
	}

	private refreshCardsAfterSave(nodeMap: Map<string, TaskTreeNode>) {
		if (nodeMap.size > 50) return;
		const taskView = this.store?.getTaskView?.();
		for (const [uid, node] of nodeMap) {
			taskView?.refreshSingleCard?.(node);
		}
	}
}

// ========== 辅助函数 ==========

function createEditState(): EditState {
	return {
		editMode: false,
		batchMode: false,
		selectedTasks: new Set(),
		previews: new Map(),
		savedTasks: new Set(),
		expandedButton: null,
	};
}

/** 将编辑值转换为 YAML 格式值 */
function toYamlValue(key: string, value: string): string {
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
