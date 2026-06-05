// src/ui/view/organize-view.ts
// 整理处视图（批量编辑）

import { DataManager } from "../../process/core/data-manager";
import {
	addSnapshot,
	loadSnapshots,
	Op,
	writeToFiles,
} from "../../process/task/task-editor";
import { filterTasks } from "../../process/task/task-filter";
import { GlobalFilter } from "../../types";
import { BaseTaskView } from "./base-view";

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
	protected selectedTasks: Set<string> = new Set();
	protected previews: Map<string, string> = new Map();
	protected confirmedTasks: Set<string> = new Set();
	protected filterMode: string = "incomplete-missing";
	private dataManager: DataManager;

	constructor(container: HTMLElement, store: any, app: any) {
		super(container, store, app);
		this.dataManager = DataManager.getInstance();
	}

	getDefaultFilter(): GlobalFilter {
		const filter = super.getDefaultFilter();
		filter.hideRepeat = false;
		return filter;
	}

	async render() {
		this.container.empty();
		const state = this.store.getState();
		const preset = this.store.getActivePreset();
		const activeFilter: GlobalFilter =
			preset?.filter ?? this.getDefaultFilter();
		try {
			const { tasks: allTasks } = await this.dataManager.loadData(
				this.app,
			);
			if (!allTasks || allTasks.length === 0) {
				this.renderEmpty();
				return;
			}
			let tasks = filterTasks(allTasks, activeFilter);
			tasks = this.applyOrganizeFilter(tasks);
			this.renderModeSwitch();
			this.renderEditToolbar(tasks);
			this.renderTaskList(tasks);
			this.renderBottomBar(tasks);
		} catch (e) {
			this.container.createDiv({
				text: "加载失败：" + (e as Error).message,
			});
		}
	}

	protected renderEmpty() {
		this.container.createDiv({ text: "没有符合条件的任务" });
	}

	protected applyOrganizeFilter(tasks: any[]): any[] {
		const mode = this.filterMode;
		const isIncomplete = mode.startsWith("incomplete");
		const isMissing = mode.endsWith("missing");
		return tasks.filter((task) => {
			const statusOk = isIncomplete
				? task._status === "todo" || task._status === "planned"
				: task._status === "in-progress" ||
					task._status === "completed" ||
					task._status === "cancelled";
			if (!statusOk) return false;
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
		[
			{ key: "incomplete-missing", label: "未完成&缺失" },
			{ key: "incomplete-complete", label: "未完成&完整" },
			{ key: "complete-missing", label: "已完成&缺失" },
			{ key: "complete-complete", label: "已完成&完整" },
		].forEach((m) => {
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
		const selectAllBtn = toolbar.createEl("button", {
			text: "全选/全不选",
			cls: "filter-btn",
		});
		selectAllBtn.onclick = () => {
			if (this.selectedTasks.size === tasks.length)
				this.selectedTasks.clear();
			else
				tasks.forEach((t) =>
					this.selectedTasks.add(t.path + "|" + t.lineNumber),
				);
			this.render();
		};
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
				btn.onclick = () => this.applyEditToSelected(mark.key, opt);
			});
		});
		const autoBtn = toolbar.createEl("button", {
			text: "补全时间（3天）",
			cls: "filter-btn",
		});
		autoBtn.onclick = () => {
			this.selectedTasks.forEach((taskId) => {
				const task = tasks.find(
					(t) => t.path + "|" + t.lineNumber === taskId,
				);
				if (task?._done) {
					this.previews.set(
						taskId,
						Op.autoComplete(task._fullLine, 3),
					);
				}
			});
			this.render();
		};
		const sortBtn = toolbar.createEl("button", {
			text: "排序标记",
			cls: "filter-btn",
		});
		sortBtn.onclick = () => {
			this.selectedTasks.forEach((taskId) => {
				const task = tasks.find(
					(t) => t.path + "|" + t.lineNumber === taskId,
				);
				if (task) {
					this.previews.set(taskId, Op.sortTags(task._fullLine));
				}
			});
			this.render();
		};
	}

	protected applyEditToSelected(markKey: string, option: string) {
		const opMap: Record<string, (line: string, val?: string) => string> = {
			priority: (l, v) =>
				v === "删除" ? Op.delPriority(l) : Op.setPriority(l, v!),
			repeat: (l, v) =>
				v === "删除" ? Op.delRepeat(l) : Op.setRepeat(l, v!),
			created: (l, v) =>
				v === "删除"
					? Op.delCreated(l)
					: Op.setCreated(l, new Date().toISOString().slice(0, 10)),
			scheduled: (l, v) =>
				v === "删除"
					? Op.delScheduled(l)
					: Op.setScheduled(l, new Date().toISOString().slice(0, 10)),
			starts: (l, v) =>
				v === "删除"
					? Op.delStarts(l)
					: Op.setStarts(l, new Date().toISOString().slice(0, 10)),
			due: (l, v) =>
				v === "删除"
					? Op.delDue(l)
					: Op.setDue(l, new Date().toISOString().slice(0, 10)),
			done: (l, v) =>
				v === "删除"
					? Op.delDone(l)
					: Op.setDone(l, new Date().toISOString().slice(0, 10)),
			cancel: (l, v) =>
				v === "删除"
					? Op.delCancel(l)
					: Op.setCancel(l, new Date().toISOString().slice(0, 10)),
			tag: (l, v) =>
				v === "删除"
					? Op.delTag(l)
					: Op.setTag(l, v!.replace("🏁 ", "")),
			id: (l, v) =>
				v === "删除"
					? Op.delId(l)
					: v === "生成"
						? l +
							" 🆔 " +
							Math.random().toString(36).substring(2, 8)
						: l,
			forbid: (l, v) => (v === "删除" ? Op.delForbid(l) : l),
		};
		const fn = opMap[markKey];
		if (!fn) return;
		this.selectedTasks.forEach((taskId) => {
			this.previews.set(
				taskId,
				fn(this.previews.get(taskId) || "", option),
			);
		});
		this.render();
	}

	protected renderTaskList(tasks: any[]) {
		const listContainer = this.container.createDiv({
			cls: "organize-task-list",
		});
		tasks.forEach((task) => {
			const taskId = task.path + "|" + task.lineNumber;
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
			const snapshot: Record<string, string> = {};
			taskIds.forEach((id) => {
				const task = tasks.find(
					(t) => t.path + "|" + t.lineNumber === id,
				);
				if (task) snapshot[id] = task._fullLine;
			});
			const snapshots = loadSnapshots();
			addSnapshot(snapshots, snapshot);
			await writeToFiles(this.app, tasks, taskIds, linesMap);
			this.confirmedTasks.clear();
			this.previews.clear();
			this.selectedTasks.clear();
			this.render();
		};
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
}
