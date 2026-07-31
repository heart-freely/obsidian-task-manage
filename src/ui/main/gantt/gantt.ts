// src/ui/main/gantt/gantt.ts

import { getStatusColors } from "../../../core/config/config";
import { buildTooltip, getDisplayText } from "../../../core/task/task-format";
import { TaskTreeNode } from "../../../core/task/task-tree";
import { GanttSvgElement } from "../../../type/type";
import { DateUtils } from "../../../util/date-utils";
import { createEl } from "../../../util/dom-utils";
import { tooltip } from "../../component/tooltip/tooltip";
import { renderTaskTree } from "../list/tree-list";
import {
	calcRangeFromRoots,
	calcTreeMaxWidth,
	formatGanttDuration,
	GANTT_CONFIG,
	getTaskInterval,
	isDarkTheme,
	loadZoomState,
	saveZoomState,
} from "./gantt-view-process";

type LayerDef = {
	name: string;
	visible: boolean;
	fontSize: string;
	fontWeight: string;
	color: string;
	getLabel: (d: Date) => string;
	nextDate: (d: Date) => Date;
};

function createTimelineHeader(
	tr: { minTime: number; maxTime: number },
	dateToX: (ts: number) => number,
	_totalDays: number,
	dayWidth: number,
	totalWidth: number,
	treeWidth: number,
): HTMLElement {
	const HEADER_HEIGHT = GANTT_CONFIG.HEADER_HEIGHT;
	const dark = isDarkTheme();
	const borderColor = "var(--background-modifier-border)";
	const textColor = "var(--text-normal)";
	const mutedColor = dark ? "#999" : "#888";

	const header = createEl("div");
	header.className = "gantt-header gantt-header-dynamic";
	header.setCssProps({
		"--gantt-header-height": HEADER_HEIGHT + "px",
		"--gantt-header-width": treeWidth + totalWidth + "px",
	});

	const spacer = createEl("div");
	spacer.className = "gantt-header-spacer";
	spacer.setCssProps({ "--gantt-spacer-width": treeWidth + "px" });
	header.appendChild(spacer);

	const inner = createEl("div");
	inner.className = "gantt-header-inner-dynamic";
	inner.setCssProps({
		"--gantt-inner-left": treeWidth + "px",
		"--gantt-inner-width": totalWidth + "px",
	});
	header.appendChild(inner);

	const layers: LayerDef[] = [
		{
			name: "year",
			visible: true,
			fontSize: "11px",
			fontWeight: "bold",
			color: textColor,
			getLabel: (d: Date): string => String(d.getFullYear()),
			nextDate: (d: Date): Date => new Date(d.getFullYear() + 1, 0, 1),
		},
		{
			name: "quarter",
			visible: dayWidth >= 5,
			fontSize: "10px",
			fontWeight: "bold",
			color: textColor,
			getLabel: (d: Date): string =>
				"Q" + String(Math.floor(d.getMonth() / 3) + 1).padStart(2, "0"),
			nextDate: (d: Date): Date =>
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
			getLabel: (d: Date): string =>
				"M" + String(d.getMonth() + 1).padStart(2, "0"),
			nextDate: (d: Date): Date =>
				new Date(d.getFullYear(), d.getMonth() + 1, 1),
		},
		{
			name: "week",
			visible: dayWidth >= 15,
			fontSize: "8px",
			fontWeight: "normal",
			color: mutedColor,
			getLabel: (d: Date): string =>
				"W" + String(DateUtils.getISOWeekNumber(d)).padStart(2, "0"),
			nextDate: (d: Date): Date => {
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
			getLabel: (d: Date): string => String(d.getDate()).padStart(2, "0"),
			nextDate: (d: Date): Date => {
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
				const el = createEl("span");
				el.textContent = layer.getLabel(cur);
				el.className = "gantt-header-label";
				if (nextTs < tr.maxTime)
					el.addClass("gantt-header-label-border-right");
				el.setCssProps({
					"--gantt-label-left": x1 + "px",
					"--gantt-label-top": idx * eachH + "px",
					"--gantt-label-width": x2 - x1 + "px",
					"--gantt-label-height": eachH + "px",
					"--gantt-label-font-size": layer.fontSize,
					"--gantt-label-font-weight": layer.fontWeight,
					"--gantt-label-color": layer.color,
					"--gantt-label-border-color": borderColor,
				});
				header.appendChild(el);
			}
			cur = next;
		}
	});

	return header;
}

