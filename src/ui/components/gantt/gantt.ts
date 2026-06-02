import { CONFIG } from "../../../configs/configs";
import { DateUtils } from "../../../process/process";
import { tooltip } from "../tooltip/tooltip";

const gs = {
	wrapper: null as HTMLElement | null,
	canvas: null as HTMLCanvasElement | null,
	ctx: null as CanvasRenderingContext2D | null,
	rowH: 26,
	headerH: 24,
	leftW: 300,
	scale: 1,
	offsetX: 0,
	scrollTop: 0,
	flatNodes: [] as any[],
	ganttTasks: [] as any[],
	minTime: 0,
	maxTime: 0,
	timeToX: null as ((t: number) => number) | null,
	collapsed: new Set<string>(),
	theme: null as any,
	barPath: null as Path2D | null,
	resizeObs: null as ResizeObserver | null,
	isResizing: false,
	isDragging: false,
	lastDragX: 0,
};

const { formatDate, setStart, setEnd, getWeekRange } = DateUtils;

const STATUS_COLORS: Record<string, string> = {
	todo: "#6c757d",
	planned: "#adb5bd",
	"in-progress": "#4dabf7",
	completed: "#40c057",
	cancelled: "#495057",
};

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
	if (!gs.canvas) return;
	const dpr = window.devicePixelRatio || 1;
	const w = gs.canvas.width / dpr;
	const chartW = w - gs.leftW - 20;
	const startX = gs.leftW + 10 + gs.offsetX;
	const range = gs.maxTime - gs.minTime || 86400000;
	gs.timeToX = (t: number) =>
		startX + ((t - gs.minTime) / range) * chartW * gs.scale;
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

	rows.forEach((item: any) => {
		if (item.flatIdx < startRow || item.flatIdx >= endRow) return;
		const x1 = gs.timeToX!(item.start.getTime()),
			x2 = gs.timeToX!(item.end.getTime());
		const y = yOff + item.flatIdx * rowH + (rowH - 20) / 2;
		let bw = x2 - x1;
		if (bw < 2) bw = 2;
		ctx.fillStyle = STATUS_COLORS[item.status] || "#adb5bd";
		ctx.save();
		ctx.translate(x1, y);
		ctx.scale(bw / 100, 1);
		ctx.fill(gs.barPath!);
		ctx.restore();
	});

	ctx.fillStyle = theme.text;
	ctx.font = "11px " + theme.fontFam;
	ctx.textAlign = "center";
	for (let i = 0; i <= 10; i++) {
		const time = gs.minTime + (i / 10) * (gs.maxTime - gs.minTime);
		const x = gs.timeToX!(time);
		if (x > gs.leftW && x < w)
			ctx.fillText(formatDate(new Date(time)), x, 14);
	}
}

function isToday(task: any) {
	const today = setStart(new Date()).getTime();
	const tomorrow = today + 86400000;
	const test = (d: string) =>
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
	gs.ctx!.setTransform(1, 0, 0, 1, 0, 0);
	gs.ctx!.scale(dpr, dpr);
	updateTimeScale();
	draw();
}

export function renderGantt(container: HTMLElement, tasks: any[]) {
	container.empty();
	container.style.display = "flex";
	container.style.height = "100%";

	const leftPanel = document.createElement("div");
	leftPanel.className = "gantt-left";
	leftPanel.style.width = "250px";
	leftPanel.style.overflowY = "auto";
	leftPanel.style.borderRight = "1px solid var(--background-modifier-border)";

	const rightPanel = document.createElement("div");
	rightPanel.style.flex = "1";
	rightPanel.style.overflow = "hidden";
	const canvas = document.createElement("canvas");
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	rightPanel.appendChild(canvas);

	container.appendChild(leftPanel);
	container.appendChild(rightPanel);

	const fileMap = new Map<string, any[]>();
	tasks.forEach((t) => {
		if (!fileMap.has(t.path)) fileMap.set(t.path, []);
		fileMap.get(t.path)!.push(t);
	});

	fileMap.forEach((tasks, path) => {
		const fileName = path.split("/").pop()?.replace(".md", "") || path;
		const fileDiv = document.createElement("div");
		fileDiv.className = "gantt-file";
		fileDiv.textContent = fileName;
		leftPanel.appendChild(fileDiv);
	});

	gs.wrapper = rightPanel;
	gs.canvas = canvas;
	gs.ctx = canvas.getContext("2d");

	gs.flatNodes = [];
	let idx = 0;
	fileMap.forEach((tasks) => {
		tasks.forEach((task) => {
			if (task._scheduled && task._due) {
				gs.flatNodes.push({ type: "task", task, level: 0 });
				gs.ganttTasks.push({
					task,
					start: new Date(task._scheduled),
					end: new Date(task._due),
					status: task._status,
					dur:
						new Date(task._due).getTime() -
						new Date(task._scheduled).getTime(),
					flatIdx: idx++,
				});
			}
		});
	});

	if (gs.ganttTasks.length > 0) {
		const min = Math.min(
			...gs.ganttTasks.map((t: any) => t.start.getTime()),
		);
		const max = Math.max(...gs.ganttTasks.map((t: any) => t.end.getTime()));
		const pad = Math.max((max - min) * 0.05, 86400000);
		gs.minTime = min - pad;
		gs.maxTime = max + pad;
	} else {
		const r = getWeekRange(new Date());
		gs.minTime = r.start.getTime();
		gs.maxTime = r.end.getTime();
	}

	canvas.addEventListener("mousemove", (e) => {
		if (!gs.timeToX || !gs.canvas) return;
		const rect = gs.canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const sx = gs.canvas.width / rect.width;
		const x = ((e.clientX - rect.left) * sx) / dpr;
		const y = ((e.clientY - rect.top) * sx) / dpr;
		let tip: any = null;
		for (const item of gs.ganttTasks) {
			const x1 = gs.timeToX!(item.start.getTime());
			const x2 = gs.timeToX!(item.end.getTime());
			const rowY = gs.headerH - gs.scrollTop + item.flatIdx * gs.rowH;
			if (x >= x1 && x <= x2 && y >= rowY && y <= rowY + gs.rowH) {
				tip = item.task;
				break;
			}
		}
		if (tip) {
			const parts = [];
			if (tip._status) parts.push("状态：" + tip._status);
			if (tip._priorityIcon) parts.push("优先级：" + tip._priorityIcon);
			if (tip._due) parts.push("📅 " + tip._due);
			tooltip.show(parts.join("<br>"), e.clientX, e.clientY);
		} else {
			tooltip.hide();
		}
	});
	canvas.addEventListener("mouseleave", () => tooltip.hide());

	gs.resizeObs = new ResizeObserver(() => resize());
	gs.resizeObs.observe(rightPanel);
	resize();
}
