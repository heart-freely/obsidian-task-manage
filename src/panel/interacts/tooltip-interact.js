//  <!-- SYNC_COMMENTS_START -->
/**
 * 文件：src/panel/interacts/tooltip-interact.js
 * 描述：TooltipManager 类，全局工具提示管理器，提供显隐/移动/内容更新能力
 * 所属模块：panel/interacts
 * 依赖：
 *   - 无外部依赖，仅使用原生 DOM API
 * 对外导出：TooltipManager（类）
 * 注意事项：tooltip 通过唯一一个挂载在 document.body 下的 div 实现，避免重复创建；单例由调用方自行实例化并共享
 * @see .cline/skills/code/panel/interacts/tooltip-interact.md
 */

/* @skill-sig file src/panel/interacts/tooltip-interact.js - TooltipManager 类，全局工具提示管理器，提供显隐/移动/内容更新能力 */
/* @skill-class TooltipManager
   constructor() - 初始化，div 置 null
   ensureDiv() : HTMLElement - 创建或复用 tooltip DOM
   show(html, x, y) : void - 显示带 HTML 内容的 tooltip
   move(x, y) : void - 移动 tooltip 跟随鼠标
   hide() : void - 隐藏 tooltip（保留 DOM）
   remove() : void - 销毁 tooltip（移除 DOM）
*/
/* @skill-api
   chart-interact.js, base-task-view.js, calendar-task-view.js 等视图
   各视图通过 import { tooltipManager } 共享同一个 TooltipManager 实例
   tooltipManager 单例在 panel.js 或 chart-interact.js 中初始化
*/
/* @skill-state
   无内部状态（实例化后仅维护 div 引用）
   div : HTMLElement|null - 当前 tooltip DOM 元素，null 表示未创建
   所有状态由调用方传入（html 内容、x/y 坐标）
*/
/* @skill-dom
   div.dataview-tooltip - 全局唯一的 tooltip DOM 元素，挂载在 document.body 下
   display:block|none - 控制显隐
   left/top - 定位（相对于鼠标位置右下偏移 15px）
*/
/* @skill-flow
   new TooltipManager()
   → show(html, x, y): 如果 div 不存在则 ensureDiv() 创建 → 设置 innerHTML/display/left/top
   → move(x, y): 检测 display===block → 更新 left/top
   → hide(): display = none
   → remove(): 从 DOM 移除 div，置为 null
*/
/* @skill-condition
   div 首次 show 时创建，复用至 remove 为止
   show/move 坐标偏移 15px（相对于鼠标位置右下角）
   move 仅在当前可见时生效
   hide 保留 DOM 仅隐藏，remove 彻底清除
   样式依赖 .dataview-tooltip 类名
*/
//  <!-- SYNC_COMMENTS_END -->

/**
 * 工具提示管理器
 * 管理一个全局的 tooltip DOM 元素，提供显隐、移动和内容更新能力。
 * tooltip 通过唯一一个挂载在 document.body 下的 div 实现，避免重复创建。
 */
export class TooltipManager {
	/**
	 * 初始化时 div 为 null，首次显示时创建
	 */
	// @skill-anchor constructor - 初始化，div 置 null
	constructor() {
		this.div = null;
	}

	/**
	 * 确保 tooltip 的 DOM 元素存在
	 * 如果 div 尚未创建，则创建并追加到 document.body
	 * @returns {HTMLElement} tooltip 的 div 元素
	 */
	// @skill-anchor ensureDiv - 首次创建或复用 tooltip DOM
	ensureDiv() {
		if (!this.div) {
			this.div = document.createElement("div");
			this.div.className = "dataview-tooltip";
			document.body.appendChild(this.div);
		}
		return this.div;
	}

	/**
	 * 在指定位置显示 tooltip
	 * @param {string} html - tooltip 的 HTML 内容
	 * @param {number} x - 鼠标 X 坐标（px）
	 * @param {number} y - 鼠标 Y 坐标（px）
	 */
	// @skill-anchor show - 显示带 HTML 内容的 tooltip
	show(html, x, y) {
		const div = this.ensureDiv();
		div.innerHTML = html;
		div.style.display = "block";
		div.style.left = x + 15 + "px";
		div.style.top = y + 15 + "px";
	}

	/**
	 * 移动 tooltip 到新位置（仅在 tooltip 当前可见时生效）
	 * @param {number} x - 鼠标 X 坐标（px）
	 * @param {number} y - 鼠标 Y 坐标（px）
	 */
	// @skill-anchor move - 移动 tooltip 跟随鼠标
	move(x, y) {
		if (this.div && this.div.style.display === "block") {
			this.div.style.left = x + 15 + "px";
			this.div.style.top = y + 15 + "px";
		}
	}

	/** 隐藏 tooltip（仅隐藏，不移除 DOM） */
	// @skill-anchor hide - 隐藏 tooltip（保留 DOM）
	hide() {
		if (this.div) this.div.style.display = "none";
	}

	/** 从 DOM 中移除 tooltip 元素并清空引用 */
	// @skill-anchor remove - 销毁 tooltip（移除 DOM）
	remove() {
		if (this.div) {
			this.div.remove();
			this.div = null;
		}
	}
}
