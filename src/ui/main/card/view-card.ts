// src/ui/main/card/view-card.ts
// src/ui/main/card/view-card.ts
// 统一任务卡片组件 — 阅读模式和编辑模式共用同一 DOM 节点

import { getStatusColors } from "../../../core/config/config";
import { buildDescription, buildTooltip } from "../../../core/task/task-format";
import { TaskTreeNode } from "../../../core/task/task-tree";
import {
	createCheckbox,
	createEditBar,
	createPreviewRow,
} from "../../../util/edit-utils";
import { tooltip } from "../../component/tooltip/tooltip";
import { EditContext } from "./card";

// ========== 卡片选项 ==========

export interface TaskCardOptions {
	showTooltip?: boolean;
	compact?: boolean;
	onClick?: (node: TaskTreeNode) => void;
	onSingleClick?: (node: TaskTreeNode) => void;
}

// ========== 统一卡片 ==========

export function createViewCard(
	node: TaskTreeNode,
	options?: TaskCardOptions,
	editCtx?: EditContext | null,
): HTMLElement {
	const showTooltip = options?.showTooltip ?? false;
	const compact = options?.compact ?? false;
	const isEditing = editCtx?.editMode && editCtx.selectedTasks.has(node.uid);
	const previewText = editCtx?.previews.get(node.uid) ?? null;
	const saved = isEditing
		? (editCtx?.savedTasks.has(node.uid) ?? false)
		: false;
	const hasEdits = isEditing
		? previewText !== null && previewText !== node.rawLine
		: false;
	const checked = isEditing ? editCtx!.selectedTasks.has(node.uid) : false;
	const expandedButton = isEditing ? (editCtx?.expandedButton ?? null) : null;

	const descHtml = buildDescription(node, compact);

	const li = document.createElement("li");
	li.className = "task-item";
	if (compact) li.classList.add("task-item-compact");
	if (isEditing) li.classList.add("task-item-editing");
	li.setAttribute("data-path", node.path);
	li.setAttribute("data-line-number", String(node.line));
	li.setAttribute("data-uid", node.uid);

	const statusColors = getStatusColors();
	const statusColor = statusColors[node.status] || statusColors["todo"];

	if (!compact) {
		li.style.cssText =
			"margin:6px 0; padding:8px 10px; background:var(--background-primary); border-radius:8px; font-size:0.9em; cursor:pointer; display:flex; flex-direction:column; color:var(--text-normal); transition:background 0.1s; box-sizing:border-box;";
		li.style.borderLeft = `3px solid ${statusColor}`;
		if (isEditing) li.style.cursor = "default";
	} else {
		li.style.cssText =
			"margin:0;padding:1px 0;background:transparent;border-radius:4px;font-size:var(--font-ui-small);cursor:pointer;border:none;display:block;list-style:none;";
	}

	if (!node.display) {
		li.style.opacity = "0.4";
	}

	// ========== 第一行 ==========
	if (compact) {
		li.innerHTML = `<div class="task-desc" style="font-weight:normal;margin-bottom:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:0;line-height:1.5;">${descHtml}</div>`;
	} else {
		const row1 = document.createElement("div");
		row1.style.cssText = "display:flex;align-items:center;gap:4px;";

		if (isEditing && editCtx?.batchMode) {
			row1.appendChild(
				createCheckbox(checked, (newChecked) => {
					editCtx!.onCheckChange(node, newChecked);
				}),
			);
		}

		const descEl = document.createElement("span");
		descEl.className = "task-desc";
		descEl.innerHTML = descHtml;
		descEl.style.cssText = `font-weight:500;flex:1;cursor:${isEditing ? "text" : "pointer"};margin-bottom:4px;color:${hasEdits ? "var(--text-accent)" : "var(--text-normal)"};`;

		if (isEditing) {
			descEl.addEventListener("click", (e) => {
				e.stopPropagation();
				if (descEl.getAttribute("contenteditable") === "true") return;
				descEl.setAttribute("contenteditable", "true");
				descEl.focus();
				const range = document.createRange();
				range.selectNodeContents(descEl);
				const sel = window.getSelection();
				sel?.removeAllRanges();
				sel?.addRange(range);
				const onBlur = () => {
					descEl.removeAttribute("contenteditable");
					const newContent = descEl.textContent?.trim();
					if (
						newContent &&
						newContent !== (node.content || node.text)
					) {
						editCtx!.onContentEdit(node, newContent);
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

		row1.appendChild(descEl);
		li.appendChild(row1);

		// ========== 第二行：编辑栏（始终存在） ==========
		const editBar = createEditBar(node, {
			expandedButton,
			previewText,
			isEditing,
			onEdit: (n, markKey, value) => {
				if (editCtx) {
					if (markKey.endsWith("_toggle")) {
						editCtx.onEdit(n, markKey, null);
					} else {
						editCtx.onEdit(n, markKey, value);
					}
				}
			},
		});
		li.appendChild(editBar);

		// ========== 第三行：预览行 ==========
		if (previewText) {
			const previewRow = createPreviewRow(
				previewText,
				saved,
				saved ? null : () => editCtx?.onSave(node),
				saved ? () => editCtx?.onRevert(node) : null,
				hasEdits,
				hasEdits && editCtx?.onRestore
					? () => editCtx.onRestore!(node)
					: null,
			);
			li.appendChild(previewRow);
		} else {
			// 始终创建预览行容器（隐藏）
			const previewRow = document.createElement("div");
			previewRow.className = "task-preview-row";
			previewRow.style.display = "none";
			li.appendChild(previewRow);
		}
	}

	// ========== 事件 ==========
	li.addEventListener("mouseenter", () => {
		if (!isEditing) {
			li.style.backgroundColor = compact
				? "var(--background-modifier-hover)"
				: "var(--background-modifier-hover)";
		} else {
			li.style.backgroundColor = "var(--background-modifier-hover)";
		}
	});
	li.addEventListener("mouseleave", () => {
		if (!isEditing) {
			li.style.backgroundColor = compact
				? "transparent"
				: "var(--background-primary)";
		} else {
			li.style.backgroundColor = "var(--background-primary)";
		}
	});

	if (showTooltip && compact) {
		const tooltipHtml = buildTooltip(node);
		if (tooltipHtml) {
			li.addEventListener("mouseenter", (e) =>
				tooltip.show(tooltipHtml, e.clientX, e.clientY),
			);
			li.addEventListener("mousemove", (e) =>
				tooltip.move(e.clientX, e.clientY),
			);
			li.addEventListener("mouseleave", () => tooltip.hide());
		}
	}

	if (options?.onSingleClick && !isEditing) {
		li.addEventListener("click", (e) => {
			e.stopPropagation();
			setTimeout(() => options.onSingleClick!(node), 150);
		});
	}

	if (options?.onClick && !isEditing) {
		li.addEventListener("dblclick", (e) => {
			e.stopPropagation();
			options.onClick!(node);
		});
	}

	return li;
}
