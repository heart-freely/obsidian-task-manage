// src/ui/bars/time-bar.ts

import {
	absoluteValueToYear,
	calcDynamicOffset,
	datesFromLevel,
	dayToDate,
	daysInYear,
	formatDayValue,
	formatDynamicLabel,
	formatDynamicValue,
	formatMonthValue,
	formatQuarterValue,
	formatWeekValue,
	formatYearValue,
	getLevelValues,
	getTaskTimeRange,
	getTodayAbsoluteValue,
	maxDynamicRange,
	staticSliderRanges,
	weeksInYear,
} from "../../process/bars/bars-process";
import { DateUtils } from "../../process/process";
import { getAllTasks } from "../../process/tasks/read-task";
import { Store } from "../../store/store";
import {
	createEnhancedSlider,
	EnhancedSliderRef,
} from "../components/slider/slider";

const YEAR_RANGE_OFFSET = 10;

export class TimeBar {
	private container: HTMLElement;
	private store: Store;

	private dynamicStart = new Date();
	private dynamicEnd = new Date();
	private dynamicUnit: "day" | "week" | "month" | "quarter" | "year" = "day";

	private staticStart = new Date();
	private staticEnd = new Date();

	private useDynamic = false;
	private intervalMode = "scheduled-due";
	private taskMinYear = 2021;
	private taskMaxYear = 2031;

	private currentMinYear: number = new Date().getFullYear();
	private currentMaxYear: number = new Date().getFullYear();
	private childSlidersDrivenByYear: boolean = true;

	private enhancedSliders = new Map<string, EnhancedSliderRef>();
	private updateMidLines = new Map<string, (v: number) => void>();
	private unsub: (() => void) | null = null;
	private initialRender = true;
	private dateCheckInterval: number | null = null;
	private pendingDateCheck: number | null = null;
	private lastCheckedDate: string = "";

