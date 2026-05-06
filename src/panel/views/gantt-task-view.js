/**
 * 文件：src/panel/views/gantt-task-view.js
 * 描述：甘特图视图，以甘特图形式展示任务时间线，支持缩放、拖拽、折叠文件夹和任务依赖箭头
 * 所属模块：panel/views
 * 依赖：
 *   - base-task-view: 基础视图类
 *   - read-tasks: 任务读取接口
 *   - common-process.DateUtils: 日期工具函数
 *   - plugin-configs: 全局配置
 * 对外导出：GanttTaskView 类、startGanttView 函数
 * 注意事项：
 *   - 使用 Canvas 2D 绘制，支持虚拟滚动
 *   - 依赖关系通过 _forbid 字段解析，绘制箭头
 *   - 支持 Alt+滚轮缩放、拖拽平移、左侧栏拖拽调整宽度
 * @see .cline/skills/code/views/gantt-task-view.md
 */

// src/panel/views/gantt-task-view.js
import { CONFIG } from "../../configs/plugin-configs";
import { DateUtils } from "../../tasks/process/common-process";
import * as readTasks from "../../tasks/read/read-tasks";
import { BaseTaskView } from "./base-task-view";

export const VIEW_TYPE_GANTT = "gantt-task-view";

/* @skill-segment class GanttTaskView - 甘特图视图类，继承 BaseTaskView */

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
	/* @skill-route _startCore -> startGanttView - 核心启动路由 */
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startGanttView(dv, app, dv.container, undefined);
	}
}

/* @skill-state
  gs 全局状态对象（模块级单例）:
    wrapper       : HTMLElement   // 甘特图外层容器
    canvas        : HTMLCanvas    // 绘图画布
    ctx           : CanvasRenderingContext2D
    rowH          : number (26)   // 行高
    headerH       : number (24)   // 顶部日期标签高度
    leftW         : number (300)  // 左侧树面板宽度
    scale         : number (1)    // 时间轴缩放比例
    offsetX       : number (0)    // 时间轴水平偏移
    scrollTop     : number (0)    // 虚拟滚动偏移
    flatNodes     : Array         // 展平后的树节点列表
    ganttTasks    : Array         // 甘特图任务条数据
    minTime       : number        // 时间轴起始时间戳
    maxTime       : number        // 时间轴结束时间戳
    timeToX       : Function      // 时间 → x 坐标映射函数
    tooltip       : HTMLElement   // 悬浮提示元素
    collapsed     : Set           // 已折叠的文件夹路径集合
    theme         : Object|null   // 缓存的主题样式
    barPath       : Path2D|null   // 缓存的圆角条路径
    resizeObs     : ResizeObserver|null
    isResizing    : boolean       // 是否正在拖拽调整左栏宽度
    isDragging    : boolean       // 是否正在拖拽平移时间轴
    lastDragX     : number        // 上次拖拽鼠标 X 坐标
*/

// ---------- 内部状态 ----------
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

/* @skill-constant STATUS_COLORS - 不同状态对应的十六进制颜色值 */
const STATUS_COLORS = {
	todo: "#6c757d",
	planned: "#adb5bd",
	"in-progress": "#4dabf7",
	completed: "#40c057",
	cancelled: "#495057",
};

/* @skill-flow gantt 视图完整流程
  入口 → startGanttView()
    → injectStyle() 注入动态样式
    → 构建工具栏 + wrapper + canvas + tooltip DOM
    → 注册各种事件监听器
    → render() 循环：
      → readTasks.getAllTasks() 获取全量任务
      → 应用过滤器（日期/状态/标记/重复/已完成/已取消）
      → buildTree() 构建文件路径树
      → sortNodes() 排序
      → flatten() 展平并应用折叠状态
      → prepareTasks() 提取有时间区间的任务条
      → 计算 minTime/maxTime
      → resize() 调整画布尺寸 + draw() 绘制
*/

