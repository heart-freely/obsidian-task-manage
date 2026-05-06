// ============================================================================
// 标记面板 (Mark/Tag Filter Panel)
// ============================================================================
// 功能：提供任务的标签筛选面板，支持多选标签进行任务过滤。
//       用户可通过标签对任务进行快速分类筛选。
// 依赖：无
// 调用方：panel.js - 各视图初始化时调用 buildMarkPanel
// ============================================================================

/**
 * 构建标签筛选面板
 * @param {HTMLElement} container - 父容器
 * @param {Object} dv - Dataview 实例
 * @param {Object} state - 全局状态对象（需包含 selectedTag, allTags）
 * @returns {HTMLElement} 标签面板 DOM 元素
 */
export function buildMarkPanel(container, dv, state) {
	const markRow = dv.el("div", "");
	markRow.style.cssText =
		"display:flex; align-items:center; padding:12px 0 8px 0; gap:12px; flex-wrap:wrap;";

	// ── "全部"按钮 ────────────────────────────────────────────────────
	// 清除标签筛选，显示所有任务
	const allBtn = dv.el("button", "全部", {
		cls: "tag-btn" + (!state.selectedTag ? " tag-btn-active" : ""),
	});
	allBtn.onclick = () => {
		state.selectedTag = "";
		// 更新所有标签按钮的样式
		document.querySelectorAll(".tag-btn").forEach((b) => {
			b.classList.remove("tag-btn-active");
		});
		allBtn.classList.add("tag-btn-active");
		state.filterCache.fingerprint = "";
	};
	markRow.appendChild(allBtn);

	// ── 标签按钮 ──────────────────────────────────────────────────────
	// 根据 state.allTags 动态生成标签按钮
	state.allTags.forEach((tag) => {
		const btn = dv.el("button", "#" + tag, {
			cls:
				"tag-btn" +
				(state.selectedTag === tag ? " tag-btn-active" : ""),
		});
		btn.onclick = () => {
			state.selectedTag = state.selectedTag === tag ? "" : tag;
			// 更新所有标签按钮的样式
			document.querySelectorAll(".tag-btn").forEach((b) => {
				b.classList.remove("tag-btn-active");
			});
			if (state.selectedTag) {
				btn.classList.add("tag-btn-active");
			} else {
				allBtn.classList.add("tag-btn-active");
			}
			state.filterCache.fingerprint = "";
		};
		markRow.appendChild(btn);
	});

	container.appendChild(markRow);
	return markRow;
}
