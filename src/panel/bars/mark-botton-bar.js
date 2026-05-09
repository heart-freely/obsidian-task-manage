//  <!-- SYNC_COMMENTS_START -->
/**
 * 文件：src/panel/bars/mark-botton-bar.js
 * 描述：标签筛选面板，支持全部/单标签模式切换，点击清空缓存触发重新筛选。
 *       提供任务的标签筛选 UI，用户可通过标签对任务进行快速分类筛选。
 * 所属模块：panel/bars
 * 依赖：
 *   - panel.js: 全局状态 state（selectedTag, allTags, filterCache）
 * 对外导出：buildMarkPanel, buildMarkFilterPanel
 * 注意事项：标签变化后需清空 filterCache.fingerprint 触发重新筛选
 * @see .cline/skills/code/panel/bars/mark-botton-bar.md
 */

/* @skill-sig file src/panel/bars/mark-botton-bar.js - 标签筛选面板，支持全部/单标签模式切换，点击清空缓存触发重新筛选 */
/* @skill-api
   panel.js (全局状态 state)
   state.selectedTag : string     // 当前选中的标签（空字符串=全部）
   state.allTags : string[]       // 所有可用标签列表
   state.filterCache.fingerprint  // 标签变化后需清空
*/
/* @skill-state
   state.selectedTag : string     // 当前筛选标签，"全部"时为 ""
   state.allTags : string[]       // 从任务数据中提取的所有标签集合
   state.filterCache.fingerprint : string  // 标签筛选变化后清空
*/
/* @skill-func
   buildMarkPanel(container, dv, state) : HTMLElement - 构建标签筛选面板，含"全部"按钮和动态标签按钮
   buildMarkFilterPanel : HTMLElement - buildMarkPanel 的别名导出
*/
/* @skill-anchor
   buildMarkPanel - 标签筛选面板主入口，构建"全部"+动态标签按钮
   buildMarkFilterPanel - buildMarkPanel 的别名导出
*/
/* @skill-dom
   .markRow (容器 display:flex gap:12px)
   button.tag-btn / button.tag-btn-active
   "全部" 按钮 | #tag1 #tag2 #tag3 ...
*/
/* @skill-flow
   buildMarkPanel(container, dv, state)
   创建 markRow → 创建"全部"按钮(初始 active 如果 !selectedTag)
   → 遍历 state.allTags 创建标签按钮(加 # 前缀)
   → 每个按钮 onclick: 切换选中标签 → 清除所有按钮 active → 更新选中按钮
   → state.selectedTag 和选中按钮联动
   → 始终清空 filterCache.fingerprint 触发重新筛选
*/
/* @skill-condition
   selectedTag="" (全部) → "全部"按钮 active
   selectedTag===tag → 该标签按钮 active
   点击已选中的标签 → 清空 selectedTag (回到全部)
   所有标签变化均清空 filterCache.fingerprint
   按钮通过 .tag-btn-active 类名控制激活样式
*/
//  <!-- SYNC_COMMENTS_END -->

/**
 * 构建标签筛选面板
 * @param {HTMLElement} container - 父容器
 * @param {Object} dv - Dataview 实例
 * @param {Object} state - 全局状态对象（需包含 selectedTag, allTags）
 * @returns {HTMLElement} 标签面板 DOM 元素
 */
/* @skill-anchor: buildMarkPanel */
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
/* @skill-anchor: buildMarkFilterPanel */
export const buildMarkFilterPanel = buildMarkPanel;
