// src/ui/bars/time-bar.ts

import { getDefaultFilter } from "../../configs/configs";
import {
	calcDynamicOffset,
	datesFromLevel,
	dayToDate,
	daysInYear,
	getLevelValues,
	getTaskTimeRange,
	maxDynamicRange,
	staticSliderRanges,
	weeksInYear,
} from "../../process/bars/bars-process";
import { DateUtils } from "../../process/process";
import { getAllTasks } from "../../process/tasks/read-process";
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";

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

	private refs = new Map<
		string,
		{
			s: HTMLElement;
			e: HTMLElement;
			f: HTMLElement;
			l: HTMLElement;
			m: HTMLElement;
		}
	>();
	private unsub: (() => void) | null = null;
	private initialRender = true;
	private dateCheckInterval: number | null = null;
	private pendingDateCheck: number | null = null;
	private lastCheckedDate: string = "";

	private useDynamicBtn: HTMLElement | null = null;
	private modeBtn: HTMLElement | null = null;
	private unitBtns = new Map<string, HTMLElement>();

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		const today = new Date();
		this.dynamicStart = DateUtils.setStart(today);
		this.dynamicEnd = DateUtils.setStart(today);
		this.staticStart = DateUtils.setStart(today);
		this.staticEnd = DateUtils.setStart(today);
		this.lastCheckedDate = DateUtils.formatDate(today);
		this.unsub = store.subscribe(() => this.onStoreChange());
		this.render();

		// 每 60 秒检查日期是否变化
		this.dateCheckInterval = window.setInterval(() => {
			this.checkDateChange();
		}, 60000);

		// 监听 Obsidian 工作区事件（切换标签页/视图时触发）
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
		this.unsub?.();
		this.unsub = null;
	}

	// ========== 工作区事件 ==========
	private registerWorkspaceEvent() {
		const app = (window as any).app;
		if (!app) return;

		app.workspace.on("active-leaf-change", () => {
			this.checkDateChange();
		});

		app.workspace.on("layout-change", () => {
			this.checkDateChange();
		});
	}

	// ========== 日期变化检测（防抖） ==========
	private checkDateChange() {
		if (this.pendingDateCheck !== null) {
			cancelAnimationFrame(this.pendingDateCheck);
		}
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
			if (!this.useDynamic) {
				this.refreshDynamicUI();
			}
		}
	}

	// ========== Store 变化 ==========
	private onStoreChange() {
		const state = this.store.getState();
		const pre = this.store.getActivePreset();
		if (!pre) return;
		const newMode = (pre as any)?.intervalMode ?? "scheduled-due";
		const newUseDynamic = (pre as any)?.useDynamic ?? false;
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
	}

	private clamp(v: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, v));
	}
	private getStaticYearRange() {
		return {
			startYear: this.staticStart.getFullYear(),
			endYear: this.staticEnd.getFullYear(),
		};
	}

	private updateStore(changes: {
		draftFilter?: boolean;
		presets?: Partial<any>;
	}) {
		const state = this.store.getState();
		const pre = state.presets.find((p) => p.id === state.activePresetId);
		const update: any = {};
		if (changes.draftFilter) {
			const cf = state.draftFilter ?? pre?.filter ?? getDefaultFilter();
			update.draftFilter = {
				...cf,
				dateRange: {
					start: this.staticStart.getTime(),
					end: this.staticEnd.getTime(),
					isAll: false,
				},
			};
		}
		if (changes.presets && pre)
			update.presets = state.presets.map((x) =>
				x.id === pre.id ? { ...x, ...changes.presets } : x,
			);
		if (Object.keys(update).length > 0) this.store.update(update);
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
			this.staticStart = DateUtils.setStart(new Date(startDate));
			this.staticEnd = DateUtils.setEnd(new Date(endDate));
			this.refreshAllStaticSliders();
			setTimeout(() => this.updateStore({ draftFilter: true }), 0);
		}
	}

	private onStaticChange(lv: string, sv: number, ev: number) {
		const { startDate, endDate } = datesFromLevel(
			lv,
			Math.min(sv, ev),
			Math.max(sv, ev),
		);
		this.staticStart = DateUtils.setStart(
			startDate <= endDate ? startDate : endDate,
		);
		this.staticEnd = DateUtils.setEnd(
			startDate <= endDate ? endDate : startDate,
		);
		this.refreshAllStaticSliders();
		if (!this.useDynamic)
			setTimeout(() => this.updateStore({ draftFilter: true }), 0);
	}

	private onToggleDynamic() {
		this.useDynamic = !this.useDynamic;
		this.useDynamicBtn?.toggleClass("active", this.useDynamic);
		if (this.useDynamic) {
			this.staticStart = DateUtils.setStart(new Date(this.dynamicStart));
			this.staticEnd = DateUtils.setEnd(new Date(this.dynamicEnd));
			this.refreshAllStaticSliders();
			setTimeout(
				() =>
					this.updateStore({
						draftFilter: true,
						presets: { useDynamic: true },
					}),
				0,
			);
		} else this.updateStore({ presets: { useDynamic: false } });
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
		this.updateStore({ presets: { intervalMode: this.intervalMode } });
	}

	private onSwitchUnit(k: "day" | "week" | "month" | "quarter" | "year") {
		if (this.dynamicUnit === k) return;
		const nm = maxDynamicRange(k);
		const ds = calcDynamicOffset(this.dynamicStart, k),
			de = calcDynamicOffset(this.dynamicEnd, k);
		if (ds < -nm || ds > nm || de < -nm || de > nm) {
			const t = new Date();
			t.setHours(0, 0, 0, 0);
			this.dynamicStart = new Date(t);
			this.dynamicEnd = new Date(t);
			if (this.useDynamic) {
				this.staticStart = new Date(this.dynamicStart);
				this.staticEnd = new Date(this.dynamicEnd);
				this.refreshAllStaticSliders();
				setTimeout(() => this.updateStore({ draftFilter: true }), 0);
			}
		}
		this.dynamicUnit = k;
		this.unitBtns.forEach((btn, key) =>
			btn.toggleClass("active", key === k),
		);
		this.rebuildDynamicSlider();
		this.refreshDynamicUI();
	}

	private rebuildDynamicSlider() {
		const oldRef = this.refs.get("dynamic");
		if (oldRef) {
			const row = oldRef.l.parentElement;
			if (row) row.remove();
			this.refs.delete("dynamic");
		}
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
		this.slider(
			dSec,
			"dynamic",
			-dmx,
			dmx,
			Math.min(dsVal, deVal),
			Math.max(dsVal, deVal),
			(v) => {
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
			},
			(s, e) => this.onDynamicChange(s, e),
			0,
		);
	}

	private fmtYear(x: number): string {
		return `${x}`;
	}
	private fmtQuarter(x: number): string {
		const { startYear } = this.getStaticYearRange();
		let r = x,
			y = startYear;
		while (r > 4) {
			r -= 4;
			y++;
		}
		return `${y}/${r}`;
	}
	private fmtMonth(x: number): string {
		const { startYear } = this.getStaticYearRange();
		let r = x,
			y = startYear;
		while (r > 12) {
			r -= 12;
			y++;
		}
		return `${y}/${r}`;
	}
	private fmtWeek(x: number): string {
		const { startYear } = this.getStaticYearRange();
		let r = x,
			y = startYear;
		while (r > weeksInYear(y)) {
			r -= weeksInYear(y);
			y++;
		}
		return `${y}/${r}`;
	}
	private fmtDay(cy: number, x: number): string {
		const { startYear } = this.getStaticYearRange();
		let r = x,
			y = startYear;
		while (r > daysInYear(y)) {
			r -= daysInYear(y);
			y++;
		}
		const d = dayToDate(y, Math.max(1, r));
		return `${y}/${d.getMonth() + 1}/${d.getDate()}`;
	}

	private fmtDynamicLabel(a: number, b: number): string {
		const u = this.dynamicUnit;
		const f = (v: number): string => {
			if (v === 0) {
				if (u === "day") return "本日";
				if (u === "week") return "本周";
				if (u === "month") return "本月";
				if (u === "quarter") return "本季";
				if (u === "year") return "本年";
			}
			const p = v < 0 ? "前" : "后";
			const abs = Math.abs(v);
			if (u === "week") return `${p}${abs}周`;
			if (u === "month") return `${p}${abs}月`;
			if (u === "quarter") return `${p}${abs}季`;
			if (u === "year") return `${p}${abs}年`;
			return `${p}${abs}日`;
		};
		return a === b ? f(a) : `${f(a)}~${f(b)}`;
	}

	private getTodayValue(lv: string): number {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const cy = today.getFullYear();
		switch (lv) {
			case "year":
				return cy;
			case "quarter":
				return Math.floor(today.getMonth() / 3) + 1;
			case "month":
				return today.getMonth() + 1;
			case "week":
				return DateUtils.getISOWeekNumber(today);
			case "day":
				return Math.ceil(
					(today.getTime() - new Date(cy, 0, 0).getTime()) / 86400000,
				);
		}
		return 0;
	}

	// ========== 自定义滑动条 ==========
	private slider(
		ct: HTMLElement,
		lv: string,
		mn: number,
		mx: number,
		s: number,
		e: number,
		ff: (v: number) => string,
		onChange: (s: number, e: number) => void,
		todayVal?: number,
	) {
		const row = ct.createDiv({ cls: "filter-row" });
		row.style.width = "100%";
		row.style.alignItems = "center";
		row.style.flexWrap = "nowrap";
		const tc = row.createDiv();
		tc.style.cssText =
			"flex:0.5;position:relative;height:4px;margin:0 8px;cursor:pointer;background:var(--background-modifier-border);border-radius:2px;min-width:60px;";
		const initS = this.clamp(Math.min(s, e), mn, mx),
			initE = this.clamp(Math.max(s, e), mn, mx);
		const t = mx - mn || 1,
			step = Math.max(1, Math.ceil((mx - mn) / 20));
		for (let v = mn; v <= mx; v += step) {
			const isToday = todayVal !== undefined && v === todayVal;
			const mark = tc.createDiv();
			mark.style.cssText = `position:absolute;top:${isToday ? "-4px" : "-1px"};left:${((v - mn) / t) * 100}%;width:${isToday ? "2px" : "1px"};height:${isToday ? "12px" : "6px"};background:${isToday ? "var(--text-accent)" : "var(--text-muted)"};opacity:${isToday ? "1" : "0.4"};z-index:1;`;
		}
		if (
			todayVal !== undefined &&
			todayVal >= mn &&
			todayVal <= mx &&
			(todayVal - mn) % step !== 0
		) {
			const mark = tc.createDiv();
			mark.style.cssText = `position:absolute;top:-4px;left:${((todayVal - mn) / t) * 100}%;width:2px;height:12px;background:var(--text-accent);opacity:1;z-index:1;`;
		}

		const sp = ((initS - mn) / t) * 100,
			ep = ((initE - mn) / t) * 100;
		const fl = tc.createDiv();
		fl.style.cssText = `position:absolute;top:0;left:${sp}%;width:${Math.max(0, ep - sp)}%;height:100%;background:var(--interactive-accent);border-radius:2px;`;
		const mid = tc.createDiv();
		mid.style.cssText =
			"position:absolute;top:-2px;width:1px;height:calc(100% + 4px);background:var(--text-muted);opacity:0.5;z-index:1;";

		const mkStart = (pct: number, title: string) => {
			const el = tc.createDiv();
			el.style.cssText = `position:absolute;top:-6px;left:${pct}%;width:6px;height:16px;background:var(--interactive-accent);border-radius:3px 0 0 3px;cursor:grab;transform:translateX(-100%);z-index:2;`;
			el.title = title;
			return el;
		};
		const mkEnd = (pct: number, title: string) => {
			const el = tc.createDiv();
			el.style.cssText = `position:absolute;top:-6px;left:${pct}%;width:6px;height:16px;background:var(--interactive-accent);border-radius:0 3px 3px 0;cursor:grab;transform:translateX(0);z-index:2;`;
			el.title = title;
			return el;
		};

		const st = mkStart(sp, ff(initS)),
			et = mkEnd(ep, ff(initE));
		const rl = row.createSpan();
		rl.style.cssText =
			"font-size:var(--font-ui-smaller);width:160px;min-width:160px;max-width:160px;text-align:left;flex-shrink:0;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
		rl.textContent =
			initS === initE ? ff(initS) : `${ff(initS)}~${ff(initE)}`;
		this.refs.set(lv, { s: st, e: et, f: fl, l: rl, m: mid });

		let cs = initS,
			ce = initE,
			isDraggingHandle = false;
		const upUI = (ns: number, ne: number) => {
			const mnv = this.clamp(Math.min(ns, ne), mn, mx),
				mxv = this.clamp(Math.max(ns, ne), mn, mx);
			st.style.left = `${((mnv - mn) / t) * 100}%`;
			et.style.left = `${((mxv - mn) / t) * 100}%`;
			fl.style.left = `${((mnv - mn) / t) * 100}%`;
			fl.style.width = `${((mxv - mnv) / t) * 100}%`;
			rl.textContent = mnv === mxv ? ff(mnv) : `${ff(mnv)}~${ff(mxv)}`;
		};
		const dragHandle = (el: HTMLElement, isStart: boolean) => {
			el.onmousedown = (ev: MouseEvent) => {
				ev.preventDefault();
				ev.stopPropagation();
				isDraggingHandle = true;
				el.style.cursor = "grabbing";
				const mv = (e: MouseEvent) => {
					if (!isDraggingHandle) return;
					const rect = tc.getBoundingClientRect();
					const raw = Math.max(
						0,
						Math.min(1, (e.clientX - rect.left) / rect.width),
					);
					let v = Math.round(mn + raw * (mx - mn));
					v = this.clamp(v, mn, mx);
					if (isStart) cs = this.clamp(v, mn, ce);
					else ce = this.clamp(v, cs, mx);
					upUI(cs, ce);
				};
				const mu = (e: MouseEvent) => {
					if (!isDraggingHandle) return;
					isDraggingHandle = false;
					el.style.cursor = "grab";
					document.removeEventListener("mousemove", mv);
					document.removeEventListener("mouseup", mu);
					e.preventDefault();
					e.stopPropagation();
					onChange(cs, ce);
				};
				document.addEventListener("mousemove", mv);
				document.addEventListener("mouseup", mu);
			};
		};
		dragHandle(st, true);
		dragHandle(et, false);
		let isDraggingRange = false;
		tc.onmousedown = (ev: MouseEvent) => {
			const target = ev.target as HTMLElement;
			if (target === st || target === et) return;
			const rect = tc.getBoundingClientRect();
			const raw = Math.max(
				0,
				Math.min(1, (ev.clientX - rect.left) / rect.width),
			);
			const clickVal = Math.round(mn + raw * (mx - mn));
			if (clickVal >= cs && clickVal <= ce && cs !== ce) {
				ev.preventDefault();
				isDraggingRange = true;
				const startCs = cs,
					startCe = ce,
					startX = ev.clientX;
				const mv = (e: MouseEvent) => {
					if (!isDraggingRange) return;
					const dx = e.clientX - startX;
					const rawDx = Math.round((dx / tc.offsetWidth) * (mx - mn));
					let newCs = startCs + rawDx,
						newCe = startCe + rawDx;
					if (newCs < mn) {
						newCe = mn + (startCe - startCs);
						newCs = mn;
					}
					if (newCe > mx) {
						newCs = mx - (startCe - startCs);
						newCe = mx;
					}
					newCs = this.clamp(newCs, mn, mx);
					newCe = this.clamp(newCe, mn, mx);
					cs = newCs;
					ce = newCe;
					upUI(cs, ce);
				};
				const mu = () => {
					if (!isDraggingRange) return;
					isDraggingRange = false;
					document.removeEventListener("mousemove", mv);
					document.removeEventListener("mouseup", mu);
					onChange(cs, ce);
				};
				document.addEventListener("mousemove", mv);
				document.addEventListener("mouseup", mu);
			}
		};
		tc.onclick = (ev: MouseEvent) => {
			if (isDraggingHandle || isDraggingRange) return;
			if (ev.target === st || ev.target === et) return;
			const rect = tc.getBoundingClientRect();
			const raw = Math.max(
				0,
				Math.min(1, (ev.clientX - rect.left) / rect.width),
			);
			let v = Math.round(mn + raw * (mx - mn));
			v = this.clamp(v, mn, mx);
			if (v >= cs && v <= ce && cs !== ce) return;
			if (Math.abs(v - cs) <= Math.abs(v - ce))
				cs = this.clamp(v, mn, ce);
			else ce = this.clamp(v, cs, mx);
			upUI(cs, ce);
			onChange(cs, ce);
		};
	}

	// ========== UI 更新 ==========
	private setThumbPosition(
		r: { s: HTMLElement; e: HTMLElement; f: HTMLElement },
		s: number,
		e: number,
		mn: number,
		mx: number,
		t: number,
	) {
		const cs = this.clamp(Math.min(s, e), mn, mx),
			ce = this.clamp(Math.max(s, e), mn, mx);
		r.s.style.left = `${((cs - mn) / t) * 100}%`;
		r.e.style.left = `${((ce - mn) / t) * 100}%`;
		r.f.style.left = `${((cs - mn) / t) * 100}%`;
		r.f.style.width = `${((ce - cs) / t) * 100}%`;
	}

	private refreshDynamicUI() {
		const r = this.refs.get("dynamic");
		if (!r) return;
		const mx = this.maxDyn(),
			mn = -mx,
			t = mx - mn || 1;
		const ds = calcDynamicOffset(this.dynamicStart, this.dynamicUnit),
			de = calcDynamicOffset(this.dynamicEnd, this.dynamicUnit);
		this.setThumbPosition(r, ds, de, mn, mx, t);
		r.m.style.left = `${((0 - mn) / t) * 100}%`;
		const minV = this.clamp(Math.min(ds, de), mn, mx),
			maxV = this.clamp(Math.max(ds, de), mn, mx);
		r.l.textContent = this.fmtDynamicLabel(minV, maxV);
	}

	private refreshAllStaticSliders() {
		const ranges = staticSliderRanges(
			this.staticStart,
			this.staticEnd,
			this.taskMinYear,
			this.taskMaxYear,
		);
		const vals = getLevelValues(this.staticStart, this.staticEnd);
		const cy = new Date().getFullYear();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const up = (
			lv: string,
			s: number,
			e: number,
			mn: number,
			mx: number,
			ff: (v: number) => string,
			midV: number,
		) => {
			const r = this.refs.get(lv);
			if (!r) return;
			if (mn >= mx) return;
			const t = mx - mn || 1;
			this.setThumbPosition(r, s, e, mn, mx, t);
			r.m.style.left = `${((this.clamp(midV, mn, mx) - mn) / t) * 100}%`;
			const cs = this.clamp(Math.min(s, e), mn, mx),
				ce = this.clamp(Math.max(s, e), mn, mx);
			r.l.textContent = cs === ce ? ff(cs) : `${ff(cs)}~${ff(ce)}`;
		};
		const cur = (lv: string) => {
			if (lv === "year") return cy;
			if (lv === "quarter") return Math.floor(today.getMonth() / 3) + 1;
			if (lv === "month") return today.getMonth() + 1;
			if (lv === "week") return DateUtils.getISOWeekNumber(today);
			if (lv === "day")
				return Math.ceil(
					(today.getTime() - new Date(cy, 0, 0).getTime()) / 86400000,
				);
			return 0;
		};
		up(
			"year",
			Math.min(vals.yearStart, vals.yearEnd),
			Math.max(vals.yearStart, vals.yearEnd),
			ranges.yearMin,
			ranges.yearMax,
			(x) => `${x}年`,
			cur("year"),
		);
		up(
			"quarter",
			vals.quarterStart,
			vals.quarterEnd,
			ranges.quarterMin,
			ranges.quarterMax,
			(x) => `${this.fmtQuarter(x)}季`,
			cur("quarter"),
		);
		up(
			"month",
			vals.monthStart,
			vals.monthEnd,
			ranges.monthMin,
			ranges.monthMax,
			(x) => `${this.fmtMonth(x)}月`,
			cur("month"),
		);
		up(
			"week",
			vals.weekStart,
			vals.weekEnd,
			ranges.weekMin,
			ranges.weekMax,
			(x) => `${this.fmtWeek(x)}周`,
			cur("week"),
		);
		up(
			"day",
			vals.dayStart,
			vals.dayEnd,
			ranges.dayMin,
			ranges.dayMax,
			(x) => `${this.fmtDay(cy, x)}日`,
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
		this.refs.clear();
		this.unitBtns.clear();
		this.useDynamicBtn = null;
		this.modeBtn = null;
		this.initRange();
		const state = this.store.getState();
		const pre = this.store.getActivePreset();
		const cf: GlobalFilter =
			state.draftFilter ?? pre?.filter ?? getDefaultFilter();
		this.intervalMode = (pre as any)?.intervalMode ?? "scheduled-due";
		this.useDynamic = (pre as any)?.useDynamic ?? false;
		if (this.initialRender) {
			this.initialRender = false;
			if (!cf.dateRange.isAll && cf.dateRange.start && cf.dateRange.end) {
				this.staticStart = DateUtils.setStart(
					new Date(cf.dateRange.start),
				);
				this.staticEnd = DateUtils.setEnd(new Date(cf.dateRange.end));
			}
		}
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
		this.slider(
			dSec,
			"dynamic",
			-dmx,
			dmx,
			Math.min(dsVal, deVal),
			Math.max(dsVal, deVal),
			(v) => {
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
			},
			(s, e) => this.onDynamicChange(s, e),
			0,
		);
		const sSec = this.container.createDiv({ cls: "filter-section" });
		sSec.createDiv({ cls: "filter-row" }).createSpan({
			text: "静态",
			cls: "filter-label",
		});
		const ranges = staticSliderRanges(
			this.staticStart,
			this.staticEnd,
			this.taskMinYear,
			this.taskMaxYear,
		);
		const vals = getLevelValues(this.staticStart, this.staticEnd);
		const cy = new Date().getFullYear();
		this.slider(
			sSec,
			"year",
			ranges.yearMin,
			ranges.yearMax,
			this.clamp(
				Math.min(vals.yearStart, vals.yearEnd),
				ranges.yearMin,
				ranges.yearMax,
			),
			this.clamp(
				Math.max(vals.yearStart, vals.yearEnd),
				ranges.yearMin,
				ranges.yearMax,
			),
			(x) => `${x}年`,
			(s, e) => this.onStaticChange("year", s, e),
			this.getTodayValue("year"),
		);
		this.slider(
			sSec,
			"quarter",
			ranges.quarterMin,
			ranges.quarterMax,
			this.clamp(vals.quarterStart, ranges.quarterMin, ranges.quarterMax),
			this.clamp(vals.quarterEnd, ranges.quarterMin, ranges.quarterMax),
			(x) => `${this.fmtQuarter(x)}季`,
			(s, e) => this.onStaticChange("quarter", s, e),
			this.getTodayValue("quarter"),
		);
		this.slider(
			sSec,
			"month",
			ranges.monthMin,
			ranges.monthMax,
			this.clamp(vals.monthStart, ranges.monthMin, ranges.monthMax),
			this.clamp(vals.monthEnd, ranges.monthMin, ranges.monthMax),
			(x) => `${this.fmtMonth(x)}月`,
			(s, e) => this.onStaticChange("month", s, e),
			this.getTodayValue("month"),
		);
		this.slider(
			sSec,
			"week",
			ranges.weekMin,
			ranges.weekMax,
			this.clamp(vals.weekStart, ranges.weekMin, ranges.weekMax),
			this.clamp(vals.weekEnd, ranges.weekMin, ranges.weekMax),
			(x) => `${this.fmtWeek(x)}周`,
			(s, e) => this.onStaticChange("week", s, e),
			this.getTodayValue("week"),
		);
		this.slider(
			sSec,
			"day",
			ranges.dayMin,
			ranges.dayMax,
			this.clamp(vals.dayStart, ranges.dayMin, ranges.dayMax),
			this.clamp(vals.dayEnd, ranges.dayMin, ranges.dayMax),
			(x) => `${this.fmtDay(cy, x)}日`,
			(s, e) => this.onStaticChange("day", s, e),
			this.getTodayValue("day"),
		);
	}
}
