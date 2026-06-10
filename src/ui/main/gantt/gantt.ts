// ui/main/gantt/gantt.ts
// 甘特图组件 — 整体视图，甘特条作为树行内元素
import {
	advanceGridLineDate,
	calcBarEdges,
	calcDependencyPath,
	calcRangeFromRoots,
	calcTreeMaxWidth,
	formatGanttDuration,
	GANTT_CONFIG,
	getGridFirstLineDate,
	getGridLevels,
	getGridLineStyle,
	getLayerStyle,
	getTaskInterval,
	getTimelineLayers,
	isDarkTheme,
	loadZoomState,
	saveZoomState,
} from "../../../core/component/gantt-view-process";
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
	el.style.cssText = `
		position: absolute; left: ${left}px; top: 0;
		height: 100%; width: ${width}px;
		display: flex; align-items: center; justify-content: center;
		font-size: ${fontSize}; font-weight: ${fontWeight}; color: ${color};
		${hasBorder ? "border-right: 1px solid var(--background-modifier-border);" : ""}
		overflow: hidden; white-space: nowrap;
	`;
	return el;
}

function applyGridBackground(
	content: HTMLElement,
	dayWidth: number,
	treeWidth: number,
	totalWidth: number,
	timeRange: { minTime: number; maxTime: number },
) {
	const dark = isDarkTheme();
	const gridContainer = document.createElement("div");
	gridContainer.style.cssText = `
		position: absolute; top: 0; left: 0;
		width: ${totalWidth}px; height: 100%;
		pointer-events: none; z-index: 0;
	`;
	const gridLevels = getGridLevels(dayWidth);
	const reversed = [...gridLevels].reverse();
	reversed.forEach((level) => {
		const style = getGridLineStyle(level.intervalDays, dark);
		const firstLineDate = getGridFirstLineDate(
			timeRange,
			level.intervalDays,
		);
		let lineDate = new Date(firstLineDate);
		while (lineDate.getTime() <= timeRange.maxTime) {
			const offsetDays =
				(lineDate.getTime() - timeRange.minTime) / 86400000;
			const x = treeWidth + offsetDays * dayWidth;
			if (x >= treeWidth && x <= totalWidth) {
				const line = document.createElement("div");
				line.style.cssText = `
					position: absolute; left: ${x}px; top: 0;
					width: ${style.width}; height: 100%;
					background: ${style.color};
				`;
				gridContainer.appendChild(line);
			}
			advanceGridLineDate(lineDate, level.intervalDays);
		}
	});
	content.appendChild(gridContainer);
}

