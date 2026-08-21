// src/core/config/progress-config.ts
// 进度显示配置 — 模块级单例，由设置页保存时更新，各视图读取

import { ProgressDisplayMode, ProgressTextFormat } from "../../setting/setting";

export interface ProgressDisplayConfig {
	displayMode: ProgressDisplayMode;
	textFormat: ProgressTextFormat;
	customFormat: string;
	supportHover: boolean;
	countSubLevel: boolean;
	hideBasedOnConditions: boolean;
	hideTags: string[];
	hideFolders: string[];
	hideMetadata: string[];
}

const DEFAULT_PROGRESS_CONFIG: ProgressDisplayConfig = {
	displayMode: "graphical",
	textFormat: "bracketFraction",
	customFormat: "[{{COMPLETED}}/{{TOTAL}}]",
	supportHover: true,
	countSubLevel: true,
	hideBasedOnConditions: false,
	hideTags: [],
	hideFolders: [],
	hideMetadata: [],
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
	progressDisplayMode: ProgressDisplayMode;
	progressTextFormat: ProgressTextFormat;
	customProgressFormat: string;
	supportHoverProgressInfo: boolean;
	countSubLevel: boolean;
	hideProgressBarBasedOnConditions: boolean;
	hideProgressBarTags: string;
	hideProgressBarFolders: string;
	hideProgressBarMetadata: string;
}): void {
	updateProgressConfig({
		displayMode: settings.progressDisplayMode,
		textFormat: settings.progressTextFormat,
		customFormat: settings.customProgressFormat,
		supportHover: settings.supportHoverProgressInfo,
		countSubLevel: settings.countSubLevel,
		hideBasedOnConditions: settings.hideProgressBarBasedOnConditions,
		hideTags: splitList(settings.hideProgressBarTags),
		hideFolders: splitList(settings.hideProgressBarFolders),
		hideMetadata: splitList(settings.hideProgressBarMetadata),
	});
}

export function getProgressConfig(): ProgressDisplayConfig {
	return progressConfig;
}
