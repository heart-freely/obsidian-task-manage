import {
	adaptTasksApiTask,
	createTaskCard,
	normalizeTaskCardData,
} from "./base-task-view";

export async function startListBaseView(
	app,
	container,
	fetchFn,
	title,
	color = "var(--background-modifier-border)",
) {
	container.innerHTML = "";
	try {
		const rawTasks = await fetchFn(app);
		if (!rawTasks || !rawTasks.length) {
			container.innerHTML = `<div class="empty-placeholder">📭 暂无${title}</div>`;
			return {
				cleanup: () => {
					container.innerHTML = "";
				},
				updateSort: () => {},
			};
		}

		const wrapper = document.createElement("div");
		wrapper.className = "view-col";
		wrapper.style.setProperty("--quad-color", color);

		const header = document.createElement("div");
		header.className = "col-header";
		header.innerHTML = `<span>📋 ${title}</span><span>${rawTasks.length} 项</span>`;
		wrapper.appendChild(header);

		const ul = document.createElement("ul");
		ul.className = "task-list";

		rawTasks.forEach((task) => {
			const adapted = adaptTasksApiTask(task);

			const cardData = normalizeTaskCardData({
				description:
					adapted.description || adapted._cleanText || "（无描述）",
				priority: adapted.priority || "none",
				status: mapSymbolToStatus(adapted.status?.symbol),
				recurrenceLabel: adapted.recurrence
					? `🔁 ${adapted.recurrence.toText()}`
					: adapted._repeat
						? `🔁 ${adapted._repeat}`
						: "",
				scheduled: adapted.scheduledDate
					? window.moment(adapted.scheduledDate).format("YYYY-MM-DD")
					: null,
				start: adapted.startDate
					? window.moment(adapted.startDate).format("YYYY-MM-DD")
					: null,
				due: adapted.dueDate
					? window.moment(adapted.dueDate).format("YYYY-MM-DD")
					: null,
				tags: (adapted.tags || []).map((tag) => tag.replace(/^#/, "")),
				id: adapted._id || "",
				forbid: adapted._forbid || "",
				fileName: adapted.path.split("/").pop().replace(/\.md$/, ""),
				path: adapted.path,
				lineNumber: adapted.lineNumber || 0,
			});
			ul.appendChild(createTaskCard(cardData, app));
		});

		wrapper.appendChild(ul);
		container.appendChild(wrapper);
	} catch (e) {
		container.innerHTML = `<div class="empty-placeholder">⚠️ 获取${title}失败，请确认 Tasks 插件已启用</div>`;
	}

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: () => {},
	};
}

function mapSymbolToStatus(symbol) {
	if (symbol === " ") return "todo";
	if (symbol === "?") return "planned";
	if (symbol === "/") return "in-progress";
	if (symbol === "x" || symbol === "X") return "completed";
	if (symbol === "-") return "cancelled";
	return "todo";
}
