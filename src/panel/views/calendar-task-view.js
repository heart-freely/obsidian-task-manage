// src/panel/views/calendar-task-view.js
/**
 * 文件：src/panel/views/calendar-task-view.js
 * 描述：日历视图，支持日/周/月/季/年五种视图模式，展示任务在时间轴上的分布，支持无任务时间段合并显示
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 视图基类
 *   - readTasks.getAllTasks: 统一任务读取接口
 *   - DateUtils: 日期工具（formatDate, setStart, setEnd, getWeekRange, getISOWeekNumber等）
 *   - CONFIG: 插件配置（状态、优先级、日期标记等定义）
 * 对外导出：VIEW_TYPE_CALENDAR, CalendarTaskView, startCalendarView
 * 注意事项：该视图使用内部 calState 管理视图切换状态，包含五种渲染模式（日/周/月/季/年），大量 DOM 操作
 * @see .cline/skills/code/views/calendar-task-view.md
 */
import { CONFIG } from "../../configs/plugin-configs";
import { DateUtils } from "../../tasks/process/common-process";
import * as readTasks from "../../tasks/read/read-tasks";
import {
	BaseTaskView,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

export const VIEW_TYPE_CALENDAR = "calendar-task-view";

export class CalendarTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_CALENDAR;
	}
	getDisplayText() {
		return "日历图";
	}
	getIcon() {
		return "calendar";
	}
	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startCalendarView(dv, app, dv.container, undefined);
	}
}

// ---------- 内部状态 ----------
/* @skill-state
  calState.currentView : string       // 当前视图模式（'day'|'week'|'month'|'quarter'|'year'）
  calState.singleDateMode : boolean   // 是否为单日聚焦模式（从其他视图点击日期进入）
  calState.focusedDate : Date|null    // 聚焦的日期
  calState.focusedTaskId : string|null // 聚焦的任务ID（用于高亮和滚动定位）
*/
const calState = {
	currentView: "month",
	singleDateMode: false,
	focusedDate: null,
	focusedTaskId: null,
};

const {
	formatDate,
	setStart,
	setEnd,
	getWeekRange,
	getISOWeekNumber,
	getWeekOfMonth,
	getWeekRangeByYearWeek,
	getMonthRangeByYearMonth,
	getQuarterRangeByYearQuarter,
	getYearRangeByYear,
	getWeekdayRange,
} = DateUtils;

// ---------- 注入样式 ----------
function injectStyle() {
	if (document.getElementById("calendar-final-style")) return;
	const style = document.createElement("style");
	style.id = "calendar-final-style";
	style.textContent = `
        .cal-root {
            padding: 8px 0; max-width: 100%; font-size: var(--font-text-size);
            position: relative;
        }
        .cal-toolbar {
            display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;
            padding: 8px; background: var(--background-secondary); border-radius: 8px;
            align-items: center;
            position: sticky; top: 0; z-index: 10;
        }
        .cal-toolbar button {
            padding: 4px 12px; border: none; border-radius: 16px;
            background: var(--interactive-normal); color: var(--text-normal);
            cursor: pointer; font-size: 0.9em;
        }
        .cal-toolbar button.active { background: var(--interactive-accent); color: white; font-weight: bold; }

        .cal-global-title {
            font-weight: bold; margin-bottom: 8px; font-size: 1em; color: var(--text-normal);
            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
        }
        .cal-view-area { min-height: 400px; width: 100%; }

        .day-group { margin-bottom: 16px; }
        .day-header { font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 4px; }
        .week-block { margin-bottom: 24px; }
        .week-title { font-weight: bold; margin-bottom: 8px; }
        .week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; width: 100%; }
        .cal-cell {
            background: var(--background-primary); border: 1px solid var(--background-modifier-border);
            border-radius: 4px; padding: 4px; min-height: 100px; max-height: 240px;
            overflow-y: auto; cursor: pointer; transition: all 0.2s;
        }
        .cal-cell.today { border: 2px solid var(--text-accent); }
        .cal-cell.other-month { opacity: 0.5; }
        .cal-cell.expanded {
            grid-column: span 2; grid-row: span 2;
            max-height: none; z-index: 10; background: var(--background-primary);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .cal-cell-header { font-weight: bold; text-align: center; margin-bottom: 4px; font-size: clamp(12px, 2vw, 16px); }
        .cal-task-row { display: flex; align-items: center; gap: 4px; height: 20px; line-height: 20px; }
        .cal-task-desc {
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            font-size: 12px; padding: 0 4px; border-radius: 3px; background: var(--background-secondary);
            cursor: pointer; height: 18px; line-height: 18px; flex-shrink: 0;
        }
        .cal-task-line {
            height: 6px; border-radius: 3px; flex: 1; min-width: 10px; cursor: pointer;
        }
        .cal-task-line.todo { background: rgba(75,82,91,0.5); }
        .cal-task-line.planned { background: rgba(175,186,198,0.5); }
        .cal-task-line.in-progress { background: rgba(69,136,201,0.5); }
        .cal-task-line.completed { background: rgba(71,133,47,0.5); }
        .cal-task-line.cancelled { background: rgba(46,51,59,0.5); }
        .cal-task-placeholder { height: 6px; flex: 1; min-width: 10px; visibility: hidden; }
        .cal-more { text-align: center; font-size: 12px; color: var(--text-muted); cursor: pointer; padding: 2px 0; }

        .year-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 12px;
            width: 100%;
        }
        .year-month-card { background: var(--background-secondary); border-radius: 8px; padding: 8px; }
        .year-month-title { font-weight: bold; text-align: center; margin-bottom: 4px; }
        .year-heat-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .year-heat-cell {
            aspect-ratio: 1; border-radius: 2px; display: flex; align-items: center;
            justify-content: center; font-size: 8px; cursor: pointer;
            background: transparent; border: 1px solid var(--background-modifier-border);
        }
        .year-heat-cell.today { border: 2px solid var(--text-accent); }

        .empty-message { padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }

        /* 无任务合并块样式 */
        .no-tasks-block {
            margin-bottom: 24px;
            border-left: 4px solid var(--text-muted);
            padding: 8px 12px;
            background: var(--background-secondary);
            border-radius: 4px;
            color: var(--text-muted);
            font-style: italic;
        }
        .no-tasks-title {
            font-weight: bold;
            margin-bottom: 4px;
        }

        /* 悬浮按钮 */
        .cal-scroll-buttons {
            position: fixed; bottom: 20px; right: 20px;
            display: flex; gap: 8px; z-index: 10000;
            background: var(--background-primary);
            padding: 4px; border-radius: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .cal-scroll-buttons button {
            padding: 6px 14px; border: none; border-radius: 20px;
            background: var(--interactive-accent); color: white;
            cursor: pointer; font-size: 0.85em;
        }
    `;
	document.head.appendChild(style);
}

