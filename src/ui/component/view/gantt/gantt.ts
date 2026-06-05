// src/ui/component/gantt/gantt.ts
// 甘特图通用视图组件——支持虚拟滚动、依赖箭头、三画布分层

import { STATUS_ICONS } from "../../../../process/config/config";
import { DateUtils } from "../../../../process/process";

// ========== 类型定义 ==========

interface GanttFlatNode {
	type: "folder" | "file" | "task";
	name: string;
	path?: string;
	fullPath: string;
	level: number;
	task?: any;
	tasks?: any[];
	children?: GanttFlatNode[];
}

interface GanttTaskRow {
	task: any;
	start: Date;
	end: Date;
	durationMs: number;
	status: string;
	flatIndex: number;
}

interface GanttArrow {
	fromX: number;
	fromY: number;
	midX: number;
	toX: number;
	toY: number;
}

// ========== 全局状态（每次渲染独立） ==========

interface GanttState {
	wrapper: HTMLElement | null;
	canvas: HTMLCanvasElement | null;
	ctx: CanvasRenderingContext2D | null;
	bgCanvas: HTMLCanvasElement | null;
	bgCtx: CanvasRenderingContext2D | null;
	hoverCanvas: HTMLCanvasElement | null;
	hoverCtx: CanvasRenderingContext2D | null;

	flatNodes: GanttFlatNode[];
	ganttTasks: GanttTaskRow[];

	minTime: number;
	maxTime: number;
	scale: number;
	offsetX: number;
	scrollTop: number;

	rowHeight: number;
	headerHeight: number;
	leftWidth: number;

	timeToX: ((t: number) => number) | null;

	collapsedNodes: Set<string>;
	hoveredBarTaskId: string | null;

	taskBarPath: Path2D | null;

	isResizing: boolean;
	isDragging: boolean;
	lastDragX: number;

	tooltipDiv: HTMLElement | null;
	resizeObserver: ResizeObserver | null;

	cleanup: (() => void) | null;
}

// ========== 配置 ==========

const CONFIG = {
	STATUS_COLORS: {
		todo: "#2e333b",
		planned: "#4b525b",
		"in-progress": "#7fb8f0",
		completed: "#47852f",
		cancelled: "#c3393e",
	} as Record<string, string>,
	TASK_BAR_RADIUS: 4,
	TASK_BAR_HEIGHT: 20,
	DEPENDENCY_LINE_COLOR: "#3a6ea5",
	DEPENDENCY_LINE_WIDTH: 1,
	DEPENDENCY_ARROW_SIZE: 6,
	ROW_HEIGHT: 28,
	HEADER_HEIGHT: 30,
	LEFT_PANEL_WIDTH: 300,
	MIN_LEFT_WIDTH: 200,
	MAX_LEFT_WIDTH: 500,
	SCALE_MIN: 0.5,
	SCALE_MAX: 5,
};

// ========== 日期工具 ==========

const {
	formatDate,
	setStart,
	setEnd,
	getISOWeekNumber,
	getWeekRangeByYearWeek,
} = DateUtils;

// ========== 主题缓存 ==========

function cacheTheme(): {
	text: string;
	grid: string;
	accent: string;
	bg: string;
	secondary: string;
	font: string;
	boldFont: string;
	fontFam: string;
} {
	const style = getComputedStyle(document.body);
	const fontFam =
		style.getPropertyValue("--font-text") || "Inter, sans-serif";
	return {
		text: style.getPropertyValue("--text-normal").trim() || "#333",
		grid:
			style.getPropertyValue("--background-modifier-border").trim() ||
			"#ccc",
		accent: style.getPropertyValue("--text-accent").trim() || "#4dabf7",
		bg: style.getPropertyValue("--background-primary").trim() || "#fff",
		secondary:
			style.getPropertyValue("--background-secondary").trim() ||
			"#f0f0f0",
		font: `13px ${fontFam}`,
		boldFont: `bold 13px ${fontFam}`,
		fontFam,
	};
}

// ========== Path2D 缓存 ==========

