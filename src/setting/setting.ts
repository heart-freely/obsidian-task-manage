// src/setting/setting.ts

import { App, PluginSettingTab, Setting } from "obsidian";
import { updateTaskFileConfig } from "../core/config/config";
import { DataManager } from "../core/data/data-manager";
import { safeMergeConfig } from "../util/validate-utils";

export interface PathFilterConfig {
	pattern: string;
	caseSensitive: boolean;
	wholeWord: boolean;
	useRegex: boolean;
	exclude: boolean;
}

export interface TaskItemFilterConfig {
	pattern: string;
	exclude: boolean;
}

export interface TaskManageSettings {
	taskRootPath: string;
	folderFilters: PathFilterConfig[];
	fileFilters: PathFilterConfig[];
	headingFilters: PathFilterConfig[];
	taskItemFilters: TaskItemFilterConfig[];
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
};

const CONFIG_SCHEMA: Record<string, string> = {
	taskRootPath: "string",
	folderFilters: "array",
	fileFilters: "array",
	headingFilters: "array",
	taskItemFilters: "array",
};

export class TaskManageSettingTab extends PluginSettingTab {
	plugin: any;
	private folderCache: string[] | null = null;
	private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide() {
		if (this.saveDebounceTimer) {
			clearTimeout(this.saveDebounceTimer);
			this.saveDebounceTimer = null;
		}
		updateTaskFileConfig({
			rootPath: this.plugin.settings.taskRootPath || "",
			folderFilters: this.plugin.settings.folderFilters,
			fileFilters: this.plugin.settings.fileFilters,
			headingFilters: this.plugin.settings.headingFilters,
			taskItemFilters: this.plugin.settings.taskItemFilters,
		});
		this.plugin.saveAllSettings();
		DataManager.getInstance().invalidate();

		const leaves = this.app.workspace.getLeavesOfType("manage-view");
		if (leaves.length > 0) {
			const view = leaves[0].view as any;
			view.refreshView?.();
		}
	}