// ---------- 辅助函数 ----------
/* @skill-sig function safeState(globalState) : Object - 安全包装全局状态，提供默认值 */
function safeState(globalState) {
	return {
		dateFilterState: {
			start: globalState?.dateFilterState?.start ?? null,
			end: globalState?.dateFilterState?.end ?? null,
			isAll: globalState?.dateFilterState?.isAll ?? false,
		},
		markFilterState: {
			statuses: globalState?.markFilterState?.statuses ?? [
				...CONFIG.ALLOWED_STATUSES,
			],
			includeMarks: globalState?.markFilterState?.includeMarks ?? [],
			excludeMarks: globalState?.markFilterState?.excludeMarks ?? [],
		},
		hideRepeatTasks: globalState?.hideRepeatTasks ?? true,
		hideCompletedTasks: globalState?.hideCompletedTasks ?? true,
		hideCancelledTasks: globalState?.hideCancelledTasks ?? true,
		intervalMode: globalState?.intervalMode ?? "scheduled-due",
		leftSort: globalState?.leftSort ?? { type: "status", order: "asc" },
	};
}

/* @skill-sig function getFilteredTasks(dv, globalState) : Array<Task> - 获取过滤后的任务列表（日期范围+标记筛选+重复/完成排除） */
function getFilteredTasks(dv, globalState) {
	const state = safeState(globalState);
	const allTasks = readTasks.getAllTasks(false, dv, globalState || {});
	let tasks = allTasks.slice();
	const { dateFilterState, markFilterState } = state;

	if (
		!dateFilterState.isAll &&
		dateFilterState.start &&
		dateFilterState.end
	) {
		const rs = dateFilterState.start.getTime();
		const re = dateFilterState.end.getTime();
		tasks = tasks.filter((t) => {
			const tr = t._cachedTimeRange;
			return tr && tr.start <= re && tr.end >= rs;
		});
	}

	if (markFilterState.statuses.length < CONFIG.ALLOWED_STATUSES.length) {
		tasks = tasks.filter((t) =>
			markFilterState.statuses.includes(t._status),
		);
	}
	if (markFilterState.includeMarks.length)
		tasks = tasks.filter((t) =>
			markFilterState.includeMarks.every((m) => t._marks?.[m]),
		);
	if (markFilterState.excludeMarks.length)
		tasks = tasks.filter(
			(t) => !markFilterState.excludeMarks.some((m) => t._marks?.[m]),
		);
	if (state.hideRepeatTasks) tasks = tasks.filter((t) => !t._repeat);
	if (state.hideCompletedTasks)
		tasks = tasks.filter((t) => t._status !== "completed");
	if (state.hideCancelledTasks)
		tasks = tasks.filter((t) => t._status !== "cancelled");

	tasks.sort((a, b) => {
		const pa = a._priorityIcon
			? { "⏬": 4, "🔽": 3, "🔼": 2, "⏫": 1, "🔺": 0 }[a._priorityIcon]
			: 5;
		const pb = b._priorityIcon
			? { "⏬": 4, "🔽": 3, "🔼": 2, "⏫": 1, "🔺": 0 }[b._priorityIcon]
			: 5;
		if (pa !== pb) return pa - pb;
		const om = {
			todo: 0,
			planned: 1,
			"in-progress": 2,
			cancelled: 3,
			completed: 4,
		};
		return (om[a._status] || 99) - (om[b._status] || 99);
	});
	return tasks;
}

/* @skill-sig function getEffectiveDateRange(state, dv) : { start:Date, end:Date } | null - 获取有效日期范围（从过滤状态或全部任务推断） */
function getEffectiveDateRange(state, dv) {
	if (
		state.dateFilterState.isAll ||
		!state.dateFilterState.start ||
		!state.dateFilterState.end
	) {
		if (!dv) return null;
		const allTasks = readTasks.getAllTasks(false, dv, state);
		let min = null,
			max = null;
		allTasks.forEach((t) => {
			const tr = t._cachedTimeRange;
			if (tr) {
				if (min === null || tr.start < min) min = tr.start;
				if (max === null || tr.end > max) max = tr.end;
			}
		});
		return min
			? { start: setStart(new Date(min)), end: setEnd(new Date(max)) }
			: null;
	}
	return {
		start: state.dateFilterState.start,
		end: state.dateFilterState.end,
	};
}

/* @skill-sig function getTaskInterval(task, state) : { start:Date, end:Date } | null - 获取任务在时间轴上的区间（根据 intervalMode 选择时间字段对） */
function getTaskInterval(task, state) {
	const mode = state.intervalMode || "scheduled-due";
	let start, end;
	if (mode === "starts-done") {
		start = task._starts;
		end = task._done || task._due;
	} else {
		start = task._scheduled;
		end = task._due;
	}
	if (!start || !end) return null;
	return { start: new Date(start), end: new Date(end) };
}

/* @skill-condition
  仅当天是该任务区间的首日或末日时，才显示完整描述文本；其余天数仅显示颜色条 */
function isFirstLastForDate(task, date, state) {
	const interval = getTaskInterval(task, state);
	if (!interval) return false;
	const start = setStart(interval.start).getTime();
	const end = setEnd(interval.end).getTime();
	const day = setStart(date).getTime();
	return day === start || day === end;
}

