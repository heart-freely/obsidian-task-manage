// ============================================================================
// 排序按钮栏 (Sort Button Bar)
// ============================================================================
// 功能：提供任务列表的排序控制按钮，支持按不同字段（优先级、截止日期、
//       创建时间、标签等）进行排序，并支持升序/降序切换。
// 依赖：无
// 调用方：panel.js - 各视图初始化时调用 buildSortPanel / buildSortRow
// ============================================================================

/**
 * 构建排序控制面板 (别名：buildSortRow)
 * @param {HTMLElement} container - 父容器
 * @param {Object} dv - Dataview 实例
 * @param {Object} state - 全局状态对象（需包含 sortField, sortOrder 等）
 * @returns {HTMLElement} 排序面板 DOM 元素
 */
export function buildSortPanel(container, dv, state) {
	const sortRow = dv.el("div", "");
	sortRow.style.cssText =
		"display:flex; align-items:center; padding:12px 0 8px 0; gap:8px; flex-wrap:wrap;";

	// ── 排序字段按钮定义 ─────────────────────────────────────────────
	// 每个按钮对应一种排序字段
	const sortFields = [
		{ field: "priority", label: "🔥 优先级" },
		{ field: "due", label: "📅 截止日期" },
		{ field: "created", label: "📝 创建时间" },
		{ field: "completed", label: "✅ 完成时间" },
		{ field: "status", label: "📌 状态" },
		{ field: "alphabetical", label: "🔤 字母序" },
	];

	// 初始化排序状态（如果尚未设置）
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
				// 切换排序方向
				state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
			} else {
				state.sortField = sf.field;
				state.sortOrder = "desc";
			}
			// 更新所有排序按钮的样式
			document.querySelectorAll(".sort-btn").forEach((b) => {
				b.classList.remove("sort-btn-active");
			});
			btn.classList.add("sort-btn-active");
			// 更新按钮文本显示排序方向
			btn.textContent =
				sf.label +
				(state.sortField === sf.field
					? state.sortOrder === "asc"
						? " ↑"
						: " ↓"
					: "");
			state.filterCache.fingerprint = "";
			// 触发排序变更回调
			if (state.onSortChange) {
				state.onSortChange(sf.field, state.sortOrder);
			}
		};
		sortRow.appendChild(btn);
	});

	container.appendChild(sortRow);
	return sortRow;
}

/** 兼容别名 — panel.js 中使用 buildSortRow 导入 */
export { buildSortPanel as buildSortRow };
