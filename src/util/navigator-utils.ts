// src/util/navigator-utils.ts
// 任务导航工具 — 跳转到文件对应行

import { TaskTreeNode } from "../core/task/task-tree";

/** Obsidian 相关类型的最小接口 */
interface LeafLike {
	setViewState(state: { type: string; active?: boolean }): Promise<void>;
	openFile(
		file: { path: string },
		options?: { active?: boolean },
	): Promise<void>;
	setEphemeralState(state: Record<string, unknown>): void;
	view: ViewLike;
}

interface ViewLike {
	getState(): { mode?: string };
	editor?: EditorLike;
	previewMode?: { applyScroll(line: number): void };
}

interface EditorLike {
	lineCount(): number;
	getLine(line: number): string;
	setCursor(pos: { line: number; ch: number }): void;
	setSelection(
		from: { line: number; ch: number },
		to: { line: number; ch: number },
	): void;
	scrollIntoView(
		range: {
			from: { line: number; ch: number };
			to: { line: number; ch: number };
		},
		center?: boolean,
	): void;
	cm?: {
		scrollIntoView(
			pos: { line: number; ch: number },
			margin?: number,
		): void;
		getScrollInfo(): { clientHeight: number };
		scrollDOM: { clientHeight: number };
	};
}

interface AppLike {
	vault: {
		getAbstractFileByPath(path: string): { path: string } | null;
	};
	workspace: {
		getLeaf(split?: boolean | "tab" | "split"): LeafLike;
		getLeavesOfType(type: string): LeafLike[];
		setActiveLeaf(leaf: LeafLike, options?: { focus?: boolean }): void;
	};
}

export class TaskNavigator {
	static async openTaskAtLine(
		app: AppLike,
		node: TaskTreeNode,
	): Promise<void> {
		if (!node?.path) return;

		const file = app.vault.getAbstractFileByPath(node.path);
		if (!file) return;

		const targetLine = node.line;
		const leaf = app.workspace.getLeaf(false);

		await leaf.openFile(file, { active: true });

		leaf.setEphemeralState({
			line: targetLine,
			startLoc: { line: targetLine, ch: 0, offset: 0 },
		});

		window.setTimeout(() => {
			TaskNavigator.scrollToLine(leaf, targetLine);
		}, 300);
	}

	private static scrollToLine(leaf: LeafLike, targetLine: number): void {
		const view = leaf.view;
		const state = view.getState();
		const mode = state.mode || "source";

		if (mode === "preview") {
			view.previewMode?.applyScroll(targetLine);
			return;
		}

		const editor = view.editor;
		if (!editor) return;

		const clampedLine = Math.min(targetLine, editor.lineCount() - 1);

		editor.setCursor({ line: clampedLine, ch: 0 });
		editor.setSelection(
			{ line: clampedLine, ch: 0 },
			{
				line: clampedLine,
				ch: editor.getLine(clampedLine)?.length || 0,
			},
		);

		try {
			editor.scrollIntoView(
				{
					from: { line: clampedLine, ch: 0 },
					to: { line: clampedLine, ch: 0 },
				},
				true,
			);
		} catch {
			const cm = editor.cm;
			if (cm) {
				const halfHeight = Math.floor(
					(cm.getScrollInfo?.() || cm.scrollDOM)?.clientHeight / 2 ||
						200,
				);
				cm.scrollIntoView({ line: clampedLine, ch: 0 }, halfHeight);
			}
		}
	}
}
