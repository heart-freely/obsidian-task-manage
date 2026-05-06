// ============================================================================
// 侧边视图切换按钮栏 (Side View Switcher Bar)
// ============================================================================
// 功能：提供侧边视图的模式切换按钮，用于在不同视图模式（如列表、表格、
//       卡片、树形等）之间快速切换。
// 依赖：无
// 调用方：panel.js - 与主视图配合使用
// ============================================================================

/**
 * 构建侧边视图切换按钮栏
 * @param {HTMLElement} container - 父容器
 * @param {Object} dv - Dataview 实例
 * @param {Object} state - 全局状态对象（需包含 sideViewType 等）
 * @returns {HTMLElement} 侧边按钮栏 DOM 元素
 */
export function buildSideButtonBar(container, dv, state) {
	const sideRow = dv.el("div", "");
	sideRow.style.cssText =
		"display:flex; align-items:center; padding:12px 0 8px 0; gap:8px; flex-wrap:wrap;";

	// ── 视图模式按钮定义 ─────────────────────────────────────────────
	// 每个按钮对应一种视图类型
	const views = [
		{ type: "list", label: "📋 列表", title: "列表视图" },
		{ type: "grid", label: "🔲 卡片", title: "卡片视图" },
		{ type: "table", label: "📊 表格", title: "表格视图" },
		{ type: "tree", label: "🌳 树形", title: "树形视图" },
		{ type: "timeline", label: "📅 时间线", title: "时间线视图" },
	];

	views.forEach((view) => {
		const btn = dv.el("button", view.label, {
			cls:
				"side-btn" +
				(state.sideViewType === view.type ? " side-btn-active" : ""),
			title: view.title,
		});
		btn.onclick = () => {
			state.sideViewType = view.type;
			// 更新所有侧边按钮的样式
			document.querySelectorAll(".side-btn").forEach((b) => {
				b.classList.remove("side-btn-active");
			});
			btn.classList.add("side-btn-active");
			// 触发视图刷新
			if (state.onViewChange) {
				state.onViewChange(view.type);
			}
		};
		sideRow.appendChild(btn);
	});

	container.appendChild(sideRow);
	return sideRow;
}
