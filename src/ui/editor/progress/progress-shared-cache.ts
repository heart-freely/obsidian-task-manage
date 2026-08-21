// src/ui/editor/progress/progress-shared-cache.ts
// 共享进度缓存：编辑模式统计的父任务进度，供阅读模式复用（保证两种模式一致）

import { EditorProgressCounts } from "./range-calculator";

const taskProgressCache = new Map<string, EditorProgressCounts>();

/** 记录一个父任务的进度（key = 任务文本首行） */
export function cacheTaskProgress(label: string, counts: EditorProgressCounts): void {
	if (!label) return;
	taskProgressCache.set(label, counts);
}

/** 读取缓存的父任务进度 */
export function getCachedTaskProgress(label: string): EditorProgressCounts | null {
	return taskProgressCache.get(label) || null;
}

/** 清空缓存（文档切换时） */
export function clearTaskProgressCache(): void {
	taskProgressCache.clear();
}
