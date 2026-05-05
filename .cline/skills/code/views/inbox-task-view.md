--
name: 任务收集箱视图开发
description: 开发或修改收件箱视图，汇聚未开始与计划中任务
triggers:
  - 修改收件箱视图
  - 调整任务收集逻辑
  - 添加过滤或排序
---

# 任务收集箱视图 Skill

## 文件
`src/panel/views/inbox-task-view.js`

## 功能
- 自动汇聚所有未开始（`- [ ]`）和计划中（`- [?]`）的非循环任务
- 强制分组：未开始置顶，计划中其次
- 组内按优先级降序，紧凑显示

## 实现方式
- 调用 `readTasks.getAllTasks` 获取全量任务
- 过滤：`task.status.type === 'TODO'` && `!task.isRecurring`
- 渲染使用 `createTaskCard`，容器为 `ul.task-list.inbox-list`

## 核心函数
- `fetchInboxTasks(dv, state)` → Array<Task>
- `groupByStatus(tasks)` → { backlog: Task[], planned: Task[] }
- `sortGroup(tasks)`

## DOM 结构
```html
<div class="inbox-view">
  <div class="inbox-group" data-status="backlog">
    <h3>📍 未开始</h3>
    <ul class="task-list"></ul>
  </div>
  <div class="inbox-group" data-status="planned">
    <h3>📅 计划中</h3>
    <ul class="task-list"></ul>
  </div>
</div>
```
## 状态模型

无（纯展示视图）
## 事件流

    点击任务 → 跳转至源文件（事件委托）

## 数据流伪代码

    tasks = getAllTasks(dv, state)

    filtered = tasks.filter(t => !t.isRecurring && t.status.type === 'TODO')

    groups = { backlog: filtered.filter(t => t.statusSymbol === ' '), planned: ... }

    每组按优先级降序排序

    渲染两组 DOM

## ## 关键算法复杂度

    过滤和分组：O(n)

    组内排序：O(m log m)

    渲染：DocumentFragment 批量插入

## 公共调用

    readTasks.getAllTasks(dv, state)

    createTaskCard(normalizeTaskCardData(task))

## 关键条件

    仅保留状态为 TODO 且非循环的任务

## 依赖

    readTasks.getAllTasks

    createTaskCard

    BaseTaskView

## 修改指南

    调整展示的状态：修改过滤条件中的状态符号

    添加排序选项：在 sortGroup 中增加比较逻辑


