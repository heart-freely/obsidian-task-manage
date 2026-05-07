---
name: 重要任务视图开发
description: 筛选高优先级未完成任务
skill-version: 4.0
triggers:
  - 修改重要任务视图
  - 调整优先级阈值
---

# 重要任务视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/important-task-view.js`

## 导出 <!-- @sync -->
- `ImportantTaskView`
- `VIEW_TYPE_IMPORTANT`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/important-task-view.js`
- Skill：`.cline/skills/code/views/important-task-view.md`

## 功能 <!-- @manual -->
- 筛选未完成且优先级为 🔺、⏫、🔼 的任务
- 两级分组：优先级 → 状态，组内按截止日期升序

## 实现方式 <!-- @sync -->
- 过滤 `status.type === 'TODO' && priority in [1,2,3]`
- 分组后排序

## 核心函数 (@skill-sig) <!-- @sync -->
- `filterImportantTasks(tasks): Task[]`
- `groupByPriorityAndStatus(tasks): GroupedTasks`
- `renderGroupedTasks(container, grouped): void`

## DOM 结构 <!-- @sync -->
```html
<div class="important-view">
  <div class="priority-group" data-priority="p0">...</div>
</div>
```

## 状态模型 <!-- @sync -->

无内部状态

## 事件流 <!-- @sync -->

加载 → 过滤 → 分组 → 渲染

## 关键算法复杂度 <!-- @sync -->

O(n) 过滤，O(n log n) 排序

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `createTaskCard`

## 依赖 <!-- @sync -->

- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 无重要任务显示占位符

## 测试要点 <!-- @manual -->

- 验证优先级阈值可配置

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
