// src/ui/main/card/view-card.ts

import { getStatusColors } from "../../../core/config/config";
import { buildDescription, buildTooltip } from "../../../core/task/task-format";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { createEl } from "../../../util/dom-utils";
import {
	createCheckbox,
	createEditBar,
	createPreviewRow,
	hasContentBeenEdited,
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

function buildDescriptionDOM(
	node: TaskTreeNode,
	_compact: boolean,
): DocumentFragment {
	const frag = document.createDocumentFragment();
	const span = document.createElement("span");
	span.textContent = buildDescription(node, _compact);
	frag.appendChild(span);
	return frag;
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

import { getEditContext } from "./card";

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
	const hasContentEdit = isEditing
		? previewText !== null &&
			hasContentBeenEdited(node.rawLine, previewText)
		: false;
	const checked =
		isEditing && editCtx ? editCtx.selectedTasks.has(node.uid) : false;
	const expandedButton = isEditing ? (editCtx?.expandedButton ?? null) : null;

	const li = createEl("li");
	li.className = "task-item";
	if (compact) li.classList.add("task-item-compact");
	if (isEditing) li.classList.add("task-item-editing");
	li.setAttribute("data-path", node.path);
	li.setAttribute("data-line-number", String(node.line));
	li.setAttribute("data-uid", node.uid);
	const statusColors = getStatusColors();
	const statusColor = statusColors[node.status] || statusColors["todo"];

	if (!compact) {
		li.addClass(
			"task-card",
			"task-m-1",
			"task-p-2",
			"task-bg-primary",
			"task-rounded",
			"task-text-sm",
			"task-clickable",
			"task-flex",
			"task-flex-col",
			"task-text-normal",
			"task-transition-bg",
		);
		li.addClass("task-card-status-border");
		li.setCssProps({ "--task-status-color": statusColor });
		if (isEditing) li.addClass("task-cursor-default");
	} else {
		li.addClass(
			"task-card-compact",
			"task-m-0",
			"task-py-0",
			"task-px-0",
			"task-bg-transparent",
			"task-rounded",
			"task-text-xs",
			"task-clickable",
			"task-border-none",
			"task-block",
			"task-list-none",
		);
	}
	if (!node.display) li.addClass("task-opacity-40");

	if (compact) {
		const descDiv = createEl("div");
		descDiv.className = "task-desc";
		descDiv.addClass(
			"task-font-normal",
			"task-mb-0",
			"task-text-ellipsis",
			"task-pl-0",
			"task-leading-normal",
		);
		descDiv.appendChild(buildDescriptionDOM(node, compact));
		li.appendChild(descDiv);
	} else {
		const row1 = createEl("div");
		row1.addClass("task-flex", "task-items-center", "task-gap-1");
		if (isBatchMode && editCtx && node.type === "list") {
			row1.appendChild(
				createCheckbox(checked, (newChecked: boolean) => {
					editCtx.onCheckChange(node, newChecked);
				}),
			);
		}
		const descEl = createEl("span");
		descEl.className = "task-desc";
		descEl.appendChild(buildDescriptionDOM(node, compact));
		descEl.addClass(
			"task-font-medium",
			"task-flex-1",
			"task-mb-1",
			"task-cursor-pointer",
		);
		descEl.addClass(
			hasContentEdit ? "task-text-accent" : "task-text-normal",
		);
		if (isEditing) descEl.addClass("task-cursor-text");
		if (isEditing && editCtx) bindDescriptionEdit(descEl, node, editCtx);
		row1.appendChild(descEl);
		li.appendChild(row1);
		const editBar = createEditBar(node, {
			expandedButton,
			previewText,
			isEditing,
			onEdit: (n, mk, v) => {
				if (editCtx)
					mk.endsWith("_toggle")
						? editCtx.onEdit(n, mk, null)
						: editCtx.onEdit(n, mk, v);
			},
		});
		li.appendChild(editBar);
		if (isBatchMode && !isEditing) editBar.addClass("task-hidden");
		if (previewText) {
			li.appendChild(
				createPreviewRow(
					previewText,
					saved,
					saved
						? null
						: isBatchMode
							? null
							: () => editCtx?.onSave(node),
					saved ? () => editCtx?.onRevert(node) : null,
					hasContentEdit,
					editCtx?.onRestore ? () => editCtx.onRestore!(node) : null,
				),
			);
		} else {
			const pr = createEl("div");
			pr.className = "task-preview-row";
			pr.addClass("task-hidden");
			li.appendChild(pr);
		}
	}

	if (compact && options?.onSingleClick) {
		li.addEventListener("click", (e) => {
			e.stopPropagation();
			options.onSingleClick!(node);
		});
	}
	if (options?.onClick && !isEditing && !compact) {
		li.addEventListener("dblclick", (e) => {
			e.stopPropagation();
			options.onClick!(node);
		});
	}
	if (!compact && !isEditing && options?.onEnterEdit) {
		let pending: ReturnType<typeof setTimeout> | null = null;
		li.addEventListener("click", (e) => {
			if (pending) {
				window.clearTimeout(pending);
				pending = null;
				return;
			}
			e.stopPropagation();
			e.preventDefault();
			pending = window.setTimeout(() => {
				pending = null;
				options.onEnterEdit!(node);
			}, 300);
		});
	}
	li.addEventListener("mouseenter", () => {
		li.addClass("task-bg-hover");
	});
	li.addEventListener("mouseleave", () => {
		li.removeClass("task-bg-hover");
		li.addClass(compact ? "task-bg-transparent" : "task-bg-primary");
	});
	if (showTooltip && compact) {
		const tipHtml = buildTooltip(node);
		if (tipHtml) {
			li.addEventListener("mouseenter", (e) =>
				tooltip.show(tipHtml, e.clientX, e.clientY),
			);
			li.addEventListener("mousemove", (e) =>
				tooltip.move(e.clientX, e.clientY),
			);
			li.addEventListener("mouseleave", () => tooltip.hide());
		}
	}
	return li;
}
