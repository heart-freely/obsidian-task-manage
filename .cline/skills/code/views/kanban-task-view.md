---
name: 看板视图开发
description: 三列状态看板（未开始/计划中/进行中）
skill-version: 4.0
triggers:
  - 修改看板视图
  - 添加列或调整排序
  - 优化看板性能
---

# 看板视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/kanban-task-view.js`

## 导出 <!-- @sync -->
- `KanbanTaskView`
- `VIEW_TYPE_KANBAN`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/kanban-task-view.js`
- Skill：`.cline/skills/code/views/kanban-task-view.md`

## 功能 <!-- @manual -->
- 横向三列：未开始、计划中、进行中
- 各列内独立按优先级排序

## 实现方式 <!-- @sync -->
- 按状态符号分拣
- 列内排序可独立

## 核心函数 (@skill-sig) <!-- @sync -->
- `getTasksForKanban(dv, state): { todo, planned, inProgress }`
- `sortColumn(tasks, sortKey): Task[]`

## DOM 结构 <!-- @sync -->
```html
<div class="kanban-view view-grid cols-3">
  <div class="view-col" data-status="todo">...</div>
  <div class="view-col" data-status="planned">...</div>
  <div class="view-col" data-status="inProgress">...</div>
</div>
```

## 状态模型 <!-- @sync -->

```
{ tasks, sortKey, sortAsc }
```

## 事件流 <!-- @sync -->

- 加载 → 分拣 → 排序 → 渲染
- 排序切换 → 重新排序 → 渲染

## 关键算法复杂度 <!-- @sync -->

分拣 O(n)，列内排序 O(m log m)

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `createTaskCard`

## 依赖 <!-- @sync -->

- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 某列无数据显示占位符

## 测试要点 <!-- @manual -->

- 验证各列排序独立

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
