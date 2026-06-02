import { filterTasks } from "../../process/bars/bars-process";
import {
	addSnapshot,
	loadSnapshots,
	Op,
	writeToFiles,
} from "../../process/tasks/edits-task";
import { getAllTasks } from "../../process/tasks/read-task";
import { GlobalFilter } from "../../types";
import { BaseTaskView } from "./base-view";

// 编辑操作的描述（用于按钮渲染）
const EDIT_MARKS = [
	{
		key: "priority",
		label: "优先级",
		options: ["🔺", "⏫", "🔼", "🔽", "⏬", "删除"],
	},
	{
		key: "repeat",
		label: "循环",
		options: [
			"🔁 every day",
			"🔁 every week",
			"🔁 every month",
			"🔁 every year",
			"删除",
		],
	},
	{ key: "created", label: "创建", options: ["今天", "删除"] },
	{ key: "scheduled", label: "计划", options: ["今天", "删除"] },
	{ key: "starts", label: "开始", options: ["今天", "删除"] },
	{ key: "due", label: "截止", options: ["今天", "删除"] },
	{ key: "done", label: "完成", options: ["今天", "删除"] },
	{ key: "cancel", label: "取消", options: ["今天", "删除"] },
	{ key: "tag", label: "标签", options: ["🏁 keep", "🏁 delete", "删除"] },
	{ key: "id", label: "ID", options: ["生成", "删除"] },
	{ key: "forbid", label: "依赖", options: ["删除"] },
];

export class OrganizeView extends BaseTaskView {
	protected selectedTasks: Set<string> = new Set(); // path|line
	protected previews: Map<string, string> = new Map(); // taskId -> 修改后的行
	protected confirmedTasks: Set<string> = new Set(); // 已确认的任务
	protected filterMode: string = "incomplete-missing"; // 'incomplete-missing'|'incomplete-complete'|'complete-missing'|'complete-complete'

