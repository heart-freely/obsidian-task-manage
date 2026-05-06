
---

## 3. `.cline/skills/code/views/future-task-all-view.md`

```markdown
---
name: 全部未来任务视图开发
description: 开发或修改显示所有未来未完成任务的视图
skill-version: 3.1
triggers:
  - 修改全部未来任务视图
---

# 全部未来任务视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/future-task-all-view.js`

## 导出 <!-- @sync -->
- `FutureTaskAllView`
- `VIEW_TYPE_FUTURE_ALL`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/future-task-all-view.js`
- Skill：`.cline/skills/code/views/future-task-all-view.md`

## 功能 <!-- @manual -->
- 显示今天之后（不含今天）所有未完成、非循环任务
- 按状态分组，组内按计划时间升序、优先级降序

## 实现方式 <!-- @sync -->
- 调用 `readTasks.getAllTasks` 获取全量任务
- 过滤：`!task.isRecurring && task.status.type === 'TODO'`，且任务日期或区间与未来有交集（任何日期 >= tomorrow 或区间结束 >= tomorrow）
- 分组（状态固定顺序），组内排序：`task.scheduled` 升序（无计划日期置后），再 `task.priority` 降序

## 核心函数 (@skill-sig) <!-- @sync -->
- `fetchFutureTasks(tasks: Task[], startDate: string): Task[]` - 筛选所有未来任务（日期 >= startDate）
- `isTaskInFuture(task: Task, startDate: string): boolean` - 检查任务是否属于未来

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="future-tasks-all-view">
  <div class="task-group" data-status="backlog">...</div>
  <div class="task-group" data-status="planned">...</div>
  <div class="task-group" data-status="inProgress">...</div>
</div>

状态模型 (@skill-state) <!-- @sync -->

无内部状态（纯展示视图）
事件流 (@skill-flow) <!-- @sync -->

    加载数据 → 过滤 → 分组 → 排序 → 渲染

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
tomorrow = 今天的日期 + 1天
futureTasks = tasks.filter(t => 
  !t.isRecurring && 
  statusIsTODO(t) && 
  isTaskInFuture(t, tomorrow)
)
每组内排序：默认按 scheduled 升序，其次 priority 降序
渲染各组（使用 createTaskCard）

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    过滤 O(n * k)（k ≈ 4～6 个日期字段）

    排序 O(n log n)

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks

    DateUtils.addDays

    createTaskCard

关键条件 (@skill-condition) <!-- @sync -->

    仅考虑未完成、非循环任务。

    只要任意一个相关日期字段 >= tomorrow 即视为未来任务。

依赖 <!-- @sync -->

    readTasks.getAllTasks

    DateUtils

    createTaskCard

    BaseTaskView

错误处理 <!-- @sync -->

    无未来任务时显示占位符。

    日期解析错误时跳过该任务。

测试要点 <!-- @manual -->

    验证发生在今天之后且包含明天的任务被正确显示。

    验证无日期任务不会误判为未来（除非区间结束在未来）。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）
    