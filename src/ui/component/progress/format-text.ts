// src/ui/component/progress/format-text.ts
// 进度文本格式化 — 独立模块，避免 progress.ts 与 progress-render.ts 循环依赖

import { getProgressConfig } from "../../../core/config/progress-config";
import { ProgressTextFormat } from "../../../setting/setting";

function doneCount(counts: Record<string, number>): number {
	return (counts["completed"] || 0) + (counts["cancelled"] || 0);
}

export function percentDone(
	counts: Record<string, number>,
	total: number,
): number {
	const st = total || 1;
	return Math.min(Math.round((doneCount(counts) / st) * 100), 100);
}

export function formatProgressText(
	counts: Record<string, number>,
	total: number,
	format: ProgressTextFormat,
	customFormat?: string,
): string {
	const st = total || 1;
	const completed = counts["completed"] || 0;
	const cancelled = counts["cancelled"] || 0;
	const inProgress = counts["in-progress"] || 0;
	const planned = counts["scheduled"] || 0;
	const abandoned = cancelled;
	const notStarted = counts["todo"] || 0;
	const done = completed + cancelled;
	const pct = Math.min(Math.round((done / st) * 100), 100);

	switch (format) {
		case "percentage":
			return pct + "%";
		case "bracketPercentage":
			return "[" + pct + "%]";
		case "fraction":
			return done + "/" + total;
		case "bracketFraction":
			return "[" + done + "/" + total + "]";
		case "detailed":
			return (
				"[" + completed + "✓ " + inProgress + "⟳ " + abandoned +
				"✗ " + planned + "? / " + total + "]"
			);
		case "range-based": {
			const cfg = getProgressConfig();
			if (cfg.customizeProgressRanges && cfg.progressRanges.length > 0) {
				const range = cfg.progressRanges.find(
					(r) => pct >= r.min && pct <= r.max,
				);
				if (range) {
					return range.text.replace(
						/{{PROGRESS}}/g,
						String(pct),
					);
				}
			}
			return pct + "%";
		}
		case "custom":
			if (customFormat) {
				return customFormat
					.replace(/{{COMPLETED}}/g, String(completed))
					.replace(/{{TOTAL}}/g, String(total))
					.replace(/{{IN_PROGRESS}}/g, String(inProgress))
					.replace(/{{PLANNED}}/g, String(planned))
					.replace(/{{ABANDONED}}/g, String(abandoned))
					.replace(/{{NOT_STARTED}}/g, String(notStarted))
					.replace(/{{PERCENT}}/g, String(pct))
					.replace(/{{PROGRESS}}/g, String(pct));
			}
			return "[" + done + "/" + total + "]";
		default:
			return pct + "%";
	}
}
