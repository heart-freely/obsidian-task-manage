// src/panel/interact/interact-tooltip.js

export class TooltipManager {
    constructor() {
        this.div = null;
    }

    /** 确保 tooltip DOM 存在（挂载到 body） */
    ensureDiv() {
        if (!this.div) {
            this.div = document.createElement('div');
            this.div.className = 'dataview-tooltip';
            document.body.appendChild(this.div);
        }
        return this.div;
    }

    /** 显示 tooltip（HTML 内容，位置） */
    show(html, x, y) {
        const div = this.ensureDiv();
        div.innerHTML = html;
        div.style.display = 'block';
        div.style.left = (x + 15) + 'px';
        div.style.top = (y + 15) + 'px';
    }

    /** 移动时更新位置 */
    move(x, y) {
        if (this.div && this.div.style.display === 'block') {
            this.div.style.left = (x + 15) + 'px';
            this.div.style.top = (y + 15) + 'px';
        }
    }

    /** 隐藏 */
    hide() {
        if (this.div) {
            this.div.style.display = 'none';
        }
    }

    /** 移除 DOM */
    remove() {
        if (this.div) {
            this.div.remove();
            this.div = null;
        }
    }
}