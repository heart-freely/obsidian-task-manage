// src/ui/main/gantt/gantt.ts

import { getStatusColors } from "../../../core/config/config";
import {
	calcRangeFromRoots,
	calcTreeMaxWidth,
	formatGanttDuration,
	GANTT_CONFIG,
	getTaskInterval,
	isDarkTheme,
	loadZoomState,
	saveZoomState,
} from "../../../core/process/gantt-view-process";
import { buildTooltip, getDisplayText } from "../../../core/task/task-format";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { DateUtils } from "../../../util/date-utils";
import { tooltip } from "../../component/tooltip/tooltip";
import { renderTaskTree } from "../list/tree-list";

function createTimelineHeader(
	tr: { minTime: number; maxTime: number },
	dateToX: (ts: number) => number,
	totalDays: number,
	dayWidth: number,
	totalWidth: number,
	treeWidth: number,
): HTMLElement {
	const HEADER_HEIGHT = GANTT_CONFIG.HEADER_HEIGHT;
	const dark = isDarkTheme();
	const borderColor = "var(--background-modifier-border)";
	const textColor = "var(--text-normal)";
	const mutedColor = dark ? "#999" : "#888";

	const header = document.createElement("div");
	header.className = "gantt-header";
	header.style.cssText = `position: sticky; top: 0; z-index: 3; height: ${HEADER_HEIGHT}px; width: ${treeWidth + totalWidth}px; background: var(--background-primary); border-bottom: 1px solid var(--background-modifier-border); flex-shrink: 0; contain: layout style;`;

	const spacer = document.createElement("div");
	spacer.style.cssText = `position: absolute; top: 0; left: 0; width: ${treeWidth}px; height: 100%; background: var(--background-primary); z-index: 5;`;
	header.appendChild(spacer);

	const inner = document.createElement("div");
	inner.className = "gantt-header-inner";
	inner.style.cssText = `position: absolute; top: 0; left: ${treeWidth}px; height: 100%; width: ${totalWidth}px; content-visibility: auto; contain-intrinsic-size: auto ${totalWidth}px;`;

	type LayerDef = {
		name: string;
		visible: boolean;
		fontSize: string;
		fontWeight: string;
		color: string;
		getLabel: (d: Date) => string;
		nextDate: (d: Date) => Date;
	};
	const layers: LayerDef[] = [
		{
			name: "year",
			visible: true,
			fontSize: "11px",
			fontWeight: "bold",
			color: textColor,
			getLabel: (d) => String(d.getFullYear()),
			nextDate: (d) => new Date(d.getFullYear() + 1, 0, 1),
		},
		{
			name: "quarter",
			visible: dayWidth >= 5,
			fontSize: "10px",
			fontWeight: "bold",
			color: textColor,
			getLabel: (d) =>
				"Q" + String(Math.floor(d.getMonth() / 3) + 1).padStart(2, "0"),
			nextDate: (d) =>
				new Date(
					d.getFullYear(),
					Math.floor(d.getMonth() / 3) * 3 + 3,
					1,
				),
		},
		{
			name: "month",
			visible: dayWidth >= 1.5,
			fontSize: "10px",
			fontWeight: "bold",
			color: textColor,
			getLabel: (d) => "M" + String(d.getMonth() + 1).padStart(2, "0"),
			nextDate: (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
		},
		{
			name: "week",
			visible: dayWidth >= 15,
			fontSize: "8px",
			fontWeight: "normal",
			color: mutedColor,
			getLabel: (d) =>
				"W" + String(DateUtils.getISOWeekNumber(d)).padStart(2, "0"),
			nextDate: (d) => {
				const nd = new Date(d);
				const day = nd.getDay() || 7;
				nd.setDate(nd.getDate() + (8 - day));
				return nd;
			},
		},
		{
			name: "day",
			visible: dayWidth >= 40,
			fontSize: "8px",
			fontWeight: "normal",
			color: mutedColor,
			getLabel: (d) => String(d.getDate()).padStart(2, "0"),
			nextDate: (d) => {
				const nd = new Date(d);
				nd.setDate(nd.getDate() + 1);
				return nd;
			},
		},
	].filter((l) => l.visible);

	const eachH = HEADER_HEIGHT / layers.length;

	layers.forEach((layer, idx) => {
		let cur = DateUtils.setStart(new Date(tr.minTime));
		const end = new Date(tr.maxTime);
		while (cur <= end) {
			const next = layer.nextDate(new Date(cur));
			const nextTs = Math.min(next.getTime(), tr.maxTime);
			const x1 = treeWidth + dateToX(cur.getTime());
			const x2 = treeWidth + dateToX(nextTs);
			if (x2 > x1) {
				const el = document.createElement("span");
				el.textContent = layer.getLabel(cur);
				el.style.cssText = `position: absolute; left: ${x1}px; top: ${idx * eachH}px; width: ${x2 - x1}px; height: ${eachH}px; display: flex; align-items: center; justify-content: center; font-size: ${layer.fontSize}; font-weight: ${layer.fontWeight}; color: ${layer.color}; white-space: nowrap; overflow: hidden;${nextTs < tr.maxTime ? " border-right: 1px solid " + borderColor + ";" : ""}`;
				header.appendChild(el);
			}
			cur = next;
		}
	});

	header.appendChild(inner);
	return header;
}

function createDependencySVG(
	taskMap: Map<string, TaskTreeNode>,
	totalWidth: number,
): SVGSVGElement {
	const DEP_COLOR = "var(--text-muted)";
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("class", "gantt-dependencies");
	svg.style.cssText = `position: absolute; top: 0; left: 0; width: ${totalWidth}px; z-index: 7; pointer-events: none; overflow: visible;`;
	svg.setAttribute("width", String(totalWidth));
	function redraw(
		barPositions: Map<string, { left: number; right: number; y: number }>,
	) {
		while (svg.firstChild) svg.removeChild(svg.firstChild);
		if (!barPositions || barPositions.size === 0) return;
		taskMap.forEach((task) => {
			if (!task.forbid) return;
			const tPos = barPositions.get(task.uid);
			if (!tPos) return;
			const ty = tPos.y;
			task.forbid
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
				.forEach((fid) => {
					let sPos = barPositions.get(fid);
					if (!sPos) {
						const sTask = taskMap.get(fid);
						if (sTask) sPos = barPositions.get(sTask.uid);
					}
					if (!sPos) return;
					const sy = sPos.y;
					if (tPos.left <= sPos.right + 4) return;
					const d = `M ${sPos.right} ${sy} L ${tPos.left - 6} ${sy} L ${tPos.left - 6} ${ty}`;
					const g = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"g",
					);
					g.style.cursor = "pointer";
					const path = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"path",
					);
					path.setAttribute("d", d);
					path.setAttribute("fill", "none");
					path.setAttribute("stroke", DEP_COLOR);
					path.setAttribute(
						"stroke-width",
						String(GANTT_CONFIG.DEPENDENCY_LINE_WIDTH),
					);
					path.setAttribute("stroke-linecap", "round");
					path.setAttribute("stroke-linejoin", "round");
					g.appendChild(path);
					const as = GANTT_CONFIG.DEPENDENCY_ARROW_SIZE;
					const arrow = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"polygon",
					);
					arrow.setAttribute(
						"points",
						`${tPos.left},${ty} ${tPos.left - as},${ty - as / 2} ${tPos.left - as},${ty + as / 2}`,
					);
					arrow.setAttribute("fill", DEP_COLOR);
					g.appendChild(arrow);
					g.addEventListener("mouseenter", () => {
						path.setAttribute("stroke", "#ffaa00");
						path.setAttribute("stroke-width", "3");
						arrow.setAttribute("fill", "#ffaa00");
					});
					g.addEventListener("mouseleave", () => {
						path.setAttribute("stroke", DEP_COLOR);
						path.setAttribute(
							"stroke-width",
							String(GANTT_CONFIG.DEPENDENCY_LINE_WIDTH),
						);
						arrow.setAttribute("fill", DEP_COLOR);
					});
					svg.appendChild(g);
				});
		});
	}
	(svg as any).__redraw = redraw;
	return svg;
}