/* @skill-sig function buildDateTaskMap(tasks, state) : Object<string, Task[]> - 构建日期→任务映射（含区间展开和平铺去重） */
function buildDateTaskMap(tasks, state) {
	const map = {};
	tasks.forEach((task) => {
		const dateFields = [
			"_created",
			"_scheduled",
			"_starts",
			"_due",
			"_done",
			"_cancel",
		];
		dateFields.forEach((field) => {
			const val = task[field];
			if (val) {
				const key = formatDate(new Date(val));
				(map[key] ||= []).push(task);
			}
		});
		const interval = getTaskInterval(task, state);
		if (interval) {
			let cur = setStart(interval.start);
			const limit = setEnd(interval.end);
			while (cur <= limit) {
				const key = formatDate(cur);
				(map[key] ||= []).push(task);
				cur.setDate(cur.getDate() + 1);
			}
		}
	});
	for (const key in map) {
		map[key] = [...new Set(map[key])];
	}
	return map;
}

/* @skill-sig function buildGlobalTitle(state, groupCount, taskCount) : string - 构建全局标题（含日期范围、筛选条件和统计信息） */
function buildGlobalTitle(state, groupCount, taskCount) {
	const parts = [];
	if (
		!state.dateFilterState.isAll &&
		state.dateFilterState.start &&
		state.dateFilterState.end
	) {
		const s = state.dateFilterState.start;
		const e = state.dateFilterState.end;
		const y = s.getFullYear(),
			m = s.getMonth() + 1;
		const q = Math.floor((m - 1) / 3) + 1;
		const wom = getWeekOfMonth(s);
		const wd = s.getDay() || 7;
		const wdStr = ["一", "二", "三", "四", "五", "六", "日"][wd - 1];
		parts.push(
			`${y}年 第${q}季度 ${m}月 第${wom}周 周${wdStr} ${formatDate(s)}~${formatDate(e)}`,
		);
	} else {
		parts.push("全部日期");
	}
	if (
		state.markFilterState.statuses.length < CONFIG.ALLOWED_STATUSES.length
	) {
		parts.push(
			state.markFilterState.statuses
				.map((s) => CONFIG.STATUS_NAMES[s])
				.join("，"),
		);
	}
	if (state.markFilterState.includeMarks.length)
		parts.push(
			"包含：" +
				state.markFilterState.includeMarks
					.map((m) => CONFIG.MARK_NAMES[m])
					.join("，"),
		);
	if (state.markFilterState.excludeMarks.length)
		parts.push(
			"排除：" +
				state.markFilterState.excludeMarks
					.map((m) => CONFIG.MARK_NAMES[m])
					.join("，"),
		);
	const title = parts.join(" · ");
	const stats = [];
	if (groupCount !== undefined) stats.push(`任务组数${groupCount}`);
	if (taskCount !== undefined) stats.push(`任务总数${taskCount}`);
	return title + (stats.length ? ` (${stats.join(" ")})` : "");
}

