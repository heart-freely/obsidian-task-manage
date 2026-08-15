// src/ui/component/tooltip/tooltip.ts


class TooltipManager {
	private div: HTMLElement | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;

	ensureDiv() {
		if (!this.div) {
			this.div = createEl("div");
			this.div.className = "dataview-tooltip";
			document.body.appendChild(this.div);
			document.addEventListener("mousemove", (e) => {
				const t = e.target as HTMLElement;
				if (
					!t.closest(".task-item") &&
					!t.closest(".gantt-bar") &&
					!t.closest(".cal-task-item") &&
					!t.closest(".cal-span-line") &&
					!t.closest(".task-progress-bar") &&
					!t.closest(".cal-more-indicator") &&
					!t.closest(".timeline-bar") &&
					!t.closest(".year-view-day")
				) {
					if (this.hideTimer) window.clearTimeout(this.hideTimer);
					this.hideTimer = window.setTimeout(() => this.hide(), 100);
				}
			});
		}
		return this.div;
	}

	show(html: string, x: number, y: number) {
		if (this.hideTimer) window.clearTimeout(this.hideTimer);
		const div = this.ensureDiv();
		while (div.firstChild) div.removeChild(div.firstChild);
		html.split("<br>").forEach((part, i) => {
			if (i > 0) div.appendChild(createEl("br"));
			div.appendChild(document.createTextNode(part));
		});
		div.classList.remove("dataview-tooltip-hidden");
		div.classList.add("dataview-tooltip-visible");
		const padding = 15;
		let left = x + padding,
			top = y + padding;
		div.style.setProperty("left", left + "px");
		div.style.setProperty("top", top + "px");
		const rect = div.getBoundingClientRect();
		if (rect.right > window.innerWidth) left = x - rect.width - padding;
		if (rect.bottom > window.innerHeight) top = y - rect.height - padding;
		if (left < 0) left = padding;
		if (top < 0) top = padding;
		div.style.setProperty("left", left + "px");
		div.style.setProperty("top", top + "px");
	}

	move(x: number, y: number) {
		if (this.div?.classList.contains("dataview-tooltip-visible")) {
			const padding = 15;
			let left = x + padding,
				top = y + padding;
			const rect = this.div.getBoundingClientRect();
			if (rect.right > window.innerWidth) left = x - rect.width - padding;
			if (rect.bottom > window.innerHeight)
				top = y - rect.height - padding;
			if (left < 0) left = padding;
			if (top < 0) top = padding;
			this.div.style.setProperty("left", left + "px");
			this.div.style.setProperty("top", top + "px");
		}
	}

	hide() {
		if (this.div) {
			this.div.classList.remove("dataview-tooltip-visible");
			this.div.classList.add("dataview-tooltip-hidden");
		}
	}
	remove() {
		if (this.div) {
			this.div.remove();
			this.div = null;
		}
	}
}

export const tooltip = new TooltipManager();
export function getEChartsTooltipConfig(trigger: "item" | "axis" = "item") {
	return {
		trigger,
		backgroundColor: "rgba(0, 0, 0, 0.85)",
		borderColor: "transparent",
		textStyle: { color: "#fff", fontSize: 11 },
		extraCssText:
			"border-radius:6px;padding:8px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.3);",
	};
}
