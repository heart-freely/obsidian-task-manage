// src/ui/editor/progress/live-preview-widget.ts
// 编辑模式（Live Preview）进度条 Widget — 复用统一渲染核心

import { WidgetType } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { EditorProgressCounts } from "./range-calculator";
import { renderProgressDom } from "./progress-render";

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
		return renderProgressDom(this.counts);
	}

	ignoreEvent(): boolean {
		return true;
	}
}
