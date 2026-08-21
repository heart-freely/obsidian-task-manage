// src/ui/editor/progress/progress-shared-cache.ts
// 共享进度缓存：编辑模式统计的父任务进度，供阅读模式复用（保证两种模式一致）
// key = docId + ":" + 归一化任务文本，避免跨文档同名任务覆盖

import { EditorProgressCounts } from "./range-calculator";

const taskProgressCache = new Map<string, EditorProgressCounts>();

function cacheKey(docId: string, label: string): string {
	return docId + ":" + label;
}

/** 记录一个父任务的进度（key = docId + 归一化任务文本） */
export function cacheTaskProgress(
	docId: string,
	label: string,
	counts: EditorProgressCounts,
): void {
	if (!label) return;
	taskProgressCache.set(cacheKey(docId, label), counts);
}

/** 读取缓存的父任务进度 */
export function getCachedTaskProgress(
	docId: string,
	label: string,
): EditorProgressCounts | null {
	return taskProgressCache.get(cacheKey(docId, label)) || null;
}

/** 清空缓存（文档切换时） */
export function clearTaskProgressCache(): void {
	taskProgressCache.clear();
}
