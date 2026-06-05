import { RX } from "../config/config";

const AUTOCOMPLETE_DAYS = 3;
const MAX_SNAPSHOTS = 5;
const STORAGE_KEY_SNAPSHOTS = "organizeSnapshots";

// ---------- 辅助函数 ----------
export function isIncomplete(s) {
	return s === "todo" || s === "planned" || s === "in-progress";
}
export function isCompleted(s) {
	return s === "completed" || s === "cancelled";
}
export function hasEssentialTags(t) {
	return t._priorityIcon && t._created && t._scheduled && t._starts && t._due;
}

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

// ---------- 编辑操作库 ----------
export const Op = {
	setPriority(line, emoji) {
		return replaceMark(line, RX.priority, emoji);
	},
	delPriority(line) {
		return replaceMark(line, RX.priority);
	},
	setRepeat(line, rule) {
		return replaceMark(line, RX.repeat, "🔁 " + rule.replace(/^🔁\s*/, ""));
	},
	delRepeat(line) {
		return replaceMark(line, RX.repeat);
	},
	setCreated(line, date) {
		return replaceMark(line, RX.created, "➕ " + date);
	},
	delCreated(line) {
		return replaceMark(line, RX.created);
	},
	setScheduled(line, date) {
		return replaceMark(line, RX.scheduled, "⏳ " + date);
	},
	delScheduled(line) {
		return replaceMark(line, RX.scheduled);
	},
	setStarts(line, date) {
		return replaceMark(line, RX.starts, "🛫 " + date);
	},
	delStarts(line) {
		return replaceMark(line, RX.starts);
	},
	setDue(line, date) {
		return replaceMark(line, RX.due, "📅 " + date);
	},
	delDue(line) {
		return replaceMark(line, RX.due);
	},
	setDone(line, date) {
		return replaceMark(line, RX.done, "✅ " + date);
	},
	delDone(line) {
		return replaceMark(line, RX.done);
	},
	setCancel(line, date) {
		return replaceMark(line, RX.cancel, "❌ " + date);
	},
	delCancel(line) {
		return replaceMark(line, RX.cancel);
	},
	setTag(line, keyword) {
		return replaceMark(line, RX.tag, "🏁 " + keyword.replace(/^🏁\s*/, ""));
	},
	delTag(line) {
		return replaceMark(line, RX.tag);
	},
	delId(line) {
		return replaceMark(line, RX.id);
	},
	delForbid(line) {
		return replaceMark(line, RX.forbid);
	},
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

// ---------- 快照管理 ----------
export function loadSnapshots() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY_SNAPSHOTS) || "[]");
	} catch (e) {
		return [];
	}
}
export function saveSnapshots(snapshots) {
	try {
		localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(snapshots));
	} catch (e) {}
}
export function addSnapshot(snapshots, map) {
	snapshots.unshift({ time: new Date().toLocaleString(), snapshot: map });
	if (snapshots.length > MAX_SNAPSHOTS) snapshots.pop();
	saveSnapshots(snapshots);
}

// ---------- 文件写入 ----------
export async function writeToFiles(app, tasks, taskIds, linesMap) {
	const groups = {};
	for (const id of taskIds) {
		const task = tasks.find((t) => t.path + "|" + t.lineNumber === id);
		if (!task) continue;
		const newLine = linesMap[id];
		if (!newLine || newLine === task._fullLine) continue;
		if (!groups[task.path]) groups[task.path] = [];
		groups[task.path].push({ line: task.lineNumber, newLine });
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
