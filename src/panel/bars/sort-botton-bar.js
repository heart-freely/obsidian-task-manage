export function buildSortPanel(container, dv, state) {
	const sortRow = dv.el("div", "");
	sortRow.style.cssText =
		"display:flex; align-items:center; padding:12px 0 8px 0; gap:8px; flex-wrap:wrap;";

	const sortFields = [
		{ field: "priority", label: "🔥 优先级" },
		{ field: "due", label: "📅 截止日期" },
		{ field: "created", label: "📝 创建时间" },
		{ field: "completed", label: "✅ 完成时间" },
		{ field: "status", label: "📌 状态" },
		{ field: "alphabetical", label: "🔤 字母序" },
	];

	if (!state.sortField) state.sortField = "priority";
	if (!state.sortOrder) state.sortOrder = "desc";

	sortFields.forEach((sf) => {
		const isActive = state.sortField === sf.field;
		const btn = dv.el(
			"button",
			sf.label +
				(isActive ? (state.sortOrder === "asc" ? " ↑" : " ↓") : ""),
			{
				cls: "sort-btn" + (isActive ? " sort-btn-active" : ""),
				title: "按" + sf.label + "排序",
			},
		);
		btn.onclick = () => {
			if (state.sortField === sf.field) {
				state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
			} else {
				state.sortField = sf.field;
				state.sortOrder = "desc";
			}

			document.querySelectorAll(".sort-btn").forEach((b) => {
				b.classList.remove("sort-btn-active");
			});
			btn.classList.add("sort-btn-active");

			btn.textContent =
				sf.label +
				(state.sortField === sf.field
					? state.sortOrder === "asc"
						? " ↑"
						: " ↓"
					: "");
			state.filterCache.fingerprint = "";

			if (state.onSortChange) {
				state.onSortChange(sf.field, state.sortOrder);
			}
		};
		sortRow.appendChild(btn);
	});

	container.appendChild(sortRow);
	return sortRow;
}

export { buildSortPanel as buildSortRow };
