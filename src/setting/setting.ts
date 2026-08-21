// src/setting/setting.ts

import { App, Notice, PluginSettingTab, setIcon, Setting } from "obsidian";
import { forceReindexAll } from "../core/command";
import { PathFilterConfig, TaskItemFilterConfig, updateTaskFileConfig } from "../core/config/config";
import { syncProgressConfig } from "../core/config/progress-config";
import { DataManager } from "../core/data/data-manager";
import { AppLike, ManageViewLike } from "../type/type";
import { safeMergeConfig } from "../util/validate-utils";

export type ProgressDisplayMode = "graphical" | "text" | "both" | "none";
export type ProgressTextFormat =
	| "percentage"
	| "bracketPercentage"
	| "fraction"
	| "bracketFraction"
	| "detailed"
	| "custom"
	| "range-based";

export interface ProgressRange {
	min: number;
	max: number;
	text: string;
}

export interface TaskManageSettings {
	taskRootPath: string;
	folderFilters: PathFilterConfig[];
	fileFilters: PathFilterConfig[];
	headingFilters: PathFilterConfig[];
	taskItemFilters: TaskItemFilterConfig[];
	// ===== 进度显示 =====
	enableProgressDisplay: boolean;
	progressDisplayMode: ProgressDisplayMode;
	progressTextFormat: ProgressTextFormat;
	customProgressFormat: string;
	supportHoverProgressInfo: boolean;
	countSubLevel: boolean;
	hideProgressBarBasedOnConditions: boolean;
	hideProgressBarTags: string;
	hideProgressBarFolders: string;
	hideProgressBarMetadata: string;
	// ===== 编辑器进度条 =====
	enableProgressbarInReadingMode: boolean;
	addProgressBarToNonTaskBullet: boolean;
	addTaskProgressBarToHeading: boolean;
	// ===== 进度显示（对齐 taskgenius）=====
	showProgressBarBasedOnHeading: string;
	customizeProgressRanges: boolean;
	progressRanges: ProgressRange[];
}

export const DEFAULT_SETTINGS: TaskManageSettings = {
	taskRootPath: "",
	folderFilters: [
		{
			pattern: "",
			caseSensitive: false,
			wholeWord: false,
			useRegex: false,
			exclude: false,
		},
	],
	fileFilters: [
		{
			pattern: "",
			caseSensitive: false,
			wholeWord: false,
			useRegex: false,
			exclude: false,
		},
	],
	headingFilters: [
		{
			pattern: "",
			caseSensitive: false,
			wholeWord: false,
			useRegex: false,
			exclude: false,
		},
	],
	taskItemFilters: [{ pattern: "", exclude: false }],
	// ===== 进度显示 =====
	enableProgressDisplay: true,
	progressDisplayMode: "graphical",
	progressTextFormat: "bracketFraction",
	customProgressFormat: "[{{COMPLETED}}/{{TOTAL}}]",
	supportHoverProgressInfo: true,
	countSubLevel: true,
	hideProgressBarBasedOnConditions: false,
	hideProgressBarTags: "",
	hideProgressBarFolders: "",
	hideProgressBarMetadata: "",
	// ===== 编辑器进度条 =====
	enableProgressbarInReadingMode: true,
	addProgressBarToNonTaskBullet: false,
	addTaskProgressBarToHeading: false,
	// ===== 进度显示（对齐 taskgenius）=====
	showProgressBarBasedOnHeading: "",
	customizeProgressRanges: false,
	progressRanges: [
		{ min: 0, max: 20, text: "刚开始 {{PROGRESS}}%" },
		{ min: 20, max: 40, text: "进行中 {{PROGRESS}}%" },
		{ min: 40, max: 60, text: "完成一半 {{PROGRESS}}%" },
		{ min: 60, max: 80, text: "进展良好 {{PROGRESS}}%" },
		{ min: 80, max: 100, text: "即将完成 {{PROGRESS}}%" },
	],
};

const CONFIG_SCHEMA: Record<string, string> = {
	taskRootPath: "string",
	folderFilters: "array",
	fileFilters: "array",
	headingFilters: "array",
	taskItemFilters: "array",
	progressDisplayMode: "string",
	progressTextFormat: "string",
	customProgressFormat: "string",
	supportHoverProgressInfo: "boolean",
	countSubLevel: "boolean",
	hideProgressBarBasedOnConditions: "boolean",
	hideProgressBarTags: "string",
	hideProgressBarFolders: "string",
	hideProgressBarMetadata: "string",
	enableProgressbarInReadingMode: "boolean",
	addProgressBarToNonTaskBullet: "boolean",
	addTaskProgressBarToHeading: "boolean",
	showProgressBarBasedOnHeading: "string",
	customizeProgressRanges: "boolean",
	progressRanges: "array",
};

interface PluginRef {
	settings: TaskManageSettings;
	saveAllSettings(): Promise<void>;
	manifest: {
		name: string;
		version: string;
		description: string;
		author: string;
		authorUrl?: string;
		fundingUrl?: string;
	};
}

export class TaskManageSettingTab extends PluginSettingTab {
	plugin: PluginRef;
	private folderCache: string[] | null = null;
	private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private currentCard = "task-filter";
	private sectionsRendered = false;
	private searchResults: Array<{ name: string; desc: string; cardId: string; el: HTMLElement }> = [];
	private selectedSearchIndex = -1;
	private searchResultsEl: HTMLElement | null = null;

	constructor(app: App, plugin: PluginRef) {
		super(app, plugin);
		this.plugin = plugin;
	}
	getSettingDefinitions() {
		return [];
	}
	hide() {
		if (this.saveDebounceTimer) {
			window.clearTimeout(this.saveDebounceTimer);
			this.saveDebounceTimer = null;
		}
		updateTaskFileConfig({
			rootPath: this.plugin.settings.taskRootPath || "",
			folderFilters: this.plugin.settings.folderFilters,
			fileFilters: this.plugin.settings.fileFilters,
			headingFilters: this.plugin.settings.headingFilters,
			taskItemFilters: this.plugin.settings.taskItemFilters,
		});
		syncProgressConfig(this.plugin.settings);
		void this.plugin.saveAllSettings();
		DataManager.getInstance().invalidate();
		this.refreshManageViews();
	}

