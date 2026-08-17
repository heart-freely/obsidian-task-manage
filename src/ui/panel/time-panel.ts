// src/ui/panel/time-panel.ts

import { DataManager } from "../../core/data/data-manager";
import {
	calcDynamicOffset,
	clamp,
	datesFromLevel,
	daysInYear,
	formatDayValue,
	formatDynamicValue,
	formatMonthValue,
	formatQuarterValue,
	formatWeekValue,
	formatYearValue,
	getLevelValues,
	getTodaySliderValue,
	maxDynamicRange,
	singleYearRanges,
	staticSliderRanges,
	weeksInYear,
	yearSliderRange,
} from "../../core/date/date-calc";
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
	private app: unknown;
	private dynamicStart = new Date();
	private dynamicEnd = new Date();
	private dynamicUnit: "day" | "week" | "month" | "quarter" | "year" = "day";
	private staticStart = new Date();
	private staticEnd = new Date();
	private useDynamic = false;
	private intervalMode = "any-date";
	private taskMinYear = 2021;
	private taskMaxYear = 2031;
	private currentMinYear = new Date().getFullYear();
	private currentMaxYear = new Date().getFullYear();
	private childSlidersDrivenByYear = true;
	private savedStaticStart: Date | null = null;
	private savedStaticEnd: Date | null = null;
	private savedCurrentMinYear = new Date().getFullYear();
	private savedCurrentMaxYear = new Date().getFullYear();
	private savedChildSlidersDrivenByYear = true;
	private enhancedSliders = new Map<string, EnhancedSliderRef>();
	private updateMidLines = new Map<string, (v: number) => void>();
	private initialRender = true;
	private dateCheckInterval: number | null = null;
	private pendingDateCheck: number | null = null;
	private lastCheckedDate = "";
	private useDynamicBtn: HTMLElement | null = null;
	private modeBtns = new Map<string, HTMLElement>();
	private unitBtns = new Map<string, HTMLElement>();
	private dynamicSection: HTMLElement | null = null;
	private staticSection: HTMLElement | null = null;

	private isRendering = false;
	private pendingRender = false;

	constructor(container: HTMLElement, store: Store, app?: unknown) {
		this.container = container;
		this.store = store;
		this.app = app;
		this.dataManager = DataManager.getInstance();
		const t = new Date();
		this.dynamicStart = DateUtils.setStart(t);
		this.dynamicEnd = DateUtils.setStart(t);
		this.staticStart = DateUtils.setStart(t);
		this.staticEnd = DateUtils.setStart(t);
		this.lastCheckedDate = DateUtils.formatDate(t);
		this.currentMinYear = t.getFullYear();
		this.currentMaxYear = t.getFullYear();
		void this.render();
		this.dateCheckInterval = window.setInterval(
			() => this.checkDateChange(),
			60000,
		);
		this.registerWorkspaceEvent();
	}

	destroy() {
		if (this.dateCheckInterval !== null) {
			window.clearInterval(this.dateCheckInterval);
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
			const t = new Date();
			const cy = t.getFullYear();
			this.staticStart = new Date(cy, 0, 1);
			this.staticEnd = new Date(cy, 11, 31);
			this.currentMinYear = cy;
			this.currentMaxYear = cy;
			this.childSlidersDrivenByYear = true;
			this.dynamicStart = DateUtils.setStart(t);
			this.dynamicEnd = DateUtils.setStart(t);
			this.dynamicUnit = "day";
		}
		this.updateModeButtons();
		this.syncUseDynamicButton();
		this.rebuildStaticSliders();
		this.rebuildDynamicSlider();
	}

	private registerWorkspaceEvent() {
		if (!this.app) return;
		const app = this.app as {
			workspace: { on: (e: string, cb: () => void) => void };
		};
		app.workspace.on("active-leaf-change", () => this.checkDateChange());
		app.workspace.on("layout-change", () => this.checkDateChange());
	}

	private checkDateChange() {
		if (this.pendingDateCheck !== null)
			cancelAnimationFrame(this.pendingDateCheck);
		this.pendingDateCheck = window.requestAnimationFrame(() => {
			this.pendingDateCheck = null;
			this.doCheckDateChange();
		});
	}

	private doCheckDateChange() {
		const t = new Date();
		const ds = DateUtils.formatDate(t);
		if (this.lastCheckedDate !== ds) {
			this.lastCheckedDate = ds;
			this.refreshAllStaticSliders();
			if (!this.useDynamic) this.refreshDynamicUI();
		}
	}

	private updatePreset(
		changes: Record<string, unknown> & { dateRange?: boolean },
	) {
		const state = this.store.getState();
		const pre = state.presets.find((p) => p.id === state.activePresetId);
		if (!pre) return;
		const updates: Record<string, unknown> = {};
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
			if (this.intervalMode !== "none")
				this.updatePreset({ dateRange: true });
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
		if (this.intervalMode !== "none")
			this.updatePreset({ dateRange: true });
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
				const t = new Date();
				const cy = t.getFullYear();
				this.staticStart = new Date(cy, 0, 1);
				this.staticEnd = new Date(cy, 11, 31);
				this.currentMinYear = cy;
				this.currentMaxYear = cy;
				this.childSlidersDrivenByYear = true;
			}
			this.rebuildStaticSliders();
		}
		this.syncUseDynamicButton();
		if (this.intervalMode !== "none")
			this.updatePreset({ dateRange: true, useDynamic: this.useDynamic });
		else this.updatePreset({ useDynamic: this.useDynamic });
	}

	private onSelectMode(mode: string) {
		if (this.intervalMode === mode) return;
		this.intervalMode = mode;
		this.updateModeButtons();
		this.updatePreset({ intervalMode: this.intervalMode });
	}

	private updateModeButtons() {
		const mb = this.container.querySelector(
			".task-panel-btn:not(.sub-btn)",
		) as HTMLElement;
		if (mb) {
			if (this.intervalMode !== "none") mb.addClass("active");
			else mb.removeClass("active");
		}
		this.modeBtns.forEach((btn, mode) => {
			if (mode === this.intervalMode) btn.addClass("active");
			else btn.removeClass("active");
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
				if (this.intervalMode !== "none")
					this.updatePreset({ dateRange: true });
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

	private rebuildDynamicSlider() {
		const dynSection = this.dynamicSection;
		if (!dynSection || !dynSection.parentNode) return;
		this.enhancedSliders.get("dynamic")?.destroy();
		this.enhancedSliders.delete("dynamic");
		this.updateMidLines.delete("dynamic");
		const dmx = maxDynamicRange(this.dynamicUnit);
		const ds = clamp(
			calcDynamicOffset(this.dynamicStart, this.dynamicUnit),
			-dmx,
			dmx,
		);
		const de = clamp(
			calcDynamicOffset(this.dynamicEnd, this.dynamicUnit),
			-dmx,
			dmx,
		);
		const minV = Math.min(ds, de);
		const maxV = Math.max(ds, de);
		const r = createEnhancedSlider({
			container: dynSection,
			min: -dmx,
			max: dmx,
			start: minV,
			end: maxV,
			format: (v: number) => formatDynamicValue(v, this.dynamicUnit),
			onChange: (s, e) => this.onDynamicChange(s, e),
			todayValue: 0,
			midValue: 0,
		});
		r.refs.row.addClass("task-pl-4");
		r.refs.labelSpan.textContent =
			minV === maxV
				? formatDynamicValue(minV, this.dynamicUnit)
				: `${formatDynamicValue(minV, this.dynamicUnit)}~${formatDynamicValue(maxV, this.dynamicUnit)}`;
		this.enhancedSliders.set("dynamic", r.refs);
		this.updateMidLines.set("dynamic", r.updateMidLine);
	}

	private rebuildStaticSliders() {
		if (!this.staticSection) return;
		["year", "quarter", "month", "week", "day"].forEach((key) => {
			this.enhancedSliders.get(key)?.destroy();
			this.enhancedSliders.delete(key);
			this.updateMidLines.delete(key);
		});
		const { min: ymn, max: ymx } = yearSliderRange();
		const isSingle =
			this.currentMinYear === this.currentMaxYear &&
			this.childSlidersDrivenByYear;
		let ranges:
			| ReturnType<typeof singleYearRanges>
			| ReturnType<typeof staticSliderRanges>;
		if (isSingle) ranges = singleYearRanges(this.currentMinYear, ymn, ymx);
		else {
			ranges = staticSliderRanges(
				this.staticStart,
				this.staticEnd,
				this.taskMinYear,
				this.taskMaxYear,
			);
			ranges.yearMin = ymn;
			ranges.yearMax = ymx;
			this.currentMinYear = ranges.minYear;
		}
		const vals = getLevelValues(
			this.staticStart,
			this.staticEnd,
			this.currentMinYear,
		);
		const cur = (lv: string) =>
			getTodaySliderValue(
				lv,
				this.currentMinYear,
				(d: Date) => DateUtils.getISOWeekNumber(d),
				weeksInYear,
				daysInYear,
			);
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
		const fmtFns: Record<string, (x: number) => string> = {
			year: formatYearValue,
			quarter: (x: number) => formatQuarterValue(x, this.currentMinYear),
			month: (x: number) => formatMonthValue(x, this.currentMinYear),
			week: (x: number) => formatWeekValue(x, this.currentMinYear),
			day: (x: number) => formatDayValue(x, this.currentMinYear),
		};

		["year", "quarter", "month", "week", "day"].forEach((key) => {
			const min = Number(ranges[(key + "Min") as keyof typeof ranges]);
			const max = Number(ranges[(key + "Max") as keyof typeof ranges]);
			const s = sv(key);
			const e = ev(key);
			const f = fmtFns[key];
			const t = cur(key);

			const r = createEnhancedSlider({
				container: this.staticSection!,
				min,
				max,
				start: clamp(Math.min(s, e), min, max),
				end: clamp(Math.max(s, e), min, max),
				format: f,
				onChange: (sv2, ev2) => this.onStaticChange(key, sv2, ev2),
				todayValue: t,
				midValue: t,
			});
			r.refs.row.addClass("task-pl-4");
			this.enhancedSliders.set(key, r.refs);
			this.updateMidLines.set(key, r.updateMidLine);
		});
	}

	private refreshDynamicUI() {
		const ref = this.enhancedSliders.get("dynamic");
		const um = this.updateMidLines.get("dynamic");
		if (!ref || !um) return;
		const mx = maxDynamicRange(this.dynamicUnit);
		const mn = -mx;
		const ds = clamp(
			calcDynamicOffset(this.dynamicStart, this.dynamicUnit),
			mn,
			mx,
		);
		const de = clamp(
			calcDynamicOffset(this.dynamicEnd, this.dynamicUnit),
			mn,
			mx,
		);
		const minV = Math.min(ds, de);
		const maxV = Math.max(ds, de);
		ref.update(minV, maxV);
		ref.labelSpan.textContent =
			minV === maxV
				? formatDynamicValue(minV, this.dynamicUnit)
				: `${formatDynamicValue(minV, this.dynamicUnit)}~${formatDynamicValue(maxV, this.dynamicUnit)}`;
		um(0);
	}

	private refreshAllStaticSliders() {
		const { min: ymn, max: ymx } = yearSliderRange();
		const cur = (lv: string) =>
			getTodaySliderValue(
				lv,
				this.currentMinYear,
				(d: Date) => DateUtils.getISOWeekNumber(d),
				weeksInYear,
				daysInYear,
			);
		const up = (
			key: string,
			s: number,
			e: number,
			mn: number,
			mx: number,
			midV: number,
		) => {
			const ref = this.enhancedSliders.get(key);
			const um = this.updateMidLines.get(key);
			if (!ref) return;
			ref.update(
				clamp(Math.min(s, e), mn, mx),
				clamp(Math.max(s, e), mn, mx),
			);
			if (um) um(midV);
		};
		if (
			this.childSlidersDrivenByYear &&
			this.currentMinYear === this.currentMaxYear
		) {
			const y = this.currentMinYear;
			up("year", y, y, ymn, ymx, cur("year"));
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
		this.currentMinYear = ranges.minYear;
		const vals = getLevelValues(
			this.staticStart,
			this.staticEnd,
			this.currentMinYear,
		);
		up(
			"year",
			Math.min(vals.yearStart, vals.yearEnd),
			Math.max(vals.yearStart, vals.yearEnd),
			ymn,
			ymx,
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

	private async initRange(): Promise<void> {
		try {
			if (!this.app) return;
			await this.dataManager.loadData(
				this.app as Parameters<typeof this.dataManager.loadData>[0],
			);
			const r = this.dataManager.getTaskTimeRange();
			if (r.minTime) this.taskMinYear = new Date(r.minTime).getFullYear();
			if (r.maxTime) this.taskMaxYear = new Date(r.maxTime).getFullYear();
		} catch (e: unknown) {
			console.warn("[TimePanel] 初始化时间范围失败:", e);
		}
	}

	async render() {
		if (this.isRendering) {
			this.pendingRender = true;
			return;
		}
		this.isRendering = true;

		try {
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
					this.staticEnd = DateUtils.setEnd(
						new Date(cf.dateRange.end),
					);
					if (this.useDynamic) {
						this.dynamicStart = DateUtils.setStart(
							new Date(cf.dateRange.start),
						);
						this.dynamicEnd = DateUtils.setStart(
							new Date(cf.dateRange.end),
						);
					}
				}
				this.currentMinYear = this.staticStart.getFullYear();
				this.currentMaxYear = this.staticEnd.getFullYear();
				this.childSlidersDrivenByYear = true;
			}
			const mr = this.container.createDiv({ cls: "task-panel-row" });
			mr.createSpan({ text: "时间筛选", cls: "task-panel-label" });
			const mainBtn = mr.createEl("button", {
				text: "时间模式",
				cls: "task-panel-btn",
			});
			if (this.intervalMode !== "none") mainBtn.addClass("active");
			mainBtn.addEventListener("click", () => {
				const nm = this.intervalMode !== "none" ? "none" : "any-date";
				this.intervalMode = nm;
				this.updateModeButtons();
				this.updatePreset({ intervalMode: this.intervalMode });
				if (nm !== "none")
					this.updatePreset({
						dateRange: true,
						intervalMode: this.intervalMode,
					});
			});
			const sp = mr.createDiv({ cls: "task-panel-sub" });
			sp.addClass(
				"task-flex",
				"task-flex-wrap",
				"task-gap-1",
				"task-ml-2",
			);
			const modes = [
				{ key: "any-date", label: "任意时间" },
				{ key: "scheduled-due", label: "计划时间" },
				{ key: "starts-done", label: "执行时间" },
			];
			modes.forEach(({ key, label }) => {
				const btn = sp.createEl("button", {
					text: label,
					cls: "task-panel-btn sub-btn",
				});
				if (this.intervalMode === key) btn.addClass("active");
				btn.addEventListener("click", () => this.onSelectMode(key));
				this.modeBtns.set(key, btn);
			});
			this.dynamicSection = this.container.createDiv({
				cls: "task-panel-section",
			});
			const uRow = this.dynamicSection.createDiv({ cls: "task-panel-row" });
			uRow.createSpan({ text: "动态时间", cls: "task-panel-label" });
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
				const b = uRow.createEl("button", {
					text: u,
					cls: "task-panel-btn",
				});
				if (this.dynamicUnit === k) b.addClass("active");
				this.unitBtns.set(k, b);
				b.addEventListener("click", () => this.onSwitchUnit(k));
			});
			this.useDynamicBtn = uRow.createEl("button", {
				text: "使用动态",
				cls: "task-panel-btn",
			});
			if (this.useDynamic) this.useDynamicBtn.addClass("active");
			this.useDynamicBtn.addEventListener("click", () =>
				this.onToggleDynamic(),
			);
			this.rebuildDynamicSlider();
			this.staticSection = this.container.createDiv({
				cls: "task-panel-section",
			});
			this.staticSection
				.createDiv({ cls: "task-panel-row" })
				.createSpan({ text: "静态时间", cls: "task-panel-label" });
			this.rebuildStaticSliders();
		} finally {
			this.isRendering = false;

			if (this.pendingRender) {
				this.pendingRender = false;
				void this.render();
			}
		}
	}
}
