// src/core/process/gantt-view-process.ts
// 甘特图数据处理 — 时间区间、范围推断、网格级别、依赖路径

import { YEAR_RANGE_OFFSET } from "../../../core/store/preset/panel-preset";
import {
	getTaskTimeRange,
	normalizeIntervalMode,
} from "../../../core/task/task-derived";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { DateUtils } from "../../../util/date-utils";

export interface GanttTaskRow {
	start: Date;
	end: Date;
	durationMs: number;
	status: string;
}

export const GANTT_CONFIG = {
	TASK_BAR_RADIUS: 4,
	TASK_BAR_HEIGHT: 20,
	DEPENDENCY_LINE_COLOR: "#3a6ea5",
	DEPENDENCY_LINE_WIDTH: 1,
	DEPENDENCY_ARROW_SIZE: 5,
	ROW_HEIGHT: 28,
	HEADER_HEIGHT: 48,
	MIN_DAY_WIDTH: 0.5,
	MAX_DAY_WIDTH: 40,
	DEFAULT_DAY_WIDTH: 40,
	TREE_MIN_WIDTH: 200,
};

// ========== 持久化存储（内存缓存 + 异步持久化）==========

let _zoomCache: { dayWidth: number } | null = null;
let _zoomSaveFn: ((data: { dayWidth: number } | null) => Promise<void>) | null =
	null;

export function initGanttStorage(
	initialZoom: { dayWidth: number } | null,
	saveFn: (data: { dayWidth: number } | null) => Promise<void>,
) {
	_zoomCache = initialZoom;
	_zoomSaveFn = saveFn;
}

export function getZoomCache(): { dayWidth: number } | null {
	return _zoomCache;
}

export function loadZoomState(): { dayWidth: number } | null {
	return _zoomCache;
}

export function saveZoomState(dayWidth: number) {
	const data = { dayWidth };
	_zoomCache = data;
	if (_zoomSaveFn) {
		_zoomSaveFn(data).catch(() => {});
	}
}

export function getTaskInterval(
	node: TaskTreeNode,
	intervalMode: string = "scheduled-due",
): { start: Date; end: Date } | null {
	const range = getTaskTimeRange(node, normalizeIntervalMode(intervalMode));
	if (!range) return null;
	return { start: new Date(range.start), end: new Date(range.end) };
}

export function calcRangeFromRoots(
	roots: TaskTreeNode[],
	intervalMode: string = "scheduled-due",
	dateRange?: { start: number | null; end: number | null; isAll: boolean },
): { minTime: number; maxTime: number } {
	if (
		dateRange &&
		!dateRange.isAll &&
		dateRange.start != null &&
		dateRange.end != null
	) {
		return {
			minTime: DateUtils.setStart(new Date(dateRange.start)).getTime(),
			maxTime: DateUtils.setEnd(new Date(dateRange.end)).getTime(),
		};
	}
	const now = new Date();
	const currentYear = now.getFullYear();
	return {
		minTime: DateUtils.setStart(
			new Date(currentYear - YEAR_RANGE_OFFSET, 0, 1),
		).getTime(),
		maxTime: DateUtils.setEnd(
			new Date(currentYear + YEAR_RANGE_OFFSET, 11, 31),
		).getTime(),
	};
}

export function formatGanttDuration(ms: number): string {
	if (ms <= 0) return "1d";
	const days = ms / 86400000;
	if (days < 7) return Math.round(days) + "d";
	if (days < 30) return Math.round(days / 7) + "w";
	if (days < 365) return Math.round(days / 30) + "m";
	return Math.round(days / 365) + "y";
}

export function calcTreeMaxWidth(roots: TaskTreeNode[]): number {
	let maxDepth = 0;
	let maxTextLen = 0;
	function walk(node: TaskTreeNode, depth: number) {
		if (depth > maxDepth) maxDepth = depth;
		const text = node.text || "";
		if (text.length > maxTextLen) maxTextLen = text.length;
		for (const child of node.children) walk(child, depth + 1);
	}
	for (const root of roots) walk(root, 0);
	return Math.max(
		GANTT_CONFIG.TREE_MIN_WIDTH,
		maxDepth * 24 + maxTextLen * 8 + 100,
	);
}

export function isDarkTheme(): boolean {
	const bg = getComputedStyle(document.body)
		.getPropertyValue("--background-primary")
		.trim();
	if (bg.startsWith("#") && bg.length >= 7) {
		const r = parseInt(bg.slice(1, 3), 16);
		const g = parseInt(bg.slice(3, 5), 16);
		const b = parseInt(bg.slice(5, 7), 16);
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
		return luminance < 0.5;
	}
	return true;
}

export function getTimelineLayers(dayWidth: number) {
	const showDays = dayWidth >= 40;
	const showWeeks = dayWidth >= 15;
	const showMonths = dayWidth >= 5;
	const showQuarters = dayWidth >= 1.5;
	const layers: Array<{ name: string; height: number }> = [];
	layers.push({ name: "year", height: 0 });
	if (showQuarters) layers.push({ name: "quarter", height: 0 });
	if (showMonths) layers.push({ name: "month", height: 0 });
	if (showWeeks) layers.push({ name: "week", height: 0 });
	if (showDays) layers.push({ name: "day", height: 0 });
	const layerHeight = GANTT_CONFIG.HEADER_HEIGHT / layers.length;
	layers.forEach((l) => (l.height = layerHeight));
	return { layers, layerHeight };
}