	async render() {
		this.container.empty();

		// 工具栏（使用通用视图工具栏）
		const toolbar = this.container.createDiv({ cls: "view-toolbar" });

		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			preset?.filter ?? this.getDefaultFilter();

		try {
			const dv = this.app.plugins?.plugins?.dataview?.api;
			if (!dv) {
				this.container.createDiv({
					text: "请先安装并启用 Dataview 插件",
				});
				return;
			}

			const cacheState = { cachedAllTasks: null as any };
			const allTasks = getAllTasks(false, dv, cacheState);
			let tasks = filterTasks(allTasks, activeFilter);

			// 进一步筛选：根据 filterMode 过滤
			tasks = this.applyOrganizeFilter(tasks);

			// 渲染筛选模式切换
			this.renderModeSwitch();

			// 渲染编辑按钮栏
			this.renderEditToolbar(tasks);

			// 渲染任务列表
			this.renderTaskList(tasks);

			// 渲染底部操作栏
			this.renderBottomBar(tasks);
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
	}

	protected applyOrganizeFilter(tasks: any[]): any[] {
		const mode = this.filterMode;
		const isIncomplete = mode.startsWith("incomplete");
		const isMissing = mode.endsWith("missing");

		return tasks.filter((task) => {
			// 状态过滤
			const statusOk = isIncomplete
				? task._status === "todo" || task._status === "planned"
				: task._status === "in-progress" ||
					task._status === "completed" ||
					task._status === "cancelled";
			if (!statusOk) return false;

			// 必需标记检查
			const hasEssential =
				task._priorityIcon &&
				task._created &&
				task._scheduled &&
				task._starts &&
				task._due;
			if (isMissing && hasEssential) return false;
			if (!isMissing && !hasEssential) return false;
			return true;
		});
	}

	protected renderModeSwitch() {
		const row = this.container.createDiv({ cls: "organize-mode-row" });
		const modes = [
			{ key: "incomplete-missing", label: "未完成&缺失" },
			{ key: "incomplete-complete", label: "未完成&完整" },
			{ key: "complete-missing", label: "已完成&缺失" },
			{ key: "complete-complete", label: "已完成&完整" },
		];
		modes.forEach((m) => {
			const btn = row.createEl("button", {
				text: m.label,
				cls: "filter-btn",
			});
			if (this.filterMode === m.key) btn.addClass("active");
			btn.onclick = () => {
				this.filterMode = m.key;
				this.render();
			};
		});
	}

	protected renderEditToolbar(tasks: any[]) {
		const toolbar = this.container.createDiv({
			cls: "organize-edit-toolbar",
		});
		// 全选/全不选
		const selectAllBtn = toolbar.createEl("button", {
			text: "全选/全不选",
			cls: "filter-btn",
		});
		selectAllBtn.onclick = () => {
			if (this.selectedTasks.size === tasks.length) {
				this.selectedTasks.clear();
			} else {
				tasks.forEach((t) =>
					this.selectedTasks.add(t.path + "|" + t.line),
				);
			}
			this.render();
		};

		// 标记编辑按钮（每个标记一组）
		EDIT_MARKS.forEach((mark) => {
			const markRow = toolbar.createDiv({ cls: "edit-mark-row" });
			markRow.createSpan({
				text: mark.label + "：",
				cls: "filter-label",
			});
			mark.options.forEach((opt) => {
				const btn = markRow.createEl("button", {
					text: opt,
					cls: "filter-btn",
				});
				btn.onclick = () => {
					this.applyEditToSelected(mark.key, opt);
				};
			});
		});

		// 自动补全时间按钮
		const autoBtn = toolbar.createEl("button", {
			text: "补全时间（3天）",
			cls: "filter-btn",
		});
		autoBtn.onclick = () => {
			this.selectedTasks.forEach((taskId) => {
				const task = tasks.find(
					(t) => t.path + "|" + t.line === taskId,
				);
				if (task && task._done) {
					const newLine = Op.autoComplete(task._fullLine, 3);
					this.previews.set(taskId, newLine);
				}
			});
			this.render();
		};

		// 排序标记
		const sortBtn = toolbar.createEl("button", {
			text: "排序标记",
			cls: "filter-btn",
		});
		sortBtn.onclick = () => {
			this.selectedTasks.forEach((taskId) => {
				const task = tasks.find(
					(t) => t.path + "|" + t.line === taskId,
				);
				if (task) {
					const sorted = Op.sortTags(task._fullLine);
					this.previews.set(taskId, sorted);
				}
			});
			this.render();
		};
	}

	protected applyEditToSelected(markKey: string, option: string) {
		const opMap: Record<string, (line: string, val?: string) => string> = {
			priority: (line, val) => {
				if (val === "删除") return Op.delPriority(line);
				return Op.setPriority(line, val!);
			},
			repeat: (line, val) => {
				if (val === "删除") return Op.delRepeat(line);
				return Op.setRepeat(line, val!);
			},
			created: (line, val) => {
				if (val === "删除") return Op.delCreated(line);
				return Op.setCreated(
					line,
					new Date().toISOString().slice(0, 10),
				);
			},
			scheduled: (line, val) => {
				if (val === "删除") return Op.delScheduled(line);
				return Op.setScheduled(
					line,
					new Date().toISOString().slice(0, 10),
				);
			},
			starts: (line, val) => {
				if (val === "删除") return Op.delStarts(line);
				return Op.setStarts(
					line,
					new Date().toISOString().slice(0, 10),
				);
			},
			due: (line, val) => {
				if (val === "删除") return Op.delDue(line);
				return Op.setDue(line, new Date().toISOString().slice(0, 10));
			},
			done: (line, val) => {
				if (val === "删除") return Op.delDone(line);
				return Op.setDone(line, new Date().toISOString().slice(0, 10));
			},
			cancel: (line, val) => {
				if (val === "删除") return Op.delCancel(line);
				return Op.setCancel(
					line,
					new Date().toISOString().slice(0, 10),
				);
			},
			tag: (line, val) => {
				if (val === "删除") return Op.delTag(line);
				return Op.setTag(line, val!.replace("🏁 ", ""));
			},
			id: (line, val) => {
				if (val === "删除") return Op.delId(line);
				if (val === "生成") {
					const id = Math.random().toString(36).substring(2, 8);
					return line + " 🆔 " + id;
				}
				return line;
			},
			forbid: (line, val) => {
				if (val === "删除") return Op.delForbid(line);
				return line;
			},
		};

		const fn = opMap[markKey];
		if (!fn) return;

		this.selectedTasks.forEach((taskId) => {
			const currentLine = this.previews.get(taskId) || "";
			const newLine = fn(currentLine, option);
			this.previews.set(taskId, newLine);
		});
		this.render();
	}

	protected renderTaskList(tasks: any[]) {
		const listContainer = this.container.createDiv({
			cls: "organize-task-list",
		});
		tasks.forEach((task) => {
			const taskId = task.path + "|" + task.line;
			const isSelected = this.selectedTasks.has(taskId);
			const isConfirmed = this.confirmedTasks.has(taskId);
			const previewLine = this.previews.get(taskId);

			const row = listContainer.createDiv({ cls: "organize-task-row" });
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.checked = isSelected;
			checkbox.onchange = () => {
				if (checkbox.checked) this.selectedTasks.add(taskId);
				else this.selectedTasks.delete(taskId);
				this.render();
			};
			row.appendChild(checkbox);

			const originalText = document.createElement("div");
			originalText.className = "organize-original";
			originalText.textContent = task._fullLine;
			row.appendChild(originalText);

			if (previewLine && !isConfirmed) {
				const preview = document.createElement("div");
				preview.className = "organize-preview";
				preview.textContent = "📝 预览: " + previewLine;
				row.appendChild(preview);

				const confirmBtn = document.createElement("button");
				confirmBtn.textContent = "确定";
				confirmBtn.onclick = () => {
					this.confirmedTasks.add(taskId);
					this.render();
				};
				row.appendChild(confirmBtn);
			} else if (isConfirmed) {
				const confirmed = document.createElement("div");
				confirmed.className = "organize-confirmed";
				confirmed.textContent =
					"✔ 已修改: " + (previewLine || task._fullLine);
				row.appendChild(confirmed);

				const undoBtn = document.createElement("button");
				undoBtn.textContent = "撤回";
				undoBtn.onclick = () => {
					this.confirmedTasks.delete(taskId);
					this.previews.delete(taskId);
					this.render();
				};
				row.appendChild(undoBtn);
			}
		});
	}

	protected renderBottomBar(tasks: any[]) {
		const bar = this.container.createDiv({ cls: "organize-bottom-bar" });

		// 保存所有修改按钮
		const saveBtn = bar.createEl("button", {
			text: "💾 保存所有修改",
			cls: "filter-btn",
		});
		saveBtn.onclick = async () => {
			const taskIds = Array.from(this.confirmedTasks);
			const linesMap: Record<string, string> = {};
			taskIds.forEach((id) => {
				linesMap[id] = this.previews.get(id) || "";
			});

			// 记录快照
			const snapshot: Record<string, string> = {};
			taskIds.forEach((id) => {
				const task = tasks.find((t) => t.path + "|" + t.line === id);
				if (task) snapshot[id] = task._fullLine;
			});
			const snapshots = loadSnapshots();
			addSnapshot(snapshots, snapshot);

			// 写入文件
			await writeToFiles(this.app, tasks, taskIds, linesMap);

			// 清空确认状态
			this.confirmedTasks.clear();
			this.previews.clear();
			this.selectedTasks.clear();
			this.render();
		};

		// 快照撤回按钮
		const undoBtn = bar.createEl("button", {
			text: "↩ 撤回上次保存",
			cls: "filter-btn",
		});
		undoBtn.onclick = async () => {
			const snapshots = loadSnapshots();
			if (!snapshots.length) return;
			const last = snapshots[0];
			const taskIds = Object.keys(last.snapshot);
			const linesMap: Record<string, string> = {};
			taskIds.forEach((id) => {
				linesMap[id] = last.snapshot[id];
			});
			await writeToFiles(this.app, tasks, taskIds, linesMap);
			snapshots.shift();
			this.render();
		};
	}

	protected getDefaultFilter(): GlobalFilter {
		return {
			dateRange: { start: null, end: null, isAll: true },
			statuses: [
				"todo",
				"planned",
				"in-progress",
				"completed",
				"cancelled",
			],
			includeMarks: [],
			excludeMarks: [],
			hideRepeat: false,
			hideCompleted: false,
			hideCancelled: false,
			rootPath: null,
			hideFolders: false,
		};
	}
}
