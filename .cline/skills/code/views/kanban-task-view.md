---
name: 看板视图开发
description: 开发三列状态看板（未开始/计划中/进行中）
triggers:
  - 修改看板视图
  - 添加列或调整排序
  - 优化看板性能
---

# 看板视图 Skill

## 文件
`src/panel/views/kanban-task-view.js`

## 功能
- 横向三列：未开始、计划中、进行中
- 同一 API 调用获取所有任务，按状态符号分拣到各列
- 各列内独立按优先级数值排序（可扩展）
- 任务卡片点击跳转到源文件对应行

## 实现方式
- 从 `readTasks.getAllTasks` 获取全部任务
- 分拣规则：依据 `task.statusSymbol` 分配列
- 使用 `DocumentFragment` 批量插入卡片，布局使用 `.view-grid.cols-3`

## 核心函数
- `getTasksForKanban(dv, state)` → { todo: Task[], planned: Task[], inProgress: Task[] }
- `sortColumn(tasks, sortKey)`

## DOM 结构
```html
<div class="kanban-view view-grid cols-3">
  <div class="view-col" data-status="todo">
    <div class="col-header">🔲 未开始 <span class="count">3</span></div>
    <ul class="task-list"></ul>
  </div>
  <div class="view-col" data-status="planned">
    <div class="col-header">❔ 计划中 <span class="count">5</span></div>
    <ul class="task-list"></ul>
  </div>
  <div class="view-col" data-status="inProgress">
    <div class="col-header">⏩ 进行中 <span class="count">2</span></div>
    <ul class="task-list"></ul>
  </div>
```

## 状态模型
```js

state = {
  tasks: [],
  sortKey: 'priority',
  sortAsc: false
```}

## 事件流

    加载时：获取任务 → 分拣 → 排序 → 渲染各列

    排序按钮：更新 sortState → 重新排序 → 重新渲染列

## 数据流伪代码

    tasks = getAllTasks(dv, state)

    cols = { todo: tasks.filter(status ' '), planned: status '?', inProgress: status '/' }

    每列按 sortKey 排序

    各列使用 createTaskCard 渲染

## 关键算法复杂度

    分拣：O(n)

    列内排序：O(m log m)

    渲染：DocumentFragment 批量插入

## 公共调用

    readTasks.getAllTasks(dv, state)

    createTaskCard

## ## 关键条件

    状态符号严格匹配：空格（未开始）、?（计划中）、/（进行中）

## 依赖

    readTasks.getAllTasks

    createTaskCard, BaseTaskView

## 修改指南

    添加新列：扩展 cols 对象和映射规则

    调整排序：修改列内排序字段