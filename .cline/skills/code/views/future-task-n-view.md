
---

## 4. `.cline/skills/code/views/future-task-n-view.md`

```markdown
---
name: 未来15天任务视图开发
description: 开发或修改未来15天内任务视图
skill-version: 3.1
triggers:
  - 修改未来N天视图
  - 调整时间窗口大小
---

# 未来15天任务视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/future-task-n-view.js`

## 导出 <!-- @sync -->
- `FutureTaskNView`
- `VIEW_TYPE_FUTURE_N`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/future-task-n-view.js`
- Skill：`.cline/skills/code/views/future-task-n-view.md`

## 功能 <!-- @manual -->
- 显示今天之后15天内（含）有交集的未完成、非循环任务
- 日期或区间落在 [today+1, today+15] 内
- 按状态分组，组内排序：计划时间升序，优先级降序

## 实现方式 <!-- @sync -->
- 调用 `readTasks.getAllTasks` 获取全量任务
- 计算范围：[tomorrow, today+15]
- 对于每个任务，检查是否有任意日期字段在范围内，或日期区间与范围重叠
- 分组排序后渲染

## 核心函数 (@skill-sig) <!-- @sync -->
- `fetchFutureNDays(tasks: Task[], start: string, end: string): Task[]` - 筛选在指定日期范围内的任务
- `isDateInRange(date: string, start: string, end: string): boolean`
- `isRangeOverlap(task: Task, start: string, end: string): boolean`

## DOM 结构 <!-- @sync -->
同其他分组视图

## 状态模型 (@skill-state) <!-- @sync -->
无内部状态

## 事件流 <!-- @sync -->
加载 → 过滤 → 分组 → 排序 → 渲染

## 数据流伪代码 <!-- @sync -->

today = new Date()
tomorrow = addDays(today, 1)
end = addDays(today, 15)
tasks = getAllTasks(dv, state)
filtered = tasks.filter(t =>
!t.isRecurring && statusIsTODO(t) &&
(isDateInRange(t.scheduled, tomorrow, end) || ... || isRangeOverlap(t, tomorrow, end))
)
分组排序渲染
text


## 关键算法复杂度 <!-- @sync -->
O(n * k) 过滤 + O(n log n) 排序

## 公共调用 <!-- @sync -->
- `readTasks.getAllTasks`
- `DateUtils`
- `createTaskCard`

## 关键条件 <!-- @sync -->
- 窗口大小可配置（通过参数或设置），当前固定15天。
- 无日期的任务仅当区间重叠时才入选。

## 依赖 <!-- @sync -->
- `readTasks`, `DateUtils`, `BaseTaskView`

## 错误处理 <!-- @sync -->
- 无任务时显示占位符。

## 测试要点 <!-- @manual -->
- 验证第16天的任务不被包含。
- 验证区间跨过窗口边界的任务正确包含。

## 修改指南 <!-- @auto-record -->
- 2026-05-06: 初始版本（基于 v3.1 格式规范化）