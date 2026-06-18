// src/ui/main/card/view-card.ts
// 统一任务卡片组件 — 根据当前模式渲染对应 UI

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

export interface TaskCardOptions {
	showTooltip?: boolean;
	compact?: boolean;
	onClick?: (node: TaskTreeNode) => void;
	onSingleClick?: (node: TaskTreeNode) => void;
	onEnterEdit?: (node: TaskTreeNode) => void;
}

function bindDescriptionEdit(
	descEl: HTMLElement,
	node: TaskTreeNode,
	editCtx: EditContext,
) {
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
			if (newContent && newContent !== (node.content || node.text)) {
				editCtx.onContentEdit(node, newContent);
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

export function createViewCard(
	node: TaskTreeNode,
	options?: TaskCardOptions,
	editCtx?: EditContext | null,
): HTMLElement {
	const showTooltip = options?.showTooltip ?? false;
	const compact = options?.compact ?? false;
	const isBatchMode = editCtx?.editMode && editCtx.batchMode;
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

	if (compact) {
		li.innerHTML = `<div class="task-desc" style="font-weight:normal;margin-bottom:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:0;line-height:1.5;">${descHtml}</div>`;
	} else {
		const row1 = document.createElement("div");
		row1.style.cssText = "display:flex;align-items:center;gap:4px;";

		// 批量编辑模式：显示复选框
		if (isBatchMode && editCtx) {
			row1.appendChild(
				createCheckbox(checked, (newChecked) => {
					editCtx!.onCheckChange(node, newChecked);
				}),
			);
		}

		const descEl = document.createElement("span");
		descEl.className = "task-desc";
		descEl.innerHTML = descHtml;
		descEl.style.cssText =
			"font-weight:500;flex:1;cursor:" +
			(isEditing ? "text" : "pointer") +
			";margin-bottom:4px;color:" +
			(hasEdits ? "var(--text-accent)" : "var(--text-normal)") +
			";";

		if (isEditing && editCtx) {
			bindDescriptionEdit(descEl, node, editCtx);
		}

		row1.appendChild(descEl);
		li.appendChild(row1);

		// 编辑栏：仅选中任务显示
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

		// 批量模式下未选中任务隐藏编辑栏
		if (isBatchMode && !isEditing) {
			editBar.style.display = "none";
		}

		// 预览行：仅选中任务显示
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
			const previewRow = document.createElement("div");
			previewRow.className = "task-preview-row";
			previewRow.style.display = "none";
			li.appendChild(previewRow);
		}
	}

	// ========== 阅读模式：单击进入编辑 ==========
	if (!compact && !isEditing && options?.onEnterEdit) {
		li.addEventListener("click", (e) => {
			e.stopPropagation();
			e.preventDefault();
			options.onEnterEdit!(node);

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					const descEl = li.querySelector(
						".task-desc",
					) as HTMLElement;
					if (descEl) {
						descEl.click();
					}
				});
			});
		});
	}

	// ========== 双击跳转 ==========
	if (options?.onClick && !isEditing && !compact) {
		li.addEventListener("dblclick", (e) => {
			e.stopPropagation();
			options.onClick!(node);
		});
	}

	// ========== hover ==========
	li.addEventListener("mouseenter", () => {
		li.style.backgroundColor = compact
			? "var(--background-modifier-hover)"
			: "var(--background-modifier-hover)";
	});
	li.addEventListener("mouseleave", () => {
		li.style.backgroundColor = compact
			? "transparent"
			: "var(--background-primary)";
	});

	// ========== tooltip ==========
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

	return li;
}
