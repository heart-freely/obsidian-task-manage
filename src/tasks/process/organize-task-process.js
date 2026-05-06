/**
 * 文件：src/tasks/process/organize-task-process.js
 * 描述：任务组织整理模块，提供编辑操作库（Op）、快照管理与批量写入功能
 * 所属模块：tasks/process
 * 依赖：src/tasks/read/read-tasks（RX 正则集合）
 * 对外导出：isIncomplete, isCompleted, hasEssentialTags, Op, loadSnapshots, saveSnapshots, addSnapshot, writeToFiles
 * 注意事项：所有编辑操作均基于正则替换，日期格式使用 YYYY-MM-DD；快照存储在 localStorage
 */

import { RX } from "../read/read-tasks";

/** 自动补全时默认向前推算的天数 */
const AUTOCOMPLETE_DAYS = 3;

/** 快照历史最大保留数量 */
const MAX_SNAPSHOTS = 5;

/** localStorage 中快照数据的存储键名 */
const STORAGE_KEY_SNAPSHOTS = "organizeSnapshots";

// ==================== 辅助函数 ====================

/**
 * 判断任务状态是否为"未完成"
 *
 * @param {string} s - 任务状态标识
 * @returns {boolean} 状态为 todo / planned / in-progress 时返回 true
 *
 * @example
 * isIncomplete("todo") // true
 * isIncomplete("completed") // false
 */
export function isIncomplete(s) {
	return s === "todo" || s === "planned" || s === "in-progress";
}

/**
 * 判断任务状态是否为"已完成"
 *
 * @param {string} s - 任务状态标识
 * @returns {boolean} 状态为 completed / cancelled 时返回 true
 *
 * @example
 * isCompleted("completed") // true
 */
export function isCompleted(s) {
	return s === "completed" || s === "cancelled";
}

/**
 * 检查任务是否具备完整的必要标签（图标标记）
 *
 * @param {Object} t - 任务对象
 * @param {string} t._priorityIcon - 优先级图标
 * @param {string} t._created - 创建日期标记
 * @param {string} t._scheduled - 计划日期标记
 * @param {string} t._starts - 开始日期标记
 * @param {string} t._due - 截止日期标记
 * @returns {boolean} 所有必要标签均存在时返回 true
 *
 * @example
 * hasEssentialTags({ _priorityIcon: "🔼", _created: "2026-05-01", _scheduled: "2026-05-01", _starts: "2026-05-01", _due: "2026-05-01" })
 * // => true
 */
export function hasEssentialTags(t) {
	return t._priorityIcon && t._created && t._scheduled && t._starts && t._due;
}

/**
 * 替换或删除行内指定正则匹配的标记
 *
 * @param {string} line - 原始行文本
 * @param {RegExp} regex - 要匹配的标记正则
 * @param {string} [newMark] - 替换后的新标记文本；不传则删除匹配
 * @returns {string} 处理后的行文本
 *
 * @example
 * replaceMark("- [ ] 任务 📅 2026-05-01", RX.due, "📅 2026-05-10")
 * // => "- [ ] 任务 📅 2026-05-10"
 */
function replaceMark(line, regex, newMark) {
	if (newMark === undefined)
		return line
			.replace(regex, "")
			.replace(/\s{2,}/g, " ")
			.trim();
	if (regex.test(line))
		return line
			.replace(regex, newMark)
			.replace(/\s{2,}/g, " ")
			.trim();
	return (line + " " + newMark).replace(/\s{2,}/g, " ").trim();
}

// ==================== 编辑操作库 ====================

/**
 * 编辑操作库，提供针对行级任务标记的增删改方法
 *
 * @namespace Op
 *
 * @example
 * // 设置优先级
 * const newLine = Op.setPriority("- [ ] 任务", "🔼");
 */
