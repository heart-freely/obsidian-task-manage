import { ALL_MARKS, MARK_NAMES, getDefaultFilter } from "../../configs/configs";
import { Store } from "../../store/store";
import { GlobalFilter } from "../../types";

export class MarkBar {
	constructor(container: HTMLElement, store: Store) {
		const render = () => {
			container.empty();
			const state = store.getState();
			const preset = store.getActivePreset();
			const currentFilter: GlobalFilter =
				state.draftFilter ?? preset?.filter ?? getDefaultFilter();

			const markRow = container.createDiv({ cls: "filter-row" });
			markRow.createSpan({ text: "任务标记：", cls: "filter-label" });
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
