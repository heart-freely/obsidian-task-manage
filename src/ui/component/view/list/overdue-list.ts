// src/ui/component/view/list/overdue-list.ts
// 逾期任务列表渲染器

import { createGroupCard } from "../card/group-card";

/**
 * 获取任务的有效状态
 * 兼容错误格式：状态为未完成但已有完成日期 → 判定为已完成
 */
function getEffectiveStatus(task: any): string {
	const incomplete =
		task._status === "todo" ||
		task._status === "planned" ||
		task._status === "in-progress";

	if (incomplete && task._done) return "completed";
	if (incomplete && task._cancel) return "cancelled";

	return task._status;
}

export function renderOverdueList(
	container: HTMLElement,
	tasks: any[],
	options?: { onClick?: (task: any) => void },
) {
	container.empty();

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayTime = today.getTime();

	// 筛选逾期任务
	const overdueTasks = tasks.filter((task) => {
		const effectiveStatus = getEffectiveStatus(task);

		const isIncomplete =
			effectiveStatus === "todo" ||
			effectiveStatus === "planned" ||
			effectiveStatus === "in-progress";

		// 未完成：截止日期在今天之前
		if (isIncomplete && task._due) {
			const dueTime = new Date(task._due).getTime();
			return dueTime < todayTime;
		}

		// 已完成：截止日期在完成日期之前
		if (
			(effectiveStatus === "completed" ||
				effectiveStatus === "cancelled") &&
			task._due &&
			task._done
		) {
			const dueTime = new Date(task._due).getTime();
			const doneTime = new Date(task._done).getTime();
			return dueTime < doneTime;
		}

		return false;
	});

	if (overdueTasks.length === 0) {
		container.createDiv({ text: "✅ 暂无逾期任务" });
		return;
	}

	// 按逾期天数分组
	const groups: Record<string, any[]> = {};
	overdueTasks.forEach((task) => {
		const effectiveStatus = getEffectiveStatus(task);
		const isCompleted =
			effectiveStatus === "completed" || effectiveStatus === "cancelled";
		const dueTime = new Date(task._due).getTime();

		// 已完成任务：逾期天数 = 完成日期 - 截止日期
		// 未完成任务：逾期天数 = 今天 - 截止日期
		let days: number;
		if (isCompleted && task._done) {
			const doneTime = new Date(task._done).getTime();
			days = Math.floor((doneTime - dueTime) / 86400000);
		} else {
			days = Math.floor((todayTime - dueTime) / 86400000);
		}

		const label =
			days === 0 ? "今天到期" : days === 1 ? "逾期1天" : `逾期${days}天`;
		if (!groups[label]) groups[label] = [];
		groups[label].push(task);
	});

	const sortedKeys = Object.keys(groups).sort((a, b) => {
		const na = parseInt(a.replace(/[^0-9]/g, "")) || 0;
		const nb = parseInt(b.replace(/[^0-9]/g, "")) || 0;
		return nb - na;
	});

	sortedKeys.forEach((key) => {
		const card = createGroupCard({
			title: `⏰ ${key}`,
			count: groups[key].length,
			tasks: groups[key],
			color: "rgba(224,108,117,0.25)",
			onClick: options?.onClick,
		});
		container.appendChild(card);
	});
}
