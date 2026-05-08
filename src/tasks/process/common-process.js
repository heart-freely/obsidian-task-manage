//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file src/tasks/process/common-process.js - 纯工具函数集，提供日期操作(DateUtils)、帧节流(throttleByFrame)和简易 DOM 创建(createEl)，无外部依赖 */
/* @skill-ns DateUtils
   formatDate(d: Date) : string - 格式化日期为 yyyy-MM-dd
   setStart(d: Date) : Date - 设置当天起始时刻 00:00:00.000
   setEnd(d: Date) : Date - 设置当天结束时刻 23:59:59.999
   getDayRange(d) : {start,end} - 获取全天范围
   getISOWeekNumber(date) : number - 获取 ISO 周数
   getWeekRangeByYearWeek(year, week) : {start,end} - 根据年月获取周范围
   getWeekRange(d) : {start,end} - 获取日期所在周范围
   getMonthRange(d) : {start,end} - 获取日期所在月范围
   getMonthRangeByYearMonth(y, m) : {start,end} - 根据年月获取月范围
   getQuarterRangeByYearQuarter(y, q) : {start,end} - 根据年份季度获取季度范围
   getYearRangeByYear(y) : {start,end} - 获取全年范围
   getWeekdayRange(date, wd) : {start,end} - 获取下个星期几的范围
*/
/* @skill-func
   throttleByFrame(fn: Function) : Function - 帧节流函数，用 requestAnimationFrame 节流
   createEl(tag, textOrOpts?, opts?) : HTMLElement - 简易 DOM 元素创建
*/
/* @skill-flow
   DateUtils.get/Day/Week/Month/Quarter/Year Range() → 调用 setStart/setEnd 统一边界
   throttleByFrame(fn) → 返回节流包装函数 → 内部用 requestAnimationFrame 调度
   createEl(tag, textOrOpts, opts) → 创建元素 → 设置 textContent 或 Object.assign → 处理 cls/style/attr
*/
/* @skill-condition
   DateUtils 所有方法均返回新 Date 对象，不修改入参
   throttleByFrame: 使用 boolean `scheduled` 标志防止重复调度
   createEl: textOrOpts 为字符串时设 textContent，为对象时 Object.assign；opts 可选
*/
//  <!-- SYNC_COMMENTS_END -->

/**
 * 日期工具集
 * 提供常用的日期格式化、范围计算（日/周/月/季度/年）等静态方法
 * @namespace
 */
export const DateUtils = {
	/**
	 * 格式化日期为 yyyy-MM-dd 字符串
	 * @param {Date} d - 要格式化的日期对象
	 * @returns {string} 格式化后的日期字符串，如 "2024-01-15"
	 */
	formatDate(d) {
		const pad = (n) => (n < 10 ? "0" + n : n);
		return (
			d.getFullYear() +
			"-" +
			pad(d.getMonth() + 1) +
			"-" +
			pad(d.getDate())
		);
	},

	/**
	 * 将日期设置为当天的起始时刻（00:00:00.000）
	 * @param {Date} d - 源日期对象
	 * @returns {Date} 新的日期对象，时间部分为 00:00:00.000
	 */
	setStart(d) {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	},

	/**
	 * 将日期设置为当天的结束时刻（23:59:59.999）
	 * @param {Date} d - 源日期对象
	 * @returns {Date} 新的日期对象，时间部分为 23:59:59.999
	 */
	setEnd(d) {
		return new Date(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			23,
			59,
			59,
			999,
		);
	},

	/**
	 * 获取指定日期的全天范围（起始 ~ 结束时刻）
	 * @param {Date} d - 目标日期对象
	 * @returns {{start: Date, end: Date}} 包含 start 和 end 的时间范围对象
	 */
	getDayRange(d) {
		return { start: DateUtils.setStart(d), end: DateUtils.setEnd(d) };
	},

	/**
	 * 获取日期所在的 ISO 周数（周一为一周起始）
	 * @param {Date} date - 目标日期对象
	 * @returns {number} ISO 周数（1-53）
	 */
	getISOWeekNumber(date) {
		const d = new Date(
			Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
		);
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
	},

	/**
	 * 根据年份和周数获取该周的起始和结束日期范围
	 * 使用 ISO 周数计算方式（周四确定所属年）
	 * @param {number} year - 年份
	 * @param {number} week - ISO 周数（1-53）
	 * @returns {{start: Date, end: Date}} 包含 start 和 end 的时间范围对象
	 */
	getWeekRangeByYearWeek(year, week) {
		const jan4 = new Date(Date.UTC(year, 0, 4));
		const jan4Day = jan4.getUTCDay() || 7;
		const firstThursday = new Date(Date.UTC(year, 0, 4 - (jan4Day - 4)));
		const weekStart = new Date(firstThursday);
		weekStart.setUTCDate(firstThursday.getUTCDate() - 3 + (week - 1) * 7);
		const weekEnd = new Date(weekStart);
		weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
		return {
			start: DateUtils.setStart(new Date(weekStart)),
			end: DateUtils.setEnd(new Date(weekEnd)),
		};
	},

	/**
	 * 获取指定日期所在周的时间范围
	 * @param {Date} d - 目标日期对象
	 * @returns {{start: Date, end: Date}} 包含 start 和 end 的时间范围对象
	 */
	getWeekRange(d) {
		return DateUtils.getWeekRangeByYearWeek(
			d.getFullYear(),
			DateUtils.getISOWeekNumber(d),
		);
	},

	/**
	 * 获取指定日期所在月的时间范围
	 * @param {Date} d - 目标日期对象
	 * @returns {{start: Date, end: Date}} 包含该月起始和结束时刻的时间范围对象
	 */
	getMonthRange(d) {
		return {
			start: DateUtils.setStart(
				new Date(d.getFullYear(), d.getMonth(), 1),
			),
			end: DateUtils.setEnd(
				new Date(d.getFullYear(), d.getMonth() + 1, 0),
			),
		};
	},

	/**
	 * 根据年份和月份获取该月的时间范围
	 * @param {number} y - 年份
	 * @param {number} m - 月份（1-12）
	 * @returns {{start: Date, end: Date}} 包含该月起始和结束时刻的时间范围对象
	 */
	getMonthRangeByYearMonth(y, m) {
		return {
			start: DateUtils.setStart(new Date(y, m - 1, 1)),
			end: DateUtils.setEnd(new Date(y, m, 0)),
		};
	},

	/**
	 * 根据年份和季度获取该季度的时间范围
	 * 季度划分：Q1(1-3月)、Q2(4-6月)、Q3(7-9月)、Q4(10-12月)
	 * @param {number} y - 年份
	 * @param {number} q - 季度（1-4）
	 * @returns {{start: Date, end: Date}} 包含该季度起始和结束时刻的时间范围对象
	 */
	getQuarterRangeByYearQuarter(y, q) {
		const sm = (q - 1) * 3 + 1;
		return {
			start: DateUtils.setStart(new Date(y, sm - 1, 1)),
			end: DateUtils.setEnd(new Date(y, sm + 2, 0)),
		};
	},

	/**
	 * 获取指定年份的全年时间范围
	 * @param {number} y - 年份
	 * @returns {{start: Date, end: Date}} 包含该年起始和结束时刻的时间范围对象
	 */
	getYearRangeByYear(y) {
		return {
			start: DateUtils.setStart(new Date(y, 0, 1)),
			end: DateUtils.setEnd(new Date(y, 11, 31)),
		};
	},

	/**
	 * 获取指定日期后的下一个指定星期几的时间范围
	 * @param {Date} date - 基准日期对象
	 * @param {number} wd - 目标星期几（1=周一, 2=周二, ..., 7=周日）
	 * @returns {{start: Date, end: Date}} 包含该天的起始和结束时刻的时间范围对象
	 */
	getWeekdayRange(date, wd) {
		const d = new Date(date);
		d.setDate(d.getDate() + (wd - (d.getDay() || 7)));
		return DateUtils.getDayRange(d);
	},
};

