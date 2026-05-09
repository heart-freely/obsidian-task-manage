---
name: 任务时间轴视图开发
description: 按截止日期分组，无日期单独置底，组内按状态再分组
skill-version: 4.0
triggers:
    - 修改时间轴视图
    - 调整分组或排序规则
---

# 任务时间轴视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/timeline-task-view.js`

## 导出 <!-- @sync -->
- `TimelineTaskView`
- `VIEW_TYPE_TIMELINE`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/timeline-task-view.js`
- Skill：`.cline/skills/code/panel/views/timeline-task-view.md`

## 功能 <!-- @manual -->
- 第一级按截止日期（或计划日期）分组
- 无日期组置底
- 组内按状态分组，状态组内按优先级降序

## 实现方式 <!-- @sync -->
- 日期键优先级：due > scheduled > 'no-date'
- 两级分组

## 核心函数 (@skill-sig) <!-- @sync -->
- `groupByDueDate(tasks): Map<string, Task[]>`
- `groupByStatusWithinDue(tasks): Map<string, Map<string, Task[]>>`

## DOM 结构 <!-- @sync -->
```html
<div class="timeline-view">
<div class="due-group" data-due="2026-05-10"><h3>截止 2026-05-10</h3>...</div>
<div class="due-group no-date"><h3>无截止日期</h3>...</div>
</div>
```
## 状态模型 <!-- @sync -->

无内部状态

## 事件流 <!-- @sync -->

加载 → 过滤 → 两级分组 → 渲染

## 关键算法复杂度 <!-- @sync -->

O(n) 分组，O(n log n) 排序

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `createTaskCard`

## 依赖 <!-- @sync -->

- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 无任务显示占位符

## 测试要点 <!-- @manual -->

- 验证无日期组在最后

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
