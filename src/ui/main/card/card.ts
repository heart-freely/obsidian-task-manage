// src/ui/main/card/card.ts
// 统一任务卡片组件 — 入口文件

import { TaskTreeNode } from "../../../core/task/task-tree";
import { TaskCardOptions, createViewCard } from "./view-card";

export type { TaskCardOptions };

// ========== 编辑上下文类型 ==========

export interface EditContext {
	editMode: boolean;
	batchMode: boolean;
	selectedTasks: Set<string>;
	previews: Map<string, string>;
	savedTasks: Set<string>;
	expandedButton: string | null;
	onEdit: (node: TaskTreeNode, markKey: string, value: string | null) => void;
	onContentEdit: (node: TaskTreeNode, newContent: string) => void;
	onCheckChange: (node: TaskTreeNode, checked: boolean) => void;
	onSave: (node: TaskTreeNode) => void;
	onRevert: (node: TaskTreeNode) => void;
	onRestore?: (node: TaskTreeNode) => void;
}

// ========== 编辑上下文 ==========

let currentEditContext: EditContext | null = null;

export function setEditContext(ctx: EditContext | null) {
	currentEditContext = ctx;
}

export function getEditContext(): EditContext | null {
	return currentEditContext;
}

// ========== 统一入口 ==========

export function createTaskCard(
	node: TaskTreeNode,
	options?: TaskCardOptions,
): HTMLElement {
	return createViewCard(node, options, currentEditContext);
}
