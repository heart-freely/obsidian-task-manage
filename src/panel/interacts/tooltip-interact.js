// src/panel/interacts/tooltip-interact.js
export class TooltipManager {
    constructor() { this.div = null; }
    ensureDiv() { if (!this.div) { this.div = document.createElement('div'); this.div.className = 'dataview-tooltip'; document.body.appendChild(this.div); } return this.div; }
    show(html, x, y) { const div = this.ensureDiv(); div.innerHTML = html; div.style.display = 'block'; div.style.left = (x + 15) + 'px'; div.style.top = (y + 15) + 'px'; }
    move(x, y) { if (this.div && this.div.style.display === 'block') { this.div.style.left = (x + 15) + 'px'; this.div.style.top = (y + 15) + 'px'; } }
    hide() { if (this.div) this.div.style.display = 'none'; }
    remove() { if (this.div) { this.div.remove(); this.div = null; } }
}