/**
 * 帧节流函数
 * 使用 requestAnimationFrame 对函数执行进行节流，确保回调函数在下一个动画帧中只执行一次
 * 适用于高频触发的事件（如滚动、鼠标移动）场景
 *
 * @param {Function} fn - 需要节流的原函数
 * @returns {Function} 节流后的函数，具有与原函数相同的调用签名
 *
 * @example
 * const throttledHandler = throttleByFrame((e) => {
 *     console.log('Scroll position:', e.target.scrollTop);
 * });
 * window.addEventListener('scroll', throttledHandler);
 */
export function throttleByFrame(fn) {
	let scheduled = false;
	return function (...args) {
		if (!scheduled) {
			scheduled = true;
			requestAnimationFrame(() => {
				fn.apply(this, args);
				scheduled = false;
			});
		}
	};
}

/**
 * 简易 DOM 元素创建函数 @skill-sig
 * 提供轻量级的元素创建方式，不依赖 Obsidian API
 * 若需复杂功能（如事件绑定、子元素管理），建议使用 dv.el 或 Obsidian 的 createEl
 *
 * @param {string} tag - HTML 标签名，如 'div'、'span'、'input'
 * @param {string|Object} [textOrOpts] - 如果是字符串，则作为元素的 textContent；
 *                                        如果是对象，则通过 Object.assign 直接设置到元素上
 * @param {Object} [opts] - 附加选项
 * @param {string} [opts.cls] - 元素的 CSS 类名
 * @param {string} [opts.style] - 元素的内联样式字符串
 * @param {Object} [opts.attr] - 元素的 HTML 属性键值对
 * @returns {HTMLElement} 创建并配置好的 DOM 元素
 *
 * @example
 * // 创建带文本的 div
 * const el1 = createEl('div', 'Hello World');
 *
 * // 创建带属性的 input
 * const input = createEl('input', '', {
 *     cls: 'my-input',
 *     attr: { type: 'text', placeholder: 'Enter name' }
 * });
 * @sync .cline/skills/code/views/views.md → common-process 基础 DOM 工具
 */
export function createEl(tag, textOrOpts, opts) {
	const el = document.createElement(tag);
	if (typeof textOrOpts === "string") {
		el.textContent = textOrOpts;
	} else if (textOrOpts && typeof textOrOpts === "object") {
		Object.assign(el, textOrOpts);
	}
	if (opts && typeof opts === "object") {
		if (opts.cls) el.className = opts.cls;
		if (opts.style) el.style.cssText = opts.style;
		if (opts.attr) {
			for (const key in opts.attr) {
				if (Object.hasOwn(opts.attr, key))
					el.setAttribute(key, opts.attr[key]);
			}
		}
	}
	return el;
}
