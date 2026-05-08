//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file src/panel/bars/side-botton-bar.js - 侧边视图切换面板，提供列表/卡片/表格/树形/时间线视图切换功能 */
/* @skill-api
   panel.js (全局状态 state)
   state.sideViewType : string   // 当前侧边视图类型: list|grid|table|tree|timeline
   state.onViewChange : Function // 视图变更回调
*/
/* @skill-state
   state.sideViewType : string   // 当前侧边视图: list|grid|table|tree|timeline
*/
/* @skill-func
   buildSideButtonBar(container, dv, state) : HTMLElement - 构建侧边视图切换面板
   buildViewSwitcher(container, dv, state) : HTMLElement - buildSideButtonBar 的别名导出
*/
/* @skill-dom
   .side-btn / .side-btn-active (按钮样式)
   📋 列表 | 🔲 卡片 | 📊 表格 | 🌳 树形 | 📅 时间线
*/
/* @skill-flow
   buildSideButtonBar(container, dv, state)
   定义 views 数组 → 遍历创建按钮 → 当前 view 加 side-btn-active 类
   → 点击切换 state.sideViewType → 调用 state.onViewChange(type)
*/
/* @skill-condition
   state.sideViewType===view.type → 该按钮 side-btn-active
   点击切换后清除其他按钮 active 类
   state.onViewChange 存在时触发回调
*/
//  <!-- SYNC_COMMENTS_END -->

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

export { buildSideButtonBar as buildViewSwitcher };