export const Op = {
	/**
	 * 设置优先级图标
	 * @param {string} line - 行文本
	 * @param {string} emoji - 优先级图标（如 🔼、🔽）
	 * @returns {string}
	 */
	setPriority(line, emoji) {
		return replaceMark(line, RX.priority, emoji);
	},

	/**
	 * 删除优先级标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delPriority(line) {
		return replaceMark(line, RX.priority);
	},

	/**
	 * 设置重复规则
	 * @param {string} line - 行文本
	 * @param {string} rule - 重复规则字符串（如 "every day"）
	 * @returns {string}
	 */
	setRepeat(line, rule) {
		return replaceMark(line, RX.repeat, "🔁 " + rule.replace(/^🔁\s*/, ""));
	},

	/**
	 * 删除重复规则标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delRepeat(line) {
		return replaceMark(line, RX.repeat);
	},

	/**
	 * 设置创建日期
	 * @param {string} line - 行文本
	 * @param {string} date - 日期 YYYY-MM-DD
	 * @returns {string}
	 */
	setCreated(line, date) {
		return replaceMark(line, RX.created, "➕ " + date);
	},

	/**
	 * 删除创建日期标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delCreated(line) {
		return replaceMark(line, RX.created);
	},

	/**
	 * 设置计划日期
	 * @param {string} line - 行文本
	 * @param {string} date - 日期 YYYY-MM-DD
	 * @returns {string}
	 */
	setScheduled(line, date) {
		return replaceMark(line, RX.scheduled, "⏳ " + date);
	},

	/**
	 * 删除计划日期标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delScheduled(line) {
		return replaceMark(line, RX.scheduled);
	},

	/**
	 * 设置开始日期
	 * @param {string} line - 行文本
	 * @param {string} date - 日期 YYYY-MM-DD
	 * @returns {string}
	 */
	setStarts(line, date) {
		return replaceMark(line, RX.starts, "🛫 " + date);
	},

	/**
	 * 删除开始日期标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delStarts(line) {
		return replaceMark(line, RX.starts);
	},

	/**
	 * 设置截止日期
	 * @param {string} line - 行文本
	 * @param {string} date - 日期 YYYY-MM-DD
	 * @returns {string}
	 */
	setDue(line, date) {
		return replaceMark(line, RX.due, "📅 " + date);
	},

	/**
	 * 删除截止日期标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delDue(line) {
		return replaceMark(line, RX.due);
	},

	/**
	 * 设置完成日期
	 * @param {string} line - 行文本
	 * @param {string} date - 日期 YYYY-MM-DD
	 * @returns {string}
	 */
	setDone(line, date) {
		return replaceMark(line, RX.done, "✅ " + date);
	},

	/**
	 * 删除完成日期标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delDone(line) {
		return replaceMark(line, RX.done);
	},

	/**
	 * 设置取消日期
	 * @param {string} line - 行文本
	 * @param {string} date - 日期 YYYY-MM-DD
	 * @returns {string}
	 */
	setCancel(line, date) {
		return replaceMark(line, RX.cancel, "❌ " + date);
	},

	/**
	 * 删除取消日期标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delCancel(line) {
		return replaceMark(line, RX.cancel);
	},

	/**
	 * 设置标签
	 * @param {string} line - 行文本
	 * @param {string} keyword - 标签关键词
	 * @returns {string}
	 */
	setTag(line, keyword) {
		return replaceMark(line, RX.tag, "🏁 " + keyword.replace(/^🏁\s*/, ""));
	},

	/**
	 * 删除标签标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delTag(line) {
		return replaceMark(line, RX.tag);
	},

	/**
	 * 删除 ID 标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delId(line) {
		return replaceMark(line, RX.id);
	},

	/**
	 * 删除禁止标记
	 * @param {string} line - 行文本
	 * @returns {string}
	 */
	delForbid(line) {
		return replaceMark(line, RX.forbid);
	},

	/**
	 * 自动补全日期标记
	 * 基于完成日期向前推算 n 天，自动设置创建、计划、开始和截止日期
	 *
	 * @param {string} line - 行文本
	 * @param {number} [days] - 向前推算天数，默认 AUTOCOMPLETE_DAYS（3）
	 * @returns {string} 补全后的行文本
	 *
	 * @example
	 * Op.autoComplete("- [x] 任务 ✅ 2026-05-06", 3)
	 * // 自动补全 📅 🛫 ⏳ ➕ 标记
	 */
	autoComplete(line, days) {
		const doneMatch = line.match(RX.done);
		if (!doneMatch) return line;
		const n = days || AUTOCOMPLETE_DAYS;
		const doneDate = window.moment(doneMatch[1], "YYYY-MM-DD", true);
		if (!doneDate.isValid()) return line;
		let newLine = Op.sortTags(line);
		if (!RX.due.test(newLine))
			newLine += " 📅 " + doneDate.format("YYYY-MM-DD");
		else
			newLine = replaceMark(
				newLine,
				RX.due,
				"📅 " + doneDate.format("YYYY-MM-DD"),
			);
		const expectedStarts = doneDate.clone().subtract(n, "days");
		if (!RX.starts.test(newLine))
			newLine += " 🛫 " + expectedStarts.format("YYYY-MM-DD");
		else
			newLine = replaceMark(
				newLine,
				RX.starts,
				"🛫 " + expectedStarts.format("YYYY-MM-DD"),
			);
		if (!RX.scheduled.test(newLine))
			newLine += " ⏳ " + expectedStarts.format("YYYY-MM-DD");
		else
			newLine = replaceMark(
				newLine,
				RX.scheduled,
				"⏳ " + expectedStarts.format("YYYY-MM-DD"),
			);
		if (!RX.created.test(newLine))
			newLine += " ➕ " + expectedStarts.format("YYYY-MM-DD");
		else
			newLine = replaceMark(
				newLine,
				RX.created,
				"➕ " + expectedStarts.format("YYYY-MM-DD"),
			);
		return Op.sortTags(newLine);
	},

	/**
	 * 排序行内标记顺序
	 * 固定顺序：priority → repeat → created → scheduled → starts → due → done → cancel → tag → id → forbid
	 *
	 * @param {string} line - 行文本
	 * @returns {string} 标记重新排序后的行文本
	 *
	 * @example
	 * Op.sortTags("- [ ] 任务 📅 2026-05-06 🔼")
	 * // => "- [ ] 任务 🔼 📅 2026-05-06"
	 */
	sortTags(line) {
		const order = [
			"priority",
			"repeat",
			"created",
			"scheduled",
			"starts",
			"due",
			"done",
			"cancel",
			"tag",
			"id",
			"forbid",
		];
		const parts = [];
		for (const key of order) {
			const m = line.match(RX[key]);
			parts.push(m ? m[0] : "");
		}
		let clean = line;
		parts.forEach((p) => {
			if (p) clean = clean.replace(p, "");
		});
		clean = clean.replace(/\s+/g, " ").trim();
		return (clean + " " + parts.filter(Boolean).join(" "))
			.replace(/\s+/g, " ")
			.trim();
	},
};

