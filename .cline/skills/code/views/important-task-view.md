
---

## 3. `.cline/skills/code/views/important-task-view.md`

```markdown
---
name: 重要任务视图开发
description: 开发或修改重要任务视图，筛选高优先级未完成任务
skill-version: 3.1
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
- 筛选未完成且优先级为 🔺(最高)、⏫(高)、🔼(中) 的任务
- 两级分组：优先级 → 状态，组内按截止日期升序

## 实现方式 <!-- @sync -->
- 调用 `readTasks.getAllTasks` 获取全量任务
- 过滤条件：`task.status.type === 'TODO'` 且 `task.priority` 值在 [1,3]（对应 p0/p1/p2）
- 分组顺序：先按优先级数值降序（高至低），再按状态映射顺序（未开始→计划中→进行中）
- 组内排序：`task.due` 升序（日期越早越靠前）

## 核心函数 (@skill-sig) <!-- @sync -->
- `filterImportantTasks(tasks: Task[]): Task[]` - 筛选重要未完成任务
- `groupByPriorityAndStatus(tasks: Task[]): GroupedTasks` - 两级分组
- `renderGroupedTasks(container: HTMLElement, grouped: GroupedTasks): void` - 渲染分组列表

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="important-view">
  <div class="priority-group" data-priority="p0">
    <h3>最高优先级</h3>
    <div class="status-group" data-status="todo">...</div>
    <div class="status-group" data-status="planned">...</div>
    <div class="status-group" data-status="inProgress">...</div>
  </div>
  <!-- p1, p2 类似 -->
</div>
状态模型 (@skill-state) <!-- @sync -->

无内部状态（纯展示视图）
事件流 (@skill-flow) <!-- @sync -->

    加载数据 → filterImportantTasks → groupByPriorityAndStatus → 渲染

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
filtered = tasks.filter(t => t.status.type === 'TODO' && priority ∈ [1,2,3])
按 priority 降序分组 → 每个组内按状态分组（固定顺序）
每个状态组内按 due 升序排序
使用 createTaskCard 渲染

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    过滤：O(n)

    分组：O(n)

    组内排序：O(m log m)

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    createTaskCard(normalizeTaskCardData(task))

关键条件 (@skill-condition) <!-- @sync -->

    只保留状态为“未开始”、“计划中”、“进行中”的任务（通过 status.type === 'TODO' 判断）

    优先级映射：🔺→p0 (priority=1)，⏫→p1 (priority=2)，🔼→p2 (priority=3)

依赖 <!-- @sync -->

    readTasks.getAllTasks

    createTaskCard

    BaseTaskView

错误处理 <!-- @sync -->

    无重要任务时显示“暂无重要任务”占位符。

    优先级字段缺失时视为最低，不进入筛选结果。

测试要点 <!-- @manual -->

    验证优先级阈值可配置（修改 priorityRange 变量）。

    验证状态分组顺序固定且组内排序正确。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）