// ---------- 日视图 ----------
/* @skill-dom
  .cal-root > .cal-view-area
    .view-col
      .col-header[data-date]
      ul.task-list
        li.task-item[data-id]
          .task-check
          .task-desc
*/
/* @skill-sig function renderDayView(container, tasks, globalState, app, dv, renderFn) - 日视图渲染：按天分组展示任务卡片 */
function renderDayView(container, tasks, globalState, app, dv, renderFn) {
	container.innerHTML = "";
	if (!tasks.length) {
		container.innerHTML =
			'<div class="empty-message">📭 无符合条件的任务</div>';
		return;
	}

	let startDate, endDate;
	if (calState.singleDateMode && calState.focusedDate) {
		startDate = calState.focusedDate;
		endDate = calState.focusedDate;
	} else {
		const state = safeState(globalState);
		const range = getEffectiveDateRange(state, dv);
		if (!range) {
			container.innerHTML =
				'<div class="empty-message">📭 无法确定日期范围</div>';
			return;
		}
		startDate = range.start;
		endDate = range.end;
	}

	const dates = [];
	let cur = setStart(startDate);
	const last = setEnd(endDate).getTime();
	while (cur.getTime() <= last) {
		dates.push(new Date(cur));
		cur.setDate(cur.getDate() + 1);
	}
	const sortOrder = globalState?.leftSort?.order ?? "asc";
	if (sortOrder === "desc") dates.reverse();

	let groupCount = 0;

	dates.forEach((date) => {
		const dateKey = formatDate(date);
		const dayTasks = tasks.filter((t) => {
			const tr = t._cachedTimeRange;
			return (
				tr &&
				tr.start <= setEnd(date).getTime() &&
				tr.end >= setStart(date).getTime()
			);
		});
		if (!dayTasks.length) return;
		groupCount++;

		const sort = globalState?.leftSort ?? { type: "status", order: "asc" };
		dayTasks.sort((a, b) => {
			if (sort.type === "priority") {
				const pa = a._priorityIcon
					? { "⏬": 4, "🔽": 3, "🔼": 2, "⏫": 1, "🔺": 0 }[
							a._priorityIcon
						]
					: 5;
				const pb = b._priorityIcon
					? { "⏬": 4, "🔽": 3, "🔼": 2, "⏫": 1, "🔺": 0 }[
							b._priorityIcon
						]
					: 5;
				return sort.order === "desc" ? pa - pb : pb - pa;
			} else if (sort.type === "status") {
				const om = {
					todo: 0,
					planned: 1,
					"in-progress": 2,
					cancelled: 3,
					completed: 4,
				};
				return (
					(sort.order === "asc" ? 1 : -1) *
					((om[a._status] || 99) - (om[b._status] || 99))
				);
			} else {
				const getVal = (t) => t._scheduled || t._due || t._starts;
				const va = getVal(a),
					vb = getVal(b);
				if (!va && !vb) return 0;
				if (!va) return 1;
				if (!vb) return -1;
				return sort.order === "desc"
					? new Date(vb) - new Date(va)
					: new Date(va) - new Date(vb);
			}
		});

		const col = document.createElement("div");
		col.className = "view-col";
		col.style.setProperty("--quad-color", "rgba(130, 170, 255, 0.3)");
		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>${dateKey}</span><span>${dayTasks.length} 项</span>`;
		col.appendChild(header);

		const list = document.createElement("ul");
		list.className = "task-list";

		dayTasks.forEach((task) => {
			const cardData = normalizeTaskCardData({
				description: task._cleanText || task.text,
				priority: task.priority,
				status: task._status,
				recurrenceLabel: task._repeat ? `🔁 ${task._repeat}` : "",
				scheduled: task._scheduled,
				start: task._starts,
				due: task._due,
				tags: task._tag ? [task._tag] : [],
				id: task._id || "",
				forbid: task._forbid || "",
				fileName: (task.path || "")
					.split("/")
					.pop()
					.replace(/\.md$/, ""),
				path: task.path,
				lineNumber: task.line || 0,
			});
			const card = createTaskCard(cardData, app);
			if (
				calState.focusedTaskId &&
				task.line + "@" + task.path === calState.focusedTaskId
			) {
				card.style.border = "2px solid var(--text-accent)";
				setTimeout(
					() =>
						card.scrollIntoView({
							behavior: "smooth",
							block: "center",
						}),
					50,
				);
				calState.focusedTaskId = null;
			}
			list.appendChild(card);
		});

		col.appendChild(list);
		container.appendChild(col);
	});

	// 更新标题中的组数和总数（外部通过读取 container 属性或回调，这里暂不处理）
	container.dataset.groupCount = groupCount;
	container.dataset.taskCount = tasks.length;
}

// ---------- 周视图（连续无任务合并为独立块）----------
/* @skill-dom
  .cal-root > .cal-view-area
    .week-block
      .week-title
      .week-row
        .cal-cell[data-date]
          .cal-cell-header
          .cal-task-row
            .cal-task-desc (首末日/今日显示全描述，其余显示颜色条)
            .cal-task-line.status-tag
*/
/* @skill-sig function renderWeekView(container, tasks, globalState, app, dv, renderFn) - 周视图渲染：每周7列网格，无任务周合并为无任务块 */
function renderWeekView(container, tasks, globalState, app, dv, renderFn) {
	container.innerHTML = "";
	if (!tasks.length) {
		container.innerHTML =
			'<div class="empty-message">📭 无符合条件的任务</div>';
		return;
	}
	const state = safeState(globalState);
	const range = getEffectiveDateRange(state, dv);
	if (!range) {
		container.innerHTML =
			'<div class="empty-message">📭 无法确定日期范围</div>';
		return;
	}

	const weeks = [];
	let cur = setStart(range.start);
	const end = setEnd(range.end).getTime();
	while (cur.getTime() <= end) {
		const wr = getWeekRange(cur);
		if (!weeks.some((w) => w.start.getTime() === wr.start.getTime()))
			weeks.push(wr);
		cur.setDate(cur.getDate() + 7);
	}

	const dateTaskMap = buildDateTaskMap(tasks, state);
	const globalOrderIndex = {};
	tasks.forEach((t, i) => {
		globalOrderIndex[t.line + "@" + t.path] = i;
	});

	const items = [];
	let noTaskBuffer = [];

	const flushNoTaskBuffer = () => {
		if (noTaskBuffer.length === 0) return;
		const first = noTaskBuffer[0];
		const last = noTaskBuffer[noTaskBuffer.length - 1];
		const startDate = first.start;
		const endDate = last.end;
		const startWeek = getISOWeekNumber(startDate);
		const endWeek = getISOWeekNumber(endDate);
		const title = `📅 ${formatDate(startDate)} ~ ${formatDate(endDate)}`;
		const subtitle =
			startWeek === endWeek
				? `第${startWeek}周`
				: `第${startWeek}周 - 第${endWeek}周`;

		const block = document.createElement("div");
		block.className = "no-tasks-block";
		block.innerHTML = `
            <div class="no-tasks-title">${title}</div>
            <div>${subtitle} - 无任务</div>
        `;
		items.push(block);
		noTaskBuffer = [];
	};

	weeks.forEach((week) => {
		const weekStart = week.start;
		const weekEnd = week.end;
		const hasTasks = tasks.some((t) => {
			const tr = t._cachedTimeRange;
			return (
				tr &&
				tr.start <= weekEnd.getTime() &&
				tr.end >= weekStart.getTime()
			);
		});

		if (!hasTasks) {
			noTaskBuffer.push({ start: weekStart, end: weekEnd });
			return;
		}

		flushNoTaskBuffer();

		const weekTaskSet = new Set();
		for (let i = 0; i < 7; i++) {
			const d = new Date(weekStart);
			d.setDate(weekStart.getDate() + i);
			const key = formatDate(d);
			(dateTaskMap[key] || []).forEach((t) => weekTaskSet.add(t));
		}
		const weekTasks = Array.from(weekTaskSet).sort(
			(a, b) =>
				(globalOrderIndex[a.line + "@" + a.path] || 999) -
				(globalOrderIndex[b.line + "@" + b.path] || 999),
		);

		const weekBlock = document.createElement("div");
		weekBlock.className = "week-block";
		weekBlock.appendChild(
			Object.assign(document.createElement("div"), {
				className: "week-title",
				textContent: `📅 ${formatDate(weekStart)} ~ ${formatDate(weekEnd)} （第${getISOWeekNumber(weekStart)}周）`,
			}),
		);

		const row = document.createElement("div");
		row.className = "week-row";
		const days = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(weekStart);
			d.setDate(weekStart.getDate() + i);
			days.push(d);
		}
		const todayStr = formatDate(new Date());

		days.forEach((day) => {
			const dateKey = formatDate(day);
			const isToday = dateKey === todayStr;
			const cell = document.createElement("div");
			cell.className = "cal-cell" + (isToday ? " today" : "");
			const header = document.createElement("div");
			header.className = "cal-cell-header";
			header.textContent = day.getDate();
			cell.appendChild(header);

			const dayTasks = dateTaskMap[dateKey] || [];
			weekTasks.forEach((task) => {
				const inDay = dayTasks.includes(task);
				const row = document.createElement("div");
				row.className = "cal-task-row";
				if (inDay) {
					const isFirstLast = isFirstLastForDate(task, day, state);
					const showDesc = isToday || isFirstLast;
					if (showDesc) {
						const desc = document.createElement("div");
						desc.className = "cal-task-desc";
						desc.textContent =
							(CONFIG.STATUS_ICONS[task._status] || "") +
							" " +
							(task._cleanText || task.text);
						desc.title = task._tooltip || task._cleanText;
						desc.onclick = (e) => {
							e.stopPropagation();
							handleTaskClick(task, day);
						};
						row.appendChild(desc);
					} else {
						const line = document.createElement("div");
						line.className = `cal-task-line ${task._status}`;
						line.title = task._tooltip || task._cleanText;
						line.onclick = (e) => {
							e.stopPropagation();
							handleTaskClick(task, day);
						};
						row.appendChild(line);
					}
				} else {
					const placeholder = document.createElement("div");
					placeholder.className = "cal-task-placeholder";
					row.appendChild(placeholder);
				}
				cell.appendChild(row);
			});

			cell.onclick = () => {
				calState.currentView = "day";
				calState.singleDateMode = true;
				calState.focusedDate = day;
				renderFn();
			};
			row.appendChild(cell);
		});

		weekBlock.appendChild(row);
		items.push(weekBlock);
	});

	flushNoTaskBuffer();

	items.forEach((item) => container.appendChild(item));

	// 计算有任务的组数
	const groupCount = items.filter((item) =>
		item.classList.contains("week-block"),
	).length;
	container.dataset.groupCount = groupCount;
	container.dataset.taskCount = tasks.length;
}

/* @skill-flow
  点击任务 → handleTaskClick(task, date) → 切换到日视图 + 高亮定位该任务 */
function handleTaskClick(task, date) {
	calState.currentView = "day";
	calState.singleDateMode = true;
	calState.focusedDate = date;
	calState.focusedTaskId = task.line + "@" + task.path;
}

// ---------- 月视图 (连续无任务月合并为独立块) ----------
/* @skill-dom
  .cal-root > .cal-view-area
    .month-block
      .calendar-grid
        .cal-cell[data-date]
          .cal-cell-header (日期数字)
          .cal-task-row
            .cal-task-desc (今日和首末日显示)
            .cal-task-line (其余显示颜色条)
          .cal-more (+N剩余)
*/
/* @skill-sig function renderMonthView(container, tasks, globalState, app, dv, renderFn) - 月视图渲染：42格日历网格，无任务月合并为无任务块 */
function renderMonthView(container, tasks, globalState, app, dv, renderFn) {
	container.innerHTML = "";
	if (!tasks.length) {
		container.innerHTML =
			'<div class="empty-message">📭 无符合条件的任务</div>';
		return;
	}
	const state = safeState(globalState);
	const range = getEffectiveDateRange(state, dv);
	if (!range) {
		container.innerHTML =
			'<div class="empty-message">📭 无法确定日期范围</div>';
		return;
	}

	const months = [];
	let cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
	const end = range.end || new Date();
	while (cur <= end) {
		months.push({ year: cur.getFullYear(), month: cur.getMonth() });
		cur.setMonth(cur.getMonth() + 1);
	}

	const dateTaskMap = buildDateTaskMap(tasks, state);
	const items = [];
	let noTaskBuffer = [];

	const flushNoTaskBuffer = () => {
		if (noTaskBuffer.length === 0) return;
		const first = noTaskBuffer[0];
		const last = noTaskBuffer[noTaskBuffer.length - 1];
		const startStr = `${first.year}年${first.month + 1}月`;
		const endStr = `${last.year}年${last.month + 1}月`;
		const block = document.createElement("div");
		block.className = "no-tasks-block";
		block.innerHTML = `<div class="no-tasks-title">📅 ${startStr} ~ ${endStr}</div><div>月 - 无任务</div>`;
		items.push(block);
		noTaskBuffer = [];
	};

	months.forEach((month) => {
		const year = month.year;
		const mon = month.month;
		const monthStart = setStart(new Date(year, mon, 1));
		const monthEnd = setEnd(new Date(year, mon + 1, 0));
		const hasTasks = tasks.some((t) => {
			const tr = t._cachedTimeRange;
			return (
				tr &&
				tr.start <= monthEnd.getTime() &&
				tr.end >= monthStart.getTime()
			);
		});
		if (!hasTasks) {
			noTaskBuffer.push(month);
			return;
		}

		flushNoTaskBuffer();

		const block = document.createElement("div");
		block.style.marginBottom = "24px";
		block.appendChild(
			Object.assign(document.createElement("div"), {
				style: "font-weight:bold; font-size:1.1em;",
				textContent: `${year}年${mon + 1}月`,
			}),
		);

		const grid = document.createElement("div");
		grid.className = "calendar-grid";
		["一", "二", "三", "四", "五", "六", "日"].forEach((d) => {
			grid.appendChild(
				Object.assign(document.createElement("div"), {
					style: "text-align:center; font-weight:bold; padding:4px 0;",
					textContent: d,
				}),
			);
		});

		const firstDay = new Date(year, mon, 1);
		const dow = firstDay.getDay() || 7;
		const startDay = new Date(firstDay);
		startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));
		const todayStr = formatDate(new Date());

		for (let i = 0; i < 42; i++) {
			const d = new Date(startDay);
			d.setDate(startDay.getDate() + i);
			const dateKey = formatDate(d);
			const isToday = dateKey === todayStr;
			const isOtherMonth = d.getMonth() !== mon;
			const cell = document.createElement("div");
			cell.className =
				"cal-cell" +
				(isOtherMonth ? " other-month" : "") +
				(isToday ? " today" : "");
			const header = document.createElement("div");
			header.className = "cal-cell-header";
			header.textContent = d.getDate();
			cell.appendChild(header);

			const dayTasks = dateTaskMap[dateKey] || [];
			const displayedTasks = dayTasks.slice(0, 10);
			const remaining = dayTasks.length - 10;

			displayedTasks.forEach((task) => {
				const isFirstLast = isFirstLastForDate(task, d, state);
				const showDesc = isToday || isFirstLast;
				const row = document.createElement("div");
				row.className = "cal-task-row";
				if (showDesc) {
					const desc = document.createElement("div");
					desc.className = "cal-task-desc";
					desc.textContent =
						(CONFIG.STATUS_ICONS[task._status] || "") +
						" " +
						(task._cleanText || task.text);
					desc.title = task._tooltip || task._cleanText;
					desc.onclick = (e) => {
						e.stopPropagation();
						handleTaskClick(task, d);
					};
					row.appendChild(desc);
				} else {
					const line = document.createElement("div");
					line.className = `cal-task-line ${task._status}`;
					line.title = task._tooltip || task._cleanText;
					line.onclick = (e) => {
						e.stopPropagation();
						handleTaskClick(task, d);
					};
					row.appendChild(line);
				}
				cell.appendChild(row);
			});

			if (remaining > 0) {
				const more = document.createElement("div");
				more.className = "cal-more";
				more.textContent = `+${remaining}`;
				more.onclick = (e) => {
					e.stopPropagation();
					cell.style.maxHeight = "none";
					more.remove();
					for (let j = 10; j < dayTasks.length; j++) {
						const task = dayTasks[j];
						const row = document.createElement("div");
						row.className = "cal-task-row";
						const desc = document.createElement("div");
						desc.className = "cal-task-desc";
						desc.textContent =
							(CONFIG.STATUS_ICONS[task._status] || "") +
							" " +
							(task._cleanText || task.text);
						row.appendChild(desc);
						cell.appendChild(row);
					}
				};
				cell.appendChild(more);
			}

			cell.onclick = () => {
				calState.currentView = "day";
				calState.singleDateMode = true;
				calState.focusedDate = d;
				renderFn();
			};
			grid.appendChild(cell);
		}
		block.appendChild(grid);
		items.push(block);
	});

	flushNoTaskBuffer();

	items.forEach((item) => container.appendChild(item));

	const groupCount = items.filter(
		(item) =>
			item.classList.contains("week-block") === false &&
			item.querySelector(".calendar-grid"),
	).length;
	container.dataset.groupCount = groupCount;
	container.dataset.taskCount = tasks.length;
}

// ---------- 季视图 (连续无任务季合并为独立块) ----------
/* @skill-dom
  .cal-root > .cal-view-area
    .quarter-block
      .month-block
        .calendar-grid
          .cal-cell[data-date]
            ...（同月视图结构）
*/
/* @skill-sig function renderQuarterView(container, tasks, globalState, app, dv, renderFn) - 季视图渲染：每季度展示3个月历，无任务季度合并为无任务块 */
function renderQuarterView(container, tasks, globalState, app, dv, renderFn) {
	container.innerHTML = "";
	if (!tasks.length) {
		container.innerHTML =
			'<div class="empty-message">📭 无符合条件的任务</div>';
		return;
	}
	const state = safeState(globalState);
	const range = getEffectiveDateRange(state, dv);
	if (!range) {
		container.innerHTML =
			'<div class="empty-message">📭 无法确定日期范围</div>';
		return;
	}

	const quarters = [];
	let cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
	const end = range.end || new Date();
	while (cur <= end) {
		const y = cur.getFullYear(),
			q = Math.floor(cur.getMonth() / 3) + 1;
		if (!quarters.some((i) => i.year === y && i.quarter === q))
			quarters.push({ year: y, quarter: q });
		cur.setMonth(cur.getMonth() + 3);
	}

	const dateTaskMap = buildDateTaskMap(tasks, state);
	const items = [];
	let noTaskBuffer = [];

	const flushNoTaskBuffer = () => {
		if (noTaskBuffer.length === 0) return;
		const first = noTaskBuffer[0];
		const last = noTaskBuffer[noTaskBuffer.length - 1];
		const startStr = `${first.year}年 第${first.quarter}季度`;
		const endStr = `${last.year}年 第${last.quarter}季度`;
		const block = document.createElement("div");
		block.className = "no-tasks-block";
		block.innerHTML = `<div class="no-tasks-title">📅 ${startStr} ~ ${endStr}</div><div>季 - 无任务</div>`;
		items.push(block);
		noTaskBuffer = [];
	};

	quarters.forEach((qu) => {
		const hasTasks = (() => {
			const sm = (qu.quarter - 1) * 3;
			for (let mo = 0; mo < 3; mo++) {
				const monthIdx = sm + mo;
				const monthStart = setStart(new Date(qu.year, monthIdx, 1));
				const monthEnd = setEnd(new Date(qu.year, monthIdx + 1, 0));
				if (
					tasks.some((t) => {
						const tr = t._cachedTimeRange;
						return (
							tr &&
							tr.start <= monthEnd.getTime() &&
							tr.end >= monthStart.getTime()
						);
					})
				)
					return true;
			}
			return false;
		})();

		if (!hasTasks) {
			noTaskBuffer.push(qu);
			return;
		}

		flushNoTaskBuffer();

		const block = document.createElement("div");
		block.style.marginBottom = "32px";
		block.appendChild(
			Object.assign(document.createElement("div"), {
				style: "font-weight:bold; color:var(--text-accent);",
				textContent: `${qu.year}年 第${qu.quarter}季度`,
			}),
		);
		const sm = (qu.quarter - 1) * 3;
		for (let mo = 0; mo < 3; mo++) {
			const monthIdx = sm + mo;
			const monDiv = document.createElement("div");
			monDiv.style.marginBottom = "16px";
			monDiv.appendChild(
				Object.assign(document.createElement("div"), {
					style: "font-weight:bold;",
					textContent: `${qu.year}年${monthIdx + 1}月`,
				}),
			);
			const grid = document.createElement("div");
			grid.className = "calendar-grid";
			const firstDay = new Date(qu.year, monthIdx, 1);
			const dow = firstDay.getDay() || 7;
			const startDay = new Date(firstDay);
			startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));
			const todayStr = formatDate(new Date());
			for (let i = 0; i < 42; i++) {
				const d = new Date(startDay);
				d.setDate(startDay.getDate() + i);
				const dateKey = formatDate(d);
				const isToday = dateKey === todayStr;
				const isOtherMonth = d.getMonth() !== monthIdx;
				const cell = document.createElement("div");
				cell.className =
					"cal-cell" +
					(isOtherMonth ? " other-month" : "") +
					(isToday ? " today" : "");
				const header = document.createElement("div");
				header.className = "cal-cell-header";
				header.textContent = d.getDate();
				cell.appendChild(header);
				const dayTasks = dateTaskMap[dateKey] || [];
				const displayedTasks = dayTasks.slice(0, 10);
				const remaining = dayTasks.length - 10;
				displayedTasks.forEach((task) => {
					const isFirstLast = isFirstLastForDate(task, d, state);
					const showDesc = isToday || isFirstLast;
					const row = document.createElement("div");
					row.className = "cal-task-row";
					if (showDesc) {
						const desc = document.createElement("div");
						desc.className = "cal-task-desc";
						desc.textContent =
							(CONFIG.STATUS_ICONS[task._status] || "") +
							" " +
							(task._cleanText || task.text);
						desc.onclick = (e) => {
							e.stopPropagation();
							handleTaskClick(task, d);
						};
						row.appendChild(desc);
					} else {
						const line = document.createElement("div");
						line.className = `cal-task-line ${task._status}`;
						line.title = task._tooltip || task._cleanText;
						line.onclick = (e) => {
							e.stopPropagation();
							handleTaskClick(task, d);
						};
						row.appendChild(line);
					}
					cell.appendChild(row);
				});
				if (remaining > 0) {
					const more = document.createElement("div");
					more.className = "cal-more";
					more.textContent = `+${remaining}`;
					more.onclick = (e) => {
						e.stopPropagation();
						cell.style.maxHeight = "none";
						more.remove();
						for (let j = 10; j < dayTasks.length; j++) {
							const task = dayTasks[j];
							const row = document.createElement("div");
							row.className = "cal-task-row";
							const desc = document.createElement("div");
							desc.className = "cal-task-desc";
							desc.textContent =
								(CONFIG.STATUS_ICONS[task._status] || "") +
								" " +
								(task._cleanText || task.text);
							row.appendChild(desc);
							cell.appendChild(row);
						}
					};
					cell.appendChild(more);
				}
				cell.onclick = () => {
					calState.currentView = "day";
					calState.singleDateMode = true;
					calState.focusedDate = d;
					renderFn();
				};
				grid.appendChild(cell);
			}
			monDiv.appendChild(grid);
			block.appendChild(monDiv);
		}
		items.push(block);
	});

	flushNoTaskBuffer();

	items.forEach((item) => container.appendChild(item));

	const groupCount = items.filter(
		(item) =>
			item.classList.contains("week-block") === false &&
			item.querySelector(".calendar-grid"),
	).length;
	container.dataset.groupCount = groupCount;
	container.dataset.taskCount = tasks.length;
}

// ---------- 年视图 (热力图，已自适应多列) ----------
/* @skill-dom
  .cal-root > .cal-view-area
    .year-block
      .year-grid
        .year-month-card
          .year-month-title
          .year-heat-grid
            .year-heat-cell[data-date] (颜色深度表示任务密度)
*/
/* @skill-sig function renderYearView(container, tasks, globalState, app, dv, renderFn) - 年视图渲染：12个月热力图，颜色深度表示任务密度 */
function renderYearView(container, tasks, globalState, app, dv, renderFn) {
	container.innerHTML = "";
	if (!tasks.length) {
		container.innerHTML =
			'<div class="empty-message">📭 无符合条件的任务</div>';
		return;
	}
	const state = safeState(globalState);
	const range = getEffectiveDateRange(state, dv);
	if (!range) {
		container.innerHTML =
			'<div class="empty-message">📭 无法确定日期范围</div>';
		return;
	}

	const years = [];
	for (let y = range.start.getFullYear(); y <= range.end.getFullYear(); y++)
		years.push(y);

	const dateTaskMap = buildDateTaskMap(tasks, state);
	const todayStr = formatDate(new Date());
	const maxCount = Math.max(
		1,
		...Object.values(dateTaskMap).map((arr) => arr.length),
	);

	years.forEach((year) => {
		const yearBlock = document.createElement("div");
		yearBlock.style.marginBottom = "32px";
		yearBlock.appendChild(
			Object.assign(document.createElement("div"), {
				style: "font-size:1.4em; font-weight:bold;",
				textContent: `${year}年`,
			}),
		);
		const grid = document.createElement("div");
		grid.className = "year-grid";
		for (let m = 0; m < 12; m++) {
			const monthDiv = document.createElement("div");
			monthDiv.className = "year-month-card";
			monthDiv.appendChild(
				Object.assign(document.createElement("div"), {
					className: "year-month-title",
					textContent: `${m + 1}月`,
				}),
			);
			const heatGrid = document.createElement("div");
			heatGrid.className = "year-heat-grid";
			const firstDay = new Date(year, m, 1);
			const dow = firstDay.getDay() || 7;
			const startDay = new Date(firstDay);
			startDay.setDate(1 - (dow === 7 ? 6 : 1 - dow));
			for (let d = 0; d < 42; d++) {
				const curDate = new Date(startDay);
				curDate.setDate(startDay.getDate() + d);
				const dateStr = formatDate(curDate);
				const count = (dateTaskMap[dateStr] || []).length;
				const cell = document.createElement("div");
				cell.className =
					"year-heat-cell" + (dateStr === todayStr ? " today" : "");
				cell.dataset.date = dateStr;
				if (count > 0) {
					const intensity = Math.min(
						1,
						0.15 + (count / maxCount) * 0.85,
					);
					cell.style.backgroundColor = `rgba(64,120,209,${intensity.toFixed(2)})`;
					cell.title = `${count}个任务`;
				}
				cell.textContent = curDate.getDate();
				if (curDate.getMonth() !== m) cell.style.opacity = "0.4";
				heatGrid.appendChild(cell);
			}
			monthDiv.appendChild(heatGrid);
			grid.appendChild(monthDiv);
		}
		yearBlock.appendChild(grid);
		container.appendChild(yearBlock);
		grid.addEventListener("click", (e) => {
			const cell = e.target.closest(".year-heat-cell");
			if (cell?.dataset.date) {
				calState.currentView = "day";
				calState.singleDateMode = true;
				calState.focusedDate = new Date(cell.dataset.date);
				renderFn();
			}
		});
	});

	container.dataset.groupCount = 1; // 年视图组数视为1（或按年计数）
	container.dataset.taskCount = tasks.length;
}

// ---------- 主渲染调度 ----------
/* @skill-sig function renderCurrentView(container, dv, app, globalState) - 根据 calState.currentView 分发到对应的视图渲染函数 */
function renderCurrentView(container, dv, app, globalState) {
	const viewArea = container.querySelector(".cal-view-area");
	if (!viewArea) return;
	viewArea.innerHTML = "";

	const safeGS = safeState(globalState);
	const tasks = getFilteredTasks(dv, globalState);
	if (!tasks.length) {
		viewArea.innerHTML =
			'<div class="empty-message">📭 无符合条件的任务</div>';
		const countSpan = container.querySelector(".cal-task-count");
		if (countSpan) countSpan.textContent = "";
		return;
	}

	const self = () => renderCurrentView(container, dv, app, globalState);
	if (calState.currentView === "day") {
		renderDayView(viewArea, tasks, safeGS, app, dv, self);
	} else if (calState.currentView === "week") {
		renderWeekView(viewArea, tasks, safeGS, app, dv, self);
	} else if (calState.currentView === "month") {
		renderMonthView(viewArea, tasks, safeGS, app, dv, self);
	} else if (calState.currentView === "quarter") {
		renderQuarterView(viewArea, tasks, safeGS, app, dv, self);
	} else if (calState.currentView === "year") {
		renderYearView(viewArea, tasks, safeGS, app, dv, self);
	}

	const groupCount = parseInt(viewArea.dataset.groupCount || "0");
	const taskCount = parseInt(viewArea.dataset.taskCount || "0");
	const countSpan = container.querySelector(".cal-task-count");
	if (countSpan) {
		countSpan.textContent = ` (任务组数${groupCount} 任务总数${taskCount})`;
	}
}

// ---------- 导出入口 ----------
/* @skill-sig function startCalendarView(dv, app, container, globalState) : Promise<{cleanup, updateSort}> - 日历视图入口，初始化 UI 并开始渲染 */
/* @skill-flow
  初始化工具栏 → 构建标题栏 → 创建视图区域 → 添加悬浮按钮 → renderCurrentView()
  点击视图切换按钮 → 更新 calState.currentView → renderCurrentView()
  点击日期 → 切换到日视图 + 聚焦该日期
*/
/* @skill-api
  readTasks.getAllTasks(false, dv, state)
  DateUtils.formatDate(date)
  DateUtils.setStart(date)
  DateUtils.setEnd(date)
  DateUtils.getWeekRange(date)
  DateUtils.getISOWeekNumber(date)
*/
export async function startCalendarView(dv, app, container, globalState) {
	injectStyle();
	container.innerHTML = "";
	container.className = "cal-root";

	// 工具栏
	const toolbar = document.createElement("div");
	toolbar.className = "cal-toolbar";
	const views = ["day", "week", "month", "quarter", "year"];
	const labels = ["日", "周", "月", "季", "年"];
	views.forEach((v, idx) => {
		const btn = document.createElement("button");
		btn.textContent = labels[idx];
		btn.classList.toggle("active", v === calState.currentView);
		btn.onclick = () => {
			calState.currentView = v;
			calState.singleDateMode = false;
			calState.focusedDate = null;
			calState.focusedTaskId = null;
			toolbar
				.querySelectorAll("button")
				.forEach((b) => b.classList.remove("active"));
			btn.classList.add("active");
			renderCurrentView(container, dv, app, globalState);
		};
		toolbar.appendChild(btn);
	});
	container.appendChild(toolbar);

	// 标题（分为前缀和统计）
	const stateForTitle = safeState(globalState);
	const titleDiv = document.createElement("div");
	titleDiv.className = "cal-global-title";
	const prefixSpan = document.createElement("span");
	prefixSpan.textContent = buildGlobalTitle(stateForTitle, 0, 0).replace(
		/ \(.*\)$/,
		"",
	); // 去除默认统计
	const countSpan = document.createElement("span");
	countSpan.className = "cal-task-count";
	titleDiv.appendChild(prefixSpan);
	titleDiv.appendChild(countSpan);
	container.appendChild(titleDiv);

	const viewArea = document.createElement("div");
	viewArea.className = "cal-view-area";
	container.appendChild(viewArea);

	// 悬浮按钮
	const existingBtns = document.getElementById("cal-scroll-btns");
	if (existingBtns) existingBtns.remove();
	const scrollBtns = document.createElement("div");
	scrollBtns.id = "cal-scroll-btns";
	scrollBtns.className = "cal-scroll-buttons";
	const toTopBtn = document.createElement("button");
	toTopBtn.textContent = "⏫ 页首";
	toTopBtn.onclick = () => {
		viewArea.scrollIntoView({ behavior: "smooth", block: "start" });
	};
	const toBottomBtn = document.createElement("button");
	toBottomBtn.textContent = "⏬ 页尾";
	toBottomBtn.onclick = () => {
		viewArea.scrollIntoView({ behavior: "smooth", block: "end" });
	};
	scrollBtns.appendChild(toTopBtn);
	scrollBtns.appendChild(toBottomBtn);
	document.body.appendChild(scrollBtns);

	renderCurrentView(container, dv, app, globalState);

	return {
		cleanup: () => {
			container.innerHTML = "";
			const btns = document.getElementById("cal-scroll-btns");
			if (btns) btns.remove();
		},
		updateSort: () => {
			renderCurrentView(container, dv, app, globalState);
		},
	};
}
