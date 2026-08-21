// src/ui/editor/progress/range-calculator.ts
// 编辑器 Widget 的任务区间统计 — 与插件内 countTaskStatuses 口径一致

import { getProgressConfig } from "../../../core/config/progress-config";
import { SYMBOL_TO_STATUS } from "../../../core/config/config";

export interface EditorProgressCounts {
	counts: Record<string, number>;
	total: number;
}

const TAB_SIZE = 4;

/**
 * 从文档文本区间统计子任务。
 * lines[0] 为父任务自身（跳过），lines[1..] 为其子树。
 * 复用 SYMBOL_TO_STATUS 映射，保证与插件内进度条统计口径一致。
 *
 * countSubLevel=true（默认）：统计区间内全部任务行
 * countSubLevel=false：仅统计缩进恰好深一层的直接子任务
 */
export function countTasksInRange(
	lines: string[],
	countSubLevel?: boolean,
): EditorProgressCounts {
	const cfg = getProgressConfig();
	const useRecursive = countSubLevel ?? cfg.countSubLevel;

	const counts: Record<string, number> = {};
	const firstIndent = indentOf(lines[0] ?? "");
	const firstLevel = Math.floor(firstIndent / TAB_SIZE);

	let counted = 0;

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		if (!trimmed) continue;

		const m = trimmed.match(/^([-*+]|\d+\.)\s\[(.)\]\s/);
		if (!m) continue;

		if (!useRecursive) {
			const level = Math.floor(indentOf(line) / TAB_SIZE);
			// 只统计恰好深一层的直接子任务；更深或同级都不计
			if (level !== firstLevel + 1) continue;
		}

		const symbol = m[2];
		const status = SYMBOL_TO_STATUS[symbol] || "todo";
		counts[status] = (counts[status] || 0) + 1;
		counted++;
	}

	return { counts, total: counted };
}

function indentOf(line: string): number {
	let n = 0;
	for (const ch of line) {
		if (ch === " ") n++;
		else if (ch === "\t") n += 4;
		else break;
	}
	return n;
}