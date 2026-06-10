// src/ui/panel/time-panel.ts
// 任务时间面板

import { DataManager } from "../../core/data/data-manager";
import {
	calcDynamicOffset,
	datesFromLevel,
	daysInYear,
	dayToDate,
	getLevelValues,
	maxDynamicRange,
	staticSliderRanges,
	weeksInYear,
} from "../../core/panel/panel-config";
import { Store } from "../../core/store/store";
import { DateUtils } from "../../util/date-utils";
import {
	createEnhancedSlider,
	EnhancedSliderRef,
} from "../component/slider/slider";

export class TimePanel {
	private container: HTMLElement;
	private store: Store;
	private dataManager: DataManager;
	private app: any;

	private dynamicStart = new Date();
	private dynamicEnd = new Date();
	private dynamicUnit: "day" | "week" | "month" | "quarter" | "year" = "day";
	private staticStart = new Date();
	private staticEnd = new Date();
	private useDynamic = false;
	private intervalMode = "any-date";
	private taskMinYear = 2021;
	private taskMaxYear = 2031;
	private currentMinYear: number = new Date().getFullYear();
	private currentMaxYear: number = new Date().getFullYear();
	private childSlidersDrivenByYear: boolean = true;
	private savedStaticStart: Date | null = null;
	private savedStaticEnd: Date | null = null;
	private savedCurrentMinYear: number = new Date().getFullYear();
	private savedCurrentMaxYear: number = new Date().getFullYear();
	private savedChildSlidersDrivenByYear: boolean = true;
	private enhancedSliders = new Map<string, EnhancedSliderRef>();
	private updateMidLines = new Map<string, (v: number) => void>();
	private initialRender = true;
	private dateCheckInterval: number | null = null;
	private pendingDateCheck: number | null = null;
	private lastCheckedDate: string = "";
	private useDynamicBtn: HTMLElement | null = null;
	private modeBtns = new Map<string, HTMLElement>();
	private unitBtns = new Map<string, HTMLElement>();
	private dynamicSection: HTMLElement | null = null;
	private staticSection: HTMLElement | null = null;