// ==================== 快照管理 ====================

/**
 * 从 localStorage 加载快照列表
 * 快照用于记录组织操作的"之前"状态，支持撤销/回溯
 *
 * @returns {Array<{time: string, snapshot: Object}>} 快照数组（按时间降序）
 *
 * @example
 * const snapshots = loadSnapshots();
 * // [{ time: "2026/5/6 上午8:00:00", snapshot: { ... } }]
 */
export function loadSnapshots() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY_SNAPSHOTS) || "[]");
	} catch (e) {
		return [];
	}
}

/**
 * 将快照列表持久化到 localStorage
 *
 * @param {Array<{time: string, snapshot: Object}>} snapshots - 快照数组
 *
 * @example
 * saveSnapshots(snapshots);
 */
export function saveSnapshots(snapshots) {
	try {
		localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots));
	} catch (e) {}
}

/**
 * 添加新的快照到列表头部
 * 超过 MAX_SNAPSHOTS（5）条时自动裁剪
 *
 * @param {Array<{time: string, snapshot: Object}>} snapshots - 现有快照数组
 * @param {Object} map - 快照数据（任务 ID → 原始行内容的映射）
 *
 * @example
 * addSnapshot(snapshots, { "path|line": "- [ ] 任务" });
 */
export function addSnapshot(snapshots, map) {
	snapshots.unshift({
		time: new Date().toLocaleString(),
		snapshot: map,
	});
	if (snapshots.length > MAX_SNAPSHOTS) snapshots.pop();
	saveSnapshots(snapshots);
}

// ==================== 文件写入 ====================

/**
 * 批量将修改后的任务行写入文件
 * 按文件路径分组后逐一调用 app.vault.process 进行原地替换
 *
 * @param {App} app - Obsidian 应用实例
 * @param {Array} tasks - 任务对象列表（需包含 path、line、_fullLine 属性）
 * @param {string[]} taskIds - 待修改的任务 ID 数组（格式 "path|line"）
 * @param {Object.<string, string>} linesMap - 任务 ID → 新行内容的映射
 * @returns {Promise<number>} 实际写入的任务行数
 *
 * @example
 * const count = await writeToFiles(app, tasks, ["file.md|10"], { "file.md|10": "- [x] 任务 ✅ 2026-05-06" });
 */
export async function writeToFiles(app, tasks, taskIds, linesMap) {
	const groups = {};
	for (const id of taskIds) {
		const task = tasks.find((t) => t.path + "|" + t.line === id);
		if (!task) continue;
		const newLine = linesMap[id];
		if (!newLine || newLine === task._fullLine) continue;
		if (!groups[task.path]) groups[task.path] = [];
		groups[task.path].push({ line: task.line, newLine });
	}
	let count = 0;
	for (const [path, items] of Object.entries(groups)) {
		const file = app.vault.getAbstractFileByPath(path);
		if (!file) continue;
		await app.vault.process(file, (data) => {
			const dataLines = data.split("\n");
			for (const item of items)
				if (item.line < dataLines.length)
					dataLines[item.line] = item.newLine;
			return dataLines.join("\n");
		});
		count += items.length;
	}
	return count;
}