function getTaskBarPath(): Path2D {
	const r = CONFIG.TASK_BAR_RADIUS;
	const w = 100,
		h = CONFIG.TASK_BAR_HEIGHT;
	const p = new Path2D();
	p.moveTo(r, 0);
	p.lineTo(w - r, 0);
	p.quadraticCurveTo(w, 0, w, r);
	p.lineTo(w, h - r);
	p.quadraticCurveTo(w, h, w - r, h);
	p.lineTo(r, h);
	p.quadraticCurveTo(0, h, 0, h - r);
	p.lineTo(0, r);
	p.quadraticCurveTo(0, 0, r, 0);
	p.closePath();
	return p;
}

// ========== 任务间隔计算 ==========

function getTaskInterval(task: any): { start: Date; end: Date } | null {
	const startStr = task._scheduled;
	const endStr = task._due;
	if (!startStr || !endStr) return null;
	const start = new Date(startStr);
	const end = new Date(endStr);
	if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
	return { start: start < end ? start : end, end: start < end ? end : start };
}

// ========== 构建树结构 ==========

function buildGanttTree(tasks: any[], prefix: string): GanttFlatNode[] {
	const fileMap = new Map<string, any[]>();
	for (const task of tasks) {
		if (!fileMap.has(task.path)) fileMap.set(task.path, []);
		fileMap.get(task.path)!.push(task);
	}

	const pathTree = new Map<string, any>();
	for (const [path, fileTasks] of fileMap.entries()) {
		const relPath = path.startsWith(prefix)
			? path.slice(prefix.length)
			: path;
		const parts = relPath.split("/");
		let current = pathTree;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!current.has(parts[i])) current.set(parts[i], new Map());
			current = current.get(parts[i]);
		}
		const fileName = parts[parts.length - 1].replace(/\.md$/, "");
		if (!current.has("__files")) current.set("__files", new Map());
		current.get("__files").set(fileName, { path, tasks: fileTasks });
	}

	return convertToNodes(pathTree, 0);
}

function convertToNodes(
	node: Map<string, any>,
	level: number,
): GanttFlatNode[] {
	const result: GanttFlatNode[] = [];
	const folders = Array.from(node.keys())
		.filter((k) => k !== "__files")
		.sort();

	for (const folderName of folders) {
		const subNode = node.get(folderName);
		const folderNode: GanttFlatNode = {
			type: "folder",
			name: folderName,
			fullPath: folderName,
			level,
			children: convertToNodes(subNode, level + 1),
		};
		result.push(folderNode);
	}

	const files = node.get("__files") as Map<string, any> | undefined;
	if (files) {
		const fileNames = Array.from(files.keys()).sort();
		for (const fileName of fileNames) {
			const fileData = files.get(fileName)!;
			const fileNode: GanttFlatNode = {
				type: "file",
				name: fileName,
				path: fileData.path,
				fullPath: fileData.path,
				level,
				tasks: fileData.tasks,
				children: fileData.tasks.map((t: any) => ({
					type: "task" as const,
					name: t._cleanText || t.text || "",
					fullPath: t.path + ":" + (t.lineNumber ?? t.line),
					level: level + 1,
					task: t,
				})),
			};
			result.push(fileNode);
		}
	}

	return result;
}

// ========== 扁平化节点 ==========

function flattenNodes(
	nodes: GanttFlatNode[],
	collapsed: Set<string>,
): GanttFlatNode[] {
	const result: GanttFlatNode[] = [];

	function walk(nodeList: GanttFlatNode[], level: number) {
		for (const node of nodeList) {
			node.level = level;
			result.push(node);
			const isExpanded = !collapsed.has(node.fullPath);
			if (isExpanded && node.children) {
				walk(node.children, level + 1);
			}
		}
	}

	walk(nodes, 0);
	return result;
}

// ========== 构建甘特图任务行 ==========

function buildGanttTaskRows(flatNodes: GanttFlatNode[]): GanttTaskRow[] {
	const rows: GanttTaskRow[] = [];
	for (let i = 0; i < flatNodes.length; i++) {
		const node = flatNodes[i];
		if (node.type !== "task" || !node.task) continue;
		const interval = getTaskInterval(node.task);
		if (!interval) continue;
		rows.push({
			task: node.task,
			start: interval.start,
			end: interval.end,
			durationMs: interval.end.getTime() - interval.start.getTime(),
			status: node.task._status || "todo",
			flatIndex: i,
		});
	}
	return rows;
}

