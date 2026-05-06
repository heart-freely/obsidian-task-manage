
---

## 5. `.cline/skills/code/views/kanban-task-view.md`

```markdown
---
name: 看板视图开发
description: 开发三列状态看板（未开始/计划中/进行中）
skill-version: 3.1
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
- 同一 API 调用获取所有任务，按状态符号分拣到各列
- 各列内独立按优先级数值排序（可扩展）
- 任务卡片点击跳转到源文件对应行

## 实现方式 <!-- @sync -->
- 从 `readTasks.getAllTasks` 获取全部任务
- 分拣规则：依据 `task.statusSymbol` 分配列（空格→未开始，?→计划中，/→进行中）
- 使用 `DocumentFragment` 批量插入卡片，布局使用 `.view-grid.cols-3`

## 核心函数 (@skill-sig) <!-- @sync -->
- `getTasksForKanban(dv: DataView, state: AppState): { todo: Task[], planned: Task[], inProgress: Task[] }` - 分拣任务
- `sortColumn(tasks: Task[], sortKey: string): Task[]` - 列内排序（默认 priority 降序）

## DOM 结构 (@skill-dom) <!-- @sync -->
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
</div>
状态模型 (@skill-state) <!-- @sync -->
js

state = {
  tasks: Task[],
  sortKey: 'priority',
  sortAsc: false
}

事件流 (@skill-flow) <!-- @sync -->

    加载时：获取任务 → 分拣 → 排序 → 渲染各列

    排序按钮（如添加）：更新 sortKey/sortAsc → 重新排序所有列 → 重新渲染列

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
cols = {
  todo: tasks.filter(t => t.statusSymbol === ' '),
  planned: tasks.filter(t => t.statusSymbol === '?'),
  inProgress: tasks.filter(t => t.statusSymbol === '/')
}
每列按 sortKey 和 sortAsc 排序
各列使用 createTaskCard 生成卡片，插入列容器

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    分拣：O(n)

    列内排序：O(m log m)（m 为列大小）

    渲染：DocumentFragment 批量插入，减少重排

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    createTaskCard(normalizeTaskCardData(task))

关键条件 (@skill-condition) <!-- @sync -->

    状态符号严格匹配：空格（' '）→未开始，问号（'?'）→计划中，斜杠（'/'）→进行中

    其他状态符号的任务不显示在看板中

依赖 <!-- @sync -->

    readTasks.getAllTasks

    createTaskCard

    BaseTaskView

错误处理 <!-- @sync -->

    某列无数据时显示“暂无任务”占位符。

    若任务状态符号无效，跳过该任务并输出警告。

测试要点 <!-- @manual -->

    验证各列任务卡片数量正确。

    验证点击卡片能跳转到正确的源文件行号。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）