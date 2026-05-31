// src/ui/bars/time-bar.ts
import { getDefaultFilter } from "../../configs/configs";
import { Store } from "../../store/store";
import { DateUtils } from "../../tasks/process/common-process";
import {
	calcDynamicOffset,
	datesFromLevel,
	dayToDate,
	getLevelValues,
	getTaskTimeRange,
	maxDynamicRange,
	staticSliderRanges,
} from "../../tasks/process/filter-task-process";
import { getAllTasks } from "../../tasks/read/read-tasks";
import { GlobalFilter } from "../../types";

export class TimeBar {
	private container: HTMLElement;
	private store: Store;
	private startDate = new Date();
	private endDate = new Date();
	private dynamicUnit = "day";
	private useDynamic: boolean = false;
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

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.startDate.setHours(0, 0, 0, 0);
		this.endDate.setHours(23, 59, 59, 999);
		store.subscribe(() => this.render());
		this.render();
	}

	private vals() {
		return getLevelValues(this.startDate, this.endDate);
	}
	private ranges() {
		return staticSliderRanges(
			this.startDate,
			this.endDate,
			this.taskMinYear,
			this.taskMaxYear,
		);
	}
	private dynOffset(d: Date) {
		return calcDynamicOffset(d, this.dynamicUnit);
	}
	private maxDyn() {
		return maxDynamicRange(this.dynamicUnit);
	}

	private setDates(lv: string, sv: number, ev: number) {
		const { startDate, endDate } = datesFromLevel(
			lv,
			sv,
			ev,
			this.dynamicUnit,
		);

		if (lv === "dynamic") {
			this.startDate = startDate;
			this.endDate = endDate;
			if (this.useDynamic) {
				this.updateAllUI();
			} else {
				this.updateDynamicUIOnly();
			}
		} else {
			this.startDate = startDate;
			this.endDate = endDate;
			this.updateStaticUIOnly();
			const state = this.store.getState();
			const pre = state.presets.find(
				(p) => p.id === state.activePresetId,
			);
			const cf: GlobalFilter =
				state.draftFilter ?? pre?.filter ?? getDefaultFilter();
			this.apply(cf);
		}
	}

	private initRange() {
		try {
			const dv = (window as any).app?.plugins?.plugins?.dataview?.api;
			if (!dv) return;
			const tasks = getAllTasks(false, dv, {
				cachedAllTasks: null as any,
			});
			const r = getTaskTimeRange(tasks);
			if (r.minTime && r.maxTime) {
				this.taskMinYear = new Date(r.minTime).getFullYear();
				this.taskMaxYear = new Date(r.maxTime).getFullYear();
			}
		} catch (e) {
			/* ignore */
		}
	}

	private sync(f: GlobalFilter) {
		if (!f.dateRange.start || !f.dateRange.end || f.dateRange.isAll) return;
		this.startDate = new Date(f.dateRange.start);
		this.endDate = new Date(f.dateRange.end);
	}
	private apply(f: GlobalFilter) {
		this.store.update({
			draftFilter: {
				...f,
				dateRange: {
					start: this.startDate.getTime(),
					end: this.endDate.getTime(),
					isAll: false,
				},
			},
		});
	}

	private updateDynamicUIOnly() {
		const dr = this.refs.get("dynamic");
		if (!dr) return;
		const mx = this.maxDyn(),
			mn = -mx,
			t = mx - mn || 1;
		const ds = this.dynOffset(this.startDate),
			de = this.dynOffset(this.endDate);
		dr.s.style.left = `${((Math.min(ds, de) - mn) / t) * 100}%`;
		dr.e.style.left = `${((Math.max(ds, de) - mn) / t) * 100}%`;
		dr.f.style.left = `${((Math.min(ds, de) - mn) / t) * 100}%`;
		dr.f.style.width = `${((Math.max(ds, de) - Math.min(ds, de)) / t) * 100}%`;
		dr.m.style.left = `${((0 - mn) / t) * 100}%`;
		const fmt = (o: number) => {
			if (o === 0) {
				const u = this.dynamicUnit;
				if (u === "day") return "本日";
				if (u === "week") return "本周";
				if (u === "month") return "本月";
				if (u === "quarter") return "本季";
				if (u === "year") return "本年";
				return "今天";
			}
			const p = o < 0 ? "前" : "后",
				a = Math.abs(o),
				u = this.dynamicUnit;
			if (u === "week") return `${p}${a}周`;
			if (u === "month") return `${p}${a}月`;
			if (u === "quarter") return `${p}${a}季`;
			if (u === "year") return `${p}${a}年`;
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const target = new Date(today);
			target.setDate(target.getDate() + o);
			return `${target.getMonth() + 1}/${target.getDate()}`;
		};
		dr.l.textContent =
			Math.min(ds, de) === Math.max(ds, de)
				? fmt(Math.min(ds, de))
				: `${fmt(Math.min(ds, de))} — ${fmt(Math.max(ds, de))}`;
	}

	private updateStaticUIOnly() {
		const cy = new Date().getFullYear(),
			today = new Date();
		today.setHours(0, 0, 0, 0);
		const ranges = this.ranges(),
			v = this.vals();

		const up = (
			lv: string,
			s: number,
			e: number,
			mn: number,
			mx: number,
			ff: (v: number) => string,
			mid: number,
		) => {
			const r = this.refs.get(lv);
			if (!r) return;
			const t = mx - mn || 1;
			r.s.style.left = `${((s - mn) / t) * 100}%`;
			r.e.style.left = `${((e - mn) / t) * 100}%`;
			r.f.style.left = `${((s - mn) / t) * 100}%`;
			r.f.style.width = `${((e - s) / t) * 100}%`;
			r.m.style.left = `${((mid - mn) / t) * 100}%`;
			r.l.textContent = s === e ? ff(s) : `${ff(s)} — ${ff(e)}`;
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
			Math.min(v.yearStart, v.yearEnd),
			Math.max(v.yearStart, v.yearEnd),
			ranges.yearMin,
			ranges.yearMax,
			(x) => `${x}年`,
			cur("year"),
		);
		up(
			"quarter",
			v.quarterStart,
			v.quarterEnd,
			ranges.quarterMin,
			ranges.quarterMax,
			(x) => `${x > 4 ? x - 4 : x}季`,
			cur("quarter"),
		);
		up(
			"month",
			v.monthStart,
			v.monthEnd,
			ranges.monthMin,
			ranges.monthMax,
			(x) => `${x > 12 ? x - 12 : x}月`,
			cur("month"),
		);
		up(
			"week",
			v.weekStart,
			v.weekEnd,
			ranges.weekMin,
			ranges.weekMax,
			(x) => `${x > 52 ? x - 53 : x}周`,
			cur("week"),
		);
		up(
			"day",
			v.dayStart,
			v.dayEnd,
			ranges.dayMin,
			ranges.dayMax,
			(x) => {
				const real = x > 365 ? x - 366 : x;
				const d = dayToDate(cy, real);
				return `${d.getMonth() + 1}/${d.getDate()}`;
			},
			cur("day"),
		);
	}

	private updateAllUI() {
		this.updateStaticUIOnly();
		const dr = this.refs.get("dynamic");
		if (!dr) return;
		const mx = this.maxDyn(),
			mn = -mx,
			t = mx - mn || 1;
		const ds = this.dynOffset(this.startDate),
			de = this.dynOffset(this.endDate);
		dr.s.style.left = `${((Math.min(ds, de) - mn) / t) * 100}%`;
		dr.e.style.left = `${((Math.max(ds, de) - mn) / t) * 100}%`;
		dr.f.style.left = `${((Math.min(ds, de) - mn) / t) * 100}%`;
		dr.f.style.width = `${((Math.max(ds, de) - Math.min(ds, de)) / t) * 100}%`;
		dr.m.style.left = `${((0 - mn) / t) * 100}%`;
		const fmt = (o: number) => {
			if (o === 0) {
				const u = this.dynamicUnit;
				if (u === "day") return "本日";
				if (u === "week") return "本周";
				if (u === "month") return "本月";
				if (u === "quarter") return "本季";
				if (u === "year") return "本年";
				return "今天";
			}
			const p = o < 0 ? "前" : "后",
				a = Math.abs(o),
				u = this.dynamicUnit;
			if (u === "week") return `${p}${a}周`;
			if (u === "month") return `${p}${a}月`;
			if (u === "quarter") return `${p}${a}季`;
			if (u === "year") return `${p}${a}年`;
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const target = new Date(today);
			target.setDate(target.getDate() + o);
			return `${target.getMonth() + 1}/${target.getDate()}`;
		};
		dr.l.textContent =
			Math.min(ds, de) === Math.max(ds, de)
				? fmt(Math.min(ds, de))
				: `${fmt(Math.min(ds, de))} — ${fmt(Math.max(ds, de))}`;
	}

	private slider(
		ct: HTMLElement,
		lv: string,
		mn: number,
		mx: number,
		s: number,
		e: number,
		ff: (v: number) => string,
		onChange: (s: number, e: number) => void,
		extra?: { label?: string; active?: boolean; onActivate?: () => void },
	) {
		const row = ct.createDiv({ cls: "filter-row" });
		row.style.width = "100%";
		if (extra?.label) {
			const btn = row.createEl("button", {
				text: extra.label,
				cls: "filter-btn",
			});
			if (extra.active) btn.addClass("active");
			btn.style.cssText = "min-width:32px;flex-shrink:0;";
			btn.onclick = extra.onActivate || (() => {});
		}
		const tc = row.createDiv();
		tc.style.cssText =
			"flex:0.5;position:relative;height:4px;margin:0 8px;cursor:pointer;background:var(--background-modifier-border);border-radius:2px;";

		const t = mx - mn || 1;
		const totalSteps = mx - mn;
		const maxMarks = Math.min(totalSteps, 20);
		const stepInterval = Math.ceil(totalSteps / maxMarks);

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayVal = (() => {
			if (lv === "dynamic") return 0;
			const cy = today.getFullYear();
			if (lv === "year") return cy;
			if (lv === "quarter") return Math.floor(today.getMonth() / 3) + 1;
			if (lv === "month") return today.getMonth() + 1;
			if (lv === "week") return DateUtils.getISOWeekNumber(today);
			if (lv === "day")
				return Math.ceil(
					(today.getTime() - new Date(cy, 0, 0).getTime()) / 86400000,
				);
			return 0;
		})();

		for (let v = mn; v <= mx; v += stepInterval) {
			const mark = tc.createDiv();
			const pct = ((v - mn) / t) * 100;
			const isToday = v === todayVal || (lv === "dynamic" && v === 0);
			mark.style.cssText = `position:absolute;top:${isToday ? "-4px" : "-1px"};left:${pct}%;width:${isToday ? "2px" : "1px"};height:${isToday ? "12px" : "6px"};background:${isToday ? "var(--text-accent)" : "var(--text-muted)"};opacity:${isToday ? "1" : "0.4"};z-index:1;`;
		}

		const sp = ((s - mn) / t) * 100,
			ep = ((e - mn) / t) * 100;
		const fl = tc.createDiv();
		fl.style.cssText = `position:absolute;top:0;left:${sp}%;width:${Math.max(0, ep - sp)}%;height:100%;background:var(--interactive-accent);border-radius:2px;`;
		const mid = tc.createDiv();
		mid.style.cssText = `position:absolute;top:-2px;width:1px;height:calc(100% + 4px);background:var(--text-muted);opacity:0.5;z-index:1;`;
		const mk = (pct: number, title: string) => {
			const el = tc.createDiv();
			el.style.cssText = `position:absolute;top:-6px;left:${pct}%;width:12px;height:16px;background:var(--interactive-accent);border-radius:3px;cursor:grab;transform:translateX(-50%);z-index:2;`;
			el.title = title;
			return el;
		};
		const st = mk(sp, ff(s)),
			et = mk(ep, ff(e));
		const rl = row.createSpan();
		rl.style.cssText =
			"font-size:var(--font-ui-smaller);min-width:90px;text-align:left;flex-shrink:0;color:var(--text-muted);";
		rl.textContent = s === e ? ff(s) : `${ff(s)} — ${ff(e)}`;
		this.refs.set(lv, { s: st, e: et, f: fl, l: rl, m: mid });

		let cs = s,
			ce = e;
		const upUI = (ns: number, ne: number) => {
			const minVal = Math.min(ns, ne),
				maxVal = Math.max(ns, ne);
			st.style.left = `${((minVal - mn) / t) * 100}%`;
			et.style.left = `${((maxVal - mn) / t) * 100}%`;
			fl.style.left = `${((minVal - mn) / t) * 100}%`;
			fl.style.width = `${((maxVal - minVal) / t) * 100}%`;
			rl.textContent =
				minVal === maxVal
					? ff(minVal)
					: `${ff(minVal)} — ${ff(maxVal)}`;
		};
		const drag = (el: HTMLElement, isS: boolean) => {
			let on = false;
			el.onmousedown = (ev) => {
				ev.preventDefault();
				on = true;
				el.style.cursor = "grabbing";
				const mv = (e: MouseEvent) => {
					if (!on) return;
					const rawPct = Math.max(
						0,
						Math.min(
							1,
							(e.clientX - tc.getBoundingClientRect().left) /
								tc.offsetWidth,
						),
					);
					let v = Math.round(mn + rawPct * (mx - mn));
					v = Math.max(mn, Math.min(mx, v));
					if (isS) {
						cs = Math.max(mn, Math.min(v, ce));
						ce = Math.max(cs, Math.min(mx, ce));
					} else {
						ce = Math.min(mx, Math.max(v, cs));
						cs = Math.max(mn, Math.min(ce, cs));
					}
					upUI(cs, ce);
				};
				const mu = () => {
					on = false;
					el.style.cursor = "grab";
					document.removeEventListener("mousemove", mv);
					document.removeEventListener("mouseup", mu);
					onChange(cs, ce);
				};
				document.addEventListener("mousemove", mv);
				document.addEventListener("mouseup", mu);
			};
		};
		drag(st, true);
		drag(et, false);
		tc.onclick = (ev) => {
			if (
				ev.target !== tc &&
				!(ev.target as HTMLElement).style.background?.includes(
					"modifier-border",
				)
			)
				return;
			const rawPct = Math.max(
				0,
				Math.min(
					1,
					(ev.clientX - tc.getBoundingClientRect().left) /
						tc.offsetWidth,
				),
			);
			let v = Math.round(mn + rawPct * (mx - mn));
			v = Math.max(mn, Math.min(mx, v));
			if (Math.abs(v - cs) <= Math.abs(v - ce)) {
				cs = Math.max(mn, Math.min(v, ce));
				ce = Math.max(cs, Math.min(mx, ce));
			} else {
				ce = Math.min(mx, Math.max(v, cs));
				cs = Math.max(mn, Math.min(ce, cs));
			}
			upUI(cs, ce);
			onChange(cs, ce);
		};
	}

	render() {
		this.container.empty();
		this.refs.clear();
		this.initRange();
		const state = this.store.getState();
		const pre = this.store.getActivePreset();
		const cf: GlobalFilter =
			state.draftFilter ?? pre?.filter ?? getDefaultFilter();
		const im = (pre as any)?.intervalMode ?? "scheduled-due";
		this.useDynamic = (pre as any)?.useDynamic ?? false;
		this.sync(cf);

		const mr = this.container.createDiv({ cls: "filter-row" });
		mr.createSpan({ text: "模式", cls: "filter-label" });
		const mb = mr.createEl("button", {
			text: im === "scheduled-due" ? "计划~截止" : "开始~完成",
			cls: "filter-btn",
		});
		mb.onclick = () => {
			if (!pre) return;
			this.store.update({
				presets: state.presets.map((p) =>
					p.id === pre.id
						? {
								...p,
								intervalMode:
									im === "scheduled-due"
										? "starts-done"
										: "scheduled-due",
							}
						: p,
				),
			});
		};
		const useDynamicBtn = mr.createEl("button", {
			text: "使用动态",
			cls: "filter-btn",
		});
		if (this.useDynamic) useDynamicBtn.addClass("active");
		useDynamicBtn.onclick = () => {
			this.useDynamic = !this.useDynamic;
			const st = this.store.getState();
			const pr = st.presets.find((p) => p.id === st.activePresetId);
			if (pr) {
				this.store.update({
					presets: st.presets.map((p) =>
						p.id === pr.id
							? { ...p, useDynamic: this.useDynamic }
							: p,
					),
				});
			}
			if (this.useDynamic) this.updateAllUI();
			this.render();
		};

		const ds = this.container.createDiv({ cls: "filter-section" });
		const ur = ds.createDiv({ cls: "filter-row" });
		ur.createSpan({ text: "动态", cls: "filter-label" });
		["年", "季", "月", "周", "日"].forEach((u) => {
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
			const b = ur.createEl("button", { text: u, cls: "filter-btn" });
			if (this.dynamicUnit === k) b.addClass("active");
			b.onclick = () => {
				this.dynamicUnit = k;
				this.render();
			};
		});
		const mx = this.maxDyn();
		this.slider(
			ds,
			"dynamic",
			-mx,
			mx,
			this.dynOffset(this.startDate),
			this.dynOffset(this.endDate),
			(v) => {
				if (v === 0) {
					const u = this.dynamicUnit;
					if (u === "day") return "本日";
					if (u === "week") return "本周";
					if (u === "month") return "本月";
					if (u === "quarter") return "本季";
					if (u === "year") return "本年";
					return "今天";
				}
				const p = v < 0 ? "前" : "后",
					a = Math.abs(v),
					u = this.dynamicUnit;
				if (u === "week") return `${p}${a}周`;
				if (u === "month") return `${p}${a}月`;
				if (u === "quarter") return `${p}${a}季`;
				if (u === "year") return `${p}${a}年`;
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const target = new Date(today);
				target.setDate(target.getDate() + v);
				return `${target.getMonth() + 1}/${target.getDate()}`;
			},
			(s, e) => this.setDates("dynamic", s, e),
			{},
		);

		const ss = this.container.createDiv({ cls: "filter-section" });
		const sr = ss.createDiv({ cls: "filter-row" });
		sr.createSpan({ text: "静态", cls: "filter-label" });
		const ranges = this.ranges(),
			v = this.vals(),
			cy = new Date().getFullYear();
		const levels: [
			string,
			number,
			number,
			number,
			number,
			(x: number) => string,
		][] = [
			[
				"year",
				ranges.yearMin,
				ranges.yearMax,
				Math.min(v.yearStart, v.yearEnd),
				Math.max(v.yearStart, v.yearEnd),
				(x) => `${x}年`,
			],
			[
				"quarter",
				ranges.quarterMin,
				ranges.quarterMax,
				v.quarterStart,
				v.quarterEnd,
				(x) => `${x > 4 ? x - 4 : x}季`,
			],
			[
				"month",
				ranges.monthMin,
				ranges.monthMax,
				v.monthStart,
				v.monthEnd,
				(x) => `${x > 12 ? x - 12 : x}月`,
			],
			[
				"week",
				ranges.weekMin,
				ranges.weekMax,
				v.weekStart,
				v.weekEnd,
				(x) => `${x > 52 ? x - 53 : x}周`,
			],
			[
				"day",
				ranges.dayMin,
				ranges.dayMax,
				v.dayStart,
				v.dayEnd,
				(x) => {
					const real = x > 365 ? x - 366 : x;
					const d = dayToDate(cy, real);
					return `${d.getMonth() + 1}/${d.getDate()}`;
				},
			],
		];
		levels.forEach(([lv, mn, mx, s, e, ff]) => {
			this.slider(
				ss,
				lv,
				mn,
				mx,
				s,
				e,
				ff,
				(s, e) => this.setDates(lv, s, e),
				{},
			);
		});
	}
}