function createDependencySVG(
	taskMap: Map<string, TaskTreeNode>,
	totalWidth: number,
): GanttSvgElement {
	const DEP_COLOR = "var(--text-muted)";
	const svg: GanttSvgElement = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg",
	) as GanttSvgElement;
	svg.setAttribute(
		"class",
		"gantt-dependencies gantt-dependency-svg-dynamic",
	);
	svg.setAttribute("width", String(totalWidth));
	svg.setCssProps({ "--gantt-svg-width": totalWidth + "px" });

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
					g.addClass("task-clickable");
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
	svg.__redraw = redraw;
	return svg;
}

export async function renderGanttWithTree(
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
): Promise<{
	taskMap: Map<string, TaskTreeNode>;
	redraw: () => Promise<void>;
	destroy: () => void;
}> {
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
	let isDragging = false;
	let lastDragX = 0;
	let dragStartScrollLeft = 0;
	let currentSvg: GanttSvgElement | null = null;
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

	const dateToX = (ts: number): number =>
		((ts - timeRange.minTime) /
			(timeRange.maxTime - timeRange.minTime || 86400000)) *
		zoomState.totalWidth;

	const intervalCache = new Map<string, { start: Date; end: Date } | null>();
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
		const left: number = dateToX(interval.start.getTime());
		const right: number = dateToX(interval.end.getTime());
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
		const bar = createEl("div");
		bar.className = "gantt-bar gantt-bar-dynamic";
		bar.setAttribute("data-task-bar", "true");
		bar.setAttribute("data-uid", node.uid);
		const barLeftPx: string = actualTreeWidth + edges.left + "px";
		const barTopPx: string = y + "px";
		bar.setCssProps({
			"--gantt-bar-left": barLeftPx,
			"--gantt-bar-top": barTopPx,
			"--gantt-bar-width": edges.width + "px",
			"--gantt-bar-height": GANTT_CONFIG.TASK_BAR_HEIGHT + "px",
			"--gantt-bar-bg": statusColors[node.status] || statusColors["todo"],
			"--gantt-bar-radius": GANTT_CONFIG.TASK_BAR_RADIUS + "px",
		});

		if (edges.width > 60) {
			const desc = createEl("span");
			desc.className = "gantt-bar-desc";
			desc.textContent = node.text || node.content || "";
			bar.appendChild(desc);
		}

		const dur = formatGanttDuration(
			intervalCache.get(node.uid)
				? intervalCache.get(node.uid)!.end.getTime() -
						intervalCache.get(node.uid)!.start.getTime()
				: 0,
		);
		if (dur && edges.width > 30) {
			const label = createEl("span");
			label.className = "gantt-bar-label";
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
					window.clearTimeout(clickTimer);
					clickTimer = null;
					if (node?.path) options?.onTaskClick?.(node);
					return;
				}
				clickTimer = window.setTimeout(() => {
					clickTimer = null;
					const row = scrollArea.querySelector<HTMLElement>(
						`[data-task-id="${node.uid}"]`,
					);
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
					bar.setCssProps({
						"--gantt-bar-top": y + "px",
						"--gantt-bar-left": actualTreeWidth + edges.left + "px",
						"--gantt-bar-width": edges.width + "px",
						"--gantt-bar-bg":
							statusColors[node.status] || statusColors["todo"],
					});
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
		currentSvg?.__redraw?.(barPositions);
	}

	function updateGridLevel(dayWidth: number) {
		if (!gridOverlay) return;
		const gap = Math.max(dayWidth, 1);
		const borderColor = "rgba(128,128,128,0.2)";
		let lineGap: number;
		if (dayWidth >= 40) lineGap = gap;
		else if (dayWidth >= 15) lineGap = gap * 7;
		else lineGap = gap * 30;
		gridOverlay.setCssProps({
			"--gantt-grid-bg-image": `repeating-linear-gradient(to right, ${borderColor} 0, ${borderColor} 1px, transparent 1px, transparent ${lineGap}px)`,
			"--gantt-grid-bg-size": `${lineGap}px 100%`,
		});
	}

	function updateTodayLine() {
		if (!todayLine) return;
		const ts: number = DateUtils.setStart(new Date()).getTime();
		if (ts >= timeRange.minTime && ts <= timeRange.maxTime) {
			const todayLeft: string = actualTreeWidth + dateToX(ts) + "px";
			todayLine.setCssProps({ "--gantt-today-left": todayLeft });
			todayLine.removeClass("task-hidden");
		} else {
			todayLine.addClass("task-hidden");
		}
	}

	function updateLayoutWidths() {
		const tc = scrollArea.querySelector<HTMLElement>(
			".gantt-tree-container",
		);
		actualTreeWidth = tc?.offsetWidth || initTreeWidth;
		const tw = zoomState.totalWidth;
		const totalW = actualTreeWidth + tw;
		barsContainer.setCssProps({ "--gantt-bars-width": totalW + "px" });
		if (gridOverlay) {
			gridOverlay.setCssProps({
				"--gantt-grid-left": actualTreeWidth + "px",
				"--gantt-grid-width": tw + "px",
			});
		}
		updateTodayLine();
	}

	function fastUpdateBars() {
		const tw = zoomState.totalWidth;
		barCache.forEach((bar, uid) => {
			const cached = barPositionCache.get(uid);
			if (!cached) return;
			const left: number = dateToX(cached.intervalStart);
			const right: number = dateToX(cached.intervalEnd);
			const clampedLeft = Math.max(0, left);
			const clampedRight = Math.min(tw, right);
			if (clampedRight > clampedLeft) {
				bar.setCssProps({
					"--gantt-bar-left": actualTreeWidth + clampedLeft + "px",
					"--gantt-bar-width": clampedRight - clampedLeft + "px",
				});
			}
		});
	}

	function deferredUpdate() {
		if (deferredUpdateTimer) window.clearTimeout(deferredUpdateTimer);
		deferredUpdateTimer = window.setTimeout(() => {
			const tw = zoomState.totalWidth;
			const oldHeader =
				scrollArea.querySelector<HTMLElement>(".gantt-header");
			if (oldHeader)
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

			const oldLineLayer = scrollArea.querySelector<HTMLElement>(
				".gantt-timeline-lines",
			);
			if (oldLineLayer) {
				oldLineLayer.innerHTML = "";
				oldLineLayer.setCssProps({
					"--gantt-lines-width": tw + "px",
					"--gantt-lines-left": actualTreeWidth + "px",
				});
				for (let i = 0; i < totalDays; i++) {
					const d = new Date(timeRange.minTime + i * 86400000);
					if (d.getDate() === 1) {
						const x: number = dateToX(d.getTime());
						const line = createEl("div");
						line.className = "gantt-timeline-line";
						line.setCssProps({ "--gantt-line-left": x + "px" });
						oldLineLayer.appendChild(line);
					}
				}
			}

			const barPositions = new Map<
				string,
				{ left: number; right: number; y: number }
			>();
			const scrollRect = scrollArea.getBoundingClientRect();
			barCache.forEach((bar, uid) => {
				const node = taskMap.get(uid);
				if (!node) return;
				const rect = bar.getBoundingClientRect();
				barPositions.set(uid, {
					left: rect.left - scrollRect.left + scrollArea.scrollLeft,
					right: rect.right - scrollRect.left + scrollArea.scrollLeft,
					y: parseFloat(
						bar.style.getPropertyValue("--gantt-bar-top") || "0",
					),
				});
				if (node.id) barPositions.set(node.id, barPositions.get(uid)!);
			});
			currentSvg?.__redraw?.(barPositions);
		}, 150);
	}

	container.addClass("gantt-container");
	const scrollArea = createEl("div");
	scrollArea.className = "gantt-scroll-area";
	container.appendChild(scrollArea);

	scrollArea.addEventListener("mouseover", (e) => {
		const bar = (e.target as HTMLElement).closest<HTMLElement>(
			".gantt-bar",
		);
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
		const bar = (e.target as HTMLElement).closest<HTMLElement>(
			".gantt-bar",
		);
		if (bar) tooltip.move(e.clientX, e.clientY);
	});
	scrollArea.addEventListener("mouseout", () => tooltip.hide());

	async function rebuild() {
		const sl = scrollArea.scrollLeft;
		const st = scrollArea.scrollTop;
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
		if (deferredUpdateTimer) window.clearTimeout(deferredUpdateTimer);

		const treeContainer = createEl("div");
		treeContainer.className =
			"gantt-tree-container gantt-tree-container-dynamic";
		treeContainer.setCssProps({
			"--gantt-tree-top": GANTT_CONFIG.HEADER_HEIGHT + "px",
		});
		scrollArea.appendChild(treeContainer);

		renderTaskTree(treeContainer, {
			root: displayRoot,
			focusRoot: options?.focusRoot,
			onClick: options?.onNodeClick,
			onDoubleClick: options?.onTaskClick,
			onRestore: options?.onRestore,
			sort: options?.sort,
			onRowRender: (rowEl, node) => {
				rowEl.addClass("task-relative", "task-w-full");
				if (node && node.uid !== "__task_root__") {
					rowEl.setAttribute("data-task-id", node.uid);
					taskMap.set(node.uid, node);
					if (node.id) taskMap.set(node.id, node);
					const cc = rowEl.querySelector<HTMLElement>("div");
					if (cc && getBarEdges(node)) {
						const lb = createEl("span");
						lb.textContent = "➤";
						lb.className = "gantt-locate-btn";
						lb.addEventListener("click", (ev) => {
							ev.stopPropagation();
							const te = getBarEdges(node);
							if (te) {
								const targetLeft = Math.max(
									0,
									actualTreeWidth + te.left - 20,
								);
								window.requestAnimationFrame(() => {
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

		window.requestAnimationFrame(() => {
			actualTreeWidth = treeContainer.offsetWidth || initTreeWidth;
			const tw2 = zoomState.totalWidth;
			const totalW = actualTreeWidth + tw2;

			const header = createTimelineHeader(
				timeRange,
				dateToX,
				totalDays,
				zoomState.dayWidth,
				tw2,
				actualTreeWidth,
			);
			header.addClass("gantt-header-top");
			scrollArea.insertBefore(header, treeContainer);

			const lineLayer = createEl("div");
			lineLayer.className =
				"gantt-timeline-lines gantt-timeline-lines-dynamic gantt-timeline-lines-height";
			lineLayer.setCssProps({
				"--gantt-lines-left": actualTreeWidth + "px",
				"--gantt-lines-width": tw2 + "px",
			});
			for (let i = 0; i < totalDays; i++) {
				const d = new Date(timeRange.minTime + i * 86400000);
				if (d.getDate() === 1) {
					const x: number = dateToX(d.getTime());
					const line = createEl("div");
					line.className = "gantt-timeline-line";
					line.setCssProps({ "--gantt-line-left": x + "px" });
					lineLayer.appendChild(line);
				}
			}
			scrollArea.appendChild(lineLayer);

			gridOverlay = createEl("div");
			gridOverlay.className =
				"gantt-grid-overlay gantt-grid-overlay-dynamic gantt-grid-overlay-height";
			gridOverlay.setCssProps({
				"--gantt-grid-left": actualTreeWidth + "px",
				"--gantt-grid-width": tw2 + "px",
			});
			updateGridLevel(zoomState.dayWidth);
			scrollArea.appendChild(gridOverlay);

			todayLine = createEl("div");
			todayLine.className =
				"gantt-today-line gantt-today-line-dynamic gantt-today-line-height";
			const todayTs: number = DateUtils.setStart(new Date()).getTime();
			const todayLeft: string = actualTreeWidth + dateToX(todayTs) + "px";
			todayLine.setCssProps({ "--gantt-today-left": todayLeft });
			updateTodayLine();
			scrollArea.appendChild(todayLine);

			barsContainer = createEl("div");
			barsContainer.className = "gantt-bars-dynamic";
			barsContainer.setCssProps({ "--gantt-bars-width": totalW + "px" });
			scrollArea.appendChild(barsContainer);

			currentSvg = createDependencySVG(taskMap, totalW);
			currentSvg.addClass("gantt-svg-top", "gantt-svg-height");
			currentSvg.setCssProps({ "--gantt-svg-z": "7" });
			scrollArea.appendChild(currentSvg);

			syncHeaderScroll = () => {
				const h =
					scrollArea.querySelector<HTMLElement>(".gantt-header");
				if (h)
					h.setCssProps({
						"--gantt-header-translate": `translateX(${-scrollArea.scrollLeft}px)`,
					});
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
				treeToggleRafId = window.requestAnimationFrame(() => {
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
		const mouseContentX: number =
			e.clientX - rect.left + scrollArea.scrollLeft - actualTreeWidth;
		const mouseTime: number =
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
		wheelRafId = window.requestAnimationFrame(() => {
			wheelRafId = null;
			fastUpdateBars();
			updateLayoutWidths();
			updateGridLevel(zoomState.dayWidth);
			updateTodayLine();
			syncHeaderScroll?.();
			deferredUpdate();
		});

		const newMouseContentX: number =
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
		scrollArea.addClass("task-cursor-grabbing", "task-select-none");
		e.preventDefault();
	});
	const onMouseMove = (e: MouseEvent) => {
		if (!isDragging) return;
		scrollArea.scrollLeft = dragStartScrollLeft - (e.clientX - lastDragX);
	};
	const onMouseUp = () => {
		isDragging = false;
		scrollArea.removeClass("task-cursor-grabbing", "task-select-none");
	};
	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mouseup", onMouseUp);

	await rebuild();

	return {
		taskMap,
		redraw: rebuild,
		destroy: () => {
			scrollArea.removeEventListener("wheel", onWheel);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			if (syncHeaderScroll)
				scrollArea.removeEventListener("scroll", syncHeaderScroll);
			if (deferredUpdateTimer) window.clearTimeout(deferredUpdateTimer);
			if (onTreeToggle) {
				const tc = scrollArea.querySelector<HTMLElement>(
					".gantt-tree-container",
				);
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