function injectGridStyles() {
	const styleId = "gantt-grid-styles";
	if (document.getElementById(styleId)) return;
	const styleEl = document.createElement("style");
	styleEl.id = styleId;
	const dark = isDarkTheme();
	const c = dark ? "255,255,255" : "0,0,0";
	const da = dark ? "0.03" : "0.02",
		wa = dark ? "0.05" : "0.04",
		ma = dark ? "0.10" : "0.08";
	styleEl.textContent = `.gantt-grid-overlay{position:absolute;top:0;height:100%;pointer-events:none;z-index:0}.gantt-grid-dense{background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)-.5px),rgba(${c},${da}) calc(var(--day-width)-.5px),rgba(${c},${da}) var(--day-width)),repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*7-.5px),rgba(${c},${wa}) calc(var(--day-width)*7-.5px),rgba(${c},${wa}) calc(var(--day-width)*7)),repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30));background-size:var(--day-width) 100%,calc(var(--day-width)*7) 100%,calc(var(--day-width)*30) 100%;background-position:0 0;background-repeat:repeat-x}.gantt-grid-medium{background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*7-.5px),rgba(${c},${wa}) calc(var(--day-width)*7-.5px),rgba(${c},${wa}) calc(var(--day-width)*7)),repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30));background-size:calc(var(--day-width)*7) 100%,calc(var(--day-width)*30) 100%;background-position:0 0;background-repeat:repeat-x}.gantt-grid-sparse{background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30));background-size:calc(var(--day-width)*30) 100%;background-position:0 0;background-repeat:repeat-x}.gantt-bar:hover{filter:brightness(1.2);z-index:5!important;}`;
	document.head.appendChild(styleEl);
}

