// src/ui/bars/time-bar.ts
import { YEAR_LIST, getDefaultFilter } from "../../configs/configs";
import { Store } from "../../store/store";
import { DateUtils } from "../../tasks/process/common-process";
import { GlobalFilter } from "../../types";

export class TimeBar {
	private container: HTMLElement;
	private store: Store;

	constructor(container: HTMLElement, store: Store) {
		this.container = container;
		this.store = store;
		this.store.subscribe(() => this.render());
		this.render();
	}

	// 判断是否为动态日期选中状态
	private isDynamicSelected(filter: GlobalFilter, label: string): boolean {
		const dr = filter.dateRange;
		if (!dr.start || !dr.end || dr.isAll) return false;

		const today = new Date();
		const ranges: Record<string, { start: Date; end: Date }> = {
			昨天: (() => {
				const d = new Date();
				d.setDate(d.getDate() - 1);
				return DateUtils.getDayRange(d);
			})(),
			今天: DateUtils.getDayRange(today),
			明天: (() => {
				const d = new Date();
				d.setDate(d.getDate() + 1);
				return DateUtils.getDayRange(d);
			})(),
			上周: (() => {
				const d = new Date();
				d.setDate(d.getDate() - 7);
				return DateUtils.getWeekRange(d);
			})(),
			本周: DateUtils.getWeekRange(today),
			下周: (() => {
				const d = new Date();
				d.setDate(d.getDate() + 7);
				return DateUtils.getWeekRange(d);
			})(),
			上月: (() => {
				const d = new Date();
				d.setMonth(d.getMonth() - 1);
				return DateUtils.getMonthRange(d);
			})(),
			本月: DateUtils.getMonthRange(today),
			下月: (() => {
				const d = new Date();
				d.setMonth(d.getMonth() + 1);
				return DateUtils.getMonthRange(d);
			})(),
		};

		const range = ranges[label];
		if (!range) return false;
		return (
			dr.start === range.start.getTime() && dr.end === range.end.getTime()
		);
	}