function createTimelineHeader(
	timeRange: { minTime: number; maxTime: number },
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
	header.style.cssText = `
		position: sticky; top: 0; z-index: 3;
		height: ${GANTT_CONFIG.HEADER_HEIGHT}px;
		width: ${totalWidth}px;
		background: var(--background-primary);
		border-bottom: 1px solid var(--background-modifier-border);
		overflow: hidden; flex-shrink: 0;
	`;

	const treeSpacer = document.createElement("div");
	treeSpacer.style.cssText = `
		position: absolute; top: 0; left: 0;
		width: ${treeWidth}px; height: 100%;
		background: var(--background-primary); z-index: 5;
	`;
	header.appendChild(treeSpacer);

	const inner = document.createElement("div");
	inner.style.cssText = `
		position: absolute; top: 0; left: ${treeWidth}px;
		height: 100%; width: ${timelineWidth}px;
	`;

	let currentTop = 0,
		layerIdx = 0;

	const yearStyle = getLayerStyle(layerIdx, layerCount, dark);
	const yearLayer = document.createElement("div");
	yearLayer.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%;`;
	currentTop += layerHeight;
	layerIdx++;

	let curYear = -1,
		yearStart = 0;
	for (let i = 0; i < totalDays; i++) {
		const y = new Date(timeRange.minTime + i * 86400000).getFullYear();
		if (y !== curYear) {
			if (curYear >= 0 && (i - yearStart) * dayWidth > 0) {
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
			}
			curYear = y;
			yearStart = i;
		}
	}
	if (curYear >= 0 && (totalDays - yearStart) * dayWidth > 0) {
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
	}
	inner.appendChild(yearLayer);

	const showQuarters = layers.some((l) => l.name === "quarter");
	const showMonths = layers.some((l) => l.name === "month");
	const showWeeks = layers.some((l) => l.name === "week");
	const showDays = layers.some((l) => l.name === "day");

	if (showQuarters) {
		const qStyle = getLayerStyle(layerIdx, layerCount, dark);
		const qLayer = document.createElement("div");
		qLayer.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%; border-top: 1px solid var(--background-modifier-border);`;
		currentTop += layerHeight;
		layerIdx++;
		let curQ = -1,
			qStart = 0;
		for (let i = 0; i < totalDays; i++) {
			const q = Math.floor(
				new Date(timeRange.minTime + i * 86400000).getMonth() / 3,
			);
			if (q !== curQ) {
				if (curQ >= 0 && (i - qStart) * dayWidth > 0) {
					qLayer.appendChild(
						createTimelineLabel(
							qStart * dayWidth,
							(i - qStart) * dayWidth,
							layerHeight,
							qStyle.fontSize,
							qStyle.fontWeight,
							qStyle.color,
							true,
						),
					).textContent = "Q" + (curQ + 1);
				}
				curQ = q;
				qStart = i;
			}
		}
		if (curQ >= 0 && (totalDays - qStart) * dayWidth > 0) {
			qLayer.appendChild(
				createTimelineLabel(
					qStart * dayWidth,
					(totalDays - qStart) * dayWidth,
					layerHeight,
					qStyle.fontSize,
					qStyle.fontWeight,
					qStyle.color,
					false,
				),
			).textContent = "Q" + (curQ + 1);
		}
		inner.appendChild(qLayer);
	}

	if (showMonths) {
		const mNames = [
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
		const mStyle = getLayerStyle(layerIdx, layerCount, dark);
		const mLayer = document.createElement("div");
		mLayer.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%; border-top: 1px solid var(--background-modifier-border);`;
		currentTop += layerHeight;
		layerIdx++;
		let curM = -1,
			mStart = 0;
		for (let i = 0; i < totalDays; i++) {
			const m = new Date(timeRange.minTime + i * 86400000).getMonth();
			if (m !== curM) {
				if (curM >= 0 && (i - mStart) * dayWidth > 0) {
					mLayer.appendChild(
						createTimelineLabel(
							mStart * dayWidth,
							(i - mStart) * dayWidth,
							layerHeight,
							mStyle.fontSize,
							mStyle.fontWeight,
							mStyle.color,
							true,
						),
					).textContent = mNames[curM];
				}
				curM = m;
				mStart = i;
			}
		}
		if (curM >= 0 && (totalDays - mStart) * dayWidth > 0) {
			mLayer.appendChild(
				createTimelineLabel(
					mStart * dayWidth,
					(totalDays - mStart) * dayWidth,
					layerHeight,
					mStyle.fontSize,
					mStyle.fontWeight,
					mStyle.color,
					false,
				),
			).textContent = mNames[curM];
		}
		inner.appendChild(mLayer);
	}

	if (showWeeks) {
		const wStyle = getLayerStyle(layerIdx, layerCount, dark);
		const wLayer = document.createElement("div");
		wLayer.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%; border-top: 1px solid var(--background-modifier-border);`;
		currentTop += layerHeight;
		layerIdx++;
		let curW = -1,
			wStart = 0;
		for (let i = 0; i < totalDays; i++) {
			const d = new Date(timeRange.minTime + i * 86400000);
			const w = DateUtils.getISOWeekNumber(d);
			if (w !== curW) {
				if (curW >= 0 && (i - wStart) * dayWidth > 0) {
					wLayer.appendChild(
						createTimelineLabel(
							wStart * dayWidth,
							(i - wStart) * dayWidth,
							layerHeight,
							wStyle.fontSize,
							wStyle.fontWeight,
							wStyle.color,
							true,
						),
					).textContent = "W" + curW;
				}
				curW = w;
				wStart = i;
			}
		}
		if (curW >= 0 && (totalDays - wStart) * dayWidth > 0) {
			wLayer.appendChild(
				createTimelineLabel(
					wStart * dayWidth,
					(totalDays - wStart) * dayWidth,
					layerHeight,
					wStyle.fontSize,
					wStyle.fontWeight,
					wStyle.color,
					false,
				),
			).textContent = "W" + curW;
		}
		inner.appendChild(wLayer);
	}

	if (showDays) {
		const dStyle = getLayerStyle(layerIdx, layerCount, dark);
		const dLayer = document.createElement("div");
		dLayer.style.cssText = `position: absolute; top: ${currentTop}px; left: 0; height: ${layerHeight}px; width: 100%; border-top: 1px solid var(--background-modifier-border);`;
		let curD = -1,
			dStart = 0;
		for (let i = 0; i < totalDays; i++) {
			const d = new Date(timeRange.minTime + i * 86400000).getDate();
			if (d !== curD) {
				if (curD >= 0 && (i - dStart) * dayWidth > 0) {
					const label = createTimelineLabel(
						dStart * dayWidth,
						(i - dStart) * dayWidth,
						layerHeight,
						dStyle.fontSize,
						dStyle.fontWeight,
						dStyle.color,
						true,
					);
					label.textContent = String(curD);
					dLayer.appendChild(label);
				}
				curD = d;
				dStart = i;
			}
		}
		if (curD >= 0 && (totalDays - dStart) * dayWidth > 0) {
			const label = createTimelineLabel(
				dStart * dayWidth,
				(totalDays - dStart) * dayWidth,
				layerHeight,
				dStyle.fontSize,
				dStyle.fontWeight,
				dStyle.color,
				false,
			);
			label.textContent = String(curD);
			dLayer.appendChild(label);
		}
		inner.appendChild(dLayer);
	}

	const today = DateUtils.setStart(new Date()).getTime();
	if (today >= timeRange.minTime && today <= timeRange.maxTime) {
		const ox = ((today - timeRange.minTime) / 86400000) * dayWidth;
		if (ox < timelineWidth) {
			const line = document.createElement("div");
			line.style.cssText = `position: absolute; left: ${ox}px; top: 0; width: 2px; height: 100%; background: var(--interactive-accent, #7fb8f0); opacity: 0.5; z-index: 4; pointer-events: none;`;
			inner.appendChild(line);
		}
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
			const tKey = task.uid;
			const tPos = barPositions.get(tKey);
			if (!tPos) return;
			task.forbid
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
				.forEach((fid) => {
					const sTask = taskMap.get(fid);
					if (!sTask) return;
					const sKey = sTask.uid;
					const sPos = barPositions.get(sKey);
					if (!sPos) return;
					const sx = sPos.right,
						tx = tPos.left;
					if (tx <= sx + 4) return;
					const sy = sPos.y,
						ty = tPos.y;
					const d = calcDependencyPath(sx, sy, tx, ty);
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
						`${tx},${ty} ${tx - as},${ty - as / 2} ${tx - as},${ty + as / 2}`,
					);
					arrow.setAttribute(
						"fill",
						GANTT_CONFIG.DEPENDENCY_LINE_COLOR,
					);
					g.appendChild(arrow);
					const hit = document.createElementNS(
						"http://www.w3.org/2000/svg",
						"path",
					);
					hit.setAttribute("d", d);
					hit.setAttribute("fill", "none");
					hit.setAttribute("stroke", "transparent");
					hit.setAttribute("stroke-width", "14");
					hit.style.cssText =
						"pointer-events: auto; cursor: pointer;";
					const tip = [
						`🆔 ${fid} → 🆔 ${task.id || "?"}`,
						`📅 ${sTask.due ? DateUtils.formatDate(new Date(sTask.due)) : "?"} → 🛫 ${task.scheduled ? DateUtils.formatDate(new Date(task.scheduled)) : "?"}`,
					].join("<br>");
					hit.addEventListener("mouseenter", (e) =>
						tooltip.show(tip, e.clientX, e.clientY),
					);
					hit.addEventListener("mousemove", (e) =>
						tooltip.move(e.clientX, e.clientY),
					);
					hit.addEventListener("mouseleave", () => tooltip.hide());
					g.appendChild(hit);
					svg.appendChild(g);
				});
		});
	}

	requestAnimationFrame(() => redraw());
	(svg as any).__redraw = redraw;
	return svg;
}

