import { CONFIG } from "../../configs/plugin-configs";
import { DateUtils } from "../../tasks/process/common-process";
import * as readTasks from "../../tasks/read/read-tasks";
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_GANTT = "gantt-task-view";

export class GanttTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_GANTT;
	}
	getDisplayText() {
		return "甘特图";
	}
	getIcon() {
		return "bar-chart-2";
	}
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startGanttView(dv, app, dv.container, undefined);
	}
}

const gs = {
	wrapper: null,
	canvas: null,
	ctx: null,
	rowH: 26,
	headerH: 24,
	leftW: 300,
	scale: 1,
	offsetX: 0,
	scrollTop: 0,
	flatNodes: [],
	ganttTasks: [],
	minTime: 0,
	maxTime: 0,
	timeToX: null,
	tooltip: null,
	collapsed: new Set(),
	theme: null,
	barPath: null,
	resizeObs: null,
	isResizing: false,
	isDragging: false,
	lastDragX: 0,
};

const { formatDate, setStart, setEnd, getWeekRange } = DateUtils;

const STATUS_COLORS = {
	todo: "#6c757d",
	planned: "#adb5bd",
	"in-progress": "#4dabf7",
	completed: "#40c057",
	cancelled: "#495057",
};

function injectStyle() {
	if (document.getElementById("gantt-style")) return;
	const s = document.createElement("style");
	s.id = "gantt-style";
	s.textContent = `
        .gantt-root { padding: 4px 0; }
        .gantt-toolbar { margin-bottom: 8px; display:flex; gap:8px; flex-wrap:wrap; }
        .gantt-toolbar button {
            padding: 4px 12px; border: none; border-radius: 16px;
            background: var(--interactive-normal); color: var(--text-normal);
            cursor: pointer; font-size: 0.9em;
        }
        .gantt-wrapper {
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            overflow: auto;
            background: var(--background-primary);
        }
        .gantt-canvas { display: block; }
        .gantt-tooltip {
            position: fixed; background: #2d2d2d; color: #f0f0f0;
            border: 1px solid #555; border-radius: 6px;
            padding: 8px 12px; pointer-events: none; z-index: 10000;
            max-width: 400px; font-size: 12px; line-height: 1.4;
            display: none;
        }
    `;
	document.head.appendChild(s);
}

function getInterval(task, mode) {
	if (mode === "starts-done") {
		const s = task._starts,
			e = task._done || task._due;
		return s && e ? { start: new Date(s), end: new Date(e) } : null;
	}
	const s = task._scheduled,
		e = task._due;
	return s && e ? { start: new Date(s), end: new Date(e) } : null;
}

function buildTree(tasks, dv) {
	const prefix = CONFIG.ROOT_PATH || "pages/A 系统/A 任务系统/";
	const map = new Map();
	tasks.forEach((t) => {
		if (!map.has(t.path)) map.set(t.path, []);
		map.get(t.path).push(t);
	});
	const roots = [];
	map.forEach((ts, path) => {
		const page = dv.page(path);
		if (!page) return;
		const name = page.file.name;
		const rel = path.startsWith(prefix) ? path.slice(prefix.length) : path;
		const parts = rel.split("/");
		let parent = null,
			curPath = "";
		parts.forEach((part, i) => {
			const last = i === parts.length - 1;
			curPath += (curPath ? "/" : "") + part;
			const full = prefix + curPath;
			if (last) {
				const node = {
					type: "file",
					name,
					path,
					tasks: ts,
					fullPath: full,
					parent,
					children: [],
				};
				if (parent) parent.children.push(node);
				else roots.push(node);
			} else {
				let folder = parent?.children.find(
					(n) => n.type === "folder" && n.name === part,
				);
				if (!folder) {
					folder = {
						type: "folder",
						name: part,
						children: [],
						parent,
						fullPath: full,
					};
					if (parent) parent.children.push(folder);
					else roots.push(folder);
				}
				parent = folder;
			}
		});
	});
	return roots;
}