	private async saveSettings() {
		updateTaskFileConfig({
			rootPath: this.plugin.settings.taskRootPath || "",
			folderFilters: this.plugin.settings.folderFilters,
			fileFilters: this.plugin.settings.fileFilters,
			headingFilters: this.plugin.settings.headingFilters,
			taskItemFilters: this.plugin.settings.taskItemFilters,
		});

		if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);
		this.saveDebounceTimer = setTimeout(async () => {
			await this.plugin.saveAllSettings();
			this.saveDebounceTimer = null;
		}, 300);
	}

	display(): void {
		this.folderCache = null;
		const { containerEl } = this;
		containerEl.empty();

		// ========== 任务路径 ==========
		new Setting(containerEl).setName("任务路径").setHeading();

		const pathListContainer = containerEl.createDiv({ cls: "path-list" });
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
					if (dropdownTimer) clearTimeout(dropdownTimer);
					if (
						dropdown.style.display === "block" &&
						dropdown.dataset["keyword"] === keyword
					)
						return;
					dropdown.dataset["keyword"] = keyword;
					dropdownTimer = setTimeout(() => {
						try {
							this.renderFolderDropdown(
								dropdown,
								keyword,
								(selectedPath) => {
									pathInput.value = selectedPath;
									dropdown.style.display = "none";
									paths[index] = selectedPath;
									saveAllPaths();
								},
							);
							dropdown.style.display = "block";
						} catch (e) {
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
						saveAllPaths();
					}
					setTimeout(() => {
						dropdown.style.display = "none";
					}, 150);
				});
				pathInput.addEventListener("keydown", (e: KeyboardEvent) => {
					if (e.key === "Enter") {
						e.preventDefault();
						const value = pathInput.value.trim();
						if (value && value !== paths[index]) {
							paths[index] = value;
							saveAllPaths();
						}
						dropdown.style.display = "none";
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
				delBtn.addEventListener("click", async () => {
					paths.splice(index, 1);
					if (paths.length === 0) paths.push("");
					saveAllPaths();
					renderPaths();
				});
			});
		};

		renderPaths();

		const addPathBtn = containerEl.createEl("button", {
			text: "+ 添加任务路径",
			cls: "filter-add-btn",
		});
		addPathBtn.addClass("task-mt-1", "task-mb-2", "task-px-3", "task-py-1");
		addPathBtn.addEventListener("click", async () => {
			paths.push("");
			saveAllPaths();
			renderPaths();
		});

		// ========== 匹配任务 ==========
		new Setting(containerEl).setName("匹配任务").setHeading();

		const row1 = containerEl.createDiv({ cls: "filter-two-col" });
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

		const row2 = containerEl.createDiv({ cls: "filter-two-col" });
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

		// ========== 导入导出插件配置 ==========
		new Setting(containerEl).setName("插件配置").setHeading();

		const ioRow = containerEl.createDiv();
		ioRow.addClass("task-flex", "task-gap-3");

		const importBtn = ioRow.createEl("button", {
			text: "📥 导入插件配置",
			cls: "filter-add-btn",
		});
		importBtn.addEventListener("click", () => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json";
			input.onchange = async () => {
				if (!input.files?.length) return;
				try {
					const data = JSON.parse(await input.files[0].text());
					if (!data || typeof data !== "object") {
						alert("导入失败：文件格式不正确");
						return;
					}
					safeMergeConfig(this.plugin.settings, data, CONFIG_SCHEMA);
					await this.saveSettings();
					this.display();
				} catch {
					alert("导入失败：文件格式不正确");
				}
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
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = "task-manage-config.json";
			a.click();
		});
	}

	private getFolders(): string[] {
		if (this.folderCache) return this.folderCache;
		try {
			const files = this.app.vault.getAllLoadedFiles();
			const folders = new Set<string>();
			for (const file of files) {
				if (file && (file as any).children) {
					const p = (file as any).path || "";
					if (p) folders.add(p);
				}
			}
			this.folderCache = [...folders].sort();
			return this.folderCache;
		} catch (e) {
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
			? folders.filter((p) =>
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
		displayItems.forEach((path) => {
			const item = container.createDiv({ cls: "dropdown-item" });
			item.addClass(
				"task-px-2",
				"task-py-1",
				"task-clickable",
				"task-text-sm",
			);
			item.textContent = path;
			item.addEventListener("mouseenter", () => {
				item.style.backgroundColor = "var(--background-modifier-hover)";
			});
			item.addEventListener("mouseleave", () => {
				item.style.backgroundColor = "";
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
		key: string,
		label: string,
	) {
		const filters: PathFilterConfig[] = this.plugin.settings[key] || [];
		const listContainer = containerEl.createDiv({ cls: "filter-list" });

		filters.forEach((filter, index) => {
			this.renderFilterRow(listContainer, filter, key, index, label);
		});

		const addBtn = containerEl.createEl("button", {
			text: "+ 添加" + label,
			cls: "filter-add-btn",
		});
		addBtn.addClass("task-mt-1", "task-px-3", "task-py-1");
		addBtn.addEventListener("click", async () => {
			filters.push({
				pattern: "",
				caseSensitive: false,
				wholeWord: false,
				useRegex: false,
				exclude: false,
			});
			this.plugin.settings[key] = filters;
			await this.saveSettings();
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
		key: string,
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
		input.addEventListener("input", async () => {
			filter.pattern = input.value;
			await this.saveSettings();
		});

		const caseBtn = row.createEl("button", {
			text: "Aa",
			cls: "filter-toggle-btn",
		});
		caseBtn.style.cssText = this.toggleStyle(filter.caseSensitive);
		caseBtn.title = "区分大小写";
		caseBtn.addEventListener("click", async () => {
			filter.caseSensitive = !filter.caseSensitive;
			caseBtn.style.cssText = this.toggleStyle(filter.caseSensitive);
			await this.saveSettings();
		});

		const wordBtn = row.createEl("button", {
			text: "ab",
			cls: "filter-toggle-btn",
		});
		wordBtn.style.cssText = this.toggleStyle(filter.wholeWord);
		wordBtn.title = "全字匹配";
		wordBtn.addEventListener("click", async () => {
			filter.wholeWord = !filter.wholeWord;
			wordBtn.style.cssText = this.toggleStyle(filter.wholeWord);
			await this.saveSettings();
		});

		const regexBtn = row.createEl("button", {
			text: "正则",
			cls: "filter-toggle-btn",
		});
		regexBtn.style.cssText = this.toggleStyle(filter.useRegex);
		regexBtn.title = "使用正则表达式匹配";
		regexBtn.addEventListener("click", async () => {
			filter.useRegex = !filter.useRegex;
			regexBtn.style.cssText = this.toggleStyle(filter.useRegex);
			await this.saveSettings();
		});

		const excludeBtn = row.createEl("button", {
			text: "排除",
			cls: "filter-toggle-btn",
		});
		excludeBtn.style.cssText = this.toggleStyle(filter.exclude, "#c3393e");
		excludeBtn.title = "排除匹配项";
		excludeBtn.addEventListener("click", async () => {
			filter.exclude = !filter.exclude;
			excludeBtn.style.cssText = this.toggleStyle(
				filter.exclude,
				"#c3393e",
			);
			await this.saveSettings();
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
		delBtn.addEventListener("click", async () => {
			const filters: PathFilterConfig[] = this.plugin.settings[key] || [];
			filters.splice(index, 1);
			this.plugin.settings[key] = filters;
			await this.saveSettings();
			row.remove();
		});
	}

	private renderTaskItemList(containerEl: HTMLElement) {
		const filters: TaskItemFilterConfig[] =
			this.plugin.settings.taskItemFilters || [];
		const listContainer = containerEl.createDiv({ cls: "filter-list" });

		filters.forEach((filter, index) => {
			this.renderTaskItemRow(listContainer, filter, index);
		});

		const addBtn = containerEl.createEl("button", {
			text: "+ 添加任务项匹配",
			cls: "filter-add-btn",
		});
		addBtn.addClass("task-mt-3", "task-px-3", "task-py-1");
		addBtn.addEventListener("click", async () => {
			filters.push({ pattern: "", exclude: false });
			this.plugin.settings.taskItemFilters = filters;
			await this.saveSettings();
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
		input.addEventListener("input", async () => {
			filter.pattern = input.value;
			await this.saveSettings();
		});

		const excludeBtn = row.createEl("button", {
			text: "排除",
			cls: "filter-toggle-btn",
		});
		excludeBtn.style.cssText = this.toggleStyle(filter.exclude, "#c3393e");
		excludeBtn.title = "排除匹配项";
		excludeBtn.addEventListener("click", async () => {
			filter.exclude = !filter.exclude;
			excludeBtn.style.cssText = this.toggleStyle(
				filter.exclude,
				"#c3393e",
			);
			await this.saveSettings();
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
		delBtn.addEventListener("click", async () => {
			const list: TaskItemFilterConfig[] =
				this.plugin.settings.taskItemFilters || [];
			list.splice(index, 1);
			this.plugin.settings.taskItemFilters = list;
			await this.saveSettings();
			row.remove();
		});
	}

	private toggleStyle(active: boolean, activeColor?: string): string {
		if (active) {
			return `background:${activeColor || "var(--interactive-accent)"};color:white;border:none;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;`;
		}
		return "background:var(--background-modifier-border);color:var(--text-muted);border:none;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;";
	}
}
