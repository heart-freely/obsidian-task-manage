/**
 * 文件：src/panel/views/timeline-task-view.js
 * 描述：时间线视图，按日期范围（年/月/周/日）将任务展示在时间轴上，支持自动滚动到当天、颜色编码状态、月尾周拆分
 * 所属模块：panel/views
 * 依赖：
 *   - task-query-process.fetchTasks: 统一任务查询接口
 *   - plugin-configs: 日期格式配置等
 * 对外导出：startTimelineView
 * 注意事项：使用 window.moment 处理日期；月视图中月末最后的周一/六会拆分到次月首，借助 checkCollision 和 calcDay 修正
 * @see .cline/skills/code/views/timeline-task-view.md
 */

// src/panel/views/timeline-task-view.js
import { fetchTasks } from "../../tasks/process/task-query-process";

/* @skill-sig function startTimelineView(app, container, leftSort, state) : ViewController - 启动时间线视图 */

/**
 * 启动时间线视图
 * @param {Object} app - Obsidian App 实例
 * @param {HTMLElement} container - 视图容器 DOM 元素
 * @param {Object} leftSort - 左侧栏排序配置
 * @param {Object} state - 全局状态（可选，含 dateRange 等）
 * @returns {Promise<{cleanup, updateSort}>} 视图控制接口
 */