export function renderGanttWithTree(
	container: HTMLElement,
	treeRoot: TaskTreeNode,
	options?: {
		onTaskClick?: (task: TaskTreeNode) => void;
		onRestore?: () => void;
		onNodeClick?: (node: TaskTreeNode) => void;
		intervalMode?: string;
		sort?: { type: string; order: "asc" | "desc" };
		dateRange?: {
			start: number | null;
			end: number | null;
			isAll: boolean;
		};
		focusRoot?: TaskTreeNode;
	},
) {
	container.empty();
	const statusColors = getStatusColors();
	const im =
		options?.intervalMode && options.intervalMode !== "none"
			? options.intervalMode
			: "any-date";
	const displayRoot = options?.focusRoot || treeRoot;
	const initTreeWidth = calcTreeMaxWidth([displayRoot]);
	const timeRange = calcRangeFromRoots([displayRoot], im, options?.dateRange);
	let totalDays = Math.max(
		Math.ceil((timeRange.maxTime - timeRange.minTime) / 86400000),
		1,
	);
	const savedZoom = loadZoomState();
	const initialDayWidth =
		savedZoom?.dayWidth || GANTT_CONFIG.DEFAULT_DAY_WIDTH;
	const zoomState = {
		dayWidth: Math.min(
			GANTT_CONFIG.MAX_DAY_WIDTH,
			Math.max(GANTT_CONFIG.MIN_DAY_WIDTH, initialDayWidth),
		),
		totalWidth: Math.max(totalDays * initialDayWidth, 400),
		totalDays,
	};
	const taskMap = new Map<string, TaskTreeNode>();
	let isDragging = false,
		lastDragX = 0,
		dragStartScrollLeft = 0;
	let currentSvg: SVGSVGElement | null = null;
	let gridOverlay: HTMLElement | null = null;
	let todayLine: HTMLElement | null = null;
	let actualTreeWidth = initTreeWidth;
	let onTreeToggle: (() => void) | null = null;
	let barsContainer: HTMLElement;
	let syncHeaderScroll: (() => void) | null = null;
	const barCache = new Map<string, HTMLElement>();
	const barPositionCache = new Map<
		string,
		{ intervalStart: number; intervalEnd: number }
	>();
	let deferredUpdateTimer: ReturnType<typeof setTimeout> | null = null;
	let wheelRafId: number | null = null;

	const dateToX = (ts: number) =>
		((ts - timeRange.minTime) /
			(timeRange.maxTime - timeRange.minTime || 86400000)) *
		zoomState.totalWidth;

	const intervalCache = new Map<
		string,
		{ start: number; end: number } | null
	>();
	function getCachedInterval(node: TaskTreeNode) {
		if (!intervalCache.has(node.uid))
			intervalCache.set(node.uid, getTaskInterval(node, im));
		return intervalCache.get(node.uid)!;
	}

	function getBarEdges(
		node: TaskTreeNode,
	): { left: number; width: number } | null {
		const interval = getCachedInterval(node);
		if (!interval) return null;
		const left = dateToX(interval.start.getTime());
		const right = dateToX(interval.end.getTime());
		const maxRight = zoomState.totalWidth;
		const clampedLeft = Math.max(0, left);
		const clampedRight = Math.min(maxRight, right);
		if (clampedRight < clampedLeft) return null;
		return {
			left: clampedLeft,
			width: Math.max(2, clampedRight - clampedLeft),
		};
	}

	function createBarElement(
		node: TaskTreeNode,
		edges: { left: number; width: number },
		y: number,
	): HTMLElement {
		const bar = document.createElement("div");
		bar.className = "gantt-bar";
		bar.setAttribute("data-task-bar", "true");
		bar.setAttribute("data-uid", node.uid);
		bar.style.cssText = `position: absolute; left: ${actualTreeWidth + edges.left}px; top: ${y}px; width: ${edges.width}px; height: ${GANTT_CONFIG.TASK_BAR_HEIGHT}px; background: ${statusColors[node.status] || statusColors["todo"]}; border-radius: ${GANTT_CONFIG.TASK_BAR_RADIUS}px; cursor: pointer; opacity: 1; z-index: 2; display: flex; align-items: center; overflow: hidden; transform: translateY(-50%);`;
		const interval = getCachedInterval(node);

		if (edges.width > 60) {
			const desc = document.createElement("span");
			desc.style.cssText =
				"font-size:10px;color:var(--text-on-accent,white);line-height:1;padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;z-index:1;flex:1;";
			desc.textContent = node.text || node.content || "";
			bar.appendChild(desc);
		}

		const dur = formatGanttDuration(
			interval ? interval.end.getTime() - interval.start.getTime() : 0,
		);
		if (dur && edges.width > 30) {
			const label = document.createElement("span");
			label.style.cssText =
				"font-size:10px;color:var(--text-on-accent,white);line-height:1;padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;z-index:1;flex-shrink:0;";
			label.textContent = dur;
			bar.appendChild(label);
		}

		let clickTimer: ReturnType<typeof setTimeout> | null = null;
		bar.addEventListener("click", (e) => {
			const rect = bar.getBoundingClientRect();
			const edgePadding = Math.min(rect.width * 0.15, 150);
			if (
				e.clientX - rect.left > edgePadding &&
				e.clientX - rect.left < rect.width - edgePadding
			) {
				if (clickTimer) {
					clearTimeout(clickTimer);
					clickTimer = null;
					if (node?.path) options?.onTaskClick?.(node);
					return;
				}
				clickTimer = setTimeout(() => {
					clickTimer = null;
					const row = scrollArea.querySelector(
						`[data-task-id="${node.uid}"]`,
					) as HTMLElement;
					if (row)
						row.scrollIntoView({
							behavior: "instant",
							block: "center",
						});
					scrollArea.scrollLeft = 0;
				}, 300);
			}
		});

		return bar;
	}

	function refreshBars() {
		const rows = scrollArea.querySelectorAll("[data-task-id]");
		const scrollRect = scrollArea.getBoundingClientRect();
		const barPositions = new Map<
			string,
			{ left: number; right: number; y: number }
		>();
		const newUids = new Set<string>();

		rows.forEach((rowEl) => {
			const uid = (rowEl as HTMLElement).getAttribute("data-task-id");
			if (!uid || uid === "__task_root__") return;
			const node = taskMap.get(uid);
			if (!node) return;
			const rect = (rowEl as HTMLElement).getBoundingClientRect();
			const y =
				rect.top -
				scrollRect.top +
				scrollArea.scrollTop +
				rect.height / 2;
			const edges = getBarEdges(node);
			if (edges) {
				newUids.add(uid);
				const interval = getCachedInterval(node);
				if (interval)
					barPositionCache.set(uid, {
						intervalStart: interval.start.getTime(),
						intervalEnd: interval.end.getTime(),
					});
				const pos = {
					left: actualTreeWidth + edges.left,
					right: actualTreeWidth + edges.left + edges.width,
					y,
				};
				barPositions.set(uid, pos);
				if (node.id) barPositions.set(node.id, pos);

				let bar = barCache.get(uid);
				if (!bar) {
					bar = createBarElement(node, edges, y);
					barsContainer.appendChild(bar);
					barCache.set(uid, bar);
				} else {
					bar.style.top = y + "px";
					bar.style.left = actualTreeWidth + edges.left + "px";
					bar.style.width = edges.width + "px";
					bar.style.background =
						statusColors[node.status] || statusColors["todo"];
				}
			}
		});

		for (const [uid, bar] of barCache) {
			if (!newUids.has(uid)) {
				bar.remove();
				barCache.delete(uid);
				barPositionCache.delete(uid);
			}
		}

		(currentSvg as any)?.__redraw?.(barPositions);
	}

	function updateGridLevel(dayWidth: number) {
		if (!gridOverlay) return;
		gridOverlay.classList.remove(
			"gantt-grid-dense",
			"gantt-grid-medium",
			"gantt-grid-sparse",
		);
		if (dayWidth >= 40) gridOverlay.classList.add("gantt-grid-dense");
		else if (dayWidth >= 15) gridOverlay.classList.add("gantt-grid-medium");
		else if (dayWidth >= 5) gridOverlay.classList.add("gantt-grid-sparse");
		gridOverlay.style.setProperty("--day-width", dayWidth + "px");
	}

	function updateTodayLine() {
		if (!todayLine) return;
		const ts = DateUtils.setStart(new Date()).getTime();
		if (ts >= timeRange.minTime && ts <= timeRange.maxTime) {
			todayLine.style.left = actualTreeWidth + dateToX(ts) + "px";
			todayLine.style.display = "";
		} else {
			todayLine.style.display = "none";
		}
	}

	function updateLayoutWidths() {
		const tc = scrollArea.querySelector(
			".gantt-tree-container",
		) as HTMLElement;
		actualTreeWidth = tc?.offsetWidth || initTreeWidth;
		const tw = zoomState.totalWidth;
		const totalW = actualTreeWidth + tw;
		barsContainer.style.width = totalW + "px";
		if (gridOverlay) {
			gridOverlay.style.left = actualTreeWidth + "px";
			gridOverlay.style.width = tw + "px";
		}
		updateTodayLine();
	}

	function fastUpdateBars() {
		const tw = zoomState.totalWidth;
		const updates: Array<{
			bar: HTMLElement;
			left: number;
			width: number;
			bg: string;
		}> = [];
		barCache.forEach((bar, uid) => {
			const cached = barPositionCache.get(uid);
			if (!cached) return;
			const left = dateToX(cached.intervalStart);
			const right = dateToX(cached.intervalEnd);
			const clampedLeft = Math.max(0, left);
			const clampedRight = Math.min(tw, right);
			if (clampedRight > clampedLeft) {
				updates.push({
					bar,
					left: actualTreeWidth + clampedLeft,
					width: clampedRight - clampedLeft,
					bg:
						statusColors[taskMap.get(uid)?.status || "todo"] ||
						statusColors["todo"],
				});
			}
		});
		for (const u of updates) {
			u.bar.style.left = u.left + "px";
			u.bar.style.width = u.width + "px";
			u.bar.style.background = u.bg;
		}
	}
	function deferredUpdate() {
		if (deferredUpdateTimer) clearTimeout(deferredUpdateTimer);
		deferredUpdateTimer = setTimeout(() => {
			const tw = zoomState.totalWidth;
			const oldHeader = scrollArea.querySelector(
				".gantt-header",
			) as HTMLElement;
			if (oldHeader) {
				oldHeader.replaceWith(
					createTimelineHeader(
						timeRange,
						dateToX,
						totalDays,
						zoomState.dayWidth,
						tw,
						actualTreeWidth,
					),
				);
			}
			const oldLineLayer = scrollArea.querySelector(
				".gantt-timeline-lines",
			) as HTMLElement;
			if (oldLineLayer) {
				oldLineLayer.innerHTML = "";
				oldLineLayer.style.width = tw + "px";
				oldLineLayer.style.left = actualTreeWidth + "px";
				for (let i = 0; i < totalDays; i++) {
					const d = new Date(timeRange.minTime + i * 86400000);
					if (d.getDate() === 1) {
						const x = dateToX(d.getTime());
						const line = document.createElement("div");
						line.style.cssText = `position: absolute; left: ${x}px; top: 0; width: 1px; height: 100%; background: var(--background-modifier-border); opacity: 0.15;`;
						oldLineLayer.appendChild(line);
					}
				}
			}
			// 箭头更新
			const barPositions = new Map<
				string,
				{ left: number; right: number; y: number }
			>();
			const scrollRect = scrollArea.getBoundingClientRect(); // 修复：添加缺失的变量声明
			barCache.forEach((bar, uid) => {
				const node = taskMap.get(uid);
				if (!node) return;
				const rect = bar.getBoundingClientRect();
				barPositions.set(uid, {
					left: rect.left - scrollRect.left + scrollArea.scrollLeft,
					right: rect.right - scrollRect.left + scrollArea.scrollLeft,
					y: parseFloat(bar.style.top),
				});
				if (node.id) barPositions.set(node.id, barPositions.get(uid)!);
			});
			(currentSvg as any)?.__redraw?.(barPositions);
		}, 150);
	}

	container.style.cssText =
		"display: flex; flex-direction: column; height: 100%; background: transparent; user-select: none;";
	const scrollArea = document.createElement("div");
	scrollArea.className = "gantt-scroll-area";
	scrollArea.style.cssText =
		"flex: 1; overflow: auto; position: relative; will-change: scroll-position;";
	container.appendChild(scrollArea);

	scrollArea.addEventListener("mouseover", (e) => {
		const bar = (e.target as HTMLElement).closest(
			".gantt-bar",
		) as HTMLElement;
		if (!bar) {
			tooltip.hide();
			return;
		}
		const uid = bar.getAttribute("data-uid");
		if (!uid) return;
		const node = taskMap.get(uid);
		if (!node) return;
		const tipHtml = getDisplayText(node) + "<br>" + buildTooltip(node);
		if (tipHtml) tooltip.show(tipHtml, e.clientX, e.clientY);
	});
	scrollArea.addEventListener("mousemove", (e) => {
		const bar = (e.target as HTMLElement).closest(".gantt-bar");
		if (bar) tooltip.move(e.clientX, e.clientY);
	});
	scrollArea.addEventListener("mouseout", () => {
		tooltip.hide();
	});

	function rebuild() {
		const sl = scrollArea.scrollLeft,
			st = scrollArea.scrollTop;
		scrollArea.innerHTML = "";
		taskMap.clear();
		gridOverlay = null;
		todayLine = null;
		actualTreeWidth = initTreeWidth;
		intervalCache.clear();
		barCache.clear();
		barPositionCache.clear();
		if (syncHeaderScroll)
			scrollArea.removeEventListener("scroll", syncHeaderScroll);
		if (deferredUpdateTimer) clearTimeout(deferredUpdateTimer);

		const treeContainer = document.createElement("div");
		treeContainer.className = "gantt-tree-container";
		treeContainer.style.cssText = `position: sticky; top: ${GANTT_CONFIG.HEADER_HEIGHT}px; z-index: 5; display: inline-block; vertical-align: top; background: var(--background-secondary); min-height: 100px;`;
		scrollArea.appendChild(treeContainer);

		renderTaskTree(treeContainer, {
			root: displayRoot,
			focusRoot: options?.focusRoot,
			onClick: options?.onNodeClick,
			onDoubleClick: options?.onTaskClick,
			onRestore: options?.onRestore,
			sort: options?.sort,
			onRowRender: (rowEl, node) => {
				rowEl.style.position = "relative";
				rowEl.style.width = "100%";
				if (node && node.uid !== "__task_root__") {
					rowEl.setAttribute("data-task-id", node.uid);
					taskMap.set(node.uid, node);
					if (node.id) taskMap.set(node.id, node);
					const cc = rowEl.querySelector("div") as HTMLElement;
					if (cc && getBarEdges(node)) {
						const lb = document.createElement("span");
						lb.textContent = "➤";
						lb.style.cssText =
							"cursor:pointer;font-size:11px;margin-left:2px;opacity:0.5;flex-shrink:0;";
						lb.addEventListener("click", (ev) => {
							ev.stopPropagation();
							const te = getBarEdges(node);
							if (te) {
								const targetLeft = Math.max(
									0,
									actualTreeWidth + te.left - 20,
								);
								requestAnimationFrame(() => {
									scrollArea.scrollLeft = targetLeft;
								});
							}
						});
						const fc = cc.firstChild;
						fc?.nextSibling
							? cc.insertBefore(lb, fc.nextSibling)
							: cc.appendChild(lb);
					}
				}
			},
		});

		requestAnimationFrame(() => {
			actualTreeWidth = treeContainer.offsetWidth || initTreeWidth;
			const tw2 = zoomState.totalWidth;

			const header = createTimelineHeader(
				timeRange,
				dateToX,
				totalDays,
				zoomState.dayWidth,
				tw2,
				actualTreeWidth,
			);
			header.style.top = "0";
			scrollArea.insertBefore(header, treeContainer);

			const lineLayer = document.createElement("div");
			lineLayer.className = "gantt-timeline-lines";
			lineLayer.style.cssText = `position: absolute; top: ${GANTT_CONFIG.HEADER_HEIGHT}px; left: ${actualTreeWidth}px; width: ${tw2}px; pointer-events: none; z-index: 0;`;
			for (let i = 0; i < totalDays; i++) {
				const d = new Date(timeRange.minTime + i * 86400000);
				if (d.getDate() === 1) {
					const x = dateToX(d.getTime());
					const line = document.createElement("div");
					line.style.cssText = `position: absolute; left: ${x}px; top: 0; width: 1px; height: 100%; background: var(--background-modifier-border); opacity: 0.15;`;
					lineLayer.appendChild(line);
				}
			}
			lineLayer.style.height =
				scrollArea.scrollHeight - GANTT_CONFIG.HEADER_HEIGHT + "px";
			scrollArea.appendChild(lineLayer);

			injectGridStyles();
			gridOverlay = document.createElement("div");
			gridOverlay.className = "gantt-grid-overlay";
			gridOverlay.style.cssText = `position: absolute; top: ${GANTT_CONFIG.HEADER_HEIGHT}px; left: ${actualTreeWidth}px; width: ${tw2}px; height: calc(100% - ${GANTT_CONFIG.HEADER_HEIGHT}px);`;
			updateGridLevel(zoomState.dayWidth);
			scrollArea.appendChild(gridOverlay);

			todayLine = document.createElement("div");
			todayLine.style.cssText = `position: absolute; top: ${GANTT_CONFIG.HEADER_HEIGHT}px; left: 0; width: 2px; height: calc(100% - ${GANTT_CONFIG.HEADER_HEIGHT}px); background: var(--interactive-accent, #7fb8f0); opacity: 0.5; z-index: 4; pointer-events: none;`;
			updateTodayLine();
			scrollArea.appendChild(todayLine);

			barsContainer = document.createElement("div");
			barsContainer.className = "gantt-bars";
			barsContainer.style.cssText = `position: absolute; top: ${GANTT_CONFIG.HEADER_HEIGHT}px; left: 0; width: ${actualTreeWidth + tw2}px; z-index: 6;`;
			scrollArea.appendChild(barsContainer);

			currentSvg = createDependencySVG(taskMap, actualTreeWidth + tw2);
			currentSvg.style.top = GANTT_CONFIG.HEADER_HEIGHT + "px";
			currentSvg.style.zIndex = "7";
			currentSvg.style.height =
				scrollArea.scrollHeight - GANTT_CONFIG.HEADER_HEIGHT + "px";
			currentSvg.style.pointerEvents = "none";
			scrollArea.appendChild(currentSvg);

			syncHeaderScroll = () => {
				const h = scrollArea.querySelector(
					".gantt-header",
				) as HTMLElement;
				if (h)
					h.style.transform = `translateX(${-scrollArea.scrollLeft}px)`;
			};
			scrollArea.addEventListener("scroll", syncHeaderScroll, {
				passive: true,
			});
			syncHeaderScroll();

			refreshBars();
			scrollArea.scrollLeft = Math.max(0, sl);
			if (st > 0) scrollArea.scrollTop = st;

			if (onTreeToggle)
				treeContainer.removeEventListener("tree-toggle", onTreeToggle);
			let treeToggleRafId: number | null = null;
			onTreeToggle = () => {
				if (treeToggleRafId !== null) return;
				treeToggleRafId = requestAnimationFrame(() => {
					treeToggleRafId = null;
					actualTreeWidth =
						treeContainer.offsetWidth || initTreeWidth;
					updateLayoutWidths();
					refreshBars();
				});
			};
			treeContainer.addEventListener("tree-toggle", onTreeToggle);
		});
	}

	const onWheel = (e: WheelEvent) => {
		if (!e.altKey) return;
		e.preventDefault();
		e.stopPropagation();
		const rect = scrollArea.getBoundingClientRect();
		const mouseContentX =
			e.clientX - rect.left + scrollArea.scrollLeft - actualTreeWidth;
		const mouseTime =
			timeRange.minTime +
			(mouseContentX / zoomState.totalWidth) *
				(timeRange.maxTime - timeRange.minTime);
		zoomState.dayWidth =
			e.deltaY < 0
				? Math.min(
						GANTT_CONFIG.MAX_DAY_WIDTH,
						Math.round(zoomState.dayWidth * 1.3 * 100) / 100,
					)
				: Math.max(
						GANTT_CONFIG.MIN_DAY_WIDTH,
						Math.round(zoomState.dayWidth * 0.7 * 100) / 100,
					);
		zoomState.totalWidth = Math.ceil(totalDays * zoomState.dayWidth);
		saveZoomState(zoomState.dayWidth);

		if (wheelRafId) return;
		wheelRafId = requestAnimationFrame(() => {
			wheelRafId = null;
			fastUpdateBars();
			updateLayoutWidths();
			updateGridLevel(zoomState.dayWidth);
			updateTodayLine();
			syncHeaderScroll?.();
			deferredUpdate();
		});

		const newMouseContentX =
			((mouseTime - timeRange.minTime) /
				(timeRange.maxTime - timeRange.minTime)) *
			zoomState.totalWidth;
		scrollArea.scrollLeft = Math.max(
			0,
			actualTreeWidth + newMouseContentX - (e.clientX - rect.left),
		);
	};
	scrollArea.addEventListener("wheel", onWheel, { passive: false });
	scrollArea.addEventListener("mousedown", (e: MouseEvent) => {
		if (
			(e.target as HTMLElement).closest(".gantt-bar") ||
			(e.target as HTMLElement).closest(".gantt-tree-container")
		)
			return;
		isDragging = true;
		lastDragX = e.clientX;
		dragStartScrollLeft = scrollArea.scrollLeft;
		scrollArea.style.cursor = "grabbing";
		scrollArea.style.userSelect = "none";
		e.preventDefault();
	});
	const onMouseMove = (e: MouseEvent) => {
		if (!isDragging) return;
		scrollArea.scrollLeft = dragStartScrollLeft - (e.clientX - lastDragX);
	};
	const onMouseUp = () => {
		isDragging = false;
		scrollArea.style.cursor = "";
		scrollArea.style.userSelect = "";
	};
	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mouseup", onMouseUp);

	rebuild();

	return {
		taskMap,
		redraw: rebuild,
		destroy: () => {
			scrollArea.removeEventListener("wheel", onWheel);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			if (syncHeaderScroll)
				scrollArea.removeEventListener("scroll", syncHeaderScroll);
			if (deferredUpdateTimer) clearTimeout(deferredUpdateTimer);
			if (onTreeToggle) {
				const tc = scrollArea.querySelector(
					".gantt-tree-container",
				) as HTMLElement;
				tc?.removeEventListener("tree-toggle", onTreeToggle);
				onTreeToggle = null;
			}
			for (const bar of barCache.values()) bar.remove();
			barCache.clear();
			barPositionCache.clear();
			taskMap.clear();
			intervalCache.clear();
			if (currentSvg) {
				currentSvg.remove();
				currentSvg = null;
			}
		},
	};
}