	private async saveSettings(): Promise<void> {
		updateTaskFileConfig({
			rootPath: this.plugin.settings.taskRootPath || "",
			folderFilters: this.plugin.settings.folderFilters,
			fileFilters: this.plugin.settings.fileFilters,
			headingFilters: this.plugin.settings.headingFilters,
			taskItemFilters: this.plugin.settings.taskItemFilters,
		});
		syncProgressConfig(this.plugin.settings);
		// 立即刷新打开的视图，使进度显示设置马上生效
		this.refreshManageViews();

		if (this.saveDebounceTimer) window.clearTimeout(this.saveDebounceTimer);
		this.saveDebounceTimer = window.setTimeout(() => {
			void this.plugin.saveAllSettings();
			this.saveDebounceTimer = null;
		}, 300);
	}

	private refreshManageViews(): void {
		try {
			const leaves = this.app.workspace.getLeavesOfType("manage-view");
			for (const leaf of leaves) {
				const view = (leaf as { view?: ManageViewLike }).view;
				if (view && typeof view.refreshView === "function") {
					view.refreshView();
				}
			}
			// 强制打开的 Markdown 编辑器/阅读视图重新渲染进度条 Widget
			const mdLeaves = this.app.workspace.getLeavesOfType("markdown");
			for (const leaf of mdLeaves) {
				const v = leaf.view as {
					previewMode?: { rerender?: (force?: boolean) => void };
					editor?: {
						setCursor?: (pos: { line: number; ch: number }) => void;
						getCursor?: () => { line: number; ch: number };
					};
				};
				if (v.previewMode?.rerender) {
					v.previewMode.rerender(true);
				}
				// 触发 CodeMirror 更新以便 ViewPlugin 重建装饰（setCursor 会产生一次事务）
				if (v.editor?.setCursor && v.editor.getCursor) {
					const pos = v.editor.getCursor();
					v.editor.setCursor({ line: pos.line, ch: pos.ch });
				}
			}
		} catch (e) {
			console.warn("[TaskManage] 刷新视图失败:", e);
		}
	}

	display(): void {
		this.renderSettings();
	}

	private renderSettings(): void {
		this.folderCache = null;
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("task-settings");

		const headerBar = containerEl.createDiv({ cls: "task-settings-header-bar" });
		const titleEl = headerBar.createDiv({ cls: "task-settings-header-title" });
		titleEl.setText("Task Manage");
		const searchContainer = headerBar.createDiv({ cls: "task-settings-search-container" });
		const searchInputContainer = searchContainer.createDiv({ cls: "task-settings-search-input-container" });
		const searchIcon = searchInputContainer.createSpan({ cls: "task-settings-search-icon" });
		setIcon(searchIcon, "search");
		const searchInput = searchInputContainer.createEl("input", { type: "text" });
		searchInput.addClass("task-settings-search-input");
		searchInput.placeholder = "搜索设置...";
		const clearBtn = searchInputContainer.createEl("button", { cls: "task-settings-search-clear" });
		setIcon(clearBtn, "x");
		clearBtn.setCssStyles({ display: "none" });
		clearBtn.addEventListener("click", () => {
			searchInput.value = "";
			this.performSearch(searchInput.value);
			searchInput.focus();
		});

		const resultsContainer = searchContainer.createDiv({ cls: "task-settings-search-results" });
		resultsContainer.setCssStyles({ display: "none" });
		this.searchResultsEl = resultsContainer;

		searchInput.addEventListener("input", () => {
			clearBtn.setCssStyles({ display: searchInput.value ? "flex" : "none" });
			this.performSearch(searchInput.value);
		});
		searchInput.addEventListener("keydown", (e: KeyboardEvent) => this.handleSearchKeydown(e));
		searchInput.addEventListener("blur", () => {
			window.setTimeout(() => this.hideSearchResults(), 150);
		});

		const cards = [
			{ id: "task-index", name: "任务索引", icon: "database", category: "核心设置" },
			{ id: "task-filter", name: "任务过滤器", icon: "filter", category: "核心设置" },
			{ id: "plugin-config", name: "插件配置", icon: "settings", category: "核心设置" },
			{ id: "progress-display", name: "进度显示", icon: "trending-up", category: "状态与进度" },
			{ id: "task-status", name: "任务状态", icon: "list-checks", category: "状态与进度" },
			{ id: "about", name: "关于", icon: "info", category: "信息" },
		];

		const nav = containerEl.createDiv({ cls: "task-settings-nav" });
		["核心设置", "状态与进度", "信息"].forEach((catName) => {
			const cat = nav.createDiv({ cls: "task-settings-category" });
			const header = cat.createDiv({ cls: "task-settings-category-header" });
			header.setText(catName);
			const tabs = cat.createDiv({ cls: "task-settings-category-tabs" });
			cards
				.filter((c) => c.category === catName)
				.forEach((card) => {
					const tab = tabs.createDiv({ cls: "task-settings-card" });
					tab.setAttribute("data-card-id", card.id);
					const icon = tab.createSpan({ cls: "task-settings-card-icon" });
					setIcon(icon, card.icon);
					const label = tab.createSpan({ cls: "task-settings-card-label" });
					label.setText(card.name);
					tab.addEventListener("click", () => this.switchCard(card.id));
				});
		});

		const sections = containerEl.createDiv({ cls: "task-settings-sections" });

		const indexSection = this.createSection(sections, "task-index", "任务索引");
		this.renderIndexSection(indexSection);

		const filterSection = this.createSection(sections, "task-filter", "任务过滤器");
		this.renderTaskFilterSection(filterSection);

		const pluginConfigSection = this.createSection(sections, "plugin-config", "插件配置");
		this.renderPluginConfigSection(pluginConfigSection);

		const progressSection = this.createSection(sections, "progress-display", "进度显示");
		this.renderProgressDisplaySection(progressSection);

		const statusSection = this.createSection(sections, "task-status", "任务状态");
		this.renderEmptyCardPlaceholder(statusSection, "任务状态配置将在后续版本开放");

		const aboutSection = this.createSection(sections, "about", "关于");
		this.renderAboutSection(aboutSection);

		// 重渲染时保持当前卡片，首次进入显示卡片列表
		if (this.currentCard && this.sectionsRendered) {
			this.showSection(this.currentCard);
		} else {
			this.goBack();
		}
		this.sectionsRendered = true;
	}