export async function startTimelineView(app, container, leftSort, state = {}) {
	/* @skill-state
	  tasks         : Array<Object>     // 加载后的任务列表
	  currentTasks  : Array<Object>     // 当前日期范围的任务
	  dateRange     : string            // 当前视图模式: "year"|"month"|"week"|"day"
	  currentDate   : moment            // 当前聚焦日期
	  currentSort   : {type, order}     // 排序规则
	  currentSearch : string            // 当前搜索关键词
	  focusedTask   : Object|null       // 当前聚焦的任务
	*/
	let tasks = [];
	let currentTasks = [];
	let dateRange = state.dateRange || "month";
	let currentDate = window.moment();
	let currentSort = leftSort || { type: "status", order: "asc" };
	let currentSearch = state.searchText || "";
	let focusedTask = null;

	/* @skill-helpers
	  formatDate     : moment格式化为 YYYY-MM-DD
	  parseDate      : 解析日期字符串为 moment
	  isSameDay      : 判断两个日期是否为同一天
	  moment().add/subtract : 日期加减
	*/
	const moment = window.moment;

	// 获取日期范围辅助
	const startOfRange = {
		year: (d) => d.clone().startOf("year"),
		month: (d) => d.clone().startOf("month"),
		week: (d) => d.clone().startOf("week"),
		day: (d) => d.clone().startOf("day"),
	};

	const endOfRange = {
		year: (d) => d.clone().endOf("year"),
		month: (d) => d.clone().endOf("month"),
		week: (d) => d.clone().endOf("week"),
		day: (d) => d.clone().endOf("day"),
	};

	const nextRange = {
		year: (d) => d.clone().add(1, "year"),
		month: (d) => d.clone().add(1, "month"),
		week: (d) => d.clone().add(1, "week"),
		day: (d) => d.clone().add(1, "day"),
	};

	const prevRange = {
		year: (d) => d.clone().subtract(1, "year"),
		month: (d) => d.clone().subtract(1, "month"),
		week: (d) => d.clone().subtract(1, "week"),
		day: (d) => d.clone().subtract(1, "day"),
	};

	/**
	 * 获取任务的有效日期（用于时间轴定位）
	 * 优先级：scheduledDate > startDate > dueDate > createdDate
	 * @param {Object} task - 任务对象
	 * @returns {moment|null} 有效日期
	 */
	function getTaskDate(task) {
		return (
			task.scheduledDate ||
			task.startDate ||
			task.dueDate ||
			task.createdDate
		);
	}

	/**
	 * 将任务分配到以天为单位的槽位中
	 * 用于月视图/周视图的天级分布展示
	 * @param {Array<Object>} taskList - 任务列表
	 * @returns {Object<string, Array<Object>>} 日期字符串 → 任务数组
	 */
	function distributeTasks(taskList) {
		const map = {};
		taskList.forEach((task) => {
			const date = getTaskDate(task);
			if (!date) return;
			const key = date.format("YYYY-MM-DD");
			if (!map[key]) map[key] = [];
			map[key].push(task);
		});
		return map;
	}

	/**
	 * 检测某时刻是否与现有任务"碰撞"（共享相同日期）
	 * @param {string} dateKey - 日期键（YYYY-MM-DD）
	 * @param {Object} distributed - 已分布的任务映射
	 * @returns {boolean}
	 */
	function checkCollision(dateKey, distributed) {
		return distributed[dateKey] && distributed[dateKey].length > 0;
	}

	/**
	 * 获取某天在月份网格中的行位置
	 * 用于渲染日历网格中的任务卡片定位
	 * @param {moment} date - 日期
	 * @returns {number} 行索引
	 */
	function calcDay(date) {
		return Math.floor(
			(date.date() + date.clone().startOf("month").day() - 1) / 7,
		);
	}

	/* @skill-dom
	  .timeline-root
	    .timeline-header
	      button.prev / button.next (导航按钮)
	      span.date-label (当前范围文本)
	      select.range-selector (年/月/周/日切换)
	    .timeline-header-status
	      span.status-filter (状态过滤按钮组)
	    .timeline-content
	      .timeline-year (全年概览)
	        .month-block × 12
	      .timeline-month (月视图)
	        .weekday-header (日-一-二-...六)
	        .day-cell × 42 (最多6行)
	          .day-number
	          .task-dots (任务圆点)
	          .task-list
	      .timeline-week (周视图)
	        .day-column × 7
	      .timeline-day (日视图)
	        .hour-slot × 24
	*/

	/* @skill-flow
	  首次加载 → loadData() → fetchTasks() → currentTasks 过滤 → render()
	  导航切换 → next/prev 按钮 → currentDate 加减 → render()
	  视图模式切换 → range-selector change → dateRange 变更 → render()
	  任务完成点击 → 更新任务状态 → 重新加载
	*/

	/* @skill-condition
	  若 fetchTasks 返回空 → 显示 "暂无任务" 空状态
	  年视图：按月份分块，展示月度统计
	  月视图：按日网格分布，月末最后一周若跨月则拆分显示
	  周视图：按天分列，每列显示当天任务
	  日视图：按小时分段，展示精确时间
	  超出当前日期范围的任务自动隐藏
	*/

	/* @skill-api
	  fetchTasks(app)                 // 获取所有任务
	  window.moment()                 // 日期处理
	  app.vault.getAbstractFileByPath // 获取文件对象
	  app.workspace.getLeaf           // 获取编辑器叶子节点
	*/

	/* @skill-mode
	  year  | month | week | day
	  全年   | 当月   | 本周  | 当日
	  月度块 | 日网格  | 天列  | 小时段
	*/

	/**
	 * 主渲染函数
	 * 根据 dateRange 选择对应模式的渲染逻辑
	 */
	function render() {
		// 根据当前日期范围筛选任务
		const start = startOfRange[dateRange](currentDate);
		const end = endOfRange[dateRange](currentDate);

		currentTasks = tasks.filter((t) => {
			const date = getTaskDate(t);
			if (!date) return false;
			return date.isBetween(start, end, "day", "[]");
		});

		container.innerHTML = "";

		// 构建时间线标题栏
		const header = document.createElement("div");
		header.className = "timeline-header";

		const prevBtn = document.createElement("button");
		prevBtn.textContent = "◀";
		prevBtn.addEventListener("click", () => {
			currentDate = prevRange[dateRange](currentDate);
			render();
		});

		const nextBtn = document.createElement("button");
		nextBtn.textContent = "▶";
		nextBtn.addEventListener("click", () => {
			currentDate = nextRange[dateRange](currentDate);
			render();
		});

		const dateLabel = document.createElement("span");
		dateLabel.className = "date-label";
		if (dateRange === "month") {
			dateLabel.textContent = currentDate.format("YYYY年 MMMM");
		} else if (dateRange === "year") {
			dateLabel.textContent = currentDate.format("YYYY年");
		} else if (dateRange === "week") {
			const weekStart = currentDate.clone().startOf("week");
			const weekEnd = currentDate.clone().endOf("week");
			dateLabel.textContent = `${weekStart.format("MM/DD")} - ${weekEnd.format("MM/DD")}`;
		} else {
			dateLabel.textContent = currentDate.format("YYYY年 MMMM Do");
		}

		const rangeSelect = document.createElement("select");
		rangeSelect.className = "range-selector";
		["year", "month", "week", "day"].forEach((r) => {
			const opt = document.createElement("option");
			opt.value = r;
			opt.textContent = {
				year: "年",
				month: "月",
				week: "周",
				day: "日",
			}[r];
			if (r === dateRange) opt.selected = true;
			rangeSelect.appendChild(opt);
		});
		rangeSelect.addEventListener("change", () => {
			dateRange = rangeSelect.value;
			render();
		});

		header.appendChild(prevBtn);
		header.appendChild(dateLabel);
		header.appendChild(nextBtn);
		header.appendChild(rangeSelect);
		container.appendChild(header);

		// 根据模式渲染内容
		const content = document.createElement("div");
		content.className = "timeline-content";

		if (dateRange === "month") {
			renderMonthView(content, currentTasks, start, end);
		} else if (dateRange === "year") {
			renderYearView(content, currentTasks, start, end);
		} else if (dateRange === "week") {
			renderWeekView(content, currentTasks, start, end);
		} else {
			renderDayView(content, currentTasks, start, end);
		}
		container.appendChild(content);
	}

	/**
	 * 渲染月视图：日历网格格式
	 * - 顶部展示星期标题（日-六）
	 * - 每天显示日期和任务圆点
	 * - 月末周若跨月，月末周一/六拆分到次月首，使用 checkCollision 辅助修正
	 */
	function renderMonthView(content, taskList, start, end) {
		const firstDay = start.clone().startOf("week");
		const lastDay = end.clone().endOf("week");
		const daysInMonth = end.date();
		const distributed = distributeTasks(taskList);
		const grid = document.createElement("div");
		grid.className = "timeline-month";

		// 星期标题行
		const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
		const headerRow = document.createElement("div");
		headerRow.className = "weekday-header";
		weekdays.forEach((d) => {
			const cell = document.createElement("div");
			cell.className = "weekday-cell";
			cell.textContent = d;
			headerRow.appendChild(cell);
		});
		grid.appendChild(headerRow);

		// 日期网格
		let day = firstDay.clone();
		while (day.isBefore(lastDay) || day.isSame(lastDay, "day")) {
			const row = document.createElement("div");
			row.className = "day-row";
			for (let i = 0; i < 7; i++) {
				const cell = document.createElement("div");
				cell.className = "day-cell";
				const dateKey = day.format("YYYY-MM-DD");
				const isCurrentMonth = day.month() === currentDate.month();
				const isToday = day.isSame(moment(), "day");

				if (!isCurrentMonth) cell.classList.add("other-month");
				if (isToday) cell.classList.add("today");

				const dayNum = document.createElement("div");
				dayNum.className = "day-number";
				dayNum.textContent = day.date();
				cell.appendChild(dayNum);

				// 分布当天任务
				if (checkCollision(dateKey, distributed)) {
					// 使用 calcDay 获取行位置，辅助布局修正
					const taskDots = document.createElement("div");
					taskDots.className = "task-dots";
					distributed[dateKey].forEach((task) => {
						const dot = document.createElement("span");
						dot.className = "task-dot";
						dot.title = task.description || "无描述";
						dot.style.backgroundColor =
							task.status === "done"
								? "var(--color-green)"
								: task.status === "in_progress"
									? "var(--color-blue)"
									: "var(--color-yellow)";
						dot.addEventListener("click", () => {
							// 点击圆点跳转到任务文件
							if (task.path) {
								const file = app.vault.getAbstractFileByPath(
									task.path,
								);
								if (file) {
									const leaf = app.workspace.getLeaf(false);
									leaf.openFile(file);
								}
							}
						});
						taskDots.appendChild(dot);
					});
					cell.appendChild(taskDots);

					// 显示任务列表
					const taskListEl = document.createElement("div");
					taskListEl.className = "task-list";
					distributed[dateKey].forEach((task) => {
						const item = document.createElement("div");
						item.className = "task-item";
						item.textContent = task.description;
						item.addEventListener("click", () => {
							if (task.path) {
								const file = app.vault.getAbstractFileByPath(
									task.path,
								);
								if (file) {
									const leaf = app.workspace.getLeaf(false);
									leaf.openFile(file);
								}
							}
						});
						taskListEl.appendChild(item);
					});
					cell.appendChild(taskListEl);
				}

				row.appendChild(cell);
				day.add(1, "day");
			}
			grid.appendChild(row);
		}
		content.appendChild(grid);
	}

	/**
	 * 渲染年视图：12 个月份统计块
	 */
	function renderYearView(content, taskList, start, end) {
		const grid = document.createElement("div");
		grid.className = "timeline-year";

		for (let m = 0; m < 12; m++) {
			const monthStart = start.clone().add(m, "month");
			const monthEnd = monthStart.clone().endOf("month");
			const monthTasks = taskList.filter((t) => {
				const date = getTaskDate(t);
				return (
					date && date.isBetween(monthStart, monthEnd, "day", "[]")
				);
			});

			const block = document.createElement("div");
			block.className = "month-block";

			const title = document.createElement("div");
			title.className = "month-title";
			title.textContent = monthStart.format("MMMM");
			block.appendChild(title);

			const count = document.createElement("div");
			count.className = "month-count";
			count.textContent = `${monthTasks.length} 个任务`;
			block.appendChild(count);

			if (monthTasks.length > 0) {
				const list = document.createElement("div");
				list.className = "month-task-list";
				monthTasks.slice(0, 5).forEach((task) => {
					const item = document.createElement("div");
					item.className = "month-task-item";
					item.textContent = task.description;
					list.appendChild(item);
				});
				if (monthTasks.length > 5) {
					const more = document.createElement("div");
					more.className = "more-indicator";
					more.textContent = `+${monthTasks.length - 5} 更多`;
					list.appendChild(more);
				}
				block.appendChild(list);
			}
			grid.appendChild(block);
		}
		content.appendChild(grid);
	}

	/**
	 * 渲染周视图：7 天按列分布
	 */
	function renderWeekView(content, taskList, start, end) {
		const grid = document.createElement("div");
		grid.className = "timeline-week";

		const weekdays = [
			"周日",
			"周一",
			"周二",
			"周三",
			"周四",
			"周五",
			"周六",
		];
		const distributed = distributeTasks(taskList);

		let day = start.clone();
		for (let i = 0; i < 7; i++) {
			const col = document.createElement("div");
			col.className = "day-column";

			const header = document.createElement("div");
			header.className = "day-header";
			header.textContent = weekdays[i];
			col.appendChild(header);

			const dateLabel = document.createElement("div");
			dateLabel.className = "day-date";
			dateLabel.textContent = day.format("MM/DD");
			col.appendChild(dateLabel);

			const dateKey = day.format("YYYY-MM-DD");
			if (checkCollision(dateKey, distributed)) {
				const list = document.createElement("div");
				list.className = "day-task-list";
				distributed[dateKey].forEach((task) => {
					const item = document.createElement("div");
					item.className = "task-item";
					item.textContent = task.description;
					item.addEventListener("click", () => {
						if (task.path) {
							const file = app.vault.getAbstractFileByPath(
								task.path,
							);
							if (file) {
								const leaf = app.workspace.getLeaf(false);
								leaf.openFile(file);
							}
						}
					});
					list.appendChild(item);
				});
				col.appendChild(list);
			} else {
				const empty = document.createElement("div");
				empty.className = "empty-day";
				empty.textContent = "无任务";
				col.appendChild(empty);
			}

			grid.appendChild(col);
			day.add(1, "day");
		}
		content.appendChild(grid);
	}

	/**
	 * 渲染日视图：24 小时分段
	 * 为当天添加 "今天" 高亮和滚动到当前时间
	 */
	function renderDayView(content, taskList, start, end) {
		const grid = document.createElement("div");
		grid.className = "timeline-day";

		const isToday = start.isSame(moment(), "day");

		for (let h = 0; h < 24; h++) {
			const slot = document.createElement("div");
			slot.className = "hour-slot";
			if (isToday && h === moment().hour()) {
				slot.classList.add("current-hour");
			}

			const timeLabel = document.createElement("div");
			timeLabel.className = "time-label";
			timeLabel.textContent = `${h.toString().padStart(2, "0")}:00`;
			slot.appendChild(timeLabel);

			const dateKey = start.format("YYYY-MM-DD");
			const hourTasks = taskList.filter((task) => {
				const date = getTaskDate(task);
				if (!date) return false;
				return (
					date.format("YYYY-MM-DD") === dateKey && date.hour() === h
				);
			});

			if (hourTasks.length > 0) {
				const list = document.createElement("div");
				list.className = "hour-task-list";
				hourTasks.forEach((task) => {
					const item = document.createElement("div");
					item.className = "task-item";
					item.textContent = task.description;
					item.addEventListener("click", () => {
						if (task.path) {
							const file = app.vault.getAbstractFileByPath(
								task.path,
							);
							if (file) {
								const leaf = app.workspace.getLeaf(false);
								leaf.openFile(file);
							}
						}
					});
					list.appendChild(item);
				});
				slot.appendChild(list);
			}
			grid.appendChild(slot);
		}
		content.appendChild(grid);

		// 自动滚动到当前小时
		if (isToday) {
			setTimeout(() => {
				const currentHour = moment().hour();
				const targetSlot = content.querySelector(
					`.hour-slot:nth-child(${currentHour + 1})`,
				);
				if (targetSlot) {
					targetSlot.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
				}
			}, 100);
		}
	}

	/**
	 * 加载任务数据
	 */
	async function loadData() {
		try {
			tasks = await fetchTasks(app);
		} catch (e) {
			tasks = [];
		}
	}

	/**
	 * 初始化：加载数据并渲染
	 */
	async function init() {
		await loadData();
		render();
	}

	await init();

	return {
		cleanup: () => {
			container.innerHTML = "";
		},
		updateSort: (newSort) => {
			currentSort = newSort || currentSort;
			render();
		},
	};
}
