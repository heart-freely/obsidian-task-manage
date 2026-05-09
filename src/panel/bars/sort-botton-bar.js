//  <!-- SYNC_COMMENTS_START -->
/**
 * 文件：src/panel/bars/sort-botton-bar.js
 * 描述：排序控制面板，提供按多种字段排序及升降序切换功能
 * 所属模块：panel/bars
 * 依赖：
 *   - panel.js: 全局状态 state（sortField, sortOrder, filterCache, onSortChange）
 * 对外导出：buildSortPanel, buildSortRow
 * 注意事项：排序切换后会清空 filterCache.fingerprint 触发重新筛选
 * @see .cline/skills/code/panel/bars/sort-botton-bar.md
 */

/* @skill-sig file src/panel/bars/sort-botton-bar.js - 排序控制面板，提供按多种字段排序及升降序切换功能 */
/* @skill-api
   panel.js (全局状态 state)
   state.sortField / state.sortOrder / state.filterCache.fingerprint
   state.onSortChange - 排序变更回调
*/
/* @skill-state
   state.sortField : string    // 当前排序字段: priority|due|created|completed|status|alphabetical
   state.sortOrder : "asc"|"desc"  // 排序方向
   state.filterCache.fingerprint : string  // 筛选缓存指纹，排序切换后清空
*/
/* @skill-func
   buildSortPanel(container, dv, state) : HTMLElement - 构建排序控制面板，渲染按钮并绑定点击事件
   buildSortRow(container, dv, state) : HTMLElement - buildSortPanel 的别名导出
*/
/* @skill-dom
   .sort-row (容器 display:flex gap:8px)
   button.sort-btn / button.sort-btn-active
     🔥 优先级 ↓ | 📅 截止日期 ↓ | 📝 创建时间 | ✅ 完成时间 | 📌 状态 | 🔤 字母序
*/
/* @skill-flow
   buildSortPanel(container, dv, state)
   初始化 sortField=priority sortOrder=desc → 定义 sortFields 数组 → 遍历创建按钮，当前活跃字段显示 ↑/↓ → 点击切换字段/方向 → 更新按钮样式和文本 → 清空 filterCache.fingerprint → 调用 state.onSortChange
*/
/* @skill-condition
   点击同一字段 → 切换 sortOrder (asc↔desc)
   点击不同字段 → 设为新字段，sortOrder=desc
   state.sortField 未设置时 → 默认 priority/desc
*/
//  <!-- SYNC_COMMENTS_END -->

// @skill-anchor buildSortPanel - 排序控制面板主入口，创建排序按钮行并绑定交互
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

// @skill-anchor buildSortRow - buildSortPanel 的别名导出（兼容旧引用）
export { buildSortPanel as buildSortRow };