function sortNodes(nodes, sort) {
	nodes.sort((a, b) =>
		a.type !== b.type
			? a.type === "folder"
				? -1
				: 1
			: a.name.localeCompare(b.name),
	);
	nodes.forEach((n) => {
		if (n.type === "file" && n.tasks) {
			n.tasks.sort((a, b) => {
				const o = sort.order === "asc" ? 1 : -1;
				if (sort.type === "status") {
					const m = {
						todo: 0,
						planned: 1,
						"in-progress": 2,
						cancelled: 3,
						completed: 4,
					};
					return (m[a._status] - m[b._status]) * o;
				}
				if (sort.type === "priority") {
					const pa = a._priorityIcon
						? { "🔺": 0, "⏫": 1, "🔼": 2, "🔽": 3, "⏬": 4 }[
								a._priorityIcon
							]
						: 5;
					const pb = b._priorityIcon
						? { "🔺": 0, "⏫": 1, "🔼": 2, "🔽": 3, "⏬": 4 }[
								b._priorityIcon
							]
						: 5;
					return (pa - pb) * o;
				}
				const da = a._scheduled || a._due || a._starts || a._created;
				const db = b._scheduled || b._due || b._starts || b._created;
				if (!da && !db) return 0;
				if (!da) return 1;
				if (!db) return -1;
				return (new Date(da) - new Date(db)) * o;
			});
		}
		if (n.children) sortNodes(n.children, sort);
	});
}

function flatten(nodes, level, out, collapsed) {
	nodes.forEach((n) => {
		n.level = level;
		out.push(n);
		if (n.type === "file") {
			if (!collapsed.has(n.fullPath) && n.tasks) {
				n.tasks.forEach((task) =>
					out.push({ type: "task", task, file: n, level: level + 1 }),
				);
			}
		} else if (n.type === "folder") {
			if (!collapsed.has(n.fullPath) && n.children)
				flatten(n.children, level + 1, out, collapsed);
		}
	});
}

function prepareTasks(flat, intervalMode) {
	const rows = [];
	flat.forEach((node, idx) => {
		if (node.type !== "task") return;
		const iv = getInterval(node.task, intervalMode);
		if (!iv) return;
		rows.push({
			task: node.task,
			start: iv.start,
			end: iv.end,
			status: node.task._status,
			dur: iv.end - iv.start,
			flatIdx: idx,
		});
	});
	return rows;
}