// ========== 格式化时长 ==========

function formatDuration(ms: number): string {
	if (ms <= 0) return "";
	const days = ms / (1000 * 60 * 60 * 24);
	if (days < 7) return Math.round(days) + "d";
	if (days < 30) return Math.round(days / 7) + "w";
	if (days < 365) return Math.round(days / 30) + "m";
	return Math.round(days / 365) + "y";
}

// ========== 更新画布大小 ==========

function updateCanvasSize(state: GanttState) {
	if (
		!state.wrapper ||
		!state.canvas ||
		!state.bgCanvas ||
		!state.hoverCanvas
	)
		return;

	const totalRows = state.flatNodes.length;
	const totalHeight = state.headerHeight + totalRows * state.rowHeight + 20;
	const width = state.wrapper.clientWidth;
	const dpr = window.devicePixelRatio || 1;

	state.canvas.width = width * dpr;
	state.canvas.height = Math.max(400, totalHeight) * dpr;
	state.canvas.style.width = width + "px";
	state.canvas.style.height = Math.max(400, totalHeight) + "px";

	state.bgCanvas.width = width * dpr;
	state.bgCanvas.height = Math.max(400, totalHeight) * dpr;
	state.bgCanvas.style.width = width + "px";
	state.bgCanvas.style.height = Math.max(400, totalHeight) + "px";

	state.hoverCanvas.width = width * dpr;
	state.hoverCanvas.height = Math.max(400, totalHeight) * dpr;
	state.hoverCanvas.style.width = width + "px";
	state.hoverCanvas.style.height = Math.max(400, totalHeight) + "px";

	state.ctx!.setTransform(1, 0, 0, 1, 0, 0);
	state.ctx!.scale(dpr, dpr);
	state.bgCtx!.setTransform(1, 0, 0, 1, 0, 0);
	state.bgCtx!.scale(dpr, dpr);
	state.hoverCtx!.setTransform(1, 0, 0, 1, 0, 0);
	state.hoverCtx!.scale(dpr, dpr);
}

// ========== 更新 X 坐标映射 ==========

function updateTimeToX(state: GanttState) {
	const dpr = window.devicePixelRatio || 1;
	const w = state.canvas!.width / dpr;
	const chartWidth = w - state.leftWidth - 20;
	const chartStartX = state.leftWidth + 10 + state.offsetX;
	const timeRange = state.maxTime - state.minTime || 86400000;
	state.timeToX = (time: number) => {
		return (
			chartStartX +
			((time - state.minTime) / timeRange) * chartWidth * state.scale
		);
	};
}

// ========== 偏移限制 ==========

function clampOffset(state: GanttState) {
	const dpr = window.devicePixelRatio || 1;
	const w = state.canvas!.width / dpr;
	const chartWidth = w - state.leftWidth - 20;
	const maxOffset = 0;
	const minOffset = -(chartWidth * state.scale - chartWidth);
	if (state.offsetX > maxOffset) state.offsetX = maxOffset;
	if (state.offsetX < minOffset) state.offsetX = minOffset;
}

// ========== 绘制静态背景 ==========

function drawStaticBackground(state: GanttState) {
	if (!state.bgCanvas || !state.bgCtx) return;
	const ctx = state.bgCtx;
	const dpr = window.devicePixelRatio || 1;
	const w = state.bgCanvas.width / dpr;
	const h = state.bgCanvas.height / dpr;
	const theme = cacheTheme();

	ctx.clearRect(0, 0, w, h);
	ctx.fillStyle = theme.secondary;
	ctx.fillRect(0, 0, state.leftWidth, h);
	ctx.fillStyle = theme.bg;
	ctx.fillRect(state.leftWidth, 0, w - state.leftWidth, h);
	ctx.strokeStyle = theme.grid;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(state.leftWidth, 0);
	ctx.lineTo(state.leftWidth, h);
	ctx.stroke();
}

// ========== 绘制动态内容 ==========

