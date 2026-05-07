---
name: 逾期任务视图开发
description: 显示未完成且截止日期已过的任务
skill-version: 4.0
triggers:
  - 修改逾期任务视图
  - 调整逾期判定逻辑
---

# 逾期任务视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/overdue-task-view.js`

## 导出 <!-- @sync -->
- `OverdueTaskView`
- `VIEW_TYPE_OVERDUE`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/overdue-task-view.js`
- Skill：`.cline/skills/code/views/overdue-task-view.md`

## 功能 <!-- @manual -->
- 筛选未完成、非循环、且截止日期 < 今天的任务
- 按状态分组，组内按截止日期升序，优先级降序

## 实现方式 <!-- @sync -->
- 过滤 `!isRecurring && status TODO && due < today`

## 核心函数 (@skill-sig) <!-- @sync -->
- `fetchOverdueTasks(dv, state): Task[]`
- `groupByStatus(tasks): Map<string, Task[]>`

## DOM 结构 <!-- @sync -->
同标准分组视图

## 状态模型 <!-- @sync -->
无内部状态

## 事件流 <!-- @sync -->
加载 → 过滤 → 分组 → 排序 → 渲染

## 关键算法复杂度 <!-- @sync -->
O(n) 过滤，O(n log n) 排序

## 公共调用 <!-- @sync -->
- `readTasks.getAllTasks`
- `DateUtils`
- `createTaskCard`

## 依赖 <!-- @sync -->
- `BaseTaskView`

## 错误处理 <!-- @sync -->
- 无逾期任务显示占位符

## 测试要点 <!-- @manual -->
- 验证截止日期昨天的任务显示，今天的不显示

## 修改指南 <!-- @auto-record -->
- 2026-05-07: v4.0 初始化
