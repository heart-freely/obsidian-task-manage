/**
 * 侧边栏面板 - 按照 GTD 方法论分组显示视图切换按钮
 *
 * 分组：
 *   收集  - 任务收集箱
 *   整理  - 任务整理处、任务矩阵、任务看板
 *   回顾  - 重要任务、循环任务、今天任务、未来 15 天任务、未来任务、逾期任务、
 *           依赖任务、标签任务、所有任务时间轴、所有任务任务表、所有任务任务树、
 *           所有任务日历图、所有任务甘特图
 *   执行  - (预留)
 *   统计  - 所有任务基础统计图、所有任务详细统计图、番茄钟统计图
 */

const VIEW_GROUPS = {
	collect: {
		title: "收集",
		views: [
			{
				type: "inbox",
				emoji: "📥",
				label: "任务收集箱",
				title: "任务收集箱 - 收集所有待处理任务",
			},
		],
	},
	organize: {
		title: "整理",
		views: [
			{
				type: "organize",
				emoji: "✏️",
				label: "任务整理处",
				title: "任务整理处 - 补全和修改任务标记",
			},
			{
				type: "matrix",
				emoji: "◈",
				label: "任务矩阵",
				title: "任务矩阵 - 四象限优先级管理",
			},
			{
				type: "kanban",
				emoji: "〰",
				label: "任务看板",
				title: "任务看板 - 看板视图",
			},
		],
	},
	review: {
		title: "回顾",
		views: [
			{
				type: "important",
				emoji: "⭐",
				label: "重要任务",
				title: "重要任务 - 高优先级任务",
			},
			{
				type: "recurring",
				emoji: "🔁",
				label: "循环任务",
				title: "循环任务 - 周期性重复任务",
			},
			{
				type: "today",
				emoji: "📅",
				label: "今天任务",
				title: "今天任务 - 今日需处理的任务",
			},
			{
				type: "future-n",
				emoji: "➡️",
				label: "未来 15 天",
				title: "未来 15 天任务",
			},
			{
				type: "future-all",
				emoji: "🔮",
				label: "未来任务",
				title: "全部未来任务",
			},
			{
				type: "overdue",
				emoji: "⚠️",
				label: "逾期任务",
				title: "逾期任务 - 已过期未完成的任务",
			},
			{
				type: "depends",
				emoji: "🔗",
				label: "依赖任务",
				title: "依赖任务 - 有依赖关系的任务",
			},
			{
				type: "tag",
				emoji: "🏷️",
				label: "标签任务",
				title: "标签任务 - 按标签聚合",
			},
			{
				type: "timeline",
				emoji: "📈",
				label: "时间线",
				title: "所有任务时间轴",
			},
			{
				type: "table",
				emoji: "📊",
				label: "任务表",
				title: "所有任务任务表",
			},
			{
				type: "tree",
				emoji: "🌳",
				label: "任务树",
				title: "所有任务任务树",
			},
			{
				type: "calendar",
				emoji: "🗓️",
				label: "日历图",
				title: "所有任务日历图",
			},
			{
				type: "gantt",
				emoji: "📋",
				label: "甘特图",
				title: "所有任务甘特图",
			},
		],
	},
	execute: {
		title: "执行",
		views: [],
	},
	stats: {
		title: "统计",
		views: [
			{
				type: "data",
				emoji: "📉",
				label: "基础统计",
				title: "所有任务基础统计图",
			},
			{
				type: "data-detail",
				emoji: "📊",
				label: "详细统计",
				title: "所有任务详细统计图",
			},
			{
				type: "pomodoro",
				emoji: "🍅",
				label: "番茄钟",
				title: "番茄钟统计图",
			},
		],
	},
};

/**
 * 构建带折叠功能的侧边栏按钮面板
 * 分组标题可点击切换展开/收起，内部按钮纵向排列
 * 默认所有分组全部展开
 */
export function buildSideButtonBar(container, dv, state) {
	const sideBar = dv.el("div", "");
	// 垂直布局，整体从上到下
	sideBar.style.cssText =
		"display:flex; flex-direction:column; padding:4px 0; gap:4px;";

	Object.entries(VIEW_GROUPS).forEach(([groupKey, group]) => {
		if (group.views.length === 0) return;

		// ---- 分组标题按钮（可点击折叠） ----
		const headerBtn = dv.el("button", group.title, {
			cls: "side-group-header",
		});
		headerBtn.style.cssText =
			"display:flex; align-items:center; justify-content:space-between; " +
			"width:100%; padding:8px 12px; font-size:13px; font-weight:600; " +
			"text-transform:uppercase; letter-spacing:0.5px; " +
			"border:none; border-radius:4px; background:transparent; " +
			"cursor:pointer; text-align:left; transition:background 0.15s;";

		// 添加一个展开/收起的箭头图标
		const arrow = dv.el("span", "▸", { cls: "group-arrow" });
		arrow.style.cssText =
			"font-size:10px; transition:transform 0.2s; display:inline-block;";
		headerBtn.appendChild(arrow);

		// ---- 分组内按钮容器（默认展开） ----
		const btnWrap = dv.el("div", "");
		btnWrap.style.cssText =
			"display:flex; flex-direction:column; gap:2px; padding:0 4px;";

		// 填充该分组的视图按钮
		group.views.forEach((view) => {
			const btn = dv.el("button", view.emoji, {
				cls:
					"side-btn" +
					(state.sideViewType === view.type
						? " side-btn-active"
						: ""),
				title: view.label + " - " + view.title,
			});
			btn.style.cssText =
				"display:flex; align-items:center; justify-content:center; " +
				"padding:4px 8px; font-size:16px; border:none; border-radius:4px; " +
				"background:transparent; cursor:pointer; width:100%; " +
				"transition:background 0.15s;";

			// 鼠标悬停
			btn.onmouseenter = () => {
				if (!btn.classList.contains("side-btn-active")) {
					btn.style.background = "var(--background-modifier-hover)";
				}
			};
			btn.onmouseleave = () => {
				btn.style.background = "";
			};

			// 点击切换视图
			btn.onclick = () => {
				state.sideViewType = view.type;
				document.querySelectorAll(".side-btn").forEach((b) => {
					b.classList.remove("side-btn-active");
					b.style.background = "";
				});
				btn.classList.add("side-btn-active");
				btn.style.background = "var(--background-modifier-hover)";
				if (state.onViewChange) {
					state.onViewChange(view.type);
				}
			};

			btnWrap.appendChild(btn);
		});

		// ---- 折叠交互逻辑 ----
		headerBtn.onclick = () => {
			const isExpanded = btnWrap.style.display !== "none";
			if (isExpanded) {
				// 收起
				btnWrap.style.display = "none";
				arrow.style.transform = "rotate(0deg)";
			} else {
				// 展开
				btnWrap.style.display = "flex";
				arrow.style.transform = "rotate(90deg)";
			}
		};

		// 鼠标悬停效果（标题按钮）
		headerBtn.onmouseenter = () => {
			headerBtn.style.background = "var(--background-modifier-hover)";
		};
		headerBtn.onmouseleave = () => {
			headerBtn.style.background = "transparent";
		};

		// 默认全部展开：设置箭头旋转
		arrow.style.transform = "rotate(90deg)";

		sideBar.appendChild(headerBtn);
		sideBar.appendChild(btnWrap);
	});

	container.appendChild(sideBar);
	return sideBar;
}
export { buildSideButtonBar as buildViewSwitcher };
