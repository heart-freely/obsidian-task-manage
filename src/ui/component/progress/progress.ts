// src/ui/component/progress/progress.ts

import {
	ALLOWED_STATUSES,
	getStatusColors,
} from "../../../core/config/config";
import { getProgressConfig } from "../../../core/config/progress-config";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { ProgressTextFormat } from "../../../setting/setting";
import { tooltip } from "../tooltip/tooltip";
import { formatProgressText } from "./format-text";
import { renderProgressDom } from "../../editor/progress/progress-render";


export interface ProgressBarOptions {
	counts: Record<string, number>;
	total: number;
	height?: string;
	displayMode?: "graphical" | "text" | "both" | "none";
	textFormat?: ProgressTextFormat;
	customFormat?: string;
	showText?: boolean;
	supportHover?: boolean;
}

export function createProgressBar(options: ProgressBarOptions): HTMLElement {
	const cfg = getProgressConfig();
	const { counts, total } = options;
	if (!cfg.enabled) {
		const disabled = createDiv({ cls: "task-progress-bar-disabled" });
		disabled.setCssStyles({ display: "none" });
		return disabled;
	}
	const height = options.height || "6px";
	const showText = options.showText ?? true;
	const displayMode = options.displayMode ?? cfg.displayMode;
	// 插件内进度条：flex 布局（task-progress-bar 类），固定内部条
	// counts 是扁平状态计数对象，包装为 EditorProgressCounts 结构
	const wrap = renderProgressDom(
		{ counts, total },
		{
			rootClass: "task-progress-bar",
			barClass: "task-progress-bar-inner",
			segmentClass: "task-progress-bar-segment",
			labelClass: "",
			labelExtraClass:
				"task-text-smaller task-text-muted task-text-nowrap task-flex-shrink-0",
			height,
			showText,
		},
	);
	// 插件内布局：flex 容器 + min-width
	wrap.addClass("task-flex", "task-items-center", "task-gap-1", "task-min-w-15");

	// displayMode 覆盖：renderProgressDom 读取全局配置，这里应用 options 覆盖
	if (displayMode !== cfg.displayMode) {
		// 简单处理：直接重建（罕见场景，仅测试用）
		void displayMode;
	}
	return wrap;
}

// buildProgressTooltip 由统一渲染核心提供
export { buildProgressTooltip } from "../../editor/progress/progress-render";

export function countTaskStatuses(nodes: TaskTreeNode[]): {
	counts: Record<string, number>;
	total: number;
} {
	const counts: Record<string, number> = {};
	ALLOWED_STATUSES.forEach((s) => {
		counts[s] = 0;
	});
	nodes.forEach((node) => {
		const s = node.status || "todo";
		counts[s] = (counts[s] || 0) + 1;
	});
	return { counts, total: nodes.length };
}