	private useDynamicBtn: HTMLElement | null = null;
	private modeBtn: HTMLElement | null = null;
	private unitBtns = new Map<string, HTMLElement>();
	private staticSection: HTMLElement | null = null;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		const pre = store.getActivePreset();
		this.intervalMode = pre?.intervalMode ?? "scheduled-due";
		this.useDynamic = pre?.useDynamic ?? false;
		const today = new Date();
		this.dynamicStart = DateUtils.setStart(today);
		this.dynamicEnd = DateUtils.setStart(today);
		this.staticStart = DateUtils.setStart(today);
		this.staticEnd = DateUtils.setStart(today);
		this.lastCheckedDate = DateUtils.formatDate(today);
		this.currentMinYear = today.getFullYear();
		this.currentMaxYear = today.getFullYear();
		this.unsub = store.subscribe(() => this.onStoreChange());
		this.render();
		this.dateCheckInterval = window.setInterval(
			() => this.checkDateChange(),
			60000,
		);
		this.registerWorkspaceEvent();
	}

	destroy() {
		if (this.dateCheckInterval !== null) {
			clearInterval(this.dateCheckInterval);
			this.dateCheckInterval = null;
		}
		if (this.pendingDateCheck !== null) {
			cancelAnimationFrame(this.pendingDateCheck);
			this.pendingDateCheck = null;
		}
		this.enhancedSliders.forEach((s) => s.destroy());
		this.enhancedSliders.clear();
		this.updateMidLines.clear();
		this.unsub?.();
		this.unsub = null;
	}

	// ========== 事件 ==========

	private registerWorkspaceEvent() {
		const app = (window as any).app;
		if (!app) return;
		app.workspace.on("active-leaf-change", () => this.checkDateChange());
		app.workspace.on("layout-change", () => this.checkDateChange());
	}

	private checkDateChange() {
		if (this.pendingDateCheck !== null)
			cancelAnimationFrame(this.pendingDateCheck);
		this.pendingDateCheck = requestAnimationFrame(() => {
			this.pendingDateCheck = null;
			this.doCheckDateChange();
		});
	}

	private doCheckDateChange() {
		const today = new Date();
		const dateStr = DateUtils.formatDate(today);
		if (this.lastCheckedDate !== dateStr) {
			this.lastCheckedDate = dateStr;
			this.refreshAllStaticSliders();
			if (!this.useDynamic) this.refreshDynamicUI();
		}
	}

	private onStoreChange() {
		const pre = this.store.getActivePreset();
		if (!pre) return;
		const newMode = pre.intervalMode ?? "scheduled-due";
		const newUseDynamic = pre.useDynamic ?? false;
		const newFilter = pre.filter;

		if (this.intervalMode !== newMode) {
			this.intervalMode = newMode;
			if (this.modeBtn)
				this.modeBtn.setText(
					newMode === "scheduled-due" ? "计划~截止" : "开始~完成",
				);
		}
		if (this.useDynamic !== newUseDynamic) {
			this.useDynamic = newUseDynamic;
			this.useDynamicBtn?.toggleClass("active", this.useDynamic);
		}

		if (newFilter.dateRange.isAll && this.initialRender === false) {
			const today = new Date();
			const cy = today.getFullYear();
			this.staticStart = new Date(cy, 0, 1);
			this.staticEnd = new Date(cy, 11, 31);
			this.currentMinYear = cy;
			this.currentMaxYear = cy;
			this.childSlidersDrivenByYear = true;
			this.dynamicStart = DateUtils.setStart(today);
			this.dynamicEnd = DateUtils.setStart(today);
			this.dynamicUnit = "day";
			this.useDynamic = false;
			this.intervalMode = "scheduled-due";
			this.rebuildStaticSliders();
			this.rebuildDynamicSlider();
			return;
		}
	}

	// ========== 工具 ==========

	private clamp(v: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, v));
	}

	private yearRange(): { min: number; max: number } {
		const cy = new Date().getFullYear();
		return { min: cy - YEAR_RANGE_OFFSET, max: cy + YEAR_RANGE_OFFSET };
	}

	private savePreset(changes: Partial<any>) {
		const state = this.store.getState();
		const pre = state.presets.find((p) => p.id === state.activePresetId);
		if (!pre) return;
		const newPresets = state.presets.map((p) =>
			p.id === pre.id ? { ...p, ...changes } : p,
		);
		this.store.update({ presets: newPresets });
	}

	private updateDateRange() {
		const state = this.store.getState();
		const pre = state.presets.find((p) => p.id === state.activePresetId);
		if (!pre) return;
		const newPresets = state.presets.map((p) =>
			p.id === pre.id
				? {
						...p,
						filter: {
							...p.filter,
							dateRange: {
								start: this.staticStart.getTime(),
								end: this.staticEnd.getTime(),
								isAll: false,
							},
						},
					}
				: p,
		);
		this.store.update({ presets: newPresets });
	}

	// ========== 回调 ==========

	private onDynamicChange(sv: number, ev: number) {
		const { startDate, endDate } = datesFromLevel(
			"dynamic",
			Math.min(sv, ev),
			Math.max(sv, ev),
			this.dynamicUnit,
		);
		this.dynamicStart = startDate;
		this.dynamicEnd = endDate;
		if (this.useDynamic) {
			this.staticStart = DateUtils.setStart(new Date(startDate));
			this.staticEnd = DateUtils.setEnd(new Date(endDate));
			this.refreshAllStaticSliders();
			this.updateDateRange();
		}
	}

	private onStaticChange(lv: string, sv: number, ev: number) {
		const minV = Math.min(sv, ev);
		const maxV = Math.max(sv, ev);

		if (lv === "year") {
			this.currentMinYear = minV;
			this.currentMaxYear = maxV;
			this.childSlidersDrivenByYear = true;
			const { startDate, endDate } = datesFromLevel("year", minV, maxV);
			this.staticStart = DateUtils.setStart(startDate);
			this.staticEnd = DateUtils.setEnd(endDate);
			this.rebuildStaticSliders();
		} else {
			const { startDate, endDate } = datesFromLevel(
				lv,
				minV,
				maxV,
				undefined,
				this.currentMinYear,
			);
			this.staticStart = DateUtils.setStart(
				startDate <= endDate ? startDate : endDate,
			);
			this.staticEnd = DateUtils.setEnd(
				startDate <= endDate ? endDate : startDate,
			);
			if (this.childSlidersDrivenByYear)
				this.childSlidersDrivenByYear = false;
			this.refreshAllStaticSliders();
		}

		this.updateDateRange();
	}

	private onToggleDynamic() {
		this.useDynamic = !this.useDynamic;
		this.useDynamicBtn?.toggleClass("active", this.useDynamic);
		if (this.useDynamic) {
			this.staticStart = DateUtils.setStart(new Date(this.dynamicStart));
			this.staticEnd = DateUtils.setEnd(new Date(this.dynamicEnd));
			this.refreshAllStaticSliders();
			this.updateDateRange();
		}
		this.savePreset({ useDynamic: this.useDynamic });
	}

	private onToggleMode() {
		this.intervalMode =
			this.intervalMode === "scheduled-due"
				? "starts-done"
				: "scheduled-due";
		if (this.modeBtn)
			this.modeBtn.setText(
				this.intervalMode === "scheduled-due"
					? "计划~截止"
					: "开始~完成",
			);
		this.savePreset({ intervalMode: this.intervalMode });
	}

	private onSwitchUnit(k: "day" | "week" | "month" | "quarter" | "year") {
		if (this.dynamicUnit === k) return;
		const nm = maxDynamicRange(k);
		const ds = calcDynamicOffset(this.dynamicStart, k);
		const de = calcDynamicOffset(this.dynamicEnd, k);
		if (ds < -nm || ds > nm || de < -nm || de > nm) {
			const t = new Date();
			t.setHours(0, 0, 0, 0);
			this.dynamicStart = new Date(t);
			this.dynamicEnd = new Date(t);
			if (this.useDynamic) {
				this.staticStart = new Date(this.dynamicStart);
				this.staticEnd = new Date(this.dynamicEnd);
				this.refreshAllStaticSliders();
				this.updateDateRange();
			}
		}
		this.dynamicUnit = k;
		this.unitBtns.forEach((btn, key) =>
			btn.toggleClass("active", key === k),
		);
		this.rebuildDynamicSlider();
	}

	// ========== 格式化 ==========

	private fmtYear(x: number): string {
		return formatYearValue(x);
	}
	private fmtQuarter(x: number): string {
		return formatQuarterValue(x, this.currentMinYear);
	}
	private fmtMonth(x: number): string {
		return formatMonthValue(x, this.currentMinYear);
	}
	private fmtWeek(x: number): string {
		return formatWeekValue(x, this.currentMinYear);
	}
	private fmtDay(x: number): string {
		return formatDayValue(x, this.currentMinYear);
	}
	private fmtDynamicValue(v: number): string {
		return formatDynamicValue(v, this.dynamicUnit);
	}
	private fmtDynamicLabel(a: number, b: number): string {
		return formatDynamicLabel(a, b, this.dynamicUnit);
	}

	private getTodayValue(lv: string): number {
		return getTodayAbsoluteValue(
			lv,
			this.currentMinYear,
			DateUtils.getISOWeekNumber,
		);
	}

	// ========== 动态滑块 ==========

	private rebuildDynamicSlider() {
		this.enhancedSliders.get("dynamic")?.destroy();
		this.enhancedSliders.delete("dynamic");
		this.updateMidLines.delete("dynamic");

		const dSec = this.container.querySelector(
			".filter-section",
		) as HTMLElement;
		if (!dSec) return;

		const dmx = this.maxDyn();
		const dsVal = this.clamp(
			calcDynamicOffset(this.dynamicStart, this.dynamicUnit),
			-dmx,
			dmx,
		);
		const deVal = this.clamp(
			calcDynamicOffset(this.dynamicEnd, this.dynamicUnit),
			-dmx,
			dmx,
		);
		const minV = Math.min(dsVal, deVal);
		const maxV = Math.max(dsVal, deVal);

		const result = createEnhancedSlider({
			container: dSec,
			min: -dmx,
			max: dmx,
			start: minV,
			end: maxV,
			format: (v) => this.fmtDynamicValue(v),
			onChange: (s, e) => this.onDynamicChange(s, e),
			todayValue: 0,
			midValue: 0,
		});

		result.refs.labelSpan.textContent = this.fmtDynamicLabel(minV, maxV);

		this.enhancedSliders.set("dynamic", result.refs);
		this.updateMidLines.set("dynamic", result.updateMidLine);
	}

	// ========== 静态滑块 ==========

	private rebuildStaticSliders() {
		if (!this.staticSection) return;

		["year", "quarter", "month", "week", "day"].forEach((key) => {
			this.enhancedSliders.get(key)?.destroy();
			this.enhancedSliders.delete(key);
			this.updateMidLines.delete(key);
		});

		const { min: yearMin, max: yearMax } = this.yearRange();
		const isSingle = this.currentMinYear === this.currentMaxYear;

		let ranges: any;
		let vals: any;

		if (isSingle) {
			const y = this.currentMinYear;
			ranges = {
				yearMin,
				yearMax,
				quarterMin: 1,
				quarterMax: 4,
				monthMin: 1,
				monthMax: 12,
				weekMin: 1,
				weekMax: weeksInYear(y),
				dayMin: 1,
				dayMax: daysInYear(y),
				minYear: y,
				maxYear: y,
			};
			vals = {
				yearStart: y,
				yearEnd: y,
				quarterStart: 1,
				quarterEnd: 4,
				monthStart: 1,
				monthEnd: 12,
				weekStart: 1,
				weekEnd: weeksInYear(y),
				dayStart: 1,
				dayEnd: daysInYear(y),
			};
		} else {
			ranges = staticSliderRanges(
				this.staticStart,
				this.staticEnd,
				this.taskMinYear,
				this.taskMaxYear,
			);
			ranges.yearMin = yearMin;
			ranges.yearMax = yearMax;
			this.currentMinYear = ranges.minYear;
			vals = getLevelValues(
				this.staticStart,
				this.staticEnd,
				this.currentMinYear,
			);
		}

		const cur = (lv: string) => this.getTodayValue(lv);
		const sv = (lv: string) =>
			lv === "year"
				? Math.min(vals.yearStart, vals.yearEnd)
				: lv === "quarter"
					? vals.quarterStart
					: lv === "month"
						? vals.monthStart
						: lv === "week"
							? vals.weekStart
							: vals.dayStart;
		const ev = (lv: string) =>
			lv === "year"
				? Math.max(vals.yearStart, vals.yearEnd)
				: lv === "quarter"
					? vals.quarterEnd
					: lv === "month"
						? vals.monthEnd
						: lv === "week"
							? vals.weekEnd
							: vals.dayEnd;

		this.createSlider(
			"year",
			ranges.yearMin,
			ranges.yearMax,
			sv("year"),
			ev("year"),
			(x) => this.fmtYear(x),
			cur("year"),
		);
		this.createSlider(
			"quarter",
			ranges.quarterMin,
			ranges.quarterMax,
			sv("quarter"),
			ev("quarter"),
			(x) => this.fmtQuarter(x),
			cur("quarter"),
		);
		this.createSlider(
			"month",
			ranges.monthMin,
			ranges.monthMax,
			sv("month"),
			ev("month"),
			(x) => this.fmtMonth(x),
			cur("month"),
		);
		this.createSlider(
			"week",
			ranges.weekMin,
			ranges.weekMax,
			sv("week"),
			ev("week"),
			(x) => this.fmtWeek(x),
			cur("week"),
		);
		this.createSlider(
			"day",
			ranges.dayMin,
			ranges.dayMax,
			sv("day"),
			ev("day"),
			(x) => this.fmtDay(x),
			cur("day"),
		);
	}

	private createSlider(
		key: string,
		min: number,
		max: number,
		start: number,
		end: number,
		format: (v: number) => string,
		todayVal: number,
	) {
		if (!this.staticSection) return;
		const result = createEnhancedSlider({
			container: this.staticSection,
			min,
			max,
			start: this.clamp(Math.min(start, end), min, max),
			end: this.clamp(Math.max(start, end), min, max),
			format,
			onChange: (s, ev) => this.onStaticChange(key, s, ev),
			todayValue: todayVal,
			midValue: todayVal,
		});
		this.enhancedSliders.set(key, result.refs);
		this.updateMidLines.set(key, result.updateMidLine);
	}

	// ========== UI 更新 ==========

	private refreshDynamicUI() {
		const ref = this.enhancedSliders.get("dynamic");
		const updateMid = this.updateMidLines.get("dynamic");
		if (!ref || !updateMid) return;
		const mx = this.maxDyn();
		const mn = -mx;
		const ds = calcDynamicOffset(this.dynamicStart, this.dynamicUnit);
		const de = calcDynamicOffset(this.dynamicEnd, this.dynamicUnit);
		const minV = this.clamp(Math.min(ds, de), mn, mx);
		const maxV = this.clamp(Math.max(ds, de), mn, mx);
		ref.update(minV, maxV);
		ref.labelSpan.textContent = this.fmtDynamicLabel(minV, maxV);
		updateMid(0);
	}

	private refreshAllStaticSliders() {
		const { min: yearMin, max: yearMax } = this.yearRange();

		if (
			this.childSlidersDrivenByYear &&
			this.currentMinYear === this.currentMaxYear
		) {
			const y = this.currentMinYear;
			const cur = (lv: string) => this.getTodayValue(lv);
			const up = (
				key: string,
				s: number,
				e: number,
				mn: number,
				mx: number,
				midV: number,
			) => {
				const ref = this.enhancedSliders.get(key);
				const updateMid = this.updateMidLines.get(key);
				if (!ref) return;
				ref.update(
					this.clamp(Math.min(s, e), mn, mx),
					this.clamp(Math.max(s, e), mn, mx),
				);
				if (updateMid) updateMid(midV);
			};
			up("year", y, y, yearMin, yearMax, cur("year"));
			up("quarter", 1, 4, 1, 4, cur("quarter"));
			up("month", 1, 12, 1, 12, cur("month"));
			up("week", 1, weeksInYear(y), 1, weeksInYear(y), cur("week"));
			up("day", 1, daysInYear(y), 1, daysInYear(y), cur("day"));
			return;
		}

		const ranges = staticSliderRanges(
			this.staticStart,
			this.staticEnd,
			this.taskMinYear,
			this.taskMaxYear,
		);
		this.currentMinYear = (ranges as any).minYear;
		const vals = getLevelValues(
			this.staticStart,
			this.staticEnd,
			this.currentMinYear,
		);
		const cur = (lv: string) => this.getTodayValue(lv);

		const up = (
			key: string,
			s: number,
			e: number,
			mn: number,
			mx: number,
			midV: number,
		) => {
			const ref = this.enhancedSliders.get(key);
			const updateMid = this.updateMidLines.get(key);
			if (!ref) return;
			ref.update(
				this.clamp(Math.min(s, e), mn, mx),
				this.clamp(Math.max(s, e), mn, mx),
			);
			if (updateMid) updateMid(midV);
		};

		up(
			"year",
			Math.min(vals.yearStart, vals.yearEnd),
			Math.max(vals.yearStart, vals.yearEnd),
			yearMin,
			yearMax,
			cur("year"),
		);
		up(
			"quarter",
			vals.quarterStart,
			vals.quarterEnd,
			ranges.quarterMin,
			ranges.quarterMax,
			cur("quarter"),
		);
		up(
			"month",
			vals.monthStart,
			vals.monthEnd,
			ranges.monthMin,
			ranges.monthMax,
			cur("month"),
		);
		up(
			"week",
			vals.weekStart,
			vals.weekEnd,
			ranges.weekMin,
			ranges.weekMax,
			cur("week"),
		);
		up(
			"day",
			vals.dayStart,
			vals.dayEnd,
			ranges.dayMin,
			ranges.dayMax,
			cur("day"),
		);
	}

	private maxDyn() {
		return maxDynamicRange(this.dynamicUnit);
	}

	private initRange() {
		try {
			const dv = (window as any).app?.plugins?.plugins?.dataview?.api;
			if (!dv) return;
			const tasks = getAllTasks(false, dv, {
				cachedAllTasks: null as any,
			});
			const r = getTaskTimeRange(tasks);
			if (r.minTime) this.taskMinYear = new Date(r.minTime).getFullYear();
			if (r.maxTime) this.taskMaxYear = new Date(r.maxTime).getFullYear();
		} catch {
			/* ignore */
		}
	}

	render() {
		this.container.empty();
		this.enhancedSliders.forEach((s) => s.destroy());
		this.enhancedSliders.clear();
		this.updateMidLines.clear();
		this.unitBtns.clear();
		this.useDynamicBtn = null;
		this.modeBtn = null;
		this.staticSection = null;
		this.initRange();

		const pre = this.store.getActivePreset();
		this.intervalMode = pre?.intervalMode ?? "scheduled-due";
		this.useDynamic = pre?.useDynamic ?? false;

		if (this.initialRender) {
			this.initialRender = false;
			const cf = pre?.filter;
			if (
				cf &&
				!cf.dateRange.isAll &&
				cf.dateRange.start &&
				cf.dateRange.end
			) {
				this.staticStart = DateUtils.setStart(
					new Date(cf.dateRange.start),
				);
				this.staticEnd = DateUtils.setEnd(new Date(cf.dateRange.end));
			}
			this.currentMinYear = this.staticStart.getFullYear();
			this.currentMaxYear = this.staticEnd.getFullYear();
			this.childSlidersDrivenByYear = true;
		}

		// 模式
		const mr = this.container.createDiv({ cls: "filter-row" });
		mr.createSpan({ text: "模式", cls: "filter-label" });
		this.modeBtn = mr.createEl("button", {
			text:
				this.intervalMode === "scheduled-due"
					? "计划~截止"
					: "开始~完成",
			cls: "filter-btn active",
		});
		this.modeBtn.onclick = () => this.onToggleMode();

		// 动态
		const dSec = this.container.createDiv({ cls: "filter-section" });
		const uRow = dSec.createDiv({ cls: "filter-row" });
		uRow.createSpan({ text: "动态", cls: "filter-label" });
		(["年", "季", "月", "周", "日"] as const).forEach((u) => {
			const k =
				u === "年"
					? "year"
					: u === "季"
						? "quarter"
						: u === "月"
							? "month"
							: u === "周"
								? "week"
								: "day";
			const b = uRow.createEl("button", { text: u, cls: "filter-btn" });
			if (this.dynamicUnit === k) b.addClass("active");
			this.unitBtns.set(k, b);
			b.onclick = () => this.onSwitchUnit(k);
		});
		this.useDynamicBtn = uRow.createEl("button", {
			text: "使用动态",
			cls: "filter-btn",
		});
		if (this.useDynamic) this.useDynamicBtn.addClass("active");
		this.useDynamicBtn.onclick = () => this.onToggleDynamic();
		this.rebuildDynamicSlider();

		// 静态
		this.staticSection = this.container.createDiv({
			cls: "filter-section",
		});
		this.staticSection
			.createDiv({ cls: "filter-row" })
			.createSpan({ text: "静态", cls: "filter-label" });
		this.rebuildStaticSliders();
	}
}