	render() {
		this.container.empty();
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const currentFilter: GlobalFilter =
			state.draftFilter ?? preset?.filter ?? getDefaultFilter();
		const intervalMode = (preset as any)?.intervalMode ?? "scheduled-due";

		const isDynamicActive = !currentFilter.dateRange.isAll;

		// ========== 动态日期分组 ==========
		const quickGroups = [
			{
				label: "过去",
				items: [
					{
						label: "昨天",
						range: () => {
							const d = new Date();
							d.setDate(d.getDate() - 1);
							return DateUtils.getDayRange(d);
						},
					},
					{
						label: "上周",
						range: () => {
							const d = new Date();
							d.setDate(d.getDate() - 7);
							return DateUtils.getWeekRange(d);
						},
					},
					{
						label: "上月",
						range: () => {
							const d = new Date();
							d.setMonth(d.getMonth() - 1);
							return DateUtils.getMonthRange(d);
						},
					},
				],
			},
			{
				label: "现在",
				items: [
					{
						label: "今天",
						range: () => DateUtils.getDayRange(new Date()),
					},
					{
						label: "本周",
						range: () => DateUtils.getWeekRange(new Date()),
					},
					{
						label: "本月",
						range: () => DateUtils.getMonthRange(new Date()),
					},
				],
			},
			{
				label: "未来",
				items: [
					{
						label: "明天",
						range: () => {
							const d = new Date();
							d.setDate(d.getDate() + 1);
							return DateUtils.getDayRange(d);
						},
					},
					{
						label: "下周",
						range: () => {
							const d = new Date();
							d.setDate(d.getDate() + 7);
							return DateUtils.getWeekRange(d);
						},
					},
					{
						label: "下月",
						range: () => {
							const d = new Date();
							d.setMonth(d.getMonth() + 1);
							return DateUtils.getMonthRange(d);
						},
					},
				],
			},
			{
				label: "全时",
				items: [{ label: "所有", range: () => null }],
			},
		];

		const quickSection = this.container.createDiv({
			cls: "filter-section",
		});
		quickGroups.forEach((group) => {
			const groupRow = quickSection.createDiv({ cls: "filter-row" });
			groupRow.createSpan({ text: group.label, cls: "filter-label" });
			group.items.forEach(({ label, range }) => {
				const btn = groupRow.createEl("button", {
					text: label,
					cls: "filter-btn",
				});

				// 高亮逻辑：动态日期匹配或"所有"按钮
				const isAll = label === "所有";
				const isSelected = isAll
					? currentFilter.dateRange.isAll
					: this.isDynamicSelected(currentFilter, label);
				if (isSelected) btn.addClass("active");

				btn.onclick = () => {
					// 点击任意动态按钮时，清除静态日期选中状态（通过设置 isAll 实现）
					const r = range();
					const newFilter: GlobalFilter = { ...currentFilter };
					if (r) {
						newFilter.dateRange = {
							start: r.start.getTime(),
							end: r.end.getTime(),
							isAll: false,
						};
					} else {
						newFilter.dateRange = {
							start: null,
							end: null,
							isAll: true,
						};
					}
					this.store.update({ draftFilter: newFilter });
				};
			});
		});

		// ========== 静态级联日期 ==========
		const cascadeSection = this.container.createDiv({
			cls: "filter-section",
		});

		// 年份
		const yearRow = cascadeSection.createDiv({ cls: "filter-row" });
		yearRow.createSpan({ text: "年份", cls: "filter-label" });
		YEAR_LIST.forEach((year: number) => {
			const btn = yearRow.createEl("button", {
				text: year.toString(),
				cls: "filter-btn",
			});
			// 高亮：当前日期范围的年份匹配
			if (currentFilter.dateRange.start) {
				const sy = new Date(
					currentFilter.dateRange.start,
				).getFullYear();
				const ey = new Date(currentFilter.dateRange.end).getFullYear();
				if (sy === year && ey === year) btn.addClass("active");
			}
			btn.onclick = () => {
				const range = DateUtils.getYearRangeByYear(year);
				this.store.update({
					draftFilter: {
						...currentFilter,
						dateRange: {
							start: range.start.getTime(),
							end: range.end.getTime(),
							isAll: false,
						},
					},
				});
			};
		});

		// 季度
		const quarterRow = cascadeSection.createDiv({ cls: "filter-row" });
		quarterRow.createSpan({ text: "季度", cls: "filter-label" });
		for (let q = 1; q <= 4; q++) {
			const btn = quarterRow.createEl("button", {
				text: `${q}季`,
				cls: "filter-btn",
			});
			if (currentFilter.dateRange.start) {
				const sm = new Date(currentFilter.dateRange.start).getMonth();
				const em = new Date(currentFilter.dateRange.end).getMonth();
				const sq = Math.floor(sm / 3) + 1;
				const eq = Math.floor(em / 3) + 1;
				if (sq === q && eq === q) btn.addClass("active");
			}
			btn.onclick = () => {
				const year = new Date().getFullYear();
				const range = DateUtils.getQuarterRangeByYearQuarter(year, q);
				this.store.update({
					draftFilter: {
						...currentFilter,
						dateRange: {
							start: range.start.getTime(),
							end: range.end.getTime(),
							isAll: false,
						},
					},
				});
			};
		}

		// 月份
		const monthRow = cascadeSection.createDiv({ cls: "filter-row" });
		monthRow.createSpan({ text: "月份", cls: "filter-label" });
		for (let m = 1; m <= 12; m++) {
			const btn = monthRow.createEl("button", {
				text: `${m}月`,
				cls: "filter-btn",
			});
			if (currentFilter.dateRange.start) {
				const sm =
					new Date(currentFilter.dateRange.start).getMonth() + 1;
				const em = new Date(currentFilter.dateRange.end).getMonth() + 1;
				if (sm === m && em === m) btn.addClass("active");
			}
			btn.onclick = () => {
				const year = new Date().getFullYear();
				const range = DateUtils.getMonthRangeByYearMonth(year, m);
				this.store.update({
					draftFilter: {
						...currentFilter,
						dateRange: {
							start: range.start.getTime(),
							end: range.end.getTime(),
							isAll: false,
						},
					},
				});
			};
		}

		// 周数
		const weekRow = cascadeSection.createDiv({ cls: "filter-row" });
		weekRow.createSpan({ text: "周数", cls: "filter-label" });
		const today = new Date();
		const y = today.getFullYear();
		const m = today.getMonth();
		const firstDay = new Date(y, m, 1);
		const firstDow = firstDay.getDay() || 7;
		const mondayOffset = firstDow === 1 ? 0 : 8 - firstDow;
		const firstMonday = new Date(firstDay);
		firstMonday.setDate(1 + mondayOffset);
		const lastDay = new Date(y, m + 1, 0);
		for (let w = 1; w <= 5; w++) {
			const start = new Date(firstMonday);
			start.setDate(start.getDate() + (w - 1) * 7);
			const end = new Date(start);
			end.setDate(end.getDate() + 6);
			if (start.getMonth() !== m && end > lastDay) break;
			const btn = weekRow.createEl("button", {
				text: `${w}周`,
				cls: "filter-btn",
			});
			if (currentFilter.dateRange.start) {
				const ws = DateUtils.getISOWeekNumber(
					new Date(currentFilter.dateRange.start),
				);
				const we = DateUtils.getISOWeekNumber(
					new Date(currentFilter.dateRange.end),
				);
				const wm = DateUtils.getISOWeekNumber(start);
				if (ws === wm && we === wm) btn.addClass("active");
			}
			btn.onclick = () => {
				const range = {
					start: DateUtils.setStart(start),
					end: DateUtils.setEnd(end),
				};
				this.store.update({
					draftFilter: {
						...currentFilter,
						dateRange: {
							start: range.start.getTime(),
							end: range.end.getTime(),
							isAll: false,
						},
					},
				});
			};
		}

		// 周几
		const weekdayRow = cascadeSection.createDiv({ cls: "filter-row" });
		weekdayRow.createSpan({ text: "周几", cls: "filter-label" });
		const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
		const todayDate = new Date();
		const todayDow = todayDate.getDay() || 7;
		const currentMonday = new Date(todayDate);
		currentMonday.setDate(todayDate.getDate() - (todayDow - 1));
		weekdays.forEach((wd, idx) => {
			const d = new Date(currentMonday);
			d.setDate(currentMonday.getDate() + idx);
			const btn = weekdayRow.createEl("button", {
				text: wd,
				cls: "filter-btn",
			});
			if (currentFilter.dateRange.start) {
				const dayRange = DateUtils.getDayRange(d);
				if (
					currentFilter.dateRange.start ===
						dayRange.start.getTime() &&
					currentFilter.dateRange.end === dayRange.end.getTime()
				) {
					btn.addClass("active");
				}
			}
			btn.onclick = () => {
				const range = DateUtils.getDayRange(d);
				this.store.update({
					draftFilter: {
						...currentFilter,
						dateRange: {
							start: range.start.getTime(),
							end: range.end.getTime(),
							isAll: false,
						},
					},
				});
			};
		});

		// ========== 自定义日期 + 模式切换 ==========
		const customRow = this.container.createDiv({ cls: "filter-row" });
		customRow.createSpan({ text: "自定义", cls: "filter-label" });
		const startInput = customRow.createEl("input", {
			type: "date",
			cls: "filter-date-input",
			attr: { placeholder: "开始日期" },
		});
		const endInput = customRow.createEl("input", {
			type: "date",
			cls: "filter-date-input",
			attr: { placeholder: "结束日期" },
		});
		if (currentFilter.dateRange.start && currentFilter.dateRange.end) {
			startInput.value = new Date(currentFilter.dateRange.start)
				.toISOString()
				.slice(0, 10);
			endInput.value = new Date(currentFilter.dateRange.end)
				.toISOString()
				.slice(0, 10);
		}
		const applyBtn = customRow.createEl("button", {
			text: "应用",
			cls: "filter-btn",
		});
		applyBtn.onclick = () => {
			const s = startInput.value;
			const e = endInput.value;
			if (s && e && new Date(s) <= new Date(e)) {
				this.store.update({
					draftFilter: {
						...currentFilter,
						dateRange: {
							start: new Date(s).getTime(),
							end: new Date(e).getTime(),
							isAll: false,
						},
					},
				});
			}
		};
		const modeBtn = customRow.createEl("button", {
			text: intervalMode === "scheduled-due" ? "计划~截止" : "开始~完成",
			cls: "filter-btn",
		});
		modeBtn.onclick = () => {
			if (!preset) return;
			const newMode =
				intervalMode === "scheduled-due"
					? "starts-done"
					: "scheduled-due";
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, intervalMode: newMode } : p,
			);
			this.store.update({ presets: newPresets });
		};
	}
}
