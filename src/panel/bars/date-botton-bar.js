// ============================================================================
// 日期级联筛选面板 (Date Cascade Filter Panel)
// ============================================================================
// 功能：提供年/季/月/周/周几的五级级联日期筛选 UI。用户选中上级后，下级
//       按钮才可点击（disabled 状态切换），支持多选。最后通过 getQueryRangeFromDateSelection
//       将选中项合并为一个日期范围用于查询。
// 依赖：DateUtils (common-process.js) - 日期范围计算工具
//       CONFIG.YEAR_LIST (plugin-configs.js) - 年份列表
// 调用方：panel.js - 与 quick-botton-bar 互斥使用
// ============================================================================

import { CONFIG } from "../../configs/plugin-configs";
import { DateUtils } from "../../tasks/process/common-process";

/**
 * 清除所有级联选择（重置为空白状态）
 * @param {Object} state - 全局状态对象
 */
function clearCascadeSelections(state) {
	state.dateState.selections = {
		years: {},
		quarters: {},
		months: {},
		weeks: {},
		weekdays: {},
	};
	updateDateButtonStyles(state);
}

/** 公开的级联清除接口，供外部重置时调用 */
export function resetCascadeDateUI(state) {
	clearCascadeSelections(state);
}

/**
 * 根据当前 selections 刷新所有级联按钮的样式和 disabled 状态
 * 核心逻辑：只有上层选了且仅选 1 个时，下层才可点击
 * @param {Object} state - 全局状态对象
 */
function updateDateButtonStyles(state) {
	const s = state.dateState.selections;

	// ── 年份按钮（始终可点击） ──
	state.yearBtns.forEach((btn, i) => {
		btn.className = s.years[CONFIG.YEAR_LIST[i]]
			? "cascade-btn cascade-btn-active"
			: "cascade-btn";
	});

	// ── 季度按钮（仅当恰好选中 1 个年份时可点击） ──
	const yearsSel = Object.keys(s.years).length > 0;
	const singleY =
		yearsSel && Object.keys(s.years).length === 1
			? Object.keys(s.years)[0]
			: null;
	state.quarterBtns.forEach((btn, q) => {
		const disabled = !singleY;
		btn.disabled = disabled;
		const key = singleY ? singleY + "-Q" + (q + 1) : "";
		const active = !disabled && s.quarters[key];
		btn.className = disabled
			? "cascade-btn cascade-btn-disabled"
			: active
				? "cascade-btn cascade-btn-active"
				: "cascade-btn";
	});

	// ── 月份按钮（仅当恰好选中 1 个季度时可点击，且只显示该季度的 3 个月） ──
	const quartersSel = Object.keys(s.quarters).length > 0;
	const singleQ =
		quartersSel && Object.keys(s.quarters).length === 1
			? Object.keys(s.quarters)[0]
			: null;
	state.monthBtns.forEach((btn, m) => {
		const month = m + 1;
		let disabled = true;
		if (singleQ) {
			const parts = singleQ.split("-Q");
			const y = parseInt(parts[0], 10);
			const qn = parseInt(parts[1], 10);
			const sm = (qn - 1) * 3 + 1;
			const em = sm + 2;
			disabled = month < sm || month > em;
		} else if (quartersSel) {
			disabled = true;
		}
		btn.disabled = disabled;
		const key = singleQ ? singleQ + "-M" + month : "";
		const active = !disabled && s.months[key];
		btn.className = disabled
			? "cascade-btn cascade-btn-disabled"
			: active
				? "cascade-btn cascade-btn-active"
				: "cascade-btn";
	});

	// ── 周数按钮（仅当恰好选中 1 个月份时可点击） ──
	const monthsSel = Object.keys(s.months).length > 0;
	const singleM =
		monthsSel && Object.keys(s.months).length === 1
			? Object.keys(s.months)[0]
			: null;
	state.weekBtns.forEach((btn, w) => {
		const disabled = !singleM;
		btn.disabled = disabled;
		const key = singleM ? singleM + "-W" + (w + 1) : "";
		const active = !disabled && s.weeks[key];
		btn.className = disabled
			? "cascade-btn cascade-btn-disabled"
			: active
				? "cascade-btn cascade-btn-active"
				: "cascade-btn";
	});

	// ── 周几按钮（仅当恰好选中 1 个周时可点击） ──
	const weeksSel = Object.keys(s.weeks).length > 0;
	const singleW =
		weeksSel && Object.keys(s.weeks).length === 1
			? Object.keys(s.weeks)[0]
			: null;
	state.weekdayBtns.forEach((btn, d) => {
		const disabled = !singleW;
		btn.disabled = disabled;
		const key = singleW ? singleW + "-D" + (d + 1) : "";
		const active = !disabled && s.weekdays[key];
		btn.className = disabled
			? "cascade-btn cascade-btn-disabled"
			: active
				? "cascade-btn cascade-btn-active"
				: "cascade-btn";
	});
}

