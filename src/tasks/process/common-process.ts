// src/common.js
// 纯工具函数，不依赖 Obsidian 或 Dataview

/**
 * 日期工具集
 */
export const DateUtils = {
    formatDate(d) {
        const pad = n => n < 10 ? '0' + n : n;
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },

    setStart(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    },

    setEnd(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    },

    getDayRange(d) {
        return { start: DateUtils.setStart(d), end: DateUtils.setEnd(d) };
    },

    getISOWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

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
            end: DateUtils.setEnd(new Date(weekEnd))
        };
    },

    getWeekRange(d) {
        return DateUtils.getWeekRangeByYearWeek(d.getFullYear(), DateUtils.getISOWeekNumber(d));
    },

    getMonthRange(d) {
        return {
            start: DateUtils.setStart(new Date(d.getFullYear(), d.getMonth(), 1)),
            end: DateUtils.setEnd(new Date(d.getFullYear(), d.getMonth() + 1, 0))
        };
    },

    getMonthRangeByYearMonth(y, m) {
        return {
            start: DateUtils.setStart(new Date(y, m - 1, 1)),
            end: DateUtils.setEnd(new Date(y, m, 0))
        };
    },

    getQuarterRangeByYearQuarter(y, q) {
        const sm = (q - 1) * 3 + 1;
        return {
            start: DateUtils.setStart(new Date(y, sm - 1, 1)),
            end: DateUtils.setEnd(new Date(y, sm + 2, 0))
        };
    },

    getYearRangeByYear(y) {
        return {
            start: DateUtils.setStart(new Date(y, 0, 1)),
            end: DateUtils.setEnd(new Date(y, 11, 31))
        };
    },

    getWeekdayRange(date, wd) {
        const d = new Date(date);
        d.setDate(d.getDate() + (wd - (d.getDay() || 7)));
        return DateUtils.getDayRange(d);
    }
};

/**
 * 帧节流
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
 * 简易 DOM 创建（不依赖 Obsidian，可被 dv.el 替代）
 * 这里只提供基础版本，若需复杂功能仍用 dv.el
 */
export function createEl(tag, textOrOpts, opts) {
    const el = document.createElement(tag);
    if (typeof textOrOpts === 'string') {
        el.textContent = textOrOpts;
    } else if (textOrOpts && typeof textOrOpts === 'object') {
        Object.assign(el, textOrOpts);
    }
    if (opts && typeof opts === 'object') {
        if (opts.cls) el.className = opts.cls;
        if (opts.style) el.style.cssText = opts.style;
        if (opts.attr) {
            for (const key in opts.attr) {
                if (Object.hasOwn(opts.attr, key)) el.setAttribute(key, opts.attr[key]);
            }
        }
    }
    return el;
}
