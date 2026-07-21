// src/core/parser/task-parser.ts
// YAML 属性解析（文件任务 + 标题任务共用）

import { TaskData, TaskStatus } from "../../type/type";
import { TASK_ELEMENTS, YAML_DATE_FIELDS } from "../config/config";

// ========== 类型安全的子元素访问（与 config.ts 保持一致）==========

interface StatusChildDef {
	key: string;
	zhName: string;
	icon: string;
}

interface PriorityChildDef {
	key: string;
	zhName: string;
	icon: string;
}

const statusChildren = (TASK_ELEMENTS.status as { children: StatusChildDef[] })
	.children;
const priorityChildren = (
	TASK_ELEMENTS.priority as { children: PriorityChildDef[] }
).children;

export function parseTaskFromYaml(
	yamlData: Record<string, unknown>,
): TaskData | null {
	const sm: Record<string, string> = {};
	statusChildren.forEach((c) => {
		sm[c.zhName] = c.key;
	});
	const pm: Record<string, number> = {};
	priorityChildren.forEach((c, idx) => {
		pm[c.zhName] = 4 - idx;
	});

	const rawStatus = String(yamlData["任务状态"] ?? "无状态");
	const rawPriority = String(yamlData["任务优先级"] ?? "none");
	const sk = (sm[rawStatus] || "none") as TaskStatus;
	const pi = rawPriority === "none" ? 5 : (pm[rawPriority] ?? 5);

	const fd = (val: unknown): number | null => {
		if (!val) return null;
		const s = String(val);
		const dm = s.match(/(\d{4}-\d{2}-\d{2})/);
		const dateStr = dm ? dm[1] : s.substring(0, 10);
		const ts = new Date(dateStr).getTime();
		return isNaN(ts) ? null : ts;
	};

	const dv: Record<string, number | null> = {};
	for (const yn of YAML_DATE_FIELDS) {
		dv[yn] = fd(yamlData[yn]);
	}

	const description = String(
		yamlData["任务简介"] ?? yamlData["任务名称"] ?? "",
	);

	if (!description && Object.values(dv).every((v) => v === null)) {
		return null;
	}

	return {
		rawLine: "",
		status: sk,
		content: description,
		priority: pi,
		repeat: String(yamlData["任务周期"] ?? "").replace(/^🔁\s*/, ""),
		created: dv["任务创建"] ?? null,
		scheduled: dv["任务计划"] ?? null,
		starts: dv["任务开始"] ?? null,
		due: dv["任务截止"] ?? null,
		done: dv["任务完成"] ?? null,
		cancelled: dv["任务取消"] ?? null,
		tag: String(yamlData["任务标签"] ?? ""),
		id: String(yamlData["任务唯一ID"] ?? ""),
		forbid: String(yamlData["任务引用ID"] ?? ""),
	};
}
