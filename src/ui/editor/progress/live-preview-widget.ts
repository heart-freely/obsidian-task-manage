// src/ui/editor/progress/live-preview-widget.ts
// 编辑模式（Live Preview）进度条 Widget — 渲染逻辑与插件内 createProgressBar 一致

import { WidgetType } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { formatProgressText } from "../../component/progress/progress";
import { getProgressConfig } from "../../../core/config/progress-config";
import { getStatusColors } from "../../../core/config/config";
import { tooltip } from "../../component/tooltip/tooltip";
import { EditorProgressCounts } from "./range-calculator";

export class TaskEditorProgressWidget extends WidgetType {
	constructor(
		private counts: EditorProgressCounts,
		private view: EditorView,
	) {
		super();
	}

	eq(other: TaskEditorProgressWidget): boolean {
		return (
			other.counts.total === this.counts.total &&
			JSON.stringify(other.counts.counts) ===
				JSON.stringify(this.counts.counts)
		);
	}

	toDOM(): HTMLElement {
		const cfg = getProgressConfig();
		const { counts, total } = this.counts;
		const wrap = createSpan({ cls: "task-editor-progress" });

		const wantGraphical =
			cfg.displayMode === "graphical" || cfg.displayMode === "both";
		const wantText = cfg.displayMode === "text" || cfg.displayMode === "both";
		const graphical = wantGraphical && total > 0;

		if (graphical) {
			const bar = wrap.createSpan({ cls: "task-editor-progress-bar" });
			const statusColors = getStatusColors();
			const order = [
				"todo",
				"scheduled",
				"in-progress",
				"cancelled",
				"completed",
			];
			const st = total || 1;
			let accumulated = 0;
			order.forEach((status) => {
				const count = counts[status] || 0;
				if (count > 0) {
					const pct = Math.min((count / st) * 100, 100 - accumulated);
					accumulated += pct;
					const seg = bar.createSpan({
						cls: "task-editor-progress-segment",
					});
					seg.setCssStyles({
						width: pct + "%",
						background:
							statusColors[status] || "var(--text-muted)",
					});
				}
			});
		}

		if (wantText) {
			const label = wrap.createSpan({
				cls: "task-editor-progress-label",
				text: formatProgressText(
					counts,
					total,
					cfg.textFormat,
					cfg.customFormat,
				),
			});
		}

		if (cfg.supportHover && total > 0) {
			const tipHtml = buildEditorTooltip(counts, total);
			wrap.addEventListener("mouseenter", (e) =>
				tooltip.show(tipHtml, e.clientX, e.clientY),
			);
			wrap.addEventListener("mousemove", (e) =>
				tooltip.move(e.clientX, e.clientY),
			);
			wrap.addEventListener("mouseleave", () => tooltip.hide());
		}

		return wrap;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

function buildEditorTooltip(
	counts: Record<string, number>,
	total: number,
): string {
	const st = total || 1;
	const parts: string[] = [];
	[
		{ k: "todo", i: "🔲", l: "待办中" },
		{ k: "scheduled", i: "❔", l: "计划中" },
		{ k: "in-progress", i: "⏩", l: "进行中" },
		{ k: "cancelled", i: "❎", l: "已取消" },
		{ k: "completed", i: "✅", l: "已完成" },
	].forEach(({ k, i, l }) => {
		const c = counts[k] || 0;
		parts.push(
			i +
				" " +
				l +
				" " +
				(st > 0 ? Math.round((c / st) * 100) : 0) +
				"% " +
				c,
		);
	});
	return parts.join("<br>");
}
