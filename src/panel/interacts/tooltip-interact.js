// src/panel/interacts/tooltip-interact.js

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