function ensureTheme() {
	if (gs.theme) return gs.theme;
	const style = getComputedStyle(document.body);
	const fontFam =
		style.getPropertyValue("--font-text") || "Inter, sans-serif";
	gs.theme = {
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
	if (!gs.barPath) {
		const r = 4,
			w = 100,
			h = 20;
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
		gs.barPath = p;
	}
	return gs.theme;
}

function updateTimeScale() {
	const dpr = window.devicePixelRatio || 1;
	const w = gs.canvas.width / dpr;
	const chartW = w - gs.leftW - 20;
	const startX = gs.leftW + 10 + gs.offsetX;
	const range = gs.maxTime - gs.minTime || 86400000;
	gs.timeToX = (t) => startX + ((t - gs.minTime) / range) * chartW * gs.scale;
}

function draw() {
	if (!gs.canvas || !gs.ctx || !gs.timeToX) return;
	const ctx = gs.ctx;
	const dpr = window.devicePixelRatio || 1;
	const w = gs.canvas.width / dpr;
	const h = gs.canvas.height / dpr;
	const theme = ensureTheme();
	const nodes = gs.flatNodes;
	const rows = gs.ganttTasks;

	ctx.clearRect(0, 0, w, h);

	ctx.fillStyle = theme.secondary;
	ctx.fillRect(0, 0, gs.leftW, h);
	ctx.fillStyle = theme.bg;
	ctx.fillRect(gs.leftW, 0, w - gs.leftW, h);
	ctx.strokeStyle = theme.grid;
	ctx.beginPath();
	ctx.moveTo(gs.leftW, 0);
	ctx.lineTo(gs.leftW, h);
	ctx.stroke();

	const yOff = gs.headerH - gs.scrollTop;
	const rowH = gs.rowH;

	const startRow = Math.max(0, Math.floor(gs.scrollTop / rowH) - 2);
	const endRow = Math.min(
		nodes.length,
		Math.ceil((gs.scrollTop + h) / rowH) + 2,
	);

	ctx.font = theme.font;
	ctx.textBaseline = "middle";

	for (let i = startRow; i < endRow; i++) {
		const node = nodes[i];
		const y = yOff + i * rowH + rowH / 2;
		let x = 8 + node.level * 14;
		if (node.type === "folder" || node.type === "file") {
			ctx.fillStyle = theme.text;
			ctx.font = "11px " + theme.fontFam;
			const exp = !gs.collapsed.has(node.fullPath);
			ctx.fillText(exp ? "▼" : "▶", x + 4, y);
			x += 16;
			ctx.fillStyle = theme.accent;
			ctx.font = theme.boldFont;
			ctx.fillText(
				(node.type === "folder" ? "📁 " : "📄 ") +
					node.name +
					(node.tasks ? ` (${node.tasks.length})` : ""),
				x,
				y,
			);
		} else if (node.type === "task") {
			const task = node.task;
			x += 14;
			if (isToday(task)) {
				ctx.fillStyle = "#f59f00";
				ctx.fillText("●", x, y - 2);
			}
			x += 12;
			ctx.fillStyle = theme.text;
			ctx.font = theme.font;
			const icon = CONFIG.STATUS_ICONS[task._status] || "🔲";
			ctx.fillText(icon + " " + (task._cleanText || task.text), x, y);
		}
	}

	ctx.strokeStyle = theme.grid;
	ctx.lineWidth = 0.5;
	const gridStart = new Date(gs.minTime);
	gridStart.setDate(
		gridStart.getDate() -
			(gridStart.getDay() === 0 ? 6 : gridStart.getDay() - 1),
	);
	for (let t = gridStart.getTime(); t < gs.maxTime; t += 7 * 86400000) {
		const x = gs.timeToX(t);
		if (x > gs.leftW && x < w) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
	}

	const now = setStart(new Date()).getTime();
	if (now >= gs.minTime && now <= gs.maxTime) {
		const nx = gs.timeToX(now);
		ctx.beginPath();
		ctx.moveTo(nx, 0);
		ctx.lineTo(nx, h);
		ctx.strokeStyle = "#f59f00";
		ctx.lineWidth = 1.5;
		ctx.setLineDash([3, 3]);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	rows.forEach((item) => {
		if (item.flatIdx < startRow || item.flatIdx >= endRow) return;
		const x1 = gs.timeToX(item.start.getTime()),
			x2 = gs.timeToX(item.end.getTime());
		const y = yOff + item.flatIdx * rowH + (rowH - 20) / 2;
		let bw = x2 - x1;
		if (bw < 2) bw = 2;
		ctx.fillStyle = STATUS_COLORS[item.status] || "#adb5bd";
		ctx.save();
		ctx.translate(x1, y);
		ctx.scale(bw / 100, 1);
		ctx.fill(gs.barPath);
		ctx.restore();
		const dur = formatDur(item.dur);
		if (dur) {
			ctx.fillStyle = theme.text;
			ctx.font = "10px " + theme.fontFam;
			ctx.textAlign = "left";
			const tx = x2 + 4;
			if (tx < w - 40) ctx.fillText(dur, tx, y + 10);
		}
	});

	const depColor = "#3a6ea5";
	ctx.strokeStyle = depColor;
	ctx.lineWidth = 1;
	ctx.fillStyle = depColor;
	rows.forEach((item) => {
		const task = item.task;
		if (!task._forbid || !task._scheduled || !task._due) return;
		const deps = task._forbid.split(",").map((s) => s.trim());
		deps.forEach((depId) => {
			const depTask = gs.flatNodes.find(
				(n) => n.type === "task" && n.task._id === depId,
			)?.task;
			if (!depTask) return;
			const depRow = rows.find((r) => r.task === depTask);
			if (!depRow) return;
			const fromTime = depTask._done || depTask._due;
			const toTime = task._starts || task._scheduled;
			if (!fromTime || !toTime) return;
			const fx = gs.timeToX(new Date(fromTime).getTime());
			const fy = yOff + depRow.flatIdx * rowH + rowH / 2;
			const tx = gs.timeToX(new Date(toTime).getTime());
			const ty = yOff + item.flatIdx * rowH + rowH / 2;
			const mx = fx + (tx - fx) * 0.5;
			ctx.beginPath();
			ctx.moveTo(fx, fy);
			ctx.lineTo(mx, fy);
			ctx.lineTo(mx, ty);
			ctx.lineTo(tx, ty);
			ctx.stroke();
			const arrowSize = 5;
			ctx.beginPath();
			ctx.moveTo(tx - arrowSize, ty - 3);
			ctx.lineTo(tx, ty);
			ctx.lineTo(tx - arrowSize, ty + 3);
			ctx.closePath();
			ctx.fill();
		});
	});

	ctx.fillStyle = theme.text;
	ctx.font = "11px " + theme.fontFam;
	ctx.textAlign = "center";
	for (let i = 0; i <= 10; i++) {
		const time = gs.minTime + (i / 10) * (gs.maxTime - gs.minTime);
		const x = gs.timeToX(time);
		if (x > gs.leftW && x < w)
			ctx.fillText(formatDate(new Date(time)), x, 14);
	}
}

function formatDur(ms) {
	if (ms <= 0) return "";
	const days = ms / 86400000;
	if (days < 1) return Math.round(days * 24) + "h";
	if (days < 7) return Math.round(days) + "d";
	if (days < 30) return Math.round(days / 7) + "w";
	if (days < 365) return Math.round(days / 30) + "m";
	return Math.round(days / 365) + "y";
}

function isToday(task) {
	const today = setStart(new Date()).getTime();
	const tomorrow = today + 86400000;
	const test = (d) =>
		d
			? new Date(d).getTime() >= today && new Date(d).getTime() < tomorrow
			: false;
	return (
		test(task._scheduled) ||
		test(task._due) ||
		test(task._starts) ||
		test(task._created)
	);
}

function resize() {
	if (!gs.wrapper || !gs.canvas) return;
	const w = gs.wrapper.clientWidth;
	const h = gs.headerH + gs.flatNodes.length * gs.rowH + 20;
	const dpr = window.devicePixelRatio || 1;
	gs.canvas.width = w * dpr;
	gs.canvas.height = Math.max(400, h) * dpr;
	gs.canvas.style.width = w + "px";
	gs.canvas.style.height = Math.max(400, h) + "px";
	gs.ctx.setTransform(1, 0, 0, 1, 0, 0);
	gs.ctx.scale(dpr, dpr);
	updateTimeScale();
	draw();
}

function onCanvasClick(e, app, refresh) {
	const rect = gs.canvas.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;
	const sx = gs.canvas.width / rect.width;
	const x = ((e.clientX - rect.left) * sx) / dpr;
	const y = ((e.clientY - rect.top) * sx) / dpr;
	const row = Math.floor((y - gs.headerH + gs.scrollTop) / gs.rowH);
	if (x < gs.leftW && row >= 0 && row < gs.flatNodes.length) {
		const node = gs.flatNodes[row];
		if (node.type === "file") {
			app.workspace.openLinkText(node.path, "", { active: true });
		} else if (node.type === "task") {
			const task = node.task;
			const file = app.vault.getAbstractFileByPath(task.path);
			if (file) {
				const leaf = app.workspace.getLeaf(false);
				leaf.openFile(file).then(() => {
					setTimeout(
						() =>
							leaf.view?.editor?.setCursor({
								line: task.line ?? 0,
								ch: 0,
							}),
						20,
					);
				});
			}
		} else if (node.type === "folder" || node.type === "file") {
			const p = node.fullPath;
			gs.collapsed.has(p) ? gs.collapsed.delete(p) : gs.collapsed.add(p);
			refresh();
		}
	}
}

function onMouseMove(e) {
	const rect = gs.canvas.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;
	const sx = gs.canvas.width / rect.width;
	const x = ((e.clientX - rect.left) * sx) / dpr;
	const y = ((e.clientY - rect.top) * sx) / dpr;
	if (!gs.timeToX || !gs.tooltip) return;
	let tip = null;
	if (x > gs.leftW) {
		for (const item of gs.ganttTasks) {
			const x1 = gs.timeToX(item.start.getTime()),
				x2 = gs.timeToX(item.end.getTime());
			const rowY = gs.headerH - gs.scrollTop + item.flatIdx * gs.rowH;
			if (x >= x1 && x <= x2 && y >= rowY && y <= rowY + gs.rowH) {
				tip = item.task;
				break;
			}
		}
	} else {
		const row = Math.floor((y - gs.headerH + gs.scrollTop) / gs.rowH);
		const node = gs.flatNodes[row];
		if (node?.type === "task") tip = node.task;
	}
	if (tip) {
		readTasks.ensureTaskProperties(tip);
		gs.tooltip.innerHTML = (tip._tooltip || "").replace(/\n/g, "<br>");
		gs.tooltip.style.display = "block";
		gs.tooltip.style.left = e.clientX + 12 + "px";
		gs.tooltip.style.top = e.clientY + 12 + "px";
	} else {
		gs.tooltip.style.display = "none";
	}
}

function render(dv, app, globalState) {
	const sort = globalState?.leftSort || { type: "status", order: "asc" };
	const intervalMode = globalState?.intervalMode || "scheduled-due";

	let tasks = readTasks.getAllTasks(false, dv, globalState).slice();
	const {
		dateFilterState,
		markFilterState,
		hideRepeatTasks,
		hideCompletedTasks,
		hideCancelledTasks,
	} = globalState || {};
	if (
		dateFilterState &&
		!dateFilterState.isAll &&
		dateFilterState.start &&
		dateFilterState.end
	) {
		const rs = dateFilterState.start.getTime(),
			re = dateFilterState.end.getTime();
		tasks = tasks.filter((t) => {
			const tr = t._cachedTimeRange;
			return tr && tr.start <= re && tr.end >= rs;
		});
	}
	if (markFilterState?.statuses?.length < CONFIG.ALLOWED_STATUSES.length)
		tasks = tasks.filter((t) =>
			markFilterState.statuses.includes(t._status),
		);
	if (markFilterState?.includeMarks?.length)
		tasks = tasks.filter((t) =>
			markFilterState.includeMarks.every((m) => t._marks?.[m]),
		);
	if (markFilterState?.excludeMarks?.length)
		tasks = tasks.filter(
			(t) => !markFilterState.excludeMarks.some((m) => t._marks?.[m]),
		);
	if (hideRepeatTasks) tasks = tasks.filter((t) => !t._repeat);
	if (hideCompletedTasks)
		tasks = tasks.filter((t) => t._status !== "completed");
	if (hideCancelledTasks)
		tasks = tasks.filter((t) => t._status !== "cancelled");

	const roots = buildTree(tasks, dv);
	sortNodes(roots, sort);
	gs.flatNodes = [];
	flatten(roots, 0, gs.flatNodes, gs.collapsed);
	gs.ganttTasks = prepareTasks(gs.flatNodes, intervalMode);

	if (gs.ganttTasks.length > 0) {
		const min = Math.min(...gs.ganttTasks.map((t) => t.start.getTime()));
		const max = Math.max(...gs.ganttTasks.map((t) => t.end.getTime()));
		const pad = Math.max((max - min) * 0.05, 86400000);
		gs.minTime = min - pad;
		gs.maxTime = max + pad;
	} else {
		const r = getWeekRange(new Date());
		gs.minTime = r.start.getTime();
		gs.maxTime = r.end.getTime();
	}

	resize();
}

export async function startGanttView(dv, app, container, globalState) {
	injectStyle();
	container.innerHTML = "";
	container.className = "gantt-root";

	const toolbar = document.createElement("div");
	toolbar.className = "gantt-toolbar";
	const folderBtn = document.createElement("button");
	folderBtn.textContent = gs.collapsed.size
		? "📁 显示文件夹"
		: "📂 隐藏文件夹";
	folderBtn.onclick = () => {
		if (gs.collapsed.size) {
			gs.collapsed.clear();
		} else {
			gs.flatNodes.forEach((n) => {
				if (n.type === "folder" || n.type === "file")
					gs.collapsed.add(n.fullPath);
			});
		}
		folderBtn.textContent = gs.collapsed.size
			? "📁 显示文件夹"
			: "📂 隐藏文件夹";
		render(dv, app, globalState);
	};
	toolbar.appendChild(folderBtn);
	container.appendChild(toolbar);

	const wrapper = document.createElement("div");
	wrapper.className = "gantt-wrapper";
	const canvas = document.createElement("canvas");
	canvas.className = "gantt-canvas";
	wrapper.appendChild(canvas);
	container.appendChild(wrapper);

	gs.wrapper = wrapper;
	gs.canvas = canvas;
	gs.ctx = canvas.getContext("2d");

	const tooltip = document.createElement("div");
	tooltip.className = "gantt-tooltip";
	document.body.appendChild(tooltip);
	gs.tooltip = tooltip;

	const refresh = () => render(dv, app, globalState);

	canvas.addEventListener("click", (e) => onCanvasClick(e, app, refresh));
	canvas.addEventListener("mousemove", onMouseMove);
	canvas.addEventListener("mousedown", (e) => {
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const sx = canvas.width / rect.width;
		const x = ((e.clientX - rect.left) * sx) / dpr;
		if (Math.abs(x - gs.leftW) < 6) {
			gs.isResizing = true;
			canvas.style.cursor = "ew-resize";
			e.preventDefault();
		} else {
			gs.isDragging = true;
			gs.lastDragX = e.clientX;
			canvas.style.cursor = "grabbing";
		}
	});
	window.addEventListener("mousemove", (e) => {
		if (!gs.isResizing && !gs.isDragging) return;
		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const sx = canvas.width / rect.width;
		const x = ((e.clientX - rect.left) * sx) / dpr;
		if (gs.isResizing) {
			gs.leftW = Math.min(500, Math.max(200, x));
			resize();
		} else if (gs.isDragging) {
			const dx = e.clientX - gs.lastDragX;
			gs.lastDragX = e.clientX;
			gs.offsetX += dx;
			const w = canvas.width / dpr;
			const chartW = w - gs.leftW - 20;
			const minOff = -(chartW * gs.scale - chartW);
			gs.offsetX = Math.max(minOff, Math.min(0, gs.offsetX));
			updateTimeScale();
			draw();
		}
	});
	window.addEventListener("mouseup", () => {
		gs.isResizing = false;
		gs.isDragging = false;
		canvas.style.cursor = "default";
	});
	canvas.addEventListener(
		"wheel",
		(e) => {
			if (!e.altKey) return;
			e.preventDefault();
			gs.scale *= e.deltaY > 0 ? 0.9 : 1.1;
			gs.scale = Math.min(3, Math.max(0.3, gs.scale));
			updateTimeScale();
			draw();
		},
		{ passive: false },
	);
	wrapper.addEventListener("scroll", () => {
		gs.scrollTop = wrapper.scrollTop;
		draw();
	});
	gs.resizeObs = new ResizeObserver(() => resize());
	gs.resizeObs.observe(wrapper);

	ensureTheme();

	const thisWeek = getWeekRange(new Date());
	globalState.dateFilterState = {
		isAll: false,
		start: thisWeek.start,
		end: thisWeek.end,
	};
	render(dv, app, globalState);

	return {
		cleanup: () => {
			container.innerHTML = "";
			if (gs.tooltip) {
				gs.tooltip.remove();
				gs.tooltip = null;
			}
			if (gs.resizeObs) {
				gs.resizeObs.disconnect();
				gs.resizeObs = null;
			}
		},
		updateSort: () => render(dv, app, globalState),
	};
}
