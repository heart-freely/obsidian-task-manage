---
name: 任务收集箱视图开发
description: 开发或修改收件箱视图，汇聚未开始与计划中任务
skill-version: 3.1
triggers:
  - 修改收件箱视图
  - 调整任务收集逻辑
  - 添加过滤或排序
---

# 任务收集箱视图 Skill

## 文件 <!-- @sync -->

`src/panel/views/inbox-task-view.js`

## 导出 <!-- @sync -->

- `InboxTaskView`
- `VIEW_TYPE_INBOX`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/views/inbox-task-view.js`
- Skill：`.cline/skills/code/views/inbox-task-view.md`

## 功能 <!-- @manual -->

- 自动汇聚所有未开始（`- [ ]`）和计划中（`- [?]`）的非循环任务
- 强制分组：未开始置顶，计划中其次
- 组内按优先级降序，紧凑显示

## 实现方式 <!-- @sync -->

- 调用 `readTasks.getAllTasks` 获取全量任务
- 过滤：`task.status.type === 'TODO'` && `!task.isRecurring`
- 渲染使用 `createTaskCard`，容器为 `ul.task-list.inbox-list`

## 核心函数 (@skill-sig) <!-- @sync -->

- `fetchInboxTasks(dv: DataView, state: AppState): Task[]` - 获取过滤后的收件箱任务
- `groupByStatus(tasks: Task[]): { backlog: Task[], planned: Task[] }` - 按状态符号分组
- `sortGroup(tasks: Task[], order: 'priority-desc'): Task[]` - 组内排序

## DOM 结构 (@skill-dom) <!-- @sync -->

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

## 状态模型 (@skill-state) <!-- @sync -->

无内部状态（纯展示视图）

## 事件流 (@skill-flow) <!-- @sync -->

加载数据 → 过滤 → 分组 → 排序 → 渲染
点击任务卡片 → 事件委托跳转至源文件

## 数据流伪代码 <!-- @sync -->

```text
tasks = getAllTasks(dv, state)
// 过滤条件：TODO 且非循环
filtered = tasks.filter(t => t.status.type === 'TODO' && !t.isRecurring)
// 按状态符号分组：空格 → backlog，? → planned
groups = { backlog: [], planned: [] }
每组按优先级降序排序
渲染两组 DOM（使用 DocumentFragment 批量插入）
```

## 关键算法复杂度 (@skill-algorithm) <!-- @sync -->

过滤：O(n)
分组：O(n)
组内排序：O(m log m)

## 公共调用 (@skill-api) <!-- @sync -->

readTasks.getAllTasks(dv, state)
createTaskCard(normalizeTaskCardData(task))

## 关键条件 (@skill-condition) <!-- @sync -->

仅保留状态为 TODO 且 isRecurring === false 的任务
状态符号空格（' '）对应未开始，问号（'?'）对应计划中

## 依赖 <!-- @sync -->

readTasks.getAllTasks
createTaskCard
BaseTaskView

## 错误处理 <!-- @sync -->

过滤后无任务时显示“暂无收件箱任务”占位符。
若任务缺少优先级字段，排序时置于末尾。

## 测试要点 <!-- @manual -->

验证循环任务被正确排除。
验证未开始组和计划中组的顺序不变。

## 修改指南 <!-- @auto-record -->

2026-05-06: 初始版本（基于 v3.1 格式规范化）
