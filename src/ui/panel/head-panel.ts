// src/ui/panel/head-panel.ts
import { Component } from "obsidian";

/**
 * 头部面板组件
 * 负责显示视图切换、筛选条件等头部控件
 */
export class HeadPanel extends Component {
	container: HTMLElement;
	viewBtns: HTMLElement[] = [];
	filterInput: HTMLInputElement | null = null;
	onViewChange?: (view: string) => void;
	onFilterChange?: (filter: string) => void;

	constructor(container: HTMLElement) {
		super();
		this.container = container;
	}

	onload() {
		// 使用 CSS 类替代直接样式操作
		// 原代码：this.container.style.display = "flex";
		// 原代码：this.container.style.alignItems = "center";
		// 原代码：this.container.style.justifyContent = "space-between";
		// 原代码：this.container.style.padding = "8px 12px";
		// 原代码：this.container.style.gap = "8px";
		// 原代码：this.container.style.borderBottom = "1px solid var(--background-modifier-border)";
		// 原代码：this.container.style.flexShrink = "0";
		this.container.addClass(
			"task-head-panel",
			"task-flex",
			"task-items-center",
			"task-justify-between",
			"task-px-3",
			"task-py-2",
			"task-gap-2",
			"task-border-bottom",
			"task-flex-shrink-0",
		);

		// 左侧：视图切换按钮组
		// 原代码：const leftGroup = this.container.createDiv();
		// 原代码：leftGroup.style.display = "flex";
		// 原代码：leftGroup.style.gap = "4px";
		const leftGroup = this.container.createDiv("task-flex task-gap-1");

		const views = ["列表", "看板", "日历", "甘特图", "矩阵"];
		views.forEach((view) => {
			const btn = leftGroup.createEl("button", {
				text: view,
				cls: "task-head-btn task-view-btn",
			});
			// 原代码：btn.style.padding = "4px 12px";
			// 原代码：btn.style.borderRadius = "16px";
			// 原代码：btn.style.border = "none";
			// 原代码：btn.style.cursor = "pointer";
			// 原代码：btn.style.background = "var(--interactive-normal)";
			// 原代码：btn.style.color = "var(--text-normal)";
			btn.addClass(
				"task-px-3",
				"task-py-1",
				"task-rounded-full",
				"task-border-none",
				"task-clickable",
				"task-bg-interactive-normal",
				"task-text-normal",
			);
			btn.dataset.view = view;
			btn.onclick = () => {
				this.setActiveView(view);
				if (this.onViewChange) this.onViewChange(view);
			};
			this.viewBtns.push(btn);
		});

		// 默认激活第一个视图
		if (this.viewBtns.length > 0) {
			this.viewBtns[0].addClass("active");
			// 原代码：this.viewBtns[0].style.background = "var(--interactive-accent)";
			// 原代码：this.viewBtns[0].style.color = "white";
			this.viewBtns[0].addClass("task-bg-accent", "task-text-white");
		}

		// 右侧：筛选输入框
		// 原代码：const rightGroup = this.container.createDiv();
		// 原代码：rightGroup.style.display = "flex";
		// 原代码：rightGroup.style.alignItems = "center";
		// 原代码：rightGroup.style.gap = "8px";
		const rightGroup = this.container.createDiv(
			"task-flex task-items-center task-gap-2",
		);

		// 原代码：const searchIcon = rightGroup.createSpan("🔍");
		// 原代码：searchIcon.style.fontSize = "14px";
		rightGroup.createSpan("🔍", { cls: "task-text-sm" });

		this.filterInput = rightGroup.createEl("input", {
			type: "text",
			placeholder: "筛选任务...",
			cls: "task-head-filter-input",
		});
		// 原代码：this.filterInput.style.padding = "4px 8px";
		// 原代码：this.filterInput.style.borderRadius = "12px";
		// 原代码：this.filterInput.style.border = "1px solid var(--background-modifier-border)";
		// 原代码：this.filterInput.style.background = "var(--background-primary)";
		// 原代码：this.filterInput.style.color = "var(--text-normal)";
		// 原代码：this.filterInput.style.fontSize = "13px";
		// 原代码：this.filterInput.style.minWidth = "200px";
		this.filterInput.addClass(
			"task-px-2",
			"task-py-1",
			"task-rounded-full",
			"task-border",
			"task-bg-primary",
			"task-text-normal",
			"task-text-sm",
			"task-min-w-200",
		);
		this.filterInput.addEventListener("input", () => {
			if (this.onFilterChange)
				this.onFilterChange(this.filterInput!.value);
		});
	}

	/**
	 * 设置当前激活的视图
	 */
	setActiveView(view: string) {
		this.viewBtns.forEach((btn) => {
			const isActive = btn.dataset.view === view;
			btn.toggleClass("active", isActive);
			btn.toggleClass("task-bg-accent", isActive);
			btn.toggleClass("task-text-white", isActive);
			// 原代码：btn.style.background = isActive ? "var(--interactive-accent)" : "var(--interactive-normal)";
			// 原代码：btn.style.color = isActive ? "white" : "var(--text-normal)";
			if (!isActive) {
				btn.removeClass("task-bg-accent", "task-text-white");
				btn.addClass("task-bg-interactive-normal", "task-text-normal");
			}
		});
	}

	/**
	 * 获取当前筛选关键词
	 */
	getFilterText(): string {
		return this.filterInput?.value || "";
	}

	/**
	 * 设置筛选关键词（外部调用）
	 */
	setFilterText(text: string) {
		if (this.filterInput) {
			this.filterInput.value = text;
			if (this.onFilterChange) this.onFilterChange(text);
		}
	}

	onunload() {
		// 移除所有添加的类
		this.container.removeClass(
			"task-head-panel",
			"task-flex",
			"task-items-center",
			"task-justify-between",
			"task-px-3",
			"task-py-2",
			"task-gap-2",
			"task-border-bottom",
			"task-flex-shrink-0",
		);
		this.viewBtns.forEach((btn) => {
			btn.removeClass(
				"task-px-3",
				"task-py-1",
				"task-rounded-full",
				"task-border-none",
				"task-clickable",
				"task-bg-interactive-normal",
				"task-text-normal",
				"task-bg-accent",
				"task-text-white",
			);
		});
		if (this.filterInput) {
			this.filterInput.removeClass(
				"task-px-2",
				"task-py-1",
				"task-rounded-full",
				"task-border",
				"task-bg-primary",
				"task-text-normal",
				"task-text-sm",
				"task-min-w-200",
			);
		}
	}
}