export function getLayerStyle(
	layerIndex: number,
	totalLayers: number,
	dark: boolean,
): { fontSize: string; fontWeight: string; color: string } {
	const ratio = totalLayers > 1 ? layerIndex / (totalLayers - 1) : 0;
	const fontSize = Math.round(11 - ratio * 4) + "px";
	const fontWeight = ratio < 0.5 ? "600" : "400";
	let color: string;
	if (dark) {
		const lightness = Math.round(90 - ratio * 40);
		color = `hsl(0, 0%, ${lightness}%)`;
	} else {
		const lightness = Math.round(20 + ratio * 40);
		color = `hsl(0, 0%, ${lightness}%)`;
	}
	return { fontSize, fontWeight, color };
}

export function getGridLineStyle(
	intervalDays: number,
	dark: boolean,
): { width: string; color: string } {
	let width: string;
	let alpha: number;
	if (intervalDays >= 365) {
		width = "2px";
		alpha = dark ? 0.25 : 0.25;
	} else if (intervalDays >= 91) {
		width = "1.5px";
		alpha = dark ? 0.18 : 0.2;
	} else if (intervalDays >= 28) {
		width = "1px";
		alpha = dark ? 0.12 : 0.15;
	} else if (intervalDays >= 7) {
		width = "1px";
		alpha = dark ? 0.08 : 0.1;
	} else {
		width = "0.5px";
		alpha = dark ? 0.05 : 0.06;
	}
	const color = dark
		? `rgba(255, 255, 255, ${alpha})`
		: `rgba(0, 0, 0, ${alpha})`;
	return { width, color };
}

export function getGridLevels(
	dayWidth: number,
): Array<{ intervalDays: number }> {
	const gridLevels: Array<{ intervalDays: number }> = [];
	if (dayWidth >= 40) {
		gridLevels.push(
			{ intervalDays: 1 },
			{ intervalDays: 7 },
			{ intervalDays: 30 },
			{ intervalDays: 365 },
		);
	} else if (dayWidth >= 15) {
		gridLevels.push(
			{ intervalDays: 7 },
			{ intervalDays: 30 },
			{ intervalDays: 365 },
		);
	} else if (dayWidth >= 5) {
		gridLevels.push({ intervalDays: 30 }, { intervalDays: 365 });
	} else if (dayWidth >= 1.5) {
		gridLevels.push({ intervalDays: 91 }, { intervalDays: 365 });
	} else {
		gridLevels.push({ intervalDays: 365 });
	}
	return gridLevels;
}

export function getGridFirstLineDate(
	timeRange: { minTime: number; maxTime: number },
	intervalDays: number,
): Date {
	let firstLineDate: Date;
	if (intervalDays >= 365) {
		firstLineDate = new Date(timeRange.minTime);
		firstLineDate.setMonth(0, 1);
		firstLineDate.setHours(0, 0, 0, 0);
		if (firstLineDate.getTime() < timeRange.minTime)
			firstLineDate.setFullYear(firstLineDate.getFullYear() + 1);
	} else if (intervalDays >= 28) {
		firstLineDate = new Date(timeRange.minTime);
		firstLineDate.setDate(1);
		firstLineDate.setHours(0, 0, 0, 0);
		if (firstLineDate.getTime() < timeRange.minTime)
			firstLineDate.setMonth(firstLineDate.getMonth() + 1);
	} else if (intervalDays >= 7) {
		firstLineDate = new Date(timeRange.minTime);
		const day = firstLineDate.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		firstLineDate.setDate(firstLineDate.getDate() + diff);
		firstLineDate.setHours(0, 0, 0, 0);
		if (firstLineDate.getTime() < timeRange.minTime)
			firstLineDate.setDate(firstLineDate.getDate() + 7);
	} else {
		firstLineDate = new Date(timeRange.minTime);
		firstLineDate.setHours(0, 0, 0, 0);
		if (firstLineDate.getTime() < timeRange.minTime)
			firstLineDate.setDate(firstLineDate.getDate() + 1);
	}
	return firstLineDate;
}

export function advanceGridLineDate(date: Date, intervalDays: number): void {
	if (intervalDays >= 365) date.setFullYear(date.getFullYear() + 1);
	else if (intervalDays >= 91) date.setMonth(date.getMonth() + 3);
	else if (intervalDays >= 28) date.setMonth(date.getMonth() + 1);
	else date.setDate(date.getDate() + intervalDays);
}

export function calcBarEdges(
	node: TaskTreeNode,
	timeRange: { minTime: number; maxTime: number },
	timelineWidth: number,
	intervalMode: string,
): { left: number; width: number } | null {
	const interval = getTaskInterval(node, intervalMode);
	if (!interval) return null;
	const timeRangeMs = timeRange.maxTime - timeRange.minTime;
	const rawLeft =
		((interval.start.getTime() - timeRange.minTime) / timeRangeMs) *
		timelineWidth;
	const rawWidth = Math.max(
		2,
		((interval.end.getTime() - interval.start.getTime()) / timeRangeMs) *
			timelineWidth,
	);
	const clampedLeft = Math.max(0, rawLeft);
	const clampedRight = Math.min(timelineWidth, rawLeft + rawWidth);
	return {
		left: clampedLeft,
		width: Math.max(2, clampedRight - clampedLeft),
	};
}

export function calcDependencyPath(
	sx: number,
	sy: number,
	tx: number,
	ty: number,
): string {
	const as = GANTT_CONFIG.DEPENDENCY_ARROW_SIZE;
	const cornerX = tx - as;
	return [`M ${sx} ${sy}`, `L ${cornerX} ${sy}`, `L ${cornerX} ${ty}`].join(
		" ",
	);
}
