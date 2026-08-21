// src/core/config/progress-config.ts
// 进度显示配置 — 模块级单例，由设置页保存时更新，各视图读取

import {
	ProgressDisplayMode,
	ProgressRange,
	ProgressTextFormat,
} from "../../setting/setting";

export interface ProgressDisplayConfig {
	/** 启用进度显示（总开关） */
	enabled: boolean;
	displayMode: ProgressDisplayMode;
	textFormat: ProgressTextFormat;
	customFormat: string;
	supportHover: boolean;
	countSubLevel: boolean;
	hideBasedOnConditions: boolean;
	hideTags: string[];
	hideFolders: string[];
	hideMetadata: string[];
	/** 为标题添加进度条（编辑/阅读模式） */
	addTaskProgressBarToHeading: boolean;
	/** 为普通列表项添加进度条（编辑/阅读模式） */
	addProgressBarToNonTaskBullet: boolean;
	/** 仅在这些标题下显示进度条 */
	showProgressBarBasedOnHeading: string;
	/** 使用自定义进度范围文本 */
	customizeProgressRanges: boolean;
	/** 进度范围配置 */
	progressRanges: ProgressRange[];
}

const DEFAULT_PROGRESS_CONFIG: ProgressDisplayConfig = {
	enabled: true,
	displayMode: "graphical",
	textFormat: "bracketFraction",
	customFormat: "[{{COMPLETED}}/{{TOTAL}}]",
	supportHover: true,
	countSubLevel: true,
	hideBasedOnConditions: false,
	hideTags: [],
	hideFolders: [],
	hideMetadata: [],
	addTaskProgressBarToHeading: false,
	addProgressBarToNonTaskBullet: false,
	showProgressBarBasedOnHeading: "",
	customizeProgressRanges: false,
	progressRanges: [
		{ min: 0, max: 20, text: "刚开始 {{PROGRESS}}%" },
		{ min: 20, max: 40, text: "进行中 {{PROGRESS}}%" },
		{ min: 40, max: 60, text: "完成一半 {{PROGRESS}}%" },
		{ min: 60, max: 80, text: "进展良好 {{PROGRESS}}%" },
		{ min: 80, max: 100, text: "即将完成 {{PROGRESS}}%" },
	],
};

let progressConfig: ProgressDisplayConfig = { ...DEFAULT_PROGRESS_CONFIG };

function splitList(value: string): string[] {
	return value
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

export function updateProgressConfig(config: Partial<ProgressDisplayConfig>): void {
	progressConfig = {
		...progressConfig,
		...config,
		hideTags: config.hideTags ?? progressConfig.hideTags,
		hideFolders: config.hideFolders ?? progressConfig.hideFolders,
		hideMetadata: config.hideMetadata ?? progressConfig.hideMetadata,
	};
}

/** 从 TaskManageSettings 同步进度显示配置 */
export function syncProgressConfig(settings: {
	enableProgressDisplay: boolean;
	progressDisplayMode: ProgressDisplayMode;
	progressTextFormat: ProgressTextFormat;
	customProgressFormat: string;
	supportHoverProgressInfo: boolean;
	countSubLevel: boolean;
	hideProgressBarBasedOnConditions: boolean;
	hideProgressBarTags: string;
	hideProgressBarFolders: string;
	hideProgressBarMetadata: string;
	addTaskProgressBarToHeading: boolean;
	addProgressBarToNonTaskBullet: boolean;
	showProgressBarBasedOnHeading: string;
	customizeProgressRanges: boolean;
	progressRanges: ProgressRange[];
}): void {
	updateProgressConfig({
		enabled: settings.enableProgressDisplay,
		displayMode: settings.progressDisplayMode,
		textFormat: settings.progressTextFormat,
		customFormat: settings.customProgressFormat,
		supportHover: settings.supportHoverProgressInfo,
		countSubLevel: settings.countSubLevel,
		hideBasedOnConditions: settings.hideProgressBarBasedOnConditions,
		hideTags: splitList(settings.hideProgressBarTags),
		hideFolders: splitList(settings.hideProgressBarFolders),
		hideMetadata: splitList(settings.hideProgressBarMetadata),
		addTaskProgressBarToHeading: settings.addTaskProgressBarToHeading,
		addProgressBarToNonTaskBullet:
			settings.addProgressBarToNonTaskBullet,
		showProgressBarBasedOnHeading:
			settings.showProgressBarBasedOnHeading,
		customizeProgressRanges: settings.customizeProgressRanges,
		progressRanges: settings.progressRanges,
	});
}

export function getProgressConfig(): ProgressDisplayConfig {
	return progressConfig;
}
