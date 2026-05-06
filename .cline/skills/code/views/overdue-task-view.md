
---

## 3. `.cline/skills/code/views/overdue-task-view.md`

```markdown
---
name: 逾期任务视图开发
description: 开发或修改逾期任务视图，显示未完成且截止日期已过的任务
skill-version: 3.1
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
- 筛选未完成、非循环，且截止日期小于今天的任务
- 可按状态分组（未开始、计划中、进行中）
- 组内先按截止日期远近排序，再按优先级降序

## 实现方式 <!-- @sync -->
- 调用 `readTasks.getAllTasks` 获取全量任务
- 过滤条件：`!task.isRecurring && task.status.type === 'TODO' && task.due && task.due < today`
- 分组后排序渲染

## 核心函数 (@skill-sig) <!-- @sync -->
- `fetchOverdueTasks(dv: DataView, state: AppState): Task[]` - 获取逾期任务列表
- `groupByStatus(tasks: Task[]): Map<string, Task[]>` - 按状态分组（固定顺序）
- `sortTaskGroup(tasks: Task[]): Task[]` - 先 due 升序，再 priority 降序

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="overdue-view">
  <div class="task-group" data-status="backlog">
    <h3>📍 未开始</h3>
    <ul class="task-list"></ul>
  </div>
  <div class="task-group" data-status="planned">
    <h3>📅 计划中</h3>
    <ul class="task-list"></ul>
  </div>
  <div class="task-group" data-status="inProgress">
    <h3>⏩ 进行中</h3>
    <ul class="task-list"></ul>
  </div>
</div>

状态模型 (@skill-state) <!-- @sync -->

无内部状态（纯展示视图）
事件流 (@skill-flow) <!-- @sync -->

    加载数据 → fetchOverdueTasks → 分组 → 排序 → 渲染

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
filtered = tasks.filter(t => 
  !t.isRecurring && 
  [' ', '?', '/'].includes(t.statusSymbol) &&  // TODO 状态的三种子状态
  t.due && 
  t.due < today
)
groups = groupByStatus(filtered)  // 按状态符号分组
每组内按 due 升序，priority 降序排序
渲染（使用 createTaskCard）

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    过滤：O(n)

    分组：O(n)

    组内排序：O(m log m)

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    DateUtils.compareDate(date1, date2)

    createTaskCard(normalizeTaskCardData(task))

关键条件 (@skill-condition) <!-- @sync -->

    无截止日期的任务不视为逾期，直接排除。

    仅包含 statusSymbol 为空格、问号、斜杠的任务（即未开始、计划中、进行中）。

依赖 <!-- @sync -->

    readTasks.getAllTasks

    DateUtils

    createTaskCard

    BaseTaskView

错误处理 <!-- @sync -->

    无逾期任务时显示“暂无逾期任务”占位符。

    日期比较失败时跳过该任务并输出警告。

测试要点 <!-- @manual -->

    验证截止日期为昨天的任务被显示，今天的任务不显示。

    验证状态分组顺序固定且组内排序正确。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）