/**
 * 将日期级联选择转换为日期范围查询对象
 * 优先级：年份→季度→月份→周→周几（从最细粒度反向合成）
 * @param {Object} state - 全局状态对象
 * @returns {{ start: Date, end: Date } | null} 日期范围，无选择时返回 null
 */
export function getQueryRangeFromDateSelection(state) {
	const s = state.dateState.selections;
	const years = Object.keys(s.years);
	if (!years.length) return null;
	years.sort();

	// 周几级别
	const wdKeys = Object.keys(s.weekdays);
	if (wdKeys.length) {
		const ranges = wdKeys.map((k) => {
			const m = k.match(/(\d+)-Q(\d+)-M(\d+)-W(\d+)-D(\d+)/);
			const y = +m[1],
				mo = +m[3],
				w = +m[4],
				wd = +m[5];
			const monStart = new Date(y, mo - 1, 1);
			const firstW = DateUtils.getISOWeekNumber(monStart);
			const targetW = firstW + w - 1;
			const wr = DateUtils.getWeekRangeByYearWeek(y, targetW);
			return DateUtils.getWeekdayRange(wr.start, wd);
		});
		return {
			start: DateUtils.setStart(
				new Date(Math.min(...ranges.map((r) => r.start))),
			),
			end: DateUtils.setEnd(
				new Date(Math.max(...ranges.map((r) => r.end))),
			),
		};
	}

	// 周级别
	const wKeys = Object.keys(s.weeks);
	if (wKeys.length) {
		const ranges = wKeys.map((k) => {
			const m = k.match(/(\d+)-Q(\d+)-M(\d+)-W(\d+)/);
			const y = +m[1],
				mo = +m[3],
				w = +m[4];
			const monStart = new Date(y, mo - 1, 1);
			const firstW = DateUtils.getISOWeekNumber(monStart);
			const targetW = firstW + w - 1;
			return DateUtils.getWeekRangeByYearWeek(y, targetW);
		});
		return {
			start: DateUtils.setStart(
				new Date(Math.min(...ranges.map((r) => r.start))),
			),
			end: DateUtils.setEnd(
				new Date(Math.max(...ranges.map((r) => r.end))),
			),
		};
	}

	// 月份级别
	const mKeys = Object.keys(s.months);
	if (mKeys.length) {
		const ranges = mKeys.map((k) => {
			const m = k.match(/(\d+)-Q(\d+)-M(\d+)/);
			return DateUtils.getMonthRangeByYearMonth(+m[1], +m[3]);
		});
		return {
			start: DateUtils.setStart(
				new Date(Math.min(...ranges.map((r) => r.start))),
			),
			end: DateUtils.setEnd(
				new Date(Math.max(...ranges.map((r) => r.end))),
			),
		};
	}

	// 季度级别
	const qKeys = Object.keys(s.quarters);
	if (qKeys.length) {
		const ranges = qKeys.map((k) => {
			const m = k.match(/(\d+)-Q(\d+)/);
			return DateUtils.getQuarterRangeByYearQuarter(+m[1], +m[2]);
		});
		return {
			start: DateUtils.setStart(
				new Date(Math.min(...ranges.map((r) => r.start))),
			),
			end: DateUtils.setEnd(
				new Date(Math.max(...ranges.map((r) => r.end))),
			),
		};
	}

	// 仅年份级别（兜底）
	const ranges = years.map((y) => DateUtils.getYearRangeByYear(+y));
	return {
		start: DateUtils.setStart(
			new Date(Math.min(...ranges.map((r) => r.start))),
		),
		end: DateUtils.setEnd(new Date(Math.max(...ranges.map((r) => r.end)))),
	};
}

/**
 * 构建日期级联筛选面板（年→季→月→周→周几）
 * 选中上级且唯一时，下级才启用；选中多个上级时，下级被禁用并清空
 * @param {HTMLElement} container - 父容器
 * @param {Object} dv - Dataview 实例
 * @param {Object} state - 全局状态对象（需包含 dateState, filterCache）
 */
