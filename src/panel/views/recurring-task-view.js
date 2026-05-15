import { fetchRecurringTasksGrouped } from "../../tasks/process/recurring-task-process";
import {
	BaseTaskView,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

export const VIEW_TYPE_RECURRING = "recurring-task-view";

export class RecurringTaskView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_RECURRING;
	}
	getDisplayText() {
		return "循环任务";
	}
	getIcon() {
		return "refresh-cw";
	}

	async _startCore(dv, app, storageAdapter, instanceId) {
		return await startRecurringView(dv, app, dv.container);
	}
}

export async function startRecurringView(dv, app, container) {
	async function renderRecurring() {
		container.innerHTML = "";
		let groups;
		try {
			groups = await fetchRecurringTasksGrouped(app);
		} catch (e) {
			container.innerHTML =
				'<div class="empty-placeholder">❌ 未检测到 Tasks 插件，请安装并启用。</div>';
			return;
		}

		const total = Object.values(groups).reduce(
			(sum, arr) => sum + arr.length,
			0,
		);
		const stats = document.createElement("div");
		stats.style.cssText = "margin-bottom:12px; font-weight:600;";
		stats.textContent = `📋 循环任务：${total} 项`;
		container.appendChild(stats);

		const grid = document.createElement("div");
		grid.className = "view-grid cols-3";

		const columns = [
			{ name: "每天", color: "rgba(130, 170, 255, 0.3)" },
			{ name: "每周", color: "rgba(255, 200, 100, 0.3)" },
			{ name: "每月", color: "rgba(255, 130, 130, 0.3)" },
		];

		columns.forEach((col) => {
			const tasks = groups[col.name] || [];
			const colDiv = document.createElement("div");
			colDiv.className = "view-col";
			colDiv.style.setProperty("--quad-color", col.color);

			const header = document.createElement("div");
			header.className = "col-header";
			header.innerHTML = `<span>${col.name}</span><span>${tasks.length}</span>`;
			colDiv.appendChild(header);

			const list = document.createElement("ul");
			list.className = "task-list";

			if (!tasks.length) {
				list.innerHTML = '<li class="empty-placeholder">暂无任务</li>';
			} else {
				tasks.forEach((t) => {
					const cardData = normalizeTaskCardData(t);
					list.appendChild(createTaskCard(cardData, app));
				});
			}
			colDiv.appendChild(list);
			grid.appendChild(colDiv);
		});

		container.appendChild(grid);
	}

	await renderRecurring();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {
			renderRecurring();
		},
	};
}
