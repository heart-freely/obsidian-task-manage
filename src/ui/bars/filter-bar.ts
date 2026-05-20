import {
	ALL_MARKS,
	ALLOWED_STATUSES,
	getDefaultFilter,
	MARK_NAMES,
	YEAR_LIST,
} from "../../configs/configs";
import { Store } from "../../store/store";
import { DateUtils } from "../../tasks/process/common-process";
import { GlobalFilter } from "../../types";

export class FilterBar {
	constructor(container: HTMLElement, store: Store) {
		const render = () => {
			container.empty();
			const state = store.getState();
			const preset = store.getActivePreset();
			const currentFilter: GlobalFilter =
				state.draftFilter ?? preset?.filter ?? getDefaultFilter();
			const intervalMode =
				(preset as any)?.intervalMode ?? "scheduled-due";

			// 折叠控制
			const headerRow = container.createDiv({ cls: "filter-header" });
			let collapsed = false;
			const collapseBtn = headerRow.createEl("button", {
				text: "▼ 收起筛选",
				cls: "filter-collapse-btn",
			});
			const contentDiv = container.createDiv({ cls: "filter-content" });
			const toggleCollapse = () => {
				collapsed = !collapsed;
				contentDiv.style.display = collapsed ? "none" : "";
				collapseBtn.textContent = collapsed
					? "▶ 展开筛选"
					: "▼ 收起筛选";
			};
			collapseBtn.onclick = toggleCollapse;

			// ========== 快捷日期 ==========
			const quickRow = contentDiv.createDiv({ cls: "filter-row" });
			quickRow.createSpan({ text: "快捷：", cls: "filter-label" });
			const quickDates = [
				{
					label: "今天",
					range: () => DateUtils.getDayRange(new Date()),
				},
				{
					label: "昨天",
					range: () => {
						const d = new Date();
						d.setDate(d.getDate() - 1);
						return DateUtils.getDayRange(d);
					},
				},
				{
					label: "明天",
					range: () => {
						const d = new Date();
						d.setDate(d.getDate() + 1);
						return DateUtils.getDayRange(d);
					},
				},
				{
					label: "本周",
					range: () => DateUtils.getWeekRange(new Date()),
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
					label: "下周",
					range: () => {
						const d = new Date();
						d.setDate(d.getDate() + 7);
						return DateUtils.getWeekRange(d);
					},
				},
				{
					label: "本月",
					range: () => DateUtils.getMonthRange(new Date()),
				},
				{
					label: "上月",
					range: () => {
						const d = new Date();
						d.setMonth(d.getMonth() - 1);
						return DateUtils.getMonthRange(d);
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
				{ label: "所有", range: () => null },
			];
			quickDates.forEach(({ label, range }) => {
				const btn = quickRow.createEl("button", {
					text: label,
					cls: "filter-btn",
				});
				btn.onclick = () => {
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
					store.update({ draftFilter: newFilter });
				};
			});

			// ========== 年/季/月/周/周几级联 ==========
			const cascadeSection = contentDiv.createDiv({
				cls: "filter-section",
			});

			// 年
			const yearRow = cascadeSection.createDiv({ cls: "filter-row" });
			yearRow.createSpan({ text: "年：", cls: "filter-label" });
			YEAR_LIST.forEach((year: number) => {
				const btn = yearRow.createEl("button", {
					text: year.toString(),
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const range = DateUtils.getYearRangeByYear(year);
					store.update({
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

			// 季
			const quarterRow = cascadeSection.createDiv({ cls: "filter-row" });
			quarterRow.createSpan({ text: "季：", cls: "filter-label" });
			for (let q = 1; q <= 4; q++) {
				const btn = quarterRow.createEl("button", {
					text: `${q}季`,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const year = new Date().getFullYear();
					const range = DateUtils.getQuarterRangeByYearQuarter(
						year,
						q,
					);
					store.update({
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

			// 月
			const monthRow = cascadeSection.createDiv({ cls: "filter-row" });
			monthRow.createSpan({ text: "月：", cls: "filter-label" });
			for (let m = 1; m <= 12; m++) {
				const btn = monthRow.createEl("button", {
					text: `${m}月`,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const year = new Date().getFullYear();
					const range = DateUtils.getMonthRangeByYearMonth(year, m);
					store.update({
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

			// 周
			const weekRow = cascadeSection.createDiv({ cls: "filter-row" });
			weekRow.createSpan({ text: "周：", cls: "filter-label" });
			const today = new Date();
			const year = today.getFullYear();
			const month = today.getMonth();
			const firstDayOfMonth = new Date(year, month, 1);
			const firstDayDow = firstDayOfMonth.getDay() || 7;
			const mondayOffset = firstDayDow === 1 ? 0 : 8 - firstDayDow;
			const firstMonday = new Date(firstDayOfMonth);
			firstMonday.setDate(1 + mondayOffset);
			const lastDayOfMonth = new Date(year, month + 1, 0);
			for (let w = 1; w <= 5; w++) {
				const start = new Date(firstMonday);
				start.setDate(start.getDate() + (w - 1) * 7);
				const end = new Date(start);
				end.setDate(end.getDate() + 6);
				if (start.getMonth() !== month && end > lastDayOfMonth) break;
				const btn = weekRow.createEl("button", {
					text: `${w}周`,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const range = {
						start: DateUtils.setStart(start),
						end: DateUtils.setEnd(end),
					};
					store.update({
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
			weekdayRow.createSpan({ text: "周几：", cls: "filter-label" });
			const weekdays = [
				"周一",
				"周二",
				"周三",
				"周四",
				"周五",
				"周六",
				"周日",
			];
			const todayDate = new Date();
			const todayDay = todayDate.getDay() || 7;
			const currentMonday = new Date(todayDate);
			currentMonday.setDate(todayDate.getDate() - (todayDay - 1));
			weekdays.forEach((wd, idx) => {
				const d = new Date(currentMonday);
				d.setDate(currentMonday.getDate() + idx);
				const btn = weekdayRow.createEl("button", {
					text: wd,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					const range = DateUtils.getDayRange(d);
					store.update({
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

			// ========== 执行状态 ==========
			const statusRow = contentDiv.createDiv({ cls: "filter-row" });
			statusRow.createSpan({ text: "执行状态", cls: "filter-label" });
			const statusLabels: Record<string, string> = {
				todo: "未开始",
				planned: "计划中",
				"in-progress": "进行中",
				completed: "已完成",
				cancelled: "已取消",
			};
			ALLOWED_STATUSES.forEach((st) => {
				const btn = statusRow.createEl("button", {
					text: statusLabels[st] || st,
					cls: "filter-btn",
				});
				if (currentFilter.statuses.includes(st)) btn.addClass("active");
				btn.onclick = () => {
					const newStatuses = currentFilter.statuses.includes(st)
						? currentFilter.statuses.filter((s) => s !== st)
						: [...currentFilter.statuses, st];
					store.update({
						draftFilter: {
							...currentFilter,
							statuses: newStatuses,
						},
					});
				};
			});

			// ========== 标记筛选 ==========
			const markRow = contentDiv.createDiv({ cls: "filter-row" });
			markRow.createSpan({ text: "标记筛选", cls: "filter-label" });
			ALL_MARKS.forEach((mark) => {
				const btn = markRow.createEl("button", {
					text: MARK_NAMES[mark] || mark,
					cls: "filter-btn",
				});
				if (currentFilter.includeMarks.includes(mark))
					btn.addClass("active");
				btn.onclick = () => {
					const newInclude = currentFilter.includeMarks.includes(mark)
						? currentFilter.includeMarks.filter((m) => m !== mark)
						: [...currentFilter.includeMarks, mark];
					store.update({
						draftFilter: {
							...currentFilter,
							includeMarks: newInclude,
						},
					});
				};
			});
		};

		store.subscribe(render);
		render();
	}
}
