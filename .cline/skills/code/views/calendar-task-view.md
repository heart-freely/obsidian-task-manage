---
name: 任务日历视图开发
description: 日/周/月/季/年多级日历视图，任务与时间段交集判断
skill-version: 4.0
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
- 动态生成日/周/月/季/年视图
- 支持单点日期和区间两种交集模式
- 周/月/季视图非起止日绘制彩色过渡线条
- 年视图用颜色深浅表示完成任务数量
- 点击任务跳转日视图聚焦

## 实现方式 <!-- @sync -->
- Canvas 渲染（或 ECharts）
- 预建日期桶，标记起止日
- 交集判断：单点日期匹配或区间覆盖
- 线条颜色映射任务状态

## 核心函数 (@skill-sig) <!-- @sync -->
- `buildDateBuckets(tasks, mode): Map<string, Task[]>`
- `isTaskInDate(task, date, mode): bool`
- `renderYearView(year, yearData): HTMLElement`
- `renderMonthView(year, month, monthData): HTMLElement`
- `renderWeekView(startDate, weekData): HTMLElement`
- `renderDayView(date, dayTasks): HTMLElement`

## DOM 结构 <!-- @sync -->
```html
<div class="calendar-view cal-container">
  <div class="cal-toolbar">...</div>
  <div class="cal-view-content"></div>
</div>
```

## 状态模型 <!-- @sync -->

```
{ allTasks, currentView, currentDate, intersectMode, hideRecurring, hideCompleted, hideCancelled }
```

## 事件流 <!-- @sync -->

- 加载 → 过滤 → 构建桶 → 渲染
- 切换视图/日期/模式 → 重新渲染
- 点击任务 → 跳转日视图

## 关键算法复杂度 <!-- @sync -->

桶构建 O(n * d)，渲染 O(格子数)

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks` (`.cline/skills/code/tasks/read-tasks.md`)
- `DateUtils` (`.cline/skills/code/utils/date-utils.md`)

## 关键条件 <!-- @sync -->

- 区间模式下无截止日期任务只占当天
- 非起止日只绘制彩色条，不显示文字

## 依赖 <!-- @sync -->

- Canvas API
- `BaseTaskView` (`.cline/skills/code/views/base-task-view.md`)

## 错误处理 <!-- @sync -->

- 无任务显示占位符
- Canvas 降级为表格

## 测试要点 <!-- @manual -->

- 验证区间跨天显示连续彩色条
- 验证年视图色块与完成数正比

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