	private performSearch(query: string): void {
		const resultsEl = this.searchResultsEl;
		if (!resultsEl) return;
		this.searchResults = [];
		this.selectedSearchIndex = -1;

		const q = query.trim().toLowerCase();
		if (!q) {
			this.hideSearchResults();
			return;
		}

		const items: Array<{ name: string; desc: string; cardId: string; el: HTMLElement }> = [];
		this.containerEl.querySelectorAll(".task-settings-section").forEach((sec) => {
			const cardId = sec.getAttribute("data-card-id") || "";
			sec.querySelectorAll(".setting-item").forEach((item) => {
				const nameEl = item.querySelector(".setting-item-name");
				const descEl = item.querySelector(".setting-item-description");
				const name = (nameEl?.textContent || "").trim();
				const desc = (descEl?.textContent || "").trim();
				if (!name) return;
				items.push({ name, desc, cardId, el: item as HTMLElement });
			});
		});

		this.searchResults = items.filter(
			(it) =>
				it.name.toLowerCase().includes(q) ||
				it.desc.toLowerCase().includes(q),
		);

		resultsEl.empty();
		if (this.searchResults.length === 0) {
			resultsEl.createDiv({
				cls: "task-settings-search-no-result",
				text: "未找到相关设置",
			});
			resultsEl.setCssStyles({ display: "block" });
			return;
		}

		this.searchResults.forEach((it, index) => {
			const r = resultsEl.createDiv({ cls: "task-settings-search-result" });
			r.setAttribute("data-index", String(index));
			const nameEl = r.createDiv({ cls: "task-settings-search-result-name" });
			nameEl.textContent = it.name;
			const metaEl = r.createDiv({ cls: "task-settings-search-result-meta" });
			metaEl.textContent = this.getCardName(it.cardId);
			if (it.desc) {
				const descEl = r.createDiv({ cls: "task-settings-search-result-desc" });
				descEl.textContent = it.desc;
			}
			r.addEventListener("mousedown", (e) => {
				e.preventDefault();
				this.selectSearchResult(it);
			});
			r.addEventListener("mouseenter", () => {
				this.setSelectedSearchIndex(index);
			});
		});
		resultsEl.setCssStyles({ display: "block" });
		this.setSelectedSearchIndex(0);
	}

	private getCardName(cardId: string): string {
		const map: Record<string, string> = {
			"task-index": "任务索引",
			"task-filter": "任务过滤器",
			"plugin-config": "插件配置",
			"progress-display": "进度显示",
			"task-status": "任务状态",
			about: "关于",
		};
		return map[cardId] || cardId;
	}

	private setSelectedSearchIndex(index: number): void {
		const resultsEl = this.searchResultsEl;
		if (!resultsEl) return;
		resultsEl.querySelectorAll(".task-settings-search-result").forEach((r) => {
			r.removeClass("task-settings-search-result-selected");
		});
		this.selectedSearchIndex = index;
		if (index >= 0) {
			const sel = resultsEl.querySelector(`[data-index="${index}"]`);
			if (sel) {
				sel.addClass("task-settings-search-result-selected");
				sel.scrollIntoView({ block: "nearest" });
			}
		}
	}