/* @skill-dom gantt 视图 DOM 结构
  .gantt-root
    .gantt-toolbar
      button (折叠/展开文件夹)
    .gantt-wrapper (滚动容器)
      canvas.gantt-canvas (直接绘制)
    .gantt-tooltip (fixed 定位的悬浮提示)
*/

// ---------- 样式 ----------
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

/* @skill-helpers
  getInterval(task, mode)       // 提取任务时间区间 {start, end}
  buildTree(tasks, dv)          // 按文件路径构建树
  sortNodes(nodes, sort)        // 递归排序节点
  flatten(nodes, level, out, collapsed) // 展平树，应用折叠
  prepareTasks(flat, mode)      // 从展平节点中提取甘特条
  ensureTheme()                 // 缓存 CSS 变量主题
  updateTimeScale()             // 更新 time→x 映射
  formatDur(ms)                 // 毫秒 → 人类可读时长
  isToday(task)                 // 任务是否在今天
  resize()                      // 调整画布尺寸
  draw()                        // 主绘制函数
  onCanvasClick(e, app, refresh)// 画布点击处理
  onMouseMove(e)                // 鼠标移动 → 悬浮提示
  render(dv, app, globalState)  // 主渲染循环
*/

// ---------- 工具函数 ----------
function getInterval(task, mode) {
	/* @skill-condition
      mode="starts-done" → 使用 _starts 和 _done||_due 构建区间
      mode="scheduled-due" → 使用 _scheduled 和 _due 构建区间
      缺少日期 → 返回 null（该任务不显示条）
    */
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
	/* @skill-algorithm
      1. 按 path 分组任务 (Map<path, tasks[]>)
      2. 使用 dv.page(path) 获取文件元信息
      3. 去掉 ROOT_PATH 前缀，按 / 分割路径片段
      4. 逐层构建树：非末级创建 folder 节点，末级创建 file 节点
      5. 返回根节点数组
    */
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
	/* @skill-algorithm
      同级排序：文件夹 > 文件，名称字典序
      文件内任务排序：
        sort.type="status" → 自定义状态顺序映射
        sort.type="priority" → 优先级图标映射数值
        sort.type="date" → 按 _scheduled/_due/_starts/_created 中最早日期排序
      sort.order="asc"/"desc" 控制方向
    */
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

/* @skill-algorithm flatten - 深度优先展平树
  文件夹节点 → 自身入列；未折叠时递归子节点
  文件节点 → 自身入列；未折叠时子任务入列（类型为 task）
  每个节点记录 level 缩进层级
*/
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
	/* @skill-query - 从展平节点中提取有时间区间标记的任务条数据 */
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

// ---------- 主题缓存 ----------
function ensureTheme() {
	/* @skill-condition
      theme 已缓存 → 直接返回
      首次调用 → 读取 CSS 变量，缓存到 gs.theme
      barPath 未创建 → 用 Path2D 构建圆角矩形路径
    */
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
	/* @skill-algorithm
      时间 → X 坐标映射：
      chartW = canvas宽度 - leftW - 边距
      startX = leftW + 边距 + offsetX（拖拽偏移）
      t → x = startX + ((t - minTime) / range) * chartW * scale
    */
	const dpr = window.devicePixelRatio || 1;
	const w = gs.canvas.width / dpr;
	const chartW = w - gs.leftW - 20;
	const startX = gs.leftW + 10 + gs.offsetX;
	const range = gs.maxTime - gs.minTime || 86400000;
	gs.timeToX = (t) => startX + ((t - gs.minTime) / range) * chartW * gs.scale;
}

/* @skill-dom draw - Canvas 绘制流程
  1. 清空画布
  2. 分区背景（左侧灰、右侧白）、分割线
  3. 左侧树节点文字（虚拟滚动优化）
  4. 周网格线
  5. 今日竖线（黄色虚线）
  6. 任务条（圆角矩形 + 时长标签）
  7. 依赖箭头（折线 + 箭头三角形）
  8. 顶部日期标签
*/

// ---------- 绘制 ----------
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

	// 分区背景
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

	/* @skill-condition 虚拟滚动：只绘制可视区域内的行 ±2 行缓冲 */
	const startRow = Math.max(0, Math.floor(gs.scrollTop / rowH) - 2);
	const endRow = Math.min(
		nodes.length,
		Math.ceil((gs.scrollTop + h) / rowH) + 2,
	);

	ctx.font = theme.font;
	ctx.textBaseline = "middle";

	// 左侧树节点
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

	// 周网格线
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

	// 今日线
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

	// 任务条
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

	// 依赖箭头
	/* @skill-condition 依赖箭头绘制
      遍历每个任务 → 解析 _forbid 字段 → 按逗号拆分依赖 ID
      对每个依赖 ID → 在 flatNodes 中查找对应 task → 获取其行列
      起点：依赖任务的 _done 或 _due 时间
      终点：当前任务的 _starts 或 _scheduled 时间
      绘制折线（上→右→下）→ 终点箭头三角形
    */
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

	// 顶部日期标签
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

/* @skill-helpers formatDur - 毫秒时长 → 人类可读（h/d/w/m/y） */
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
	/* @skill-condition - 检查任务的任意日期字段是否落在今天范围内 */
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

// ---------- 画布尺寸更新 ----------
function resize() {
	/* @skill-condition - 根据 flatNodes 数量计算画布高度，dp 适配高清屏 */
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

// ---------- 交互 ----------
/* @skill-event onCanvasClick - 画布点击事件
  - 左侧树区域：文件夹/文件行 → 展开/折叠；任务行 → 打开文件
  - 其他区域：忽略
*/
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

/* @skill-event onMouseMove - 鼠标移动 → 悬浮提示
  - 时间轴区域 → 检测鼠标是否悬停在任务条上
  - 左侧树区域 → 计算对应行号 → 获取 task 类型节点
  - 找到目标 → 调用 ensureTaskProperties 填充 _tooltip → 显示提示
*/
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

// ---------- 主渲染 ----------
function render(dv, app, globalState) {
	/* @skill-flow render 主渲染循环
      1. 获取排序和区间模式配置
      2. getAllTasks 获取全量任务 → 应用过滤器
      3. buildTree → sortNodes → flatten → prepareTasks
      4. 计算时间轴范围（minTime/maxTime）
      5. resize → draw
    */
	const sort = globalState?.leftSort || { type: "status", order: "asc" };
	const intervalMode = globalState?.intervalMode || "scheduled-due";

	let tasks = readTasks.getAllTasks(false, dv, globalState).slice();
	/* @skill-condition 过滤器链（按顺序应用）
      1. 日期范围过滤器 (dateFilterState)
      2. 状态过滤器 (markFilterState.statuses)
      3. 包含标记过滤器 (markFilterState.includeMarks)
      4. 排除标记过滤器 (markFilterState.excludeMarks)
      5. 隐藏重复任务 (hideRepeatTasks)
      6. 隐藏已完成任务 (hideCompletedTasks)
      7. 隐藏已取消任务 (hideCancelledTasks)
    */
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

// ---------- 入口 ----------
/* @skill-sig function startGanttView(dv, app, container, globalState) : ViewController - 启动甘特图视图 */
export async function startGanttView(dv, app, container, globalState) {
	/* @skill-flow 入口流程
      1. injectStyle → 注入全局样式
      2. 构建工具栏（折叠/展开文件夹按钮）
      3. 构建滚动容器 + Canvas
      4. 构建 tooltip DOM（fixed 绝对定位）
      5. 注册事件：
        - canvas click → onCanvasClick
        - canvas mousemove → onMouseMove
        - canvas mousedown → 开始拖拽（左栏宽度 或 时间轴平移）
        - window mousemove → 拖拽中
        - window mouseup → 结束拖拽
        - canvas wheel（Alt）→ 缩放
        - wrapper scroll → 虚拟滚动更新
        - ResizeObserver → 自适应
      6. 默认设为本周 → 首次 render
    */

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
	// 默认本周
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