function drawDynamicContent(state: GanttState) {
	if (!state.canvas || !state.ctx || !state.timeToX) return;
	const ctx = state.ctx;
	const dpr = window.devicePixelRatio || 1;
	const w = state.canvas.width / dpr;
	const h = state.canvas.height / dpr;
	const theme = cacheTheme();
	const timeToX = state.timeToX;

	ctx.clearRect(0, 0, w, h);
	if (state.bgCanvas) ctx.drawImage(state.bgCanvas, 0, 0, w, h);

	const scrollTop = state.scrollTop;
	const yOffset = state.headerHeight - scrollTop;

	// 虚拟滚动范围
	const startRow = Math.max(0, Math.floor(scrollTop / state.rowHeight) - 3);
	const endRow = Math.min(
		state.flatNodes.length,
		Math.ceil((scrollTop + h) / state.rowHeight) + 3,
	);

	// 绘制左侧树节点
	ctx.font = theme.font;
	ctx.textBaseline = "middle";
	for (let i = startRow; i < endRow; i++) {
		const node = state.flatNodes[i];
		const y = yOffset + i * state.rowHeight + state.rowHeight / 2;
		let x = 10 + node.level * 16;

		if (node.type === "folder" || node.type === "file") {
			ctx.fillStyle = theme.text;
			ctx.font = `12px ${theme.fontFam}`;
			ctx.textAlign = "center";
			const isExpanded = !state.collapsedNodes.has(node.fullPath);
			ctx.fillText(isExpanded ? "▼" : "▶", x + 6, y);
			x += 20;
			ctx.fillStyle = theme.accent;
			ctx.font = theme.boldFont;
			ctx.textAlign = "left";
			const icon = node.type === "folder" ? "📁 " : "📄 ";
			ctx.fillText(
				icon +
					node.name +
					(node.tasks ? ` (${node.tasks.length})` : ""),
				x,
				y,
			);
		} else if (node.type === "task") {
			x += 20;
			ctx.fillStyle = theme.text;
			ctx.font = theme.font;
			const icon = STATUS_ICONS[node.task?._status] || "🔲";
			ctx.fillText(
				icon + " " + (node.task?._cleanText || node.name),
				x,
				y,
			);
		}
	}

	// 网格线
	ctx.strokeStyle = theme.grid;
	ctx.lineWidth = 0.5;
	const weekStart = new Date(state.minTime);
	weekStart.setHours(0, 0, 0, 0);
	const day = weekStart.getDay();
	const diff = day === 0 ? 6 : day - 1;
	weekStart.setDate(weekStart.getDate() - diff);
	while (weekStart.getTime() <= state.maxTime) {
		const x = timeToX(weekStart.getTime());
		if (x >= state.leftWidth && x <= w) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
		weekStart.setDate(weekStart.getDate() + 7);
	}

	// 今日线
	const today = setStart(new Date()).getTime();
	if (today >= state.minTime && today <= state.maxTime) {
		const todayX = timeToX(today);
		ctx.beginPath();
		ctx.moveTo(todayX, 0);
		ctx.lineTo(todayX, h);
		ctx.strokeStyle = "#ffaa00";
		ctx.lineWidth = 1.5;
		ctx.setLineDash([4, 4]);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	// 任务条
	const barPath = state.taskBarPath || getTaskBarPath();
	for (const item of state.ganttTasks) {
		if (item.flatIndex < startRow || item.flatIndex >= endRow) continue;
		const startX = timeToX(item.start.getTime());
		const endX = timeToX(item.end.getTime());
		const y =
			yOffset +
			item.flatIndex * state.rowHeight +
			(state.rowHeight - CONFIG.TASK_BAR_HEIGHT) / 2;
		let barWidth = endX - startX;
		if (barWidth < 2) barWidth = 2;

		ctx.fillStyle =
			CONFIG.STATUS_COLORS[item.status] || CONFIG.STATUS_COLORS["todo"];
		ctx.globalAlpha = 0.8;
		ctx.save();
		ctx.translate(startX, y);
		ctx.scale(barWidth / 100, 1);
		ctx.fill(barPath);
		ctx.restore();

		// 完成进度
		if (item.task._done) {
			const doneTime = new Date(item.task._done).getTime();
			if (
				doneTime >= item.start.getTime() &&
				doneTime <= item.end.getTime()
			) {
				const progressX = timeToX(doneTime);
				const progressWidth = progressX - startX;
				if (progressWidth > 0) {
					ctx.fillStyle = "#2e7d32";
					ctx.globalAlpha = 0.5;
					ctx.save();
					ctx.translate(startX, y);
					ctx.scale(progressWidth / 100, 1);
					ctx.fill(barPath);
					ctx.restore();
				}
			}
		}
		ctx.globalAlpha = 1.0;

		// 时长标注
		const durationText = formatDuration(item.durationMs);
		if (durationText) {
			ctx.fillStyle = theme.text;
			ctx.font = `11px ${theme.fontFam}`;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			const textX = endX + 4;
			const textY = y + CONFIG.TASK_BAR_HEIGHT / 2;
			if (textX < w - 50) ctx.fillText(durationText, textX, textY);
		}
	}

	// 依赖箭头
	const arrows: GanttArrow[] = [];
	const taskIdMap = new Map<string, any>();
	for (const item of state.ganttTasks) {
		if (item.task._id) taskIdMap.set(item.task._id, item.task);
	}

	for (const item of state.ganttTasks) {
		if (item.flatIndex < startRow || item.flatIndex >= endRow) continue;
		if (!item.task._forbid) continue;
		const forbidIds = item.task._forbid
			.split(",")
			.map((s: string) => s.trim())
			.filter(Boolean);
		for (const forbidId of forbidIds) {
			const depTask = taskIdMap.get(forbidId);
			if (!depTask) continue;
			const depRow = state.ganttTasks.find((r) => r.task === depTask);
			if (!depRow) continue;

			const sourceTime = depTask._due
				? new Date(depTask._due).getTime()
				: null;
			const targetTime = item.task._scheduled
				? new Date(item.task._scheduled).getTime()
				: null;
			if (!sourceTime || !targetTime) continue;

			const fromX = timeToX(sourceTime);
			let toX = timeToX(targetTime);
			if (toX <= fromX) toX = fromX + 2;

			const fromY =
				yOffset +
				depRow.flatIndex * state.rowHeight +
				state.rowHeight / 2;
			const toY =
				yOffset +
				item.flatIndex * state.rowHeight +
				state.rowHeight / 2;
			const midX = fromX + (toX - fromX) * 0.5;

			arrows.push({ fromX, fromY, midX, toX, toY });
		}
	}

	if (arrows.length > 0) {
		ctx.strokeStyle = CONFIG.DEPENDENCY_LINE_COLOR;
		ctx.lineWidth = CONFIG.DEPENDENCY_LINE_WIDTH;
		ctx.fillStyle = CONFIG.DEPENDENCY_LINE_COLOR;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.beginPath();
		for (const ar of arrows) {
			ctx.moveTo(ar.fromX, ar.fromY);
			ctx.lineTo(ar.midX, ar.fromY);
			ctx.lineTo(ar.midX, ar.toY);
			ctx.lineTo(ar.toX, ar.toY);
		}
		ctx.stroke();

		const arrowSize = CONFIG.DEPENDENCY_ARROW_SIZE;
		for (const ar of arrows) {
			const ax = ar.toX - arrowSize;
			const ay = ar.toY;
			ctx.beginPath();
			ctx.moveTo(ax, ay - 4);
			ctx.lineTo(ax + arrowSize, ay);
			ctx.lineTo(ax, ay + 4);
			ctx.closePath();
			ctx.fill();
		}
	}

	// 顶部时间标签
	ctx.fillStyle = theme.text;
	ctx.font = `12px ${theme.fontFam}`;
	ctx.textAlign = "center";
	for (let i = 0; i <= 10; i++) {
		const time = state.minTime + (i / 10) * (state.maxTime - state.minTime);
		const x = timeToX(time);
		if (x < state.leftWidth || x > w) continue;
		ctx.fillText(formatDate(new Date(time)), x, 20);
	}
}

// ========== 绘制高亮层 ==========

function drawHoverHighlight(state: GanttState) {
	if (!state.hoverCanvas || !state.hoverCtx || !state.timeToX) return;
	const ctx = state.hoverCtx;
	const dpr = window.devicePixelRatio || 1;
	const w = state.hoverCanvas.width / dpr;
	const h = state.hoverCanvas.height / dpr;
	const timeToX = state.timeToX;
	const scrollTop = state.scrollTop;
	const yOffset = state.headerHeight - scrollTop;

	ctx.clearRect(0, 0, w, h);
	if (!state.hoveredBarTaskId) return;

	const barPath = state.taskBarPath || getTaskBarPath();
	for (const item of state.ganttTasks) {
		const taskId = item.task.line + "@" + item.task.path;
		if (taskId !== state.hoveredBarTaskId) continue;

		const startX = timeToX(item.start.getTime());
		const endX = timeToX(item.end.getTime());
		const y =
			yOffset +
			item.flatIndex * state.rowHeight +
			(state.rowHeight - CONFIG.TASK_BAR_HEIGHT) / 2;
		if (y + CONFIG.TASK_BAR_HEIGHT < 0 || y > h) continue;
		let barWidth = endX - startX;
		if (barWidth < 2) barWidth = 2;

		ctx.fillStyle = "#ffffff";
		ctx.globalAlpha = 0.3;
		ctx.save();
		ctx.translate(startX, y);
		ctx.scale(barWidth / 100, 1);
		ctx.fill(barPath);
		ctx.restore();
		break;
	}
	ctx.globalAlpha = 1.0;
}

// ========== 请求绘制 ==========

function requestDraw(state: GanttState) {
	requestAnimationFrame(() => {
		drawDynamicContent(state);
		drawHoverHighlight(state);
	});
}

// ========== 主渲染函数 ==========

export function renderGantt(container: HTMLElement, tasks: any[]) {
	// 清理旧状态
	const oldState = (container as any).__ganttState as GanttState | undefined;
	if (oldState) {
		oldState.resizeObserver?.disconnect();
		oldState.tooltipDiv?.remove();
		oldState.cleanup?.();
	}

	container.empty();
	container.style.display = "flex";
	container.style.height = "100%";
	container.style.position = "relative";

	const state: GanttState = {
		wrapper: null,
		canvas: null,
		ctx: null,
		bgCanvas: null,
		bgCtx: null,
		hoverCanvas: null,
		hoverCtx: null,
		flatNodes: [],
		ganttTasks: [],
		minTime: 0,
		maxTime: 0,
		scale: 1,
		offsetX: 0,
		scrollTop: 0,
		rowHeight: CONFIG.ROW_HEIGHT,
		headerHeight: CONFIG.HEADER_HEIGHT,
		leftWidth: CONFIG.LEFT_PANEL_WIDTH,
		timeToX: null,
		collapsedNodes: new Set(),
		hoveredBarTaskId: null,
		taskBarPath: getTaskBarPath(),
		isResizing: false,
		isDragging: false,
		lastDragX: 0,
		tooltipDiv: null,
		resizeObserver: null,
		cleanup: null,
	};

	// 构建数据
	const rootNodes = buildGanttTree(tasks, "pages/A 系统/A 任务系统/");
	state.flatNodes = flattenNodes(rootNodes, state.collapsedNodes);
	state.ganttTasks = buildGanttTaskRows(state.flatNodes);

	// 计算时间范围
	if (state.ganttTasks.length > 0) {
		const times = state.ganttTasks.flatMap((t) => [
			t.start.getTime(),
			t.end.getTime(),
		]);
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		const pad = Math.max((maxTime - minTime) * 0.05, 86400000);
		state.minTime = minTime - pad;
		state.maxTime = maxTime + pad;
	} else {
		const weekRange = DateUtils.getWeekRange(new Date());
		state.minTime = weekRange.start.getTime();
		state.maxTime = weekRange.end.getTime();
	}

	// 创建 DOM 结构
	const wrapper = document.createElement("div");
	wrapper.className = "gantt-canvas-wrapper";
	wrapper.style.cssText = `
		flex: 1;
		position: relative;
		overflow: auto;
		border: 1px solid var(--background-modifier-border);
		border-radius: 8px;
	`;

	const bgCanvas = document.createElement("canvas");
	bgCanvas.style.cssText =
		"position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";

	const canvas = document.createElement("canvas");
	canvas.className = "gantt-canvas";
	canvas.style.cssText =
		"display:block;width:100%;height:100%;cursor:default;";

	const hoverCanvas = document.createElement("canvas");
	hoverCanvas.style.cssText =
		"position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";

	wrapper.appendChild(bgCanvas);
	wrapper.appendChild(canvas);
	wrapper.appendChild(hoverCanvas);
	container.appendChild(wrapper);

	state.wrapper = wrapper;
	state.canvas = canvas;
	state.ctx = canvas.getContext("2d");
	state.bgCanvas = bgCanvas;
	state.bgCtx = bgCanvas.getContext("2d");
	state.hoverCanvas = hoverCanvas;
	state.hoverCtx = hoverCanvas.getContext("2d");

	// Tooltip
	const tooltipDiv = document.createElement("div");
	tooltipDiv.className = "gantt-tooltip";
	tooltipDiv.style.cssText = `
		position: fixed !important;
		background: #2d2d2d;
		color: #f0f0f0;
		border: 1px solid #555;
		border-radius: 8px;
		padding: 10px 14px;
		pointer-events: none;
		z-index: 10000;
		max-width: 450px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		font-size: 13px;
		line-height: 1.5;
		display: none;
	`;
	document.body.appendChild(tooltipDiv);
	state.tooltipDiv = tooltipDiv;

	// 初始化渲染
	updateCanvasSize(state);
	drawStaticBackground(state);
	clampOffset(state);
	updateTimeToX(state);
	requestDraw(state);

	// ========== 事件处理 ==========

	// 点击
	canvas.addEventListener("click", (e) => {
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const scaleX = canvas.width / rect.width;
		const x = ((e.clientX - rect.left) * scaleX) / dpr;
		const y = ((e.clientY - rect.top) * scaleX) / dpr;
		const yOffset = state.headerHeight - state.scrollTop;

		if (x < state.leftWidth) {
			const rowIndex = Math.floor((y - yOffset) / state.rowHeight);
			if (rowIndex >= 0 && rowIndex < state.flatNodes.length) {
				const node = state.flatNodes[rowIndex];
				const iconX = 10 + node.level * 16;
				if (
					(node.type === "folder" || node.type === "file") &&
					x >= iconX &&
					x <= iconX + 20
				) {
					const path = node.fullPath;
					if (state.collapsedNodes.has(path)) {
						state.collapsedNodes.delete(path);
					} else {
						state.collapsedNodes.add(path);
					}
					// 重建扁平节点
					state.flatNodes = flattenNodes(
						rootNodes,
						state.collapsedNodes,
					);
					state.ganttTasks = buildGanttTaskRows(state.flatNodes);
					updateCanvasSize(state);
					drawStaticBackground(state);
					clampOffset(state);
					updateTimeToX(state);
					requestDraw(state);
				} else if (node.type === "task" && node.task) {
					const app = (window as any).app;
					if (app) {
						const file = app.vault.getAbstractFileByPath(
							node.task.path,
						);
						if (file) {
							app.workspace.getLeaf().openFile(file, {
								eState: {
									line:
										node.task.lineNumber ?? node.task.line,
								},
							});
						}
					}
				}
			}
		}
	});

	// 鼠标移动
	canvas.addEventListener("mousemove", (e) => {
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const scaleX = canvas.width / rect.width;
		const x = ((e.clientX - rect.left) * scaleX) / dpr;
		const y = ((e.clientY - rect.top) * scaleX) / dpr;
		const yOffset = state.headerHeight - state.scrollTop;

		if (state.isResizing) {
			const newWidth = Math.min(
				CONFIG.MAX_LEFT_WIDTH,
				Math.max(CONFIG.MIN_LEFT_WIDTH, x),
			);
			state.leftWidth = newWidth;
			updateCanvasSize(state);
			drawStaticBackground(state);
			clampOffset(state);
			updateTimeToX(state);
			requestDraw(state);
			return;
		}

		let hoveredBarTaskId: string | null = null;
		let tooltipTask: any = null;

		if (x < state.leftWidth) {
			const rowIndex = Math.floor((y - yOffset) / state.rowHeight);
			if (rowIndex >= 0 && rowIndex < state.flatNodes.length) {
				const node = state.flatNodes[rowIndex];
				if (node.type === "task" && node.task) tooltipTask = node.task;
			}
		} else if (state.timeToX) {
			for (const item of state.ganttTasks) {
				const startX = state.timeToX(item.start.getTime());
				const endX = state.timeToX(item.end.getTime());
				const barY =
					yOffset +
					item.flatIndex * state.rowHeight +
					(state.rowHeight - CONFIG.TASK_BAR_HEIGHT) / 2;
				if (
					x >= startX &&
					x <= endX &&
					y >= barY &&
					y <= barY + CONFIG.TASK_BAR_HEIGHT
				) {
					hoveredBarTaskId = item.task.line + "@" + item.task.path;
					tooltipTask = item.task;
					break;
				}
			}
		}

		if (tooltipTask?._tooltip) {
			tooltipDiv.innerHTML = tooltipTask._tooltip.replace(/\n/g, "<br>");
			tooltipDiv.style.display = "block";
			tooltipDiv.style.left = e.clientX + 15 + "px";
			tooltipDiv.style.top = e.clientY + 15 + "px";
		} else {
			tooltipDiv.style.display = "none";
		}

		if (state.hoveredBarTaskId !== hoveredBarTaskId) {
			state.hoveredBarTaskId = hoveredBarTaskId;
			drawHoverHighlight(state);
		}
	});

	canvas.addEventListener("mouseleave", () => {
		tooltipDiv.style.display = "none";
		state.hoveredBarTaskId = null;
		drawHoverHighlight(state);
	});

	// 拖拽
	canvas.addEventListener("mousedown", (e) => {
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const scaleX = canvas.width / rect.width;
		const x = ((e.clientX - rect.left) * scaleX) / dpr;

		if (Math.abs(x - state.leftWidth) < 8) {
			state.isResizing = true;
			canvas.style.cursor = "col-resize";
			e.preventDefault();
		} else {
			state.isDragging = true;
			state.lastDragX = e.clientX;
			canvas.style.cursor = "grabbing";
		}
	});

	window.addEventListener("mousemove", (e) => {
		if (state.isResizing) {
			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const scaleX = canvas.width / rect.width;
			const x = ((e.clientX - rect.left) * scaleX) / dpr;
			const newWidth = Math.min(
				CONFIG.MAX_LEFT_WIDTH,
				Math.max(CONFIG.MIN_LEFT_WIDTH, x),
			);
			state.leftWidth = newWidth;
			updateCanvasSize(state);
			drawStaticBackground(state);
			clampOffset(state);
			updateTimeToX(state);
			requestDraw(state);
		} else if (state.isDragging) {
			const dx = e.clientX - state.lastDragX;
			state.lastDragX = e.clientX;
			state.offsetX += dx;
			clampOffset(state);
			updateTimeToX(state);
			requestDraw(state);
		}
	});

	window.addEventListener("mouseup", () => {
		if (state.isResizing) {
			state.isResizing = false;
			canvas.style.cursor = "default";
		}
		if (state.isDragging) {
			state.isDragging = false;
			canvas.style.cursor = "default";
		}
	});

	// 滚轮缩放
	canvas.addEventListener(
		"wheel",
		(e) => {
			if (!e.altKey) return;
			e.preventDefault();
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			state.scale *= delta;
			state.scale = Math.min(
				CONFIG.SCALE_MAX,
				Math.max(CONFIG.SCALE_MIN, state.scale),
			);
			clampOffset(state);
			updateTimeToX(state);
			requestDraw(state);
		},
		{ passive: false },
	);

	// 滚动同步
	wrapper.addEventListener("scroll", () => {
		state.scrollTop = wrapper.scrollTop;
		requestDraw(state);
	});

	// ResizeObserver
	const resizeObserver = new ResizeObserver(() => {
		updateCanvasSize(state);
		drawStaticBackground(state);
		clampOffset(state);
		updateTimeToX(state);
		requestDraw(state);
	});
	resizeObserver.observe(wrapper);
	state.resizeObserver = resizeObserver;

	// 保存状态供清理
	state.cleanup = () => {
		resizeObserver.disconnect();
		tooltipDiv.remove();
		// 移除全局事件（使用 AbortController 更佳，此处简化）
	};
	(container as any).__ganttState = state;
}