export function buildDateCascadePanel(container, dv, state) {
	const dateSection = dv.el("div", "", { cls: "filter-section" });

	const rows = [
		dv.el("div", ""),
		dv.el("div", ""),
		dv.el("div", ""),
		dv.el("div", ""),
		dv.el("div", ""),
	];
	const labels = ["年份", "季度", "月份", "周数", "周几"];
	rows.forEach((row, r) => {
		row.style.cssText =
			"margin-bottom:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;";
		row.appendChild(dv.el("span", labels[r], { cls: "filter-label" }));
		dateSection.appendChild(row);
	});

	// ── 年份按钮 ──
	state.yearBtns = [];
	CONFIG.YEAR_LIST.forEach((y) => {
		const btn = dv.el("button", y.toString(), { cls: "cascade-btn" });
		btn.onclick = () => {
			if (state.dateState.selections.years[y])
				delete state.dateState.selections.years[y];
			else state.dateState.selections.years[y] = true;
			if (Object.keys(state.dateState.selections.years).length !== 1) {
				state.dateState.selections.quarters = {};
				state.dateState.selections.months = {};
				state.dateState.selections.weeks = {};
				state.dateState.selections.weekdays = {};
			}
			updateDateButtonStyles(state);
			state.filterCache.fingerprint = "";
		};
		rows[0].appendChild(btn);
		state.yearBtns.push(btn);
	});

	// ── 季度按钮 ──
	state.quarterBtns = [];
	for (let q = 1; q <= 4; q++) {
		(function (qq) {
			const btn = dv.el("button", "第" + qq + "季度", {
				cls: "cascade-btn cascade-btn-disabled",
			});
			btn.disabled = true;
			btn.onclick = () => {
				if (Object.keys(state.dateState.selections.years).length !== 1)
					return;
				const y = Object.keys(state.dateState.selections.years)[0];
				const key = y + "-Q" + qq;
				if (state.dateState.selections.quarters[key])
					delete state.dateState.selections.quarters[key];
				else state.dateState.selections.quarters[key] = true;
				if (
					Object.keys(state.dateState.selections.quarters).length !==
					1
				) {
					state.dateState.selections.months = {};
					state.dateState.selections.weeks = {};
					state.dateState.selections.weekdays = {};
				}
				updateDateButtonStyles(state);
				state.filterCache.fingerprint = "";
			};
			rows[1].appendChild(btn);
			state.quarterBtns.push(btn);
		})(q);
	}

	// ── 月份按钮 ──
	state.monthBtns = [];
	for (let m = 1; m <= 12; m++) {
		(function (mm) {
			const btn = dv.el("button", mm + "月", {
				cls: "cascade-btn cascade-btn-disabled",
			});
			btn.disabled = true;
			btn.onclick = () => {
				if (
					Object.keys(state.dateState.selections.quarters).length !==
					1
				)
					return;
				const qKey = Object.keys(
					state.dateState.selections.quarters,
				)[0];
				const key = qKey + "-M" + mm;
				if (state.dateState.selections.months[key])
					delete state.dateState.selections.months[key];
				else state.dateState.selections.months[key] = true;
				if (
					Object.keys(state.dateState.selections.months).length !== 1
				) {
					state.dateState.selections.weeks = {};
					state.dateState.selections.weekdays = {};
				}
				updateDateButtonStyles(state);
				state.filterCache.fingerprint = "";
			};
			rows[2].appendChild(btn);
			state.monthBtns.push(btn);
		})(m);
	}

	// ── 周数按钮 ──
	state.weekBtns = [];
	for (let w = 1; w <= 4; w++) {
		(function (ww) {
			const btn = dv.el("button", "第" + ww + "周", {
				cls: "cascade-btn cascade-btn-disabled",
			});
			btn.disabled = true;
			btn.onclick = () => {
				if (Object.keys(state.dateState.selections.months).length !== 1)
					return;
				const mKey = Object.keys(state.dateState.selections.months)[0];
				const key = mKey + "-W" + ww;
				if (state.dateState.selections.weeks[key])
					delete state.dateState.selections.weeks[key];
				else state.dateState.selections.weeks[key] = true;
				if (
					Object.keys(state.dateState.selections.weeks).length !== 1
				) {
					state.dateState.selections.weekdays = {};
				}
				updateDateButtonStyles(state);
				state.filterCache.fingerprint = "";
			};
			rows[3].appendChild(btn);
			state.weekBtns.push(btn);
		})(w);
	}

	// ── 周几按钮 ──
	state.weekdayBtns = [];
	["周一", "周二", "周三", "周四", "周五", "周六", "周日"].forEach(
		(wd, d) => {
			(function (idx) {
				const btn = dv.el("button", wd, {
					cls: "cascade-btn cascade-btn-disabled",
				});
				btn.disabled = true;
				btn.onclick = () => {
					if (
						Object.keys(state.dateState.selections.weeks).length !==
						1
					)
						return;
					const wKey = Object.keys(
						state.dateState.selections.weeks,
					)[0];
					const key = wKey + "-D" + (idx + 1);
					if (state.dateState.selections.weekdays[key])
						delete state.dateState.selections.weekdays[key];
					else state.dateState.selections.weekdays[key] = true;
					updateDateButtonStyles(state);
					state.filterCache.fingerprint = "";
				};
				rows[4].appendChild(btn);
				state.weekdayBtns.push(btn);
			})(d);
		},
	);

	container.appendChild(dateSection);
}