	private handleSearchKeydown(e: KeyboardEvent): void {
		if (!this.searchResultsEl || this.searchResultsEl.style.display === "none") {
			if (e.key === "Escape") this.hideSearchResults();
			return;
		}
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				if (this.selectedSearchIndex < this.searchResults.length - 1)
					this.setSelectedSearchIndex(this.selectedSearchIndex + 1);
				break;
			case "ArrowUp":
				e.preventDefault();
				if (this.selectedSearchIndex > 0)
					this.setSelectedSearchIndex(this.selectedSearchIndex - 1);
				break;
			case "Enter":
				e.preventDefault();
				if (this.selectedSearchIndex >= 0 && this.searchResults[this.selectedSearchIndex]) {
					this.selectSearchResult(this.searchResults[this.selectedSearchIndex]);
				}
				break;
			case "Escape":
				e.preventDefault();
				this.hideSearchResults();
				break;
		}
	}

	private selectSearchResult(item: { name: string; desc: string; cardId: string; el: HTMLElement }): void {
		this.hideSearchResults();
		this.switchCard(item.cardId);
		window.setTimeout(() => {
			item.el.scrollIntoView({ block: "center" });
			item.el.addClass("task-settings-item-highlight");
			window.setTimeout(() => {
				item.el.removeClass("task-settings-item-highlight");
			}, 2000);
		}, 100);
	}

	private hideSearchResults(): void {
		if (this.searchResultsEl) {
			this.searchResultsEl.setCssStyles({ display: "none" });
			this.searchResultsEl.empty();
		}
		this.searchResults = [];
		this.selectedSearchIndex = -1;
	}

	private createSection(sections: HTMLElement, cardId: string, title: string): HTMLElement {
		const section = sections.createDiv({ cls: "task-settings-section" });
		section.setAttribute("data-card-id", cardId);

		const header = section.createDiv({ cls: "task-settings-section-header" });
		const backBtn = header.createEl("button", { cls: "task-settings-back-btn" });
		backBtn.addClass("task-settings-header-button");
		const backIcon = backBtn.createSpan({ cls: "task-settings-header-button-icon" });
		setIcon(backIcon, "arrow-left");
		const backText = backBtn.createSpan({ cls: "task-settings-header-button-text" });
		backText.setText("返回主设置");
		backBtn.addEventListener("click", () => this.goBack());

		const titleEl = header.createDiv({ cls: "task-settings-section-title" });
		titleEl.setText(title);

		return section;
	}

	private switchCard(cardId: string): void {
		this.currentCard = cardId;
		this.containerEl.querySelectorAll(".task-settings-card").forEach((tab) => {
			if (tab.getAttribute("data-card-id") === cardId) {
				tab.addClass("task-settings-card-active");
			} else {
				tab.removeClass("task-settings-card-active");
			}
		});
		this.showSection(cardId);
	}

	private showSection(cardId: string): void {
		const nav = this.containerEl.querySelector(".task-settings-nav");
		if (nav) (nav as HTMLElement).setCssStyles({ display: "none" });
		this.containerEl.querySelectorAll(".task-settings-section").forEach((sec) => {
			const el = sec as HTMLElement;
			if (sec.getAttribute("data-card-id") === cardId) {
				sec.addClass("task-settings-section-active");
				el.setCssStyles({ display: "block" });
			} else {
				sec.removeClass("task-settings-section-active");
				el.setCssStyles({ display: "none" });
			}
		});
	}

	private goBack(): void {
		const nav = this.containerEl.querySelector(".task-settings-nav");
		if (nav) (nav as HTMLElement).setCssStyles({ display: "flex" });
		this.containerEl.querySelectorAll(".task-settings-section").forEach((sec) => {
			sec.removeClass("task-settings-section-active");
			(sec as HTMLElement).setCssStyles({ display: "none" });
		});
	}

	private renderEmptyCardPlaceholder(el: HTMLElement, text: string): void {
		const ph = el.createDiv({ cls: "task-settings-empty" });
		const icon = ph.createSpan({ cls: "task-settings-empty-icon" });
		setIcon(icon, "construction");
		const msg = ph.createDiv({ cls: "task-settings-empty-text" });
		msg.setText(text);
	}

	private renderIndexSection(el: HTMLElement): void {
		new Setting(el)
			.setName("重建索引")
			.setDesc(
				"强制重新扫描所有任务文件并重建索引。当任务缺失、状态或日期显示不正确时使用。",
			)
			.addButton((button) => {
				button
					.setButtonText("重建索引")
					.setClass("mod-warning")
					.onClick(() => {
						void forceReindexAll(this.app as unknown as AppLike);
					});
			});
	}

	private renderTaskFilterSection(el: HTMLElement): void {
		new Setting(el).setName("任务路径").setHeading();

		const pathListContainer = el.createDiv({ cls: "path-list" });
		const rootPath = this.plugin.settings.taskRootPath || "";
		const paths = rootPath
			.split(",")
			.map((p: string) => p.trim())
			.filter(Boolean);
		if (paths.length === 0) paths.push("");

		const saveAllPaths = async () => {
			this.plugin.settings.taskRootPath = paths.filter(Boolean).join(",");
			await this.saveSettings();
		};

		const renderPaths = () => {
			pathListContainer.empty();
			paths.forEach((path: string, index: number) => {
				const pathRow = pathListContainer.createDiv({
					cls: "path-row",
				});
				pathRow.addClass(
					"task-flex",
					"task-items-start",
					"task-gap-2",
					"task-mb-1",
					"task-relative",
				);

				const inputWrapper = pathRow.createDiv();
				inputWrapper.addClass("task-flex-1", "task-relative");

				const pathInput = inputWrapper.createEl("input", {
					type: "text",
					attr: { placeholder: "输入关键字搜索文件夹，默认根目录" },
				});
				pathInput.value = path;
				pathInput.addClass("task-w-full");

				const dropdown = inputWrapper.createDiv({
					cls: "folder-dropdown",
				});
				dropdown.addClass(
					"task-hidden",
					"task-absolute",
					"task-top-full",
					"task-left-0",
					"task-right-0",
					"task-max-h-50",
					"task-overflow-y-auto",
					"task-bg-primary",
					"task-border",
					"task-rounded",
					"task-z-1000",
				);

				let dropdownTimer: ReturnType<typeof setTimeout> | null = null;
				let hasUserInteracted = false;

				const showDropdown = (keyword: string) => {
					if (dropdownTimer) window.clearTimeout(dropdownTimer);
					if (
						!dropdown.hasClass("task-hidden") &&
						dropdown.dataset["keyword"] === keyword
					)
						return;
					dropdown.dataset["keyword"] = keyword;
					dropdownTimer = window.setTimeout(() => {
						try {
							this.renderFolderDropdown(
								dropdown,
								keyword,
								(selectedPath: string) => {
									pathInput.value = selectedPath;
									dropdown.addClass("task-hidden");
									paths[index] = selectedPath;
									void saveAllPaths();
								},
							);
							dropdown.removeClass("task-hidden");
						} catch (e: unknown) {
							console.warn("[TaskManage] 下拉渲染失败:", e);
						}
					}, 200);
				};

				pathInput.addEventListener("mousedown", () => {
					hasUserInteracted = true;
				});
				pathInput.addEventListener("focus", () => {
					if (hasUserInteracted) showDropdown(pathInput.value.trim());
				});
				pathInput.addEventListener("input", () => {
					if (hasUserInteracted) showDropdown(pathInput.value.trim());
				});
				pathInput.addEventListener("blur", () => {
					hasUserInteracted = false;
					const value = pathInput.value.trim();
					if (value !== paths[index]) {
						paths[index] = value;
						void saveAllPaths();
					}
					window.setTimeout(() => {
						dropdown.addClass("task-hidden");
					}, 150);
				});
				pathInput.addEventListener("keydown", (e: KeyboardEvent) => {
					if (e.key === "Enter") {
						e.preventDefault();
						const value = pathInput.value.trim();
						if (value && value !== paths[index]) {
							paths[index] = value;
							void saveAllPaths();
						}
						dropdown.addClass("task-hidden");
					}
				});

				const delBtn = pathRow.createEl("button", {
					text: "✕",
					cls: "path-del-btn",
				});
				delBtn.addClass(
					"task-border-none",
					"task-bg-transparent",
					"task-clickable",
					"task-text-muted",
					"task-flex-shrink-0",
					"task-mt-1",
				);
				delBtn.addEventListener("click", () => {
					paths.splice(index, 1);
					if (paths.length === 0) paths.push("");
					void saveAllPaths();
					renderPaths();
				});
			});
		};

		renderPaths();

		const addPathBtn = el.createEl("button", {
			text: "+ 添加任务路径",
			cls: "filter-add-btn",
		});
		addPathBtn.addClass("task-mt-1", "task-mb-2", "task-px-3", "task-py-1");
		addPathBtn.addEventListener("click", () => {
			paths.push("");
			void saveAllPaths();
			renderPaths();
		});

		new Setting(el).setName("匹配任务").setHeading();

		const row1 = el.createDiv({ cls: "filter-two-col" });
		row1.addClass(
			"task-grid",
			"task-grid-cols-2",
			"task-gap-3",
			"task-mb-2",
		);

		const folderCol = row1.createDiv();
		new Setting(folderCol).setName("任务文件夹").setHeading();
		this.renderFilterList(folderCol, "folderFilters", "任务文件夹匹配");

		const fileCol = row1.createDiv();
		new Setting(fileCol).setName("任务文件").setHeading();
		this.renderFilterList(fileCol, "fileFilters", "任务文件名匹配");

		const row2 = el.createDiv({ cls: "filter-two-col" });
		row2.addClass(
			"task-grid",
			"task-grid-cols-2",
			"task-gap-3",
			"task-mt-2",
		);

		const headingCol = row2.createDiv();
		new Setting(headingCol).setName("任务标题").setHeading();
		this.renderFilterList(headingCol, "headingFilters", "任务标题匹配");

		const taskItemCol = row2.createDiv();
		new Setting(taskItemCol).setName("任务项").setHeading();
		this.renderTaskItemList(taskItemCol);
	}

	private renderProgressDisplaySection(el: HTMLElement): void {
		new Setting(el).setName("进度显示").setDesc("自定义任务进度条的显示方式").setHeading();

		const s = this.plugin.settings;

		// 启用进度显示总开关（对齐 taskgenius 工作流卡片开关）
		new Setting(el)
			.setName("启用进度显示")
			.setDesc("启用后显示进度条；关闭后隐藏所有进度条")
			.addToggle((toggle) =>
				toggle
					.setValue(s.enableProgressDisplay)
					.onChange(async (value) => {
						s.enableProgressDisplay = value;
						await this.saveSettings();
						this.renderSettings();
					}),
			);

		if (!s.enableProgressDisplay) return;

		new Setting(el)
			.setName("显示模式")
			.setDesc("选择进度条的显示方式")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("graphical", "图形进度条")
					.addOption("text", "纯文本进度")
					.addOption("both", "图形 + 文本")
					.addOption("none", "不显示进度")
					.setValue(s.progressDisplayMode)
					.onChange(async (value) => {
						s.progressDisplayMode = value as typeof s.progressDisplayMode;
						await this.saveSettings();
						this.renderSettings();
					}),
			);

		// 文本格式（紧跟显示模式）
		const showTextOptions =
			s.progressDisplayMode === "text" || s.progressDisplayMode === "both";
		if (showTextOptions) {
			new Setting(el)
				.setName("文本格式")
				.setDesc("选择进度文本的展示格式")
				.addDropdown((dropdown) =>
					dropdown
						.addOption("percentage", "百分比 (75%)")
						.addOption("bracketPercentage", "括号百分比 ([75%])")
						.addOption("fraction", "分数 (3/4)")
						.addOption("bracketFraction", "括号分数 ([3/4])")
						.addOption("detailed", "详细 ([3✓ 1⟳ 0✗ 1? / 5])")
						.addOption("range-based", "基于进度范围文本")
						.addOption("custom", "自定义格式")
						.setValue(s.progressTextFormat)
						.onChange(async (value) => {
							s.progressTextFormat = value as typeof s.progressTextFormat;
							await this.saveSettings();
							this.renderSettings();
						}),
				);

			if (s.progressTextFormat === "custom") {
				new Setting(el)
					.setName("自定义格式")
					.setDesc(
						"可用占位符：{{COMPLETED}} {{TOTAL}} {{IN_PROGRESS}} {{PLANNED}} {{ABANDONED}} {{NOT_STARTED}} {{PERCENT}}",
					)
					.addText((text) =>
						text
							.setPlaceholder("[{{COMPLETED}}/{{TOTAL}}]")
							.setValue(s.customProgressFormat)
							.onChange(async (value) => {
								s.customProgressFormat = value;
								await this.saveSettings();
									await this.saveSettings();
							}),
					);
			}

			if (s.progressTextFormat === "range-based") {
				new Setting(el)
					.setName("自定义进度范围")
					.setDesc("按完成百分比显示不同的文本（{{PROGRESS}} 为百分比占位符）")
					.addToggle((toggle) =>
						toggle
							.setValue(s.customizeProgressRanges)
							.onChange(async (value) => {
								s.customizeProgressRanges = value;
								await this.saveSettings();
								this.renderSettings();
							}),
					);

				if (s.customizeProgressRanges) {
					s.progressRanges.forEach((range, index) => {
						new Setting(el)
							.setName("范围 " + (index + 1) + ": " + range.min + "%-" + range.max + "%")
							.setDesc("使用 {{PROGRESS}} 作为百分比占位符")
							.addText((text) =>
								text
									.setPlaceholder("文本模板")
									.setValue(range.text)
									.onChange(async (value) => {
										s.progressRanges[index].text = value;
										await this.saveSettings();
									await this.saveSettings();
									}),
							)
							.addButton((button) => {
								button.setButtonText("删除").onClick(async () => {
									s.progressRanges.splice(index, 1);
									await this.saveSettings();
									this.renderSettings();
								});
							});
					});

					const addRow = el.createDiv({ cls: "task-flex" });
					addRow.addClass("task-gap-2", "task-mt-2");
					const minInput = addRow.createEl("input", { type: "text", attr: { placeholder: "最小%" } });
					const maxInput = addRow.createEl("input", { type: "text", attr: { placeholder: "最大%" } });
					const textInput = addRow.createEl("input", { type: "text", attr: { placeholder: "文本 ({{PROGRESS}})" } });
					const addBtn = addRow.createEl("button", { text: "添加", cls: "filter-add-btn" });
					addBtn.addEventListener("click", () => {
						const min = parseInt(minInput.value);
						const max = parseInt(maxInput.value);
						const text = textInput.value;
						if (isNaN(min) || isNaN(max) || !text) return;
						s.progressRanges.push({ min, max, text });
						void this.saveSettings();
						this.renderSettings();
					});
				}
			}

		}

		// 统计子任务（文本格式之后）
		if (s.progressDisplayMode !== "none") {
			new Setting(el)
				.setName("统计子任务")
				.setDesc("生成进度条时递归统计所有子任务；关闭后仅统计直接子任务")
				.addToggle((toggle) =>
					toggle
						.setValue(s.countSubLevel)
						.onChange(async (value) => {
							s.countSubLevel = value;
							await this.saveSettings();
						}),
				);

			new Setting(el)
				.setName("悬停显示进度明细")
				.setDesc("鼠标悬停在进度条上时显示各状态的详细数量")
				.addToggle((toggle) =>
					toggle
						.setValue(s.supportHoverProgressInfo)
						.onChange(async (value) => {
							s.supportHoverProgressInfo = value;
							await this.saveSettings();
						}),
				);

			new Setting(el)
				.setName("为普通列表项添加进度条")
				.setDesc("为非任务 bullet（无复选框）显示其子任务的进度条")
				.addToggle((toggle) =>
					toggle
						.setValue(s.addProgressBarToNonTaskBullet)
						.onChange(async (value) => {
							s.addProgressBarToNonTaskBullet = value;
							await this.saveSettings();
						}),
				);

			new Setting(el)
				.setName("为标题添加进度条")
				.setDesc("在标题下显示该标题下所有任务的进度条")
				.addToggle((toggle) =>
					toggle
						.setValue(s.addTaskProgressBarToHeading)
						.onChange(async (value) => {
							s.addTaskProgressBarToHeading = value;
							await this.saveSettings();
						}),
				);

			// 在阅读模式中显示进度条（紧跟为标题添加进度条）
			new Setting(el)
				.setName("在阅读模式中显示进度条")
				.setDesc("在阅读视图中为父任务/标题显示进度条")
				.addToggle((toggle) =>
					toggle
						.setValue(s.enableProgressbarInReadingMode)
						.onChange(async (value) => {
							s.enableProgressbarInReadingMode = value;
							await this.saveSettings();
						}),
				);
		}

		new Setting(el).setName("隐藏进度条").setHeading();

		new Setting(el)
			.setName("基于条件隐藏进度条")
			.setDesc("启用后可按标签、文件夹或元数据隐藏特定任务的进度条")
			.addToggle((toggle) =>
				toggle
					.setValue(s.hideProgressBarBasedOnConditions)
					.onChange(async (value) => {
						s.hideProgressBarBasedOnConditions = value;
						await this.saveSettings();
						this.renderSettings();
					}),
			);

		if (s.hideProgressBarBasedOnConditions) {
			new Setting(el)
				.setName("按标签隐藏")
				.setDesc('指定隐藏进度条的标签（逗号分隔，不带 #）。例如："no-progress-bar,hide-progress"')
				.addText((text) =>
					text
						.setPlaceholder("no-progress-bar,hide-progress")
						.setValue(s.hideProgressBarTags)
						.onChange(async (value) => {
							s.hideProgressBarTags = value;
							await this.saveSettings();
						}),
				);

			new Setting(el)
				.setName("按文件夹隐藏")
				.setDesc('指定隐藏进度条的文件夹路径（逗号分隔）。例如："Daily Notes,Projects/Hidden"')
				.addText((text) =>
					text
						.setPlaceholder("Daily Notes,Projects/Hidden")
						.setValue(s.hideProgressBarFolders)
						.onChange(async (value) => {
							s.hideProgressBarFolders = value;
							await this.saveSettings();
						}),
				);

			new Setting(el)
				.setName("按元数据隐藏")
				.setDesc('指定文件 frontmatter 中隐藏进度条的键值（逗号分隔）。例如："hide-progress-bar: true"')
				.addText((text) =>
					text
						.setPlaceholder("hide-progress-bar: true")
						.setValue(s.hideProgressBarMetadata)
						.onChange(async (value) => {
							s.hideProgressBarMetadata = value;
							await this.saveSettings();
						}),
				);

			new Setting(el)
				.setName("仅在这些标题下显示进度条")
				.setDesc('逗号分隔的标题列表，仅在匹配的标题下显示进度条。留空表示全部显示。例如："任务汇总,周报"')
				.addText((text) =>
					text
						.setPlaceholder("任务汇总,周报")
						.setValue(s.showProgressBarBasedOnHeading)
						.onChange(async (value) => {
							s.showProgressBarBasedOnHeading = value;
							await this.saveSettings();
						}),
				);
		}

	}


	private renderPluginConfigSection(el: HTMLElement): void {
		new Setting(el).setName("插件配置").setHeading();

		const ioRow = el.createDiv();
		ioRow.addClass("task-flex", "task-gap-3");

		const importBtn = ioRow.createEl("button", {
			text: "📥 导入插件配置",
			cls: "filter-add-btn",
		});
		importBtn.addEventListener("click", () => {
			const input = createEl("input");
			input.type = "file";
			input.accept = ".json";
			input.onchange = () => {
				if (!input.files?.length) return;
				const file = input.files[0];
				file.text()
					.then((text: string) => {
						try {
							const data: unknown = JSON.parse(text);
							if (!data || typeof data !== "object") {
								new Notice("导入失败：文件格式不正确");
								return;
							}
							safeMergeConfig(
								this.plugin.settings as unknown as Record<
									string,
									unknown
								>,
								data as Record<string, unknown>,
								CONFIG_SCHEMA,
							);
							void this.saveSettings();
							this.renderSettings();
						} catch {
							new Notice("导入失败：文件格式不正确");
						}
					})
					.catch(() => {
						new Notice("导入失败：无法读取文件");
					});
			};
			input.click();
		});

		const exportBtn = ioRow.createEl("button", {
			text: "📤 导出插件配置",
			cls: "filter-add-btn",
		});
		exportBtn.addEventListener("click", () => {
			const data = {
				taskRootPath: this.plugin.settings.taskRootPath,
				folderFilters: this.plugin.settings.folderFilters,
				fileFilters: this.plugin.settings.fileFilters,
				headingFilters: this.plugin.settings.headingFilters,
				taskItemFilters: this.plugin.settings.taskItemFilters,
			};
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const a = createEl("a");
			a.href = URL.createObjectURL(blob);
			a.download = "task-manage-config.json";
			a.click();
		});
	}

	private renderAboutSection(el: HTMLElement): void {
		const m = this.plugin.manifest;
		new Setting(el).setName("关于").setDesc("版本 " + m.version).setHeading();
		new Setting(el).setName("描述").setDesc(m.description);
		if (m.author) {
			const authorSetting = new Setting(el).setName("作者");
			if (m.authorUrl) {
				authorSetting.descEl.createEl("a", {
					text: m.author,
					href: m.authorUrl,
					attr: { target: "_blank", rel: "noopener noreferrer" },
				});
			} else {
				authorSetting.setDesc(m.author);
			}
		}
	}

	private getFolders(): string[] {
		if (this.folderCache) return this.folderCache;
		try {
			const files: Array<{ path?: string; children?: unknown[] }> =
				this.app.vault.getAllLoadedFiles();
			const folders = new Set<string>();
			for (const file of files) {
				if (file && file.children) {
					const p = file.path || "";
					if (p) folders.add(p);
				}
			}
			this.folderCache = [...folders].sort();
			return this.folderCache;
		} catch (e: unknown) {
			console.warn("[TaskManage] 获取文件夹列表失败:", e);
			return [];
		}
	}

	private renderFolderDropdown(
		container: HTMLElement,
		keyword: string,
		callback: (path: string) => void,
	) {
		container.empty();
		const folders = this.getFolders();
		const filtered = keyword
			? folders.filter((p: string) =>
					p.toLowerCase().includes(keyword.toLowerCase()),
				)
			: folders;

		if (filtered.length === 0) {
			const empty = container.createDiv({
				text: "未找到匹配的文件夹",
				cls: "dropdown-empty",
			});
			empty.addClass("task-p-2", "task-text-muted", "task-text-xs");
			return;
		}

		const limit = 50;
		const displayItems = filtered.slice(0, limit);
		displayItems.forEach((path: string) => {
			const item = container.createDiv({ cls: "dropdown-item" });
			item.addClass(
				"task-px-2",
				"task-py-1",
				"task-clickable",
				"task-text-sm",
			);
			item.textContent = path;
			item.addEventListener("mouseenter", () => {
				item.addClass("task-dropdown-hover");
			});
			item.addEventListener("mouseleave", () => {
				item.removeClass("task-dropdown-hover");
			});
			item.addEventListener("mousedown", (e) => {
				e.preventDefault();
				callback(path);
			});
		});

		if (filtered.length > limit) {
			const more = container.createDiv({
				text: `... 还有 ${filtered.length - limit} 个结果`,
				cls: "dropdown-empty",
			});
			more.addClass(
				"task-px-2",
				"task-py-1",
				"task-text-muted",
				"task-text-xs",
			);
		}
	}

	private renderFilterList(
		containerEl: HTMLElement,
		key: "folderFilters" | "fileFilters" | "headingFilters",
		label: string,
	) {
		const filters: PathFilterConfig[] = this.plugin.settings[key] || [];
		const listContainer = containerEl.createDiv({ cls: "filter-list" });

		filters.forEach((filter: PathFilterConfig, index: number) => {
			this.renderFilterRow(listContainer, filter, key, index, label);
		});

		const addBtn = containerEl.createEl("button", {
			text: "+ 添加" + label,
			cls: "filter-add-btn",
		});
		addBtn.addClass("task-mt-1", "task-px-3", "task-py-1");
		addBtn.addEventListener("click", () => {
			filters.push({
				pattern: "",
				caseSensitive: false,
				wholeWord: false,
				useRegex: false,
				exclude: false,
			});
			this.plugin.settings[key] = filters;
			void this.saveSettings();
			this.renderFilterRow(
				listContainer,
				filters[filters.length - 1],
				key,
				filters.length - 1,
				label,
			);
		});
	}

	private renderFilterRow(
		containerEl: HTMLElement,
		filter: PathFilterConfig,
		key: "folderFilters" | "fileFilters" | "headingFilters",
		index: number,
		label: string,
	) {
		const row = containerEl.createDiv({ cls: "filter-row" });
		row.addClass(
			"task-flex",
			"task-items-center",
			"task-gap-1",
			"task-mb-1",
			"task-flex-wrap",
		);

		const input = row.createEl("input", {
			type: "text",
			attr: { placeholder: label + "模式" },
		});
		input.value = filter.pattern || "";
		input.addClass("task-flex-1", "task-min-w-25");
		input.addEventListener("input", () => {
			filter.pattern = input.value;
			void this.saveSettings();
		});

		const caseBtn = row.createEl("button", {
			text: "Aa",
			cls: "filter-toggle-btn",
		});
		this.applyToggleStyle(caseBtn, filter.caseSensitive);
		caseBtn.title = "区分大小写";
		caseBtn.addEventListener("click", () => {
			filter.caseSensitive = !filter.caseSensitive;
			this.applyToggleStyle(caseBtn, filter.caseSensitive);
			void this.saveSettings();
		});

		const wordBtn = row.createEl("button", {
			text: "ab",
			cls: "filter-toggle-btn",
		});
		this.applyToggleStyle(wordBtn, filter.wholeWord);
		wordBtn.title = "全字匹配";
		wordBtn.addEventListener("click", () => {
			filter.wholeWord = !filter.wholeWord;
			this.applyToggleStyle(wordBtn, filter.wholeWord);
			void this.saveSettings();
		});

		const regexBtn = row.createEl("button", {
			text: "正则",
			cls: "filter-toggle-btn",
		});
		this.applyToggleStyle(regexBtn, filter.useRegex);
		regexBtn.title = "使用正则表达式匹配";
		regexBtn.addEventListener("click", () => {
			filter.useRegex = !filter.useRegex;
			this.applyToggleStyle(regexBtn, filter.useRegex);
			void this.saveSettings();
		});

		const excludeBtn = row.createEl("button", {
			text: "排除",
			cls: "filter-toggle-btn",
		});
		this.applyToggleStyle(excludeBtn, filter.exclude, "#c3393e");
		excludeBtn.title = "排除匹配项";
		excludeBtn.addEventListener("click", () => {
			filter.exclude = !filter.exclude;
			this.applyToggleStyle(excludeBtn, filter.exclude, "#c3393e");
			void this.saveSettings();
		});

		const delBtn = row.createEl("button", {
			text: "✕",
			cls: "filter-del-btn",
		});
		delBtn.addClass(
			"task-border-none",
			"task-bg-transparent",
			"task-clickable",
			"task-text-muted",
		);
		delBtn.addEventListener("click", () => {
			const filters: PathFilterConfig[] = this.plugin.settings[key] || [];
			filters.splice(index, 1);
			this.plugin.settings[key] = filters;
			void this.saveSettings();
			row.remove();
		});
	}

	private renderTaskItemList(containerEl: HTMLElement) {
		const filters: TaskItemFilterConfig[] =
			this.plugin.settings.taskItemFilters || [];
		const listContainer = containerEl.createDiv({ cls: "filter-list" });

		filters.forEach((filter: TaskItemFilterConfig, index: number) => {
			this.renderTaskItemRow(listContainer, filter, index);
		});

		const addBtn = containerEl.createEl("button", {
			text: "+ 添加任务项匹配",
			cls: "filter-add-btn",
		});
		addBtn.addClass("task-mt-3", "task-px-3", "task-py-1");
		addBtn.addEventListener("click", () => {
			filters.push({ pattern: "", exclude: false });
			this.plugin.settings.taskItemFilters = filters;
			void this.saveSettings();
			this.renderTaskItemRow(
				listContainer,
				filters[filters.length - 1],
				filters.length - 1,
			);
		});
	}

	private renderTaskItemRow(
		containerEl: HTMLElement,
		filter: TaskItemFilterConfig,
		index: number,
	) {
		const row = containerEl.createDiv({ cls: "filter-row" });
		row.addClass(
			"task-flex",
			"task-items-center",
			"task-gap-1",
			"task-mb-1",
		);

		const input = row.createEl("input", {
			type: "text",
			attr: { placeholder: "输入状态符号，如 x" },
		});
		input.value = filter.pattern || "";
		input.addClass("task-flex-1", "task-min-w-25", "task-max-w-50");
		input.addEventListener("input", () => {
			filter.pattern = input.value;
			void this.saveSettings();
		});

		const excludeBtn = row.createEl("button", {
			text: "排除",
			cls: "filter-toggle-btn",
		});
		this.applyToggleStyle(excludeBtn, filter.exclude, "#c3393e");
		excludeBtn.title = "排除匹配项";
		excludeBtn.addEventListener("click", () => {
			filter.exclude = !filter.exclude;
			this.applyToggleStyle(excludeBtn, filter.exclude, "#c3393e");
			void this.saveSettings();
		});

		const delBtn = row.createEl("button", {
			text: "✕",
			cls: "filter-del-btn",
		});
		delBtn.addClass(
			"task-border-none",
			"task-bg-transparent",
			"task-clickable",
			"task-text-muted",
		);
		delBtn.addEventListener("click", () => {
			const list: TaskItemFilterConfig[] =
				this.plugin.settings.taskItemFilters || [];
			list.splice(index, 1);
			this.plugin.settings.taskItemFilters = list;
			void this.saveSettings();
			row.remove();
		});
	}

	private applyToggleStyle(
		btn: HTMLElement,
		active: boolean,
		activeColor?: string,
	) {
		btn.removeClass(
			"task-setting-toggle-btn-active",
			"task-setting-toggle-btn-inactive",
		);
		if (active) {
			btn.addClass("task-setting-toggle-btn-active");
			btn.setCssProps({
				"--task-toggle-bg": activeColor || "var(--interactive-accent)",
			});
		} else {
			btn.addClass("task-setting-toggle-btn-inactive");
		}
	}
}