// src/ui/main/gantt/gantt.ts

import { getStatusColors } from "../../../core/config/config";
import {
	calcRangeFromRoots,
	calcTreeMaxWidth,
	formatGanttDuration,
	GANTT_CONFIG,
	getLayerStyle,
	getTaskInterval,
	getTimelineLayers,
	isDarkTheme,
	loadZoomState,
	saveZoomState,
} from "../../../core/process/gantt-view-process";
import { buildTooltip, getDisplayText } from "../../../core/task/task-format";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { DateUtils } from "../../../util/date-utils";
import { tooltip } from "../../component/tooltip/tooltip";
import { renderTaskTree } from "../list/tree-list";

function createTimelineLabel(
	left: number,
	width: number,
	height: number,
	fontSize: string,
	fontWeight: string,
	color: string,
	hasBorder: boolean,
): HTMLElement {
	const el = document.createElement("div");
	el.style.cssText = `position: absolute; left: ${left}px; top: 0; height: 100%; width: ${width}px; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}; font-weight: ${fontWeight}; color: ${color}; ${hasBorder ? "border-right: 1px solid var(--background-modifier-border);" : ""} overflow: hidden; white-space: nowrap;`;
	return el;
}

function createTimelineHeader(
	tr: { minTime: number; maxTime: number },
	dayWidth: number,
	totalDays: number,
	timelineWidth: number,
	treeWidth: number,
): HTMLElement {
	const totalWidth = treeWidth + timelineWidth;
	const { layers, layerHeight } = getTimelineLayers(dayWidth);
	const dark = isDarkTheme();
	const layerCount = layers.length;
	const header = document.createElement("div");
	header.className = "gantt-header";
	header.style.cssText = `position: sticky; top: 0; z-index: 3; height: ${GANTT_CONFIG.HEADER_HEIGHT}px; width: ${totalWidth}px; background: var(--background-primary); border-bottom: 1px solid var(--background-modifier-border); overflow: hidden; flex-shrink: 0;`;
	const treeSpacer = document.createElement("div");
	treeSpacer.style.cssText = `position: absolute; top: 0; left: 0; width: ${treeWidth}px; height: 100%; background: var(--background-primary); z-index: 5;`;
	header.appendChild(treeSpacer);
	const inner = document.createElement("div");
	inner.style.cssText = `position: absolute; top: 0; left: ${treeWidth}px; height: 100%; width: ${timelineWidth}px;`;
	let currentTop = 0,
		layerIdx = 0;
	const yearStyle = getLayerStyle(layerIdx, layerCount, dark),
		yearLayer = document.createElement("div");
	yearLayer.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%;`;
	currentTop += layerHeight;
	layerIdx++;
	let curYear = -1,
		yearStart = 0;
	for (let i = 0; i < totalDays; i++) {
		const y = new Date(tr.minTime + i * 86400000).getFullYear();
		if (y !== curYear) {
			if (curYear >= 0 && (i - yearStart) * dayWidth > 0)
				yearLayer.appendChild(
					createTimelineLabel(
						yearStart * dayWidth,
						(i - yearStart) * dayWidth,
						layerHeight,
						yearStyle.fontSize,
						yearStyle.fontWeight,
						yearStyle.color,
						true,
					),
				).textContent = String(curYear);
			curYear = y;
			yearStart = i;
		}
	}
	if (curYear >= 0)
		yearLayer.appendChild(
			createTimelineLabel(
				yearStart * dayWidth,
				(totalDays - yearStart) * dayWidth,
				layerHeight,
				yearStyle.fontSize,
				yearStyle.fontWeight,
				yearStyle.color,
				false,
			),
		).textContent = String(curYear);
	inner.appendChild(yearLayer);
	const sq = layers.some((l) => l.name === "quarter"),
		sm = layers.some((l) => l.name === "month"),
		sw = layers.some((l) => l.name === "week"),
		sd = layers.some((l) => l.name === "day");
	if (sq) {
		const qs = getLayerStyle(layerIdx, layerCount, dark),
			ql = document.createElement("div");
		ql.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%; border-top: 1px solid var(--background-modifier-border);`;
		currentTop += layerHeight;
		layerIdx++;
		let cq = -1,
			qs2 = 0;
		for (let i = 0; i < totalDays; i++) {
			const q = Math.floor(
				new Date(tr.minTime + i * 86400000).getMonth() / 3,
			);
			if (q !== cq) {
				if (cq >= 0 && (i - qs2) * dayWidth > 0)
					ql.appendChild(
						createTimelineLabel(
							qs2 * dayWidth,
							(i - qs2) * dayWidth,
							layerHeight,
							qs.fontSize,
							qs.fontWeight,
							qs.color,
							true,
						),
					).textContent = "Q" + (cq + 1);
				cq = q;
				qs2 = i;
			}
		}
		if (cq >= 0)
			ql.appendChild(
				createTimelineLabel(
					qs2 * dayWidth,
					(totalDays - qs2) * dayWidth,
					layerHeight,
					qs.fontSize,
					qs.fontWeight,
					qs.color,
					false,
				),
			).textContent = "Q" + (cq + 1);
		inner.appendChild(ql);
	}
	if (sm) {
		const ms = getLayerStyle(layerIdx, layerCount, dark),
			ml = document.createElement("div");
		ml.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%; border-top: 1px solid var(--background-modifier-border);`;
		currentTop += layerHeight;
		layerIdx++;
		const mn = [
			"1月",
			"2月",
			"3月",
			"4月",
			"5月",
			"6月",
			"7月",
			"8月",
			"9月",
			"10月",
			"11月",
			"12月",
		];
		let cm = -1,
			ms2 = 0;
		for (let i = 0; i < totalDays; i++) {
			const m = new Date(tr.minTime + i * 86400000).getMonth();
			if (m !== cm) {
				if (cm >= 0 && (i - ms2) * dayWidth > 0)
					ml.appendChild(
						createTimelineLabel(
							ms2 * dayWidth,
							(i - ms2) * dayWidth,
							layerHeight,
							ms.fontSize,
							ms.fontWeight,
							ms.color,
							true,
						),
					).textContent = mn[cm];
				cm = m;
				ms2 = i;
			}
		}
		if (cm >= 0)
			ml.appendChild(
				createTimelineLabel(
					ms2 * dayWidth,
					(totalDays - ms2) * dayWidth,
					layerHeight,
					ms.fontSize,
					ms.fontWeight,
					ms.color,
					false,
				),
			).textContent = mn[cm];
		inner.appendChild(ml);
	}
	if (sw) {
		const ws = getLayerStyle(layerIdx, layerCount, dark),
			wl = document.createElement("div");
		wl.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%; border-top: 1px solid var(--background-modifier-border);`;
		currentTop += layerHeight;
		layerIdx++;
		let cw = -1,
			ws2 = 0;
		for (let i = 0; i < totalDays; i++) {
			const d = new Date(tr.minTime + i * 86400000),
				w = DateUtils.getISOWeekNumber(d);
			if (w !== cw) {
				if (cw >= 0 && (i - ws2) * dayWidth > 0)
					wl.appendChild(
						createTimelineLabel(
							ws2 * dayWidth,
							(i - ws2) * dayWidth,
							layerHeight,
							ws.fontSize,
							ws.fontWeight,
							ws.color,
							true,
						),
					).textContent = "W" + cw;
				cw = w;
				ws2 = i;
			}
		}
		if (cw >= 0)
			wl.appendChild(
				createTimelineLabel(
					ws2 * dayWidth,
					(totalDays - ws2) * dayWidth,
					layerHeight,
					ws.fontSize,
					ws.fontWeight,
					ws.color,
					false,
				),
			).textContent = "W" + cw;
		inner.appendChild(wl);
	}
	if (sd) {
		const ds = getLayerStyle(layerIdx, layerCount, dark),
			dl = document.createElement("div");
		dl.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%; border-top: 1px solid var(--background-modifier-border);`;
		let cd = -1,
			ds2 = 0;
		for (let i = 0; i < totalDays; i++) {
			const d = new Date(tr.minTime + i * 86400000).getDate();
			if (d !== cd) {
				if (cd >= 0 && (i - ds2) * dayWidth > 0) {
					const lb = createTimelineLabel(
						ds2 * dayWidth,
						(i - ds2) * dayWidth,
						layerHeight,
						ds.fontSize,
						ds.fontWeight,
						ds.color,
						true,
					);
					lb.textContent = String(cd);
					dl.appendChild(lb);
				}
				cd = d;
				ds2 = i;
			}
		}
		if (cd >= 0) {
			const lb = createTimelineLabel(
				ds2 * dayWidth,
				(totalDays - ds2) * dayWidth,
				layerHeight,
				ds.fontSize,
				ds.fontWeight,
				ds.color,
				false,
			);
			lb.textContent = String(cd);
			dl.appendChild(lb);
		}
		inner.appendChild(dl);
	}
	header.appendChild(inner);
	return header;
}

function createDependencySVG(
	taskMap: Map<string, TaskTreeNode>,
	totalWidth: number,
	treeContainer: HTMLElement,
): SVGSVGElement {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("class", "gantt-dependencies");
	svg.style.cssText = `position: absolute; top: 0; left: 0; width: ${totalWidth}px; height: 100%; z-index: 1; pointer-events: none; overflow: hidden;`;
	svg.setAttribute("width", String(totalWidth));
	function redraw() {
		while (svg.firstChild) svg.removeChild(svg.firstChild);
		const rows = treeContainer.querySelectorAll("[data-task-id]");
		if (rows.length === 0) return;
		const barPositions = new Map<
			string,
			{ left: number; right: number; y: number }
		>();
		const contentRect = treeContainer.getBoundingClientRect();
		rows.forEach((rowEl) => {
			const id = (rowEl as HTMLElement).getAttribute("data-task-id");
			if (!id) return;
			const bar = (rowEl as HTMLElement).querySelector(
				"[data-task-bar]",
			) as HTMLElement;
			if (!bar) return;
			const barRect = bar.getBoundingClientRect();
			barPositions.set(id, {
				left: barRect.left - contentRect.left,
				right: barRect.right - contentRect.left,
				y: barRect.top - contentRect.top + barRect.height / 2,
			});
		});
		taskMap.forEach((task) => {
			if (!task.forbid) return;
			const tPos = barPositions.get(task.uid);
			if (!tPos) return;
			task.forbid
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
				.forEach((fid) => {
					const sTask = taskMap.get(fid);
					if (!sTask) return;
					const sPos = barPositions.get(sTask.uid);
					if (!sPos) return;
					const sx = sPos.right,
						tx = tPos.left;
					if (tx <= sx + 4) return;
					const d = `M ${sx} ${sPos.y} L ${tx - 6} ${sPos.y} L ${tx - 6} ${tPos.y}`;
					const g = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"g",
					);
					const path = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"path",
					);
					path.setAttribute("d", d);
					path.setAttribute("fill", "none");
					path.setAttribute(
						"stroke",
						GANTT_CONFIG.DEPENDENCY_LINE_COLOR,
					);
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
						`${tx},${tPos.y} ${tx - as},${tPos.y - as / 2} ${tx - as},${tPos.y + as / 2}`,
					);
					arrow.setAttribute(
						"fill",
						GANTT_CONFIG.DEPENDENCY_LINE_COLOR,
					);
					g.appendChild(arrow);
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
	styleEl.textContent = `.gantt-grid-overlay{position:absolute;top:0;height:100%;pointer-events:none;z-index:0}.gantt-grid-dense{background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)-.5px),rgba(${c},${da}) calc(var(--day-width)-.5px),rgba(${c},${da}) var(--day-width)),repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*7-.5px),rgba(${c},${wa}) calc(var(--day-width)*7-.5px),rgba(${c},${wa}) calc(var(--day-width)*7)),repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30));background-size:var(--day-width) 100%,calc(var(--day-width)*7) 100%,calc(var(--day-width)*30) 100%;background-position:0 0;background-repeat:repeat-x}.gantt-grid-medium{background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*7-.5px),rgba(${c},${wa}) calc(var(--day-width)*7-.5px),rgba(${c},${wa}) calc(var(--day-width)*7)),repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30));background-size:calc(var(--day-width)*7) 100%,calc(var(--day-width)*30) 100%;background-position:0 0;background-repeat:repeat-x}.gantt-grid-sparse{background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30-1px),rgba(${c},${ma}) calc(var(--day-width)*30));background-size:calc(var(--day-width)*30) 100%;background-position:0 0;background-repeat:repeat-x}`;
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
	const totalDays = Math.max(
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
	let zoomDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let gridOverlay: HTMLElement | null = null;
	let todayLine: HTMLElement | null = null;
	let barElements: HTMLElement[] = [];
	let actualTreeWidth = initTreeWidth;

	function getBarEdges(
		node: TaskTreeNode,
	): { left: number; width: number } | null {
		const interval = getTaskInterval(node, im);
		if (!interval) return null;
		const dayWidth = zoomState.totalWidth / totalDays;
		const startDays = Math.round(
			(interval.start.getTime() - timeRange.minTime) / 86400000,
		);
		const endDays = Math.round(
			(interval.end.getTime() - timeRange.minTime) / 86400000,
		);
		const left = startDays * dayWidth;
		const right = endDays * dayWidth;
		const tw = zoomState.totalWidth;
		if (right < 0 || left > tw) return null;
		return {
			left: Math.max(0, left),
			width: Math.max(2, Math.min(tw, right) - Math.max(0, left)),
		};
	}

	function createBarElement(
		node: TaskTreeNode,
		edges: { left: number; width: number },
	): HTMLElement {
		const bar = document.createElement("div");
		bar.className = "gantt-bar";
		bar.setAttribute("data-task-bar", "true");
		bar.style.cssText = `position: absolute; left: ${actualTreeWidth + edges.left}px; top: 50%; transform: translateY(-50%); width: ${edges.width}px; height: ${GANTT_CONFIG.TASK_BAR_HEIGHT}px; background: ${statusColors[node.status] || statusColors["todo"]}; border-radius: ${GANTT_CONFIG.TASK_BAR_RADIUS}px; cursor: pointer; opacity: 0.85; z-index: 2; display: flex; align-items: center; overflow: hidden; transition: opacity 0.1s;`;
		const interval = getTaskInterval(node, im);
		if (interval && node.done) {
			const dt = node.done;
			if (
				dt >= interval.start.getTime() &&
				dt <= interval.end.getTime()
			) {
				const pr =
					(dt - interval.start.getTime()) /
					(interval.end.getTime() - interval.start.getTime());
				const pe = document.createElement("div");
				pe.style.cssText = `position: absolute; left: 0; top: 0; width: ${Math.round(pr * 100)}%; height: 100%; background: rgba(46,125,50,0.5); border-radius: ${GANTT_CONFIG.TASK_BAR_RADIUS}px 0 0 ${GANTT_CONFIG.TASK_BAR_RADIUS}px; pointer-events: none;`;
				bar.appendChild(pe);
			}
		}
		bar.addEventListener("mouseenter", () => {
			bar.style.opacity = "1";
			bar.style.zIndex = "5";
		});
		bar.addEventListener("mouseleave", () => {
			bar.style.opacity = "0.85";
			bar.style.zIndex = "2";
		});
		const dur = formatGanttDuration(
			interval ? interval.end.getTime() - interval.start.getTime() : 0,
		);
		if (dur && edges.width > 30) {
			const label = document.createElement("span");
			label.style.cssText =
				"font-size:10px;color:var(--text-on-accent,white);line-height:1;padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative;z-index:1;";
			label.textContent = dur;
			bar.appendChild(label);
		}
		const tipHtml = getDisplayText(node) + "<br>" + buildTooltip(node);
		if (tipHtml) {
			bar.addEventListener("mouseenter", (e) =>
				tooltip.show(tipHtml, e.clientX, e.clientY),
			);
			bar.addEventListener("mousemove", (e) =>
				tooltip.move(e.clientX, e.clientY),
			);
			bar.addEventListener("mouseleave", () => tooltip.hide());
		}
		bar.addEventListener("dblclick", (e) => {
			const rect = bar.getBoundingClientRect();
			if (
				e.clientX - rect.left > rect.width * 0.15 &&
				e.clientX - rect.left < rect.width * 0.85
			) {
				if (node?.path) options?.onTaskClick?.(node);
			}
		});
		return bar;
	}

	function createBarsAsync(treeContainer: HTMLElement) {
		const rows = Array.from(
			treeContainer.querySelectorAll("[data-task-id]"),
		);
		let index = 0;
		const BATCH = 30;
		function processBatch() {
			const end = Math.min(index + BATCH, rows.length);
			for (let i = index; i < end; i++) {
				const rowEl = rows[i] as HTMLElement;
				const uid = rowEl.getAttribute("data-task-id");
				if (!uid) continue;
				const node = taskMap.get(uid);
				if (!node) continue;
				const edges = getBarEdges(node);
				if (!edges) continue;
				const bar = createBarElement(node, edges);
				rowEl.appendChild(bar);
				barElements.push(bar);
				const cc = rowEl.querySelector("div") as HTMLElement;
				if (cc) {
					const lb = document.createElement("span");
					lb.textContent = "➤";
					lb.style.cssText =
						"cursor:pointer;font-size:11px;margin-left:2px;opacity:0.5;flex-shrink:0;";
					lb.addEventListener("click", (ev) => {
						ev.stopPropagation();
						const te = getBarEdges(node);
						if (te)
							scrollArea.scrollTo({
								left: Math.max(
									0,
									actualTreeWidth + te.left - 20,
								),
								behavior: "instant",
							});
					});
					const fc = cc.firstChild;
					fc?.nextSibling
						? cc.insertBefore(lb, fc.nextSibling)
						: cc.appendChild(lb);
				}
			}
			index = end;
			if (index < rows.length) requestAnimationFrame(processBatch);
			else {
				if (typeof requestIdleCallback !== "undefined")
					requestIdleCallback(() =>
						(currentSvg as any)?.__redraw?.(),
					);
				else
					requestAnimationFrame(() =>
						(currentSvg as any)?.__redraw?.(),
					);
			}
		}
		requestAnimationFrame(processBatch);
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

	function updateTodayLine(tw: number) {
		if (!todayLine) return;
		const ts = DateUtils.setStart(new Date()).getTime();
		if (ts >= timeRange.minTime && ts <= timeRange.maxTime) {
			const dayWidth = zoomState.totalWidth / totalDays;
			const td = Math.round((ts - timeRange.minTime) / 86400000);
			const ox = td * dayWidth;
			if (ox < tw) {
				todayLine.style.left = actualTreeWidth + ox + "px";
				todayLine.style.display = "";
				return;
			}
		}
		todayLine.style.display = "none";
	}

	function updateLayoutWidths() {
		const tc = scrollArea.querySelector(
			".gantt-tree-container",
		) as HTMLElement;
		actualTreeWidth = tc?.offsetWidth || initTreeWidth;
		const tw = zoomState.totalWidth;
		const totalWidth = actualTreeWidth + tw;
		const content = scrollArea.querySelector(
			".gantt-content",
		) as HTMLElement;
		if (content) content.style.width = totalWidth + "px";
		const header = scrollArea.querySelector(".gantt-header") as HTMLElement;
		if (header) {
			header.style.width = totalWidth + "px";
			const sp = header.children[0] as HTMLElement;
			if (sp) sp.style.width = actualTreeWidth + "px";
			const inn = header.children[1] as HTMLElement;
			if (inn) {
				inn.style.left = actualTreeWidth + "px";
				inn.style.width = tw + "px";
			}
		}
		if (gridOverlay) {
			gridOverlay.style.left = actualTreeWidth + "px";
			gridOverlay.style.width = tw + "px";
		}
		if (todayLine) updateTodayLine(tw);
	}

	container.style.cssText =
		"display: flex; flex-direction: column; height: 100%; background: transparent; user-select: none;";
	const scrollArea = document.createElement("div");
	scrollArea.className = "gantt-scroll-area";
	scrollArea.style.cssText = "flex: 1; overflow: auto; position: relative;";
	container.appendChild(scrollArea);

	function rebuild() {
		if (zoomDebounceTimer) {
			clearTimeout(zoomDebounceTimer);
			zoomDebounceTimer = null;
		}
		const sl = scrollArea.scrollLeft,
			st = scrollArea.scrollTop;
		scrollArea.innerHTML = "";
		taskMap.clear();
		barElements = [];
		gridOverlay = null;
		todayLine = null;
		actualTreeWidth = initTreeWidth;
		const tw = zoomState.totalWidth,
			totalWidth = actualTreeWidth + tw;
		scrollArea.appendChild(
			createTimelineHeader(
				timeRange,
				zoomState.dayWidth,
				totalDays,
				tw,
				actualTreeWidth,
			),
		);
		const content = document.createElement("div");
		content.className = "gantt-content";
		content.style.cssText = `position: relative; width: ${totalWidth}px; min-height: 200px; padding-bottom: 40px; overflow: hidden;`;
		injectGridStyles();
		gridOverlay = document.createElement("div");
		gridOverlay.className = "gantt-grid-overlay";
		gridOverlay.style.left = actualTreeWidth + "px";
		gridOverlay.style.width = tw + "px";
		updateGridLevel(zoomState.dayWidth);
		content.appendChild(gridOverlay);
		todayLine = document.createElement("div");
		todayLine.style.cssText =
			"position: absolute; left: 0; top: 0; width: 2px; height: 100%; background: var(--interactive-accent, #7fb8f0); opacity: 0.5; z-index: 4; pointer-events: none;";
		updateTodayLine(tw);
		content.appendChild(todayLine);
		scrollArea.appendChild(content);
		const treeContainer = document.createElement("div");
		treeContainer.className = "gantt-tree-container";
		treeContainer.style.cssText =
			"position: relative; z-index: 2; display: inline-block;";
		content.appendChild(treeContainer);
		currentSvg = createDependencySVG(taskMap, totalWidth, treeContainer);
		content.appendChild(currentSvg);
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
				}
			},
		});
		updateLayoutWidths();
		createBarsAsync(treeContainer);
		const onTreeToggle = () => {
			requestAnimationFrame(() => {
				updateLayoutWidths();
				barElements.forEach((bar) => {
					const re = bar.parentElement;
					if (!re) return;
					const tid = re.getAttribute("data-task-id");
					if (!tid) return;
					const tn = taskMap.get(tid);
					if (!tn) return;
					const te = getBarEdges(tn);
					if (te) bar.style.left = actualTreeWidth + te.left + "px";
				});
				(currentSvg as any)?.__redraw?.();
			});
		};
		treeContainer.addEventListener("tree-toggle", onTreeToggle);
		scrollArea.scrollLeft = Math.max(0, sl);
		if (st > 0) scrollArea.scrollTop = st;
	}

	function rebuildTimeline() {
		if (zoomDebounceTimer) {
			clearTimeout(zoomDebounceTimer);
			zoomDebounceTimer = null;
		}
		const tw = zoomState.totalWidth;
		updateLayoutWidths();
		const oldHeader = scrollArea.querySelector(
			".gantt-header",
		) as HTMLElement;
		if (oldHeader) {
			const newHeader = createTimelineHeader(
				timeRange,
				zoomState.dayWidth,
				totalDays,
				tw,
				actualTreeWidth,
			);
			oldHeader.replaceWith(newHeader);
		}
		updateGridLevel(zoomState.dayWidth);
		updateTodayLine(tw);
		barElements.forEach((bar) => {
			const re = bar.parentElement;
			if (!re) return;
			const tid = re.getAttribute("data-task-id");
			if (!tid) return;
			const tn = taskMap.get(tid);
			if (!tn) return;
			const te = getBarEdges(tn);
			if (te) {
				bar.style.left = actualTreeWidth + te.left + "px";
				bar.style.width = te.width + "px";
			}
		});
		(currentSvg as any)?.__redraw?.();
	}

	rebuild();

	const onWheel = (e: WheelEvent) => {
		if (!e.altKey) return;
		e.preventDefault();
		e.stopPropagation();
		const rect = scrollArea.getBoundingClientRect();
		const mouseX = e.clientX - rect.left + scrollArea.scrollLeft;
		const mouseTime =
			timeRange.minTime +
			((mouseX - actualTreeWidth) / zoomState.dayWidth) * 86400000;
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
		updateGridLevel(zoomState.dayWidth);
		updateTodayLine(zoomState.totalWidth);
		if (zoomDebounceTimer) clearTimeout(zoomDebounceTimer);
		zoomDebounceTimer = setTimeout(() => rebuildTimeline(), 200);
		const newMouseX =
			actualTreeWidth +
			((mouseTime - timeRange.minTime) / 86400000) * zoomState.dayWidth;
		scrollArea.scrollLeft = Math.max(
			0,
			newMouseX - (e.clientX - rect.left),
		);
	};
	scrollArea.addEventListener("wheel", onWheel, { passive: false });
	scrollArea.addEventListener("mousedown", (e: MouseEvent) => {
		if ((e.target as HTMLElement).closest(".gantt-bar")) return;
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
	return {
		taskMap,
		redraw: rebuild,
		destroy: () => {
			scrollArea.removeEventListener("wheel", onWheel);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			if (zoomDebounceTimer) clearTimeout(zoomDebounceTimer);
		},
	};
}
