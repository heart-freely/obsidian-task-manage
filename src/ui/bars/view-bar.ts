import { getDefaultFilter } from "../../configs/configs";
import { Store } from "../../store/store";

const VIEW_STYLES = [
	{ key: "list", label: "列表" },
	{ key: "table", label: "表格" },
	{ key: "kanban", label: "看板" },
	{ key: "matrix", label: "矩阵" },
	{ key: "timeline", label: "时间轴" },
	{ key: "tree", label: "任务树" },
	{ key: "statistics", label: "基础统计" },
	{ key: "detail", label: "详细统计" },
	{ key: "gantt", label: "甘特图" },
	{ key: "calendar-month", label: "日历月" },
];

const SORT_OPTIONS = [
	{ type: "status", label: "状态" },
	{ type: "priority", label: "优先级" },
	{ type: "scheduled", label: "计划" },
	{ type: "due", label: "截止" },
	{ type: "filename", label: "文件名" },
];

export function renderViewBar(container: HTMLElement, store: Store) {
	const state = store.getState();
	const preset = store.getActivePreset();
	const currentStyle = preset?.viewStyle ?? "table";
	const currentSort = preset?.sort ?? { type: "status", order: "asc" };
	const currentFilter =
		preset?.filter ?? state.draftFilter ?? getDefaultFilter();

	// 视图样式切换
	const styleRow = container.createDiv({ cls: "bar-row" });
	VIEW_STYLES.forEach(({ key, label }) => {
		const btn = styleRow.createEl("button", {
			text: label,
			cls: "bar-btn",
		});
		if (key === currentStyle) btn.addClass("active");
		btn.onclick = () => {
			if (!preset) return;
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, viewStyle: key } : p,
			);
			store.update({ presets: newPresets });
		};
	});

	// 排序
	const sortRow = container.createDiv({ cls: "bar-row" });
	SORT_OPTIONS.forEach((opt) => {
		const btn = sortRow.createEl("button", {
			text: opt.label,
			cls: "bar-btn",
		});
		if (currentSort.type === opt.type) {
			btn.setText(
				opt.label + (currentSort.order === "asc" ? " ↑" : " ↓"),
			);
			btn.addClass("active");
		}
		btn.onclick = () => {
			if (!preset) return;
			const newOrder =
				currentSort.type === opt.type
					? currentSort.order === "asc"
						? "desc"
						: "asc"
					: "asc";
			const newSort = {
				type: opt.type,
				order: newOrder as "asc" | "desc",
			};
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, sort: newSort } : p,
			);
			store.update({ presets: newPresets });
		};
	});

	// 显示/隐藏切换
	const toggleRow = container.createDiv({ cls: "bar-row" });
	const repeatBtn = toggleRow.createEl("button", {
		text: currentFilter.hideRepeat ? "显示循环" : "隐藏循环",
		cls: "bar-btn",
	});
	repeatBtn.onclick = () => {
		const newFilter = {
			...currentFilter,
			hideRepeat: !currentFilter.hideRepeat,
		};
		if (preset) {
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, filter: newFilter } : p,
			);
			store.update({ presets: newPresets });
		} else {
			store.update({ draftFilter: newFilter });
		}
	};

	const completedBtn = toggleRow.createEl("button", {
		text: currentFilter.hideCompleted ? "显示已完成" : "隐藏已完成",
		cls: "bar-btn",
	});
	completedBtn.onclick = () => {
		const newFilter = {
			...currentFilter,
			hideCompleted: !currentFilter.hideCompleted,
		};
		if (preset) {
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, filter: newFilter } : p,
			);
			store.update({ presets: newPresets });
		} else {
			store.update({ draftFilter: newFilter });
		}
	};

	const cancelledBtn = toggleRow.createEl("button", {
		text: currentFilter.hideCancelled ? "显示已取消" : "隐藏已取消",
		cls: "bar-btn",
	});
	cancelledBtn.onclick = () => {
		const newFilter = {
			...currentFilter,
			hideCancelled: !currentFilter.hideCancelled,
		};
		if (preset) {
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, filter: newFilter } : p,
			);
			store.update({ presets: newPresets });
		} else {
			store.update({ draftFilter: newFilter });
		}
	};

	const folderBtn = toggleRow.createEl("button", {
		text: (currentFilter as any).hideFolders ? "显示文件夹" : "隐藏文件夹",
		cls: "bar-btn",
	});
	folderBtn.onclick = () => {
		const newFilter = {
			...currentFilter,
			hideFolders: !(currentFilter as any).hideFolders,
		};
		if (preset) {
			const newPresets = state.presets.map((p) =>
				p.id === preset.id ? { ...p, filter: newFilter } : p,
			);
			store.update({ presets: newPresets });
		} else {
			store.update({ draftFilter: newFilter });
		}
	};
}
