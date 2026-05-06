---
name: 任务日历视图开发
description: 任务日历视图，支持日/周/月/季/年多级视图，任务与时间段交集判断
skill-version: 3.1
triggers:
  - 修改日历视图渲染逻辑
  - 调整时间交集算法
  - 添加新视图层级
---

# 任务日历视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/calendar-task-view.js`

## 导出 <!-- @sync -->
- `CalendarTaskView`
- `VIEW_TYPE_CALENDAR`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/calendar-task-view.js`
- Skill：`.cline/skills/code/views/calendar-task-view.md`

## 功能 <!-- @manual -->
- 根据查询到的任务最小/最大日期动态生成日、周、月、季、年视图
- 判断任务与日期交集：支持精确时间点（创建、开始、截止等）和区间（计划-截止、开始-完成）两种模式
- 周/月/季视图仅在任务起止日期显示完整描述，中间绘彩色过渡线条（颜色对应任务状态）
- 年视图用颜色深浅表示完成任务数量
- 交互：点击任务跳转日视图聚焦、显示/隐藏循环/已完成/已取消任务、切换交集模式

## 实现方式 <!-- @sync -->
- 渲染引擎：Canvas 或 ECharts（优先 Canvas，性能更优）
- 数据处理阶段预建“日期桶”：每个日期存储相关任务列表，并标记该任务是否为起止日
- 交集判断算法：
  - 单一日期模式：匹配创建、开始、计划、截止、完成、取消任一字段等于当前日期
  - 区间模式：计划日期 ≤ 当前日期 ≤ 截止日期，或开始日期 ≤ 当前日期 ≤ 完成日期（无完成日期时用截止日期代替）
- 线条过渡：同一任务在非起止日绘制彩色条，颜色从预定义映射表中获取（基于执行状态）
- 样式以 `cal-` 前缀注入，避免污染全局

## 核心函数 (@skill-sig) <!-- @sync -->
- `buildDateBuckets(tasks: Task[], mode: 'point'|'range'): Map<string, Task[]>` - 构建日期到任务列表的映射桶
- `isTaskInDate(task: Task, date: string, mode: string): boolean` - 判断任务与日期是否有交集
- `renderYearView(year: number, yearData: Map<string, number>): HTMLElement` - 年视图（色块）
- `renderMonthView(year: number, month: number, monthData: Map<string, Task[]>): HTMLElement` - 月视图
- `renderWeekView(startDate: string, weekData: Task[]): HTMLElement` - 周视图
- `renderDayView(date: string, dayTasks: Task[]): HTMLElement` - 日视图

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="calendar-view cal-container">
  <div class="cal-toolbar">
    <button class="cal-prev">◀</button>
    <span class="cal-title">2026年5月</span>
    <button class="cal-next">▶</button>
    <select class="cal-view-level">
      <option value="day">日视图</option>
      <option value="week">周视图</option>
      <option value="month">月视图</option>
      <option value="quarter">季视图</option>
      <option value="year">年视图</option>
    </select>
  </div>
  <div class="cal-view-content">
    <!-- 动态渲染的日历网格 -->
  </div>
</div>
```

状态模型 (@skill-state) <!-- @sync -->
js

state = {
  allTasks: Task[],
  currentView: 'month',        // 'day'|'week'|'month'|'quarter'|'year'
  currentDate: string,         // 当前聚焦日期（YYYY-MM-DD）
  intersectMode: 'range',      // 'point' | 'range'
  hideRecurring: boolean,
  hideCompleted: boolean,
  hideCancelled: boolean,
  taskColorMap: Map<string, string>  // 任务状态 → 颜色
}

事件流 (@skill-flow) <!-- @sync -->

    加载数据 → 过滤（隐藏循环/完成/取消） → 根据当前视图渲染

    切换视图层级 → 更新 currentView → 重新渲染

    切换日期 → 更新 currentDate → 重新渲染当前视图

    切换交集模式 → 重新构建日期桶 → 重新渲染

    点击任务（年视图点击色块）→ 切换到日视图并聚焦到该日期

    点击任务条目 → 跳转至源文件

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state) + 应用全局筛选
dateBuckets = buildDateBuckets(tasks, intersectMode)
根据 currentView 和 currentDate 调用对应渲染函数
- 年视图：聚合每天完成任务数量，用颜色深浅表示
- 季/月/周：绘制格子，每个格子内显示任务条（起止日显示描述，中间显示彩色线）
- 日视图：任务列表

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    日期桶构建：O(n * k)，k 为任务涉及的天数区间长度（受区间限制，最多一年）

    渲染：O(视图中格子数 + 任务条数)，月视图约 42 格 × 平均任务数

    年视图：O(366) 色块

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    DateUtils.getDateRange(tasks)

    DateUtils.isSameDay

    createTaskCard（用于日视图列表）

关键条件 (@skill-condition) <!-- @sync -->

    区间模式下无截止日期的任务区间视为只包含当天。

    周/月/季视图中，非起止日只绘制背景彩色条，不显示文字描述。

    年视图只统计已完成任务的数量（按颜色深浅表示）。

依赖 <!-- @sync -->

    Canvas API（或 ECharts）

    readTasks.getAllTasks

    DateUtils

    BaseTaskView

错误处理 <!-- @sync -->

    无任务时显示“暂无任务”占位符。

    日期解析失败时跳过该任务，输出警告。

    Canvas 渲染失败时降级为表格显示。

测试要点 <!-- @manual -->

    验证区间模式下跨越多天的任务在日历上显示连续彩色条。

    验证切换交集模式后任务显示正确。

    验证年视图色块颜色深浅与完成任务数量成正比。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）