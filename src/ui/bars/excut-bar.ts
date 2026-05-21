import { ALLOWED_STATUSES } from "../../configs/configs";
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";

export class ExcutBar {
	constructor(container: HTMLElement, store: Store) {
		const render = () => {
			container.empty();
			const state = store.getState();
			const preset = store.getActivePreset();
			const currentFilter: GlobalFilter =
				state.draftFilter ?? preset?.filter ?? this.defaultFilter();

			const row = container.createDiv({ cls: "filter-row" });
			row.createSpan({ text: "执行状态", cls: "filter-label" });
			const statusLabels: Record<string, string> = {
				todo: "未开始",
				planned: "计划中",
				"in-progress": "进行中",
				completed: "已完成",
				cancelled: "已取消",
			};
			ALLOWED_STATUSES.forEach((st) => {
				const btn = row.createEl("button", {
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
		};

		store.subscribe(render);
		render();
	}

	private defaultFilter(): GlobalFilter {
		return {
			dateRange: { start: null, end: null, isAll: true },
			statuses: ALLOWED_STATUSES,
			includeMarks: [],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		};
	}
}