export function renderGanttWithTree(
	container: HTMLElement,
	treeRoot: TaskTreeNode,
	options?: {
		onTaskClick?: (task: TaskTreeNode) => void;
		intervalMode?: string;
		sort?: { type: string; order: "asc" | "desc" };
		dateRange?: {
			start: number | null;
			end: number | null;
			isAll: boolean;
		};
	},
) {
	container.empty();

	const intervalMode =
		options?.intervalMode && options.intervalMode !== "none"
			? options.intervalMode
			: "any-date";
	const treeWidth = calcTreeMaxWidth([treeRoot]);
	const timeRange = calcRangeFromRoots(
		[treeRoot],
		intervalMode,
		options?.dateRange,
	);
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

	container.style.cssText =
		"display: flex; flex-direction: column; height: 100%; background: transparent; user-select: none;";

	const scrollArea = document.createElement("div");
	scrollArea.className = "gantt-scroll-area";
	scrollArea.style.cssText = "flex: 1; overflow: auto; position: relative;";
	container.appendChild(scrollArea);

	function rebuild() {
		const savedScrollLeft = scrollArea.scrollLeft;
		const savedScrollTop = scrollArea.scrollTop;

		scrollArea.innerHTML = "";
		taskMap.clear();

		const timelineWidth = zoomState.totalWidth;
		const totalWidth = treeWidth + timelineWidth;

		scrollArea.appendChild(
			createTimelineHeader(
				timeRange,
				zoomState.dayWidth,
				totalDays,
				timelineWidth,
				treeWidth,
			),
		);

		const content = document.createElement("div");
		content.className = "gantt-content";
		content.style.cssText = `
			position: relative; width: ${totalWidth}px;
			min-height: 200px; padding-bottom: 40px; overflow: hidden;
		`;

		applyGridBackground(
			content,
			zoomState.dayWidth,
			treeWidth,
			totalWidth,
			timeRange,
		);

		const today = DateUtils.setStart(new Date()).getTime();
		if (today >= timeRange.minTime && today <= timeRange.maxTime) {
			const ox =
				((today - timeRange.minTime) / 86400000) * zoomState.dayWidth;
			if (ox < timelineWidth) {
				const line = document.createElement("div");
				line.style.cssText = `
					position: absolute; left: ${treeWidth + ox}px; top: 0;
					width: 2px; height: 100%;
					background: var(--interactive-accent, #7fb8f0);
					opacity: 0.5; z-index: 0; pointer-events: none;
				`;
				content.appendChild(line);
			}
		}

		scrollArea.appendChild(content);

		const treeContainer = document.createElement("div");
		treeContainer.className = "gantt-tree-container";
		treeContainer.style.cssText =
			"position: relative; z-index: 2; display: inline-block;";
		content.appendChild(treeContainer);

		currentSvg = createDependencySVG(taskMap, totalWidth, treeContainer);
		content.appendChild(currentSvg);

		renderTaskTree(treeContainer, {
			root: treeRoot,
			onClick: (node: TaskTreeNode) => {
				if (node.uid === "__task_root__") return;
				const edges = calcBarEdges(
					node,
					timeRange,
					timelineWidth,
					intervalMode,
				);
				if (edges) {
					const targetX = treeWidth + edges.left - 20;
					scrollArea.scrollLeft = Math.max(0, targetX);
				}
			},
			sort: options?.sort,
			onRowRender: (rowEl, node) => {
				rowEl.style.position = "relative";
				rowEl.style.width = "100%";

				if (node && node.uid !== "__task_root__") {
					const taskId = node.uid;
					rowEl.setAttribute("data-task-id", taskId);
					taskMap.set(taskId, node);
					if (node.id) taskMap.set(node.id, node);

					const edges = calcBarEdges(
						node,
						timeRange,
						timelineWidth,
						intervalMode,
					);
					if (edges) {
						const left = treeWidth + edges.left;

						const bar = document.createElement("div");
						bar.className = "gantt-bar";
						bar.setAttribute("data-task-bar", "true");
						bar.style.cssText = `
							position: absolute; left: ${left}px; top: 50%;
							transform: translateY(-50%);
							width: ${edges.width}px;
							height: ${GANTT_CONFIG.TASK_BAR_HEIGHT}px;
							background: ${GANTT_CONFIG.STATUS_COLORS[node.status] || GANTT_CONFIG.STATUS_COLORS["todo"]};
							border-radius: ${GANTT_CONFIG.TASK_BAR_RADIUS}px;
							cursor: pointer; opacity: 0.85; z-index: 2;
							display: flex; align-items: center; overflow: hidden;
							transition: opacity 0.1s;
						`;

						const interval = getTaskInterval(node, intervalMode);
						if (interval && node.done) {
							const doneTime = node.done;
							if (
								doneTime >= interval.start.getTime() &&
								doneTime <= interval.end.getTime()
							) {
								const progressRatio =
									(doneTime - interval.start.getTime()) /
									(interval.end.getTime() -
										interval.start.getTime());
								const progressEl =
									document.createElement("div");
								progressEl.style.cssText = `
									position: absolute; left: 0; top: 0;
									width: ${Math.round(progressRatio * 100)}%; height: 100%;
									background: rgba(46, 125, 50, 0.5);
									border-radius: ${GANTT_CONFIG.TASK_BAR_RADIUS}px 0 0 ${GANTT_CONFIG.TASK_BAR_RADIUS}px;
									pointer-events: none;
								`;
								bar.appendChild(progressEl);
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
							interval
								? interval.end.getTime() -
										interval.start.getTime()
								: 0,
						);
						if (dur && edges.width > 30) {
							const label = document.createElement("span");
							label.style.cssText =
								"font-size: 10px; color: var(--text-on-accent, white); line-height: 1; padding: 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: relative; z-index: 1;";
							label.textContent = dur;
							bar.appendChild(label);
						}

						const tipHtml =
							getDisplayText(node) + "<br>" + buildTooltip(node);
						if (tipHtml) {
							bar.addEventListener("mouseenter", (e) =>
								tooltip.show(tipHtml, e.clientX, e.clientY),
							);
							bar.addEventListener("mousemove", (e) =>
								tooltip.move(e.clientX, e.clientY),
							);
							bar.addEventListener("mouseleave", () =>
								tooltip.hide(),
							);
						}

						bar.addEventListener("click", (e) => {
							const rect = bar.getBoundingClientRect();
							const clickX = e.clientX - rect.left;
							if (
								clickX > rect.width * 0.15 &&
								clickX < rect.width * 0.85
							) {
								if (node?.path) options?.onTaskClick?.(node);
							}
						});

						rowEl.appendChild(bar);
					}
				}
			},
		});

		// 树折叠/展开时更新右侧位置
		const onTreeToggle = () => {
			requestAnimationFrame(() => {
				const newTreeWidth = treeContainer.offsetWidth || treeWidth;
				const newTotalWidth = newTreeWidth + timelineWidth;

				content.style.width = newTotalWidth + "px";

				const header = scrollArea.querySelector(
					".gantt-header",
				) as HTMLElement;
				if (header) {
					const spacer = header.children[0] as HTMLElement;
					if (spacer) spacer.style.width = newTreeWidth + "px";
					const inner = header.children[1] as HTMLElement;
					if (inner) inner.style.left = newTreeWidth + "px";
					header.style.width = newTotalWidth + "px";
				}

				const oldGrids = content.querySelectorAll("div");
				oldGrids.forEach((el) => {
					if (
						el.style.pointerEvents === "none" &&
						el.style.position === "absolute" &&
						el.style.zIndex === "0"
					) {
						el.remove();
					}
				});
				applyGridBackground(
					content,
					zoomState.dayWidth,
					newTreeWidth,
					newTotalWidth,
					timeRange,
				);

				const todayLines = content.querySelectorAll(
					"div[style*='var(--interactive-accent']",
				);
				todayLines.forEach((l) => {
					if ((l as HTMLElement).style.zIndex === "0") l.remove();
				});
				const todayTs = DateUtils.setStart(new Date()).getTime();
				if (
					todayTs >= timeRange.minTime &&
					todayTs <= timeRange.maxTime
				) {
					const oxToday =
						((todayTs - timeRange.minTime) / 86400000) *
						zoomState.dayWidth;
					if (oxToday < timelineWidth) {
						const todayLine = document.createElement("div");
						todayLine.style.cssText = `
							position: absolute; left: ${newTreeWidth + oxToday}px; top: 0;
							width: 2px; height: 100%;
							background: var(--interactive-accent, #7fb8f0);
							opacity: 0.5; z-index: 0; pointer-events: none;
						`;
						content.appendChild(todayLine);
					}
				}

				const allBars = treeContainer.querySelectorAll(
					"[data-task-bar]",
				) as NodeListOf<HTMLElement>;
				allBars.forEach((bar) => {
					const rowEl = bar.parentElement;
					if (!rowEl) return;
					const taskId = rowEl.getAttribute("data-task-id");
					if (!taskId) return;
					const taskNode = taskMap.get(taskId);
					if (!taskNode) return;
					const taskEdges = calcBarEdges(
						taskNode,
						timeRange,
						timelineWidth,
						intervalMode,
					);
					if (taskEdges) {
						bar.style.left = newTreeWidth + taskEdges.left + "px";
					}
				});

				(currentSvg as any)?.__redraw?.();
			});
		};

		treeContainer.addEventListener("tree-toggle", onTreeToggle);

		requestAnimationFrame(() => (currentSvg as any)?.__redraw?.());
		scrollArea.scrollLeft = Math.max(0, savedScrollLeft);
		if (savedScrollTop > 0) scrollArea.scrollTop = savedScrollTop;
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
			((mouseX - treeWidth) / zoomState.dayWidth) * 86400000;
		if (e.deltaY < 0) {
			zoomState.dayWidth = Math.min(
				GANTT_CONFIG.MAX_DAY_WIDTH,
				Math.round(zoomState.dayWidth * 1.3 * 100) / 100,
			);
		} else {
			zoomState.dayWidth = Math.max(
				GANTT_CONFIG.MIN_DAY_WIDTH,
				Math.round(zoomState.dayWidth * 0.7 * 100) / 100,
			);
		}
		zoomState.totalWidth = Math.ceil(totalDays * zoomState.dayWidth);
		saveZoomState(zoomState.dayWidth);
		rebuild();
		const newMouseX =
			treeWidth +
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
		},
	};
}
