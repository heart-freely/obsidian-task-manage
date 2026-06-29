// src/ui/component/tooltip/tooltip.ts

class TooltipManager {
	private div: HTMLElement | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;

	ensureDiv() {
		if (!this.div) {
			this.div = document.createElement("div");
			this.div.className = "dataview-tooltip";
			document.body.appendChild(this.div);

			// 全局隐藏 tooltip 的保险机制
			document.addEventListener("mousemove", (e) => {
				const target = e.target as HTMLElement;
				if (
					!target.closest(".task-item") &&
					!target.closest(".gantt-bar") &&
					!target.closest(".cal-task-item") &&
					!target.closest(".cal-span-line") &&
					!target.closest(".task-progress-bar") &&
					!target.closest(".cal-more-indicator") &&
					!target.closest(".timeline-bar") // ← 添加
				) {
					if (this.hideTimer) clearTimeout(this.hideTimer);
					this.hideTimer = setTimeout(() => this.hide(), 100);
				}
			});
		}
		return this.div;
	}

	show(html: string, x: number, y: number) {
		if (this.hideTimer) clearTimeout(this.hideTimer);
		const div = this.ensureDiv();
		div.innerHTML = html;
		div.style.display = "block";
		div.style.left = x + 15 + "px";
		div.style.top = y + 15 + "px";
	}

	move(x: number, y: number) {
		if (this.div && this.div.style.display === "block") {
			this.div.style.left = x + 15 + "px";
			this.div.style.top = y + 15 + "px";
		}
	}

	hide() {
		if (this.div) this.div.style.display = "none";
	}

	remove() {
		if (this.div) {
			this.div.remove();
			this.div = null;
		}
	}
}

export const tooltip = new TooltipManager();
// ========== ECharts tooltip 通用配置 ==========

/**
 * 获取 ECharts tooltip 通用配置
 * 深色背景风格，与卡片简洁模式 tooltip 样式一致
 */
export function getEChartsTooltipConfig(trigger: "item" | "axis" = "item") {
	return {
		trigger,
		backgroundColor: "rgba(0, 0, 0, 0.85)",
		borderColor: "transparent",
		textStyle: {
			color: "#fff",
			fontSize: 11,
		},
		extraCssText:
			"border-radius:6px;padding:8px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.3);",
	};
}
