//  <!-- SYNC_COMMENTS_START -->
/* @skill-sig file src/panel/interacts/tooltip-interact.js - TooltipManager 类，全局工具提示管理器，提供显隐/移动/内容更新能力 */
/* @skill-class TooltipManager
   constructor() - 初始化，div 初始为 null 首次显示时创建
   ensureDiv() : HTMLElement - 确保 tooltip DOM 元素存在并返回
   show(html, x, y) : void - 在指定位置显示 tooltip（设置 innerHTML + display:block + left/top）
   move(x, y) : void - 移动 tooltip 到新位置（仅可见时生效）
   hide() : void - 隐藏 tooltip（display:none，不移除 DOM）
   remove() : void - 从 DOM 中移除 tooltip 元素并清空引用
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
	/** 初始化时 div 为 null，首次显示时创建 */
	constructor() {
		this.div = null;
	}

	/**
	 * 确保 tooltip 的 DOM 元素存在
	 * 如果 div 尚未创建，则创建并追加到 document.body
	 * @returns {HTMLElement} tooltip 的 div 元素
	 */
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
	move(x, y) {
		if (this.div && this.div.style.display === "block") {
			this.div.style.left = x + 15 + "px";
			this.div.style.top = y + 15 + "px";
		}
	}

	/** 隐藏 tooltip（仅隐藏，不移除 DOM） */
	hide() {
		if (this.div) this.div.style.display = "none";
	}

	/** 从 DOM 中移除 tooltip 元素并清空引用 */
	remove() {
		if (this.div) {
			this.div.remove();
			this.div = null;
		}
	}
}
