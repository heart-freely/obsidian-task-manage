// src/ui/editor/progress/live-preview-plugin.ts
// 编辑模式（Live Preview）进度条 CodeMirror ViewPlugin
// 扫描可见区域的任务行，计算行区间子任务并插入内嵌进度条 Widget

import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorState, Range, Text } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { TaskEditorProgressWidget } from "./live-preview-widget";
import { countTasksInRange } from "./range-calculator";
import { cacheTaskProgress } from "./progress-shared-cache";
import { getProgressConfig } from "../../../core/config/progress-config";

const TASK_LINE_RE = /^\s*([-*+]|\d+\.)\s\[(.)\]\s/;

class ProgressViewPluginValue {
	decorations: DecorationSet = Decoration.none;

	constructor(public view: EditorView) {
		try {
			this.decorations = this.buildDeco(view);
		} catch (e) {
			console.warn("[TaskManage] 进度条装饰构建失败:", e);
		}
	}

	update(update: ViewUpdate) {
		// 任意更新都重建（含设置变更后的强制刷新；扫描仅限可见区域，开销可忽略）
		try {
			this.decorations = this.buildDeco(update.view);
		} catch (e) {
			console.warn("[TaskManage] 进度条装饰更新失败:", e);
		}
	}

	private buildDeco(view: EditorView): DecorationSet {
		const cfg = getProgressConfig();
		if (!cfg.enabled || cfg.displayMode === "none") return Decoration.none;

		const decos: Range<Decoration>[] = [];
		const { from, to } = view.viewport;
		const doc = view.state.doc;
		const docLen = doc.length;

		let pos = Math.max(0, Math.min(from, docLen));
		// 当前标题上下文（用于 showProgressBarBasedOnHeading 过滤）
		let currentHeadingLabel = "";
		while (pos <= to && pos < docLen) {
			let line: { from: number; to: number; number: number };
			try {
				line = doc.lineAt(pos);
			} catch {
				break;
			}
			const text = doc.sliceString(line.from, line.to);
			const isTask = TASK_LINE_RE.test(text);
			const isHeading = /^\s*#{1,6}\s/.test(text);
			const isBullet = /^\s*([-*+]|\d+\.)\s/.test(text);
			if (isHeading) {
				currentHeadingLabel = text.replace(/^\s*#{1,6}\s+/, "").trim();
			}

			const allowedHeadings = cfg.showProgressBarBasedOnHeading
				.split(",")
				.map((h) => h.trim())
				.filter(Boolean);
			const headingAllowed =
				allowedHeadings.length === 0 ||
				allowedHeadings.includes(currentHeadingLabel);

			const shouldProcess =
				headingAllowed &&
				(isTask ||
					(cfg.addProgressBarToNonTaskBullet && isBullet) ||
					(cfg.addTaskProgressBarToHeading && isHeading));

			if (shouldProcess && !this.isExcluded(view.state, line.from)) {
				const range = isHeading
					? this.calcHeadingRange(doc, line.from, line.to)
					: this.calcRange(doc, line.from, line.to);
				if (range) {
					const rangeText = doc.sliceString(range.from, range.to);
					const counts = countTasksInRange(
						rangeText.split("\n"),
						cfg.countSubLevel,
					);
					if (counts.total > 0) {
						// 缓存父任务进度（供阅读模式复用，保证两模式一致）
						if (!isHeading) {
							const label = doc
								.sliceString(line.from, line.to)
								.replace(/^\s*([-*+]|\d+\.)\s\[[^\]]*\]\s*/, "")
								.trim()
								.slice(0, 40);
							cacheTaskProgress(label, counts);
						}
						const widgetDeco = Decoration.widget({
							widget: new TaskEditorProgressWidget(counts, view),
							side: 1,
						});
						decos.push(widgetDeco.range(line.to, line.to));
					}
				}
			}
			pos = line.to + 1;
		}

		return Decoration.set(decos.sort((a, b) => a.from - b.from), true);
	}

	/** 计算从 startPos 所在行开始到其子任务结束的文本区间 */
	private calcRange(
		doc: Text,
		startFrom: number,
		startTo: number,
	): { from: number; to: number } | null {
		const docLen = doc.length;
		const startIndent = this.lineIndent(doc, startFrom, startTo);
		let end = startTo;
		let pos = startTo + 1;
		const lineCount = doc.lines;

		while (pos <= docLen && end < docLen) {
			let line: { from: number; to: number; number: number };
			try {
				line = doc.lineAt(pos);
			} catch {
				break;
			}
			const text = doc.sliceString(line.from, line.to);
			if (text.trim() === "") {
				pos = line.to + 1;
				continue;
			}
			const indent = this.lineIndent(doc, line.from, line.to);
			if (indent <= startIndent) break;
			end = line.to;
			pos = line.to + 1;
		}
		return { from: startFrom, to: end };
	}

	/**
	 * 计算标题区间：从标题行的下一行开始，收集到下一个同级或更高级标题为止。
	 * 子标题（更低级）的任务也纳入统计（父标题汇总整个子树）。
	 */
	private calcHeadingRange(
		doc: Text,
		startFrom: number,
		startTo: number,
	): { from: number; to: number } | null {
		const lineCount = doc.lines;
		const startLineNo = doc.lineAt(startTo).number;
		const startText = doc.sliceString(startFrom, startTo).trim();
		const startMatch = startText.match(/^(#{1,6})\s/);
		const startLevel = startMatch ? startMatch[1].length : 0;
		let end = startTo;

		for (let n = startLineNo + 1; n <= lineCount; n++) {
			let line: { from: number; to: number; number: number };
			try {
				line = doc.line(n);
			} catch {
				break;
			}
			const text = doc.sliceString(line.from, line.to).trim();
			const hMatch = text.match(/^(#{1,6})\s/);
			if (hMatch) {
				// 同级或更高级标题 → 结束；子标题（更低级）→ 继续
				if (hMatch[1].length <= startLevel) break;
			}
			end = line.to;
		}
		return { from: startFrom, to: end };
	}

	private lineIndent(doc: Text, from: number, to: number): number {
		const text = doc.sliceString(from, Math.min(from + 40, to));
		let n = 0;
		for (const ch of text) {
			if (ch === " ") n++;
			else if (ch === "\t") n += 4;
			else break;
		}
		return n;
	}

	private isExcluded(state: EditorState, pos: number): boolean {
		try {
			const node = syntaxTree(state).resolveInner(pos + 1);
			const name = node.type.name || "";
			return (
				name.includes("hmd-codeblock") ||
				name.includes("hmd-frontmatter") ||
				name.includes("codeblock") ||
				name.includes("frontmatter")
			);
		} catch {
			return false;
		}
	}
}

export function taskProgressEditorExtension() {
	return ViewPlugin.fromClass(ProgressViewPluginValue, {
		decorations: (v) => v.decorations,
	});
}