	constructor(container: HTMLElement, store: Store, app?: any) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.dataManager = DataManager.getInstance();
		const today = new Date();
		this.dynamicStart = DateUtils.setStart(today);
		this.dynamicEnd = DateUtils.setStart(today);
		this.staticStart = DateUtils.setStart(today);
		this.staticEnd = DateUtils.setStart(today);
		this.lastCheckedDate = DateUtils.formatDate(today);
		this.currentMinYear = today.getFullYear();
		this.currentMaxYear = today.getFullYear();
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
	}

	public onPresetChanged() {
		const pre = this.store.getActivePreset();
		if (!pre) return;
		this.intervalMode = pre.intervalMode ?? "any-date";
		this.useDynamic = pre.useDynamic ?? false;
		const cf = pre.filter;
		if (
			cf &&
			!cf.dateRange.isAll &&
			cf.dateRange.start &&
			cf.dateRange.end
		) {
			this.staticStart = DateUtils.setStart(new Date(cf.dateRange.start));
			this.staticEnd = DateUtils.setEnd(new Date(cf.dateRange.end));
			this.currentMinYear = this.staticStart.getFullYear();
			this.currentMaxYear = this.staticEnd.getFullYear();
			if (this.useDynamic) {
				this.dynamicStart = DateUtils.setStart(
					new Date(cf.dateRange.start),
				);
				this.dynamicEnd = DateUtils.setStart(
					new Date(cf.dateRange.end),
				);
			}
		} else if (!this.useDynamic) {
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
		}
		this.updateModeButtons();
		this.syncUseDynamicButton();
		this.rebuildStaticSliders();
		this.rebuildDynamicSlider();
	}

	private registerWorkspaceEvent() {
		if (!this.app) return;
		this.app.workspace.on("active-leaf-change", () =>
			this.checkDateChange(),
		);
		this.app.workspace.on("layout-change", () => this.checkDateChange());
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

	private clamp(v: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, v));
	}

	private yearRange(): { min: number; max: number } {
		const cy = new Date().getFullYear();
		return { min: cy - 10, max: cy + 10 };
	}

	private updatePreset(changes: { dateRange?: boolean } & Partial<any>) {
		const state = this.store.getState();
		const pre = state.presets.find((p) => p.id === state.activePresetId);
		if (!pre) return;
		const updates: any = {};
		for (const key of Object.keys(changes)) {
			if (key !== "dateRange") updates[key] = changes[key];
		}
		if (changes.dateRange) {
			updates.filter = {
				...pre.filter,
				dateRange: {
					start: this.staticStart.getTime(),
					end: this.staticEnd.getTime(),
					isAll: false,
				},
			};
		}
		this.store.update({
			presets: state.presets.map((p) =>
				p.id === pre.id ? { ...p, ...updates } : p,
			),
		});
		this.dataManager.invalidateFilterCache();
	}

	private syncDynamicToStatic(startDate: Date, endDate: Date) {
		this.staticStart = DateUtils.setStart(new Date(startDate));
		this.staticEnd = DateUtils.setEnd(new Date(endDate));
		this.currentMinYear = startDate.getFullYear();
		this.currentMaxYear = endDate.getFullYear();
		this.childSlidersDrivenByYear = false;
		this.refreshAllStaticSliders();
	}

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
			this.syncDynamicToStatic(startDate, endDate);
			if (this.intervalMode !== "none") {
				this.updatePreset({ dateRange: true });
			}
		}
	}

	private onStaticChange(lv: string, sv: number, ev: number) {
		const minV = Math.min(sv, ev),
			maxV = Math.max(sv, ev);
		if (lv === "year") {
			this.currentMinYear = minV;
			this.currentMaxYear = maxV;
			this.childSlidersDrivenByYear = true;
			const { startDate, endDate } = datesFromLevel("year", minV, maxV);
			this.staticStart = DateUtils.setStart(startDate);
			this.staticEnd = DateUtils.setEnd(endDate);
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
		}
		this.rebuildStaticSliders();

		if (this.intervalMode !== "none") {
			this.updatePreset({ dateRange: true });
		}
	}

	private onToggleDynamic() {
		this.useDynamic = !this.useDynamic;
		if (this.useDynamic) {
			this.savedStaticStart = new Date(this.staticStart);
			this.savedStaticEnd = new Date(this.staticEnd);
			this.savedCurrentMinYear = this.currentMinYear;
			this.savedCurrentMaxYear = this.currentMaxYear;
			this.savedChildSlidersDrivenByYear = this.childSlidersDrivenByYear;
			this.syncDynamicToStatic(this.dynamicStart, this.dynamicEnd);
		} else {
			if (this.savedStaticStart && this.savedStaticEnd) {
				this.staticStart = this.savedStaticStart;
				this.staticEnd = this.savedStaticEnd;
				this.currentMinYear = this.savedCurrentMinYear;
				this.currentMaxYear = this.savedCurrentMaxYear;
				this.childSlidersDrivenByYear =
					this.savedChildSlidersDrivenByYear;
			} else {
				const today = new Date();
				const cy = today.getFullYear();
				this.staticStart = new Date(cy, 0, 1);
				this.staticEnd = new Date(cy, 11, 31);
				this.currentMinYear = cy;
				this.currentMaxYear = cy;
				this.childSlidersDrivenByYear = true;
			}
			this.rebuildStaticSliders();
		}
		this.syncUseDynamicButton();
		if (this.intervalMode !== "none") {
			this.updatePreset({ dateRange: true, useDynamic: this.useDynamic });
		} else {
			this.updatePreset({ useDynamic: this.useDynamic });
		}
	}

	private onSelectMode(mode: string) {
		if (this.intervalMode === mode) return;
		this.intervalMode = mode;
		this.updateModeButtons();
		this.updatePreset({ intervalMode: this.intervalMode });
	}

	private updateModeButtons() {
		const mainBtn = this.container.querySelector(
			".panel-btn:not(.sub-btn)",
		) as HTMLElement;
		if (mainBtn) {
			if (this.intervalMode !== "none") {
				mainBtn.addClass("active");
			} else {
				mainBtn.removeClass("active");
			}
		}
		this.modeBtns.forEach((btn, mode) => {
			if (mode === this.intervalMode) {
				btn.addClass("active");
			} else {
				btn.removeClass("active");
			}
		});
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
				this.syncDynamicToStatic(this.dynamicStart, this.dynamicEnd);
				if (this.intervalMode !== "none") {
					this.updatePreset({ dateRange: true });
				}
			}
		}
		this.dynamicUnit = k;
		this.unitBtns.forEach((btn, key) =>
			btn.toggleClass("active", key === k),
		);
		this.rebuildDynamicSlider();
	}

	private syncUseDynamicButton() {
		if (this.useDynamicBtn) {
			if (this.useDynamic) this.useDynamicBtn.addClass("active");
			else this.useDynamicBtn.removeClass("active");
		}
	}

	private fmtYear(x: number): string {
		return `${x}年`;
	}
	private fmtQuarter(x: number): string {
		const y = this.currentMinYear + Math.floor((x - 1) / 4);
		return `${y}/${((x - 1) % 4) + 1}季`;
	}
	private fmtMonth(x: number): string {
		const y = this.currentMinYear + Math.floor((x - 1) / 12);
		return `${y}/${((x - 1) % 12) + 1}月`;
	}
	private fmtWeek(x: number): string {
		let r = x,
			y = this.currentMinYear;
		while (r > weeksInYear(y)) {
			r -= weeksInYear(y);
			y++;
		}
		return `${y}/${r}周`;
	}
	private fmtDay(x: number): string {
		let r = x,
			y = this.currentMinYear;
		while (r > daysInYear(y)) {
			r -= daysInYear(y);
			y++;
		}
		const d = dayToDate(y, Math.max(1, r));
		return `${y}/${d.getMonth() + 1}/${d.getDate()}日`;
	}
	private fmtDynamicValue(v: number): string {
		if (v === 0) {
			const u = this.dynamicUnit;
			if (u === "day") return "本日";
			if (u === "week") return "本周";
			if (u === "month") return "本月";
			if (u === "quarter") return "本季";
			if (u === "year") return "本年";
		}
		const p = v < 0 ? "前" : "后";
		const abs = Math.abs(v);
		const u = this.dynamicUnit;
		if (u === "week") return `${p}${abs}周`;
		if (u === "month") return `${p}${abs}月`;
		if (u === "quarter") return `${p}${abs}季`;
		if (u === "year") return `${p}${abs}年`;
		return `${p}${abs}日`;
	}
	private fmtDynamicLabel(a: number, b: number): string {
		return a === b
			? this.fmtDynamicValue(a)
			: `${this.fmtDynamicValue(a)}~${this.fmtDynamicValue(b)}`;
	}

	private getTodayValue(lv: string): number {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const cy = today.getFullYear();
		let offset = 0;
		for (let y = this.currentMinYear; y < cy; y++) {
			switch (lv) {
				case "quarter":
					offset += 4;
					break;
				case "month":
					offset += 12;
					break;
				case "week":
					offset += weeksInYear(y);
					break;
				case "day":
					offset += daysInYear(y);
					break;
			}
		}
		switch (lv) {
			case "year":
				return cy;
			case "quarter":
				return Math.floor(today.getMonth() / 3) + 1 + offset;
			case "month":
				return today.getMonth() + 1 + offset;
			case "week":
				return DateUtils.getISOWeekNumber(today) + offset;
			case "day":
				return (
					Math.ceil(
						(today.getTime() - new Date(cy, 0, 0).getTime()) /
							86400000,
					) + offset
				);
		}
		return 0;
	}

	private rebuildDynamicSlider() {
		if (!this.dynamicSection?.parentNode) return;
		this.enhancedSliders.get("dynamic")?.destroy();
		this.enhancedSliders.delete("dynamic");
		this.updateMidLines.delete("dynamic");
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
		const minV = Math.min(dsVal, deVal),
			maxV = Math.max(dsVal, deVal);
		const result = createEnhancedSlider({
			container: this.dynamicSection,
			min: -dmx,
			max: dmx,
			start: minV,
			end: maxV,
			format: (v) => this.fmtDynamicValue(v),
			onChange: (s, e) => this.onDynamicChange(s, e),
			todayValue: 0,
			midValue: 0,
		});
		result.refs.row.style.paddingLeft = "calc(4em + 6px)";
		result.refs.labelSpan.textContent = this.fmtDynamicLabel(minV, maxV);
		this.enhancedSliders.set("dynamic", result.refs);
		this.updateMidLines.set("dynamic", result.updateMidLine);
	}

	private rebuildStaticSliders() {
		if (!this.staticSection) return;
		["year", "quarter", "month", "week", "day"].forEach((key) => {
			this.enhancedSliders.get(key)?.destroy();
			this.enhancedSliders.delete(key);
			this.updateMidLines.delete(key);
		});
		const { min: yearMin, max: yearMax } = this.yearRange();
		const isSingle =
			this.currentMinYear === this.currentMaxYear &&
			this.childSlidersDrivenByYear;
		let ranges: any;
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
		}
		const vals = getLevelValues(
			this.staticStart,
			this.staticEnd,
			this.currentMinYear,
		);
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
		result.refs.row.style.paddingLeft = "calc(4em + 6px)";
		this.enhancedSliders.set(key, result.refs);
		this.updateMidLines.set(key, result.updateMidLine);
	}

	private refreshDynamicUI() {
		const ref = this.enhancedSliders.get("dynamic");
		const updateMid = this.updateMidLines.get("dynamic");
		if (!ref || !updateMid) return;
		const mx = this.maxDyn(),
			mn = -mx;
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
				const ref = this.enhancedSliders.get(key),
					um = this.updateMidLines.get(key);
				if (!ref) return;
				ref.update(
					this.clamp(Math.min(s, e), mn, mx),
					this.clamp(Math.max(s, e), mn, mx),
				);
				if (um) um(midV);
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
			const ref = this.enhancedSliders.get(key),
				um = this.updateMidLines.get(key);
			if (!ref) return;
			ref.update(
				this.clamp(Math.min(s, e), mn, mx),
				this.clamp(Math.max(s, e), mn, mx),
			);
			if (um) um(midV);
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

	private async initRange() {
		try {
			if (!this.app) return;
			await this.dataManager.loadData(this.app);
			const r = this.dataManager.getTaskTimeRange();
			if (r.minTime) this.taskMinYear = new Date(r.minTime).getFullYear();
			if (r.maxTime) this.taskMaxYear = new Date(r.maxTime).getFullYear();
		} catch (e) {
			console.warn("[TimePanel] 初始化时间范围失败:", e);
		}
	}

	async render() {
		this.container.empty();
		this.enhancedSliders.forEach((s) => s.destroy());
		this.enhancedSliders.clear();
		this.updateMidLines.clear();
		this.unitBtns.clear();
		this.modeBtns.clear();
		this.useDynamicBtn = null;
		this.dynamicSection = null;
		this.staticSection = null;
		await this.initRange();
		const pre = this.store.getActivePreset();
		this.intervalMode = pre?.intervalMode ?? "any-date";
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
				this.dynamicStart = DateUtils.setStart(
					new Date(cf.dateRange.start),
				);
				this.dynamicEnd = DateUtils.setStart(
					new Date(cf.dateRange.end),
				);
			}
			this.currentMinYear = this.staticStart.getFullYear();
			this.currentMaxYear = this.staticEnd.getFullYear();
			this.childSlidersDrivenByYear = true;
		}

		const mr = this.container.createDiv({ cls: "panel-row" });
		mr.createSpan({ text: "时间筛选", cls: "panel-label" });

		const mainBtn = mr.createEl("button", {
			text: "时间模式",
			cls: "panel-btn",
		});
		if (this.intervalMode !== "none") mainBtn.addClass("active");

		mainBtn.onclick = () => {
			const newMode = this.intervalMode !== "none" ? "none" : "any-date";
			this.intervalMode = newMode;
			this.updateModeButtons();
			this.updatePreset({ intervalMode: this.intervalMode });
			if (newMode !== "none") {
				this.updatePreset({
					dateRange: true,
					intervalMode: this.intervalMode,
				});
			}
		};

		const subPanel = mr.createDiv({ cls: "panel-sub" });
		subPanel.style.cssText =
			"display:flex;flex-wrap:wrap;gap:4px;margin-left:8px;";

		const modes = [
			{ key: "any-date", label: "任意时间" },
			{ key: "scheduled-due", label: "计划时间" },
			{ key: "starts-done", label: "执行时间" },
		];
		modes.forEach(({ key, label }) => {
			const btn = subPanel.createEl("button", {
				text: label,
				cls: "panel-btn sub-btn",
			});
			if (this.intervalMode === key) btn.addClass("active");
			btn.onclick = () => this.onSelectMode(key);
			this.modeBtns.set(key, btn);
		});

		this.dynamicSection = this.container.createDiv({
			cls: "panel-section",
		});
		const uRow = this.dynamicSection.createDiv({ cls: "panel-row" });
		uRow.createSpan({ text: "动态时间", cls: "panel-label" });
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
			const b = uRow.createEl("button", { text: u, cls: "panel-btn" });
			if (this.dynamicUnit === k) b.addClass("active");
			this.unitBtns.set(k, b);
			b.onclick = () => this.onSwitchUnit(k);
		});
		this.useDynamicBtn = uRow.createEl("button", {
			text: "使用动态",
			cls: "panel-btn",
		});
		if (this.useDynamic) this.useDynamicBtn.addClass("active");
		this.useDynamicBtn.onclick = () => this.onToggleDynamic();
		this.rebuildDynamicSlider();

		this.staticSection = this.container.createDiv({ cls: "panel-section" });
		this.staticSection
			.createDiv({ cls: "panel-row" })
			.createSpan({ text: "静态时间", cls: "panel-label" });
		this.rebuildStaticSliders();
	}
}
