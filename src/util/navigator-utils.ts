// src/util/navigator-utils.ts
// 任务导航工具 — 跳转到文件对应行

import { TaskTreeNode } from "../core/task/task-tree";

export class TaskNavigator {
	/**
	 * 打开任务所在文件并跳转到对应行
	 * @param app Obsidian App 实例
	 * @param node 任务节点
	 */
	static async openTaskAtLine(app: any, node: TaskTreeNode): Promise<void> {
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

		// 延迟执行滚动，等待编辑器完全加载
		setTimeout(() => {
			TaskNavigator.scrollToLine(leaf, targetLine);
		}, 300);
	}

	/**
	 * 滚动编辑器到指定行
	 */
	private static scrollToLine(leaf: any, targetLine: number): void {
		const view = leaf.view as any;
		const state = view?.getState?.();
		const mode = state?.mode || "source";

		// 预览模式特殊处理
		if (mode === "preview") {
			view?.previewMode?.applyScroll?.(targetLine);
			return;
		}

		const editor = view?.editor;
		if (!editor) return;

		const clampedLine = Math.min(targetLine, editor.lineCount() - 1);

		// 设置光标和选中
		editor.setCursor({ line: clampedLine, ch: 0 });
		editor.setSelection(
			{ line: clampedLine, ch: 0 },
			{
				line: clampedLine,
				ch: editor.getLine(clampedLine)?.length || 0,
			},
		);

		// 使用新版 API 滚动
		try {
			editor.scrollIntoView(
				{
					from: { line: clampedLine, ch: 0 },
					to: { line: clampedLine, ch: 0 },
				},
				true,
			);
		} catch {
			// 降级方案：使用 cm 的旧 API
			const cm = editor.cm;
			if (cm) {
				const halfHeight = Math.floor(
					(cm.getScrollInfo?.() || cm.scrollDOM)?.clientHeight / 2 ||
						200,
				);
				cm.scrollIntoView?.({ line: clampedLine, ch: 0 }, halfHeight);
			}
		}
	}
}
