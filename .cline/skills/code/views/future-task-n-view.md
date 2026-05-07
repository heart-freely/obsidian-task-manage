---
name: 未来15天任务视图开发
description: 显示今天之后指定天数内的任务
skill-version: 4.0
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
  - 显示今天之后 N 天内（含）有交集的未完成任务
  - 按状态分组，组内按计划时间升序、优先级降序

  ## 实现方式 <!-- @sync -->
  - N 默认 15，可配置
  - 日期范围 [tomorrow, today+N]
  - 判断任务单日期在范围内或区间重叠

  ## 核心函数 (@skill-sig) <!-- @sync -->
  - `fetchFutureNDays(tasks, start, end): Task[]`
  - `isDateInRange(date, start, end): bool`
  - `isRangeOverlap(task, start, end): bool`

  ## DOM 结构 <!-- @sync -->
  同其他分组视图

  ## 状态模型 <!-- @sync -->
  无内部状态

  ## 事件流 <!-- @sync -->
  加载 → 过滤 → 分组 → 排序 → 渲染

  ## 关键算法复杂度 <!-- @sync -->
  O(n) 过滤，O(n log n) 排序

  ## 公共调用 <!-- @sync -->
  - `readTasks.getAllTasks`
  - `DateUtils`

  ## 依赖 <!-- @sync -->
  - `BaseTaskView`

  ## 错误处理 <!-- @sync -->
  - 无任务显示占位符

  ## 测试要点 <!-- @manual -->
  - 验证第 N+1 天任务不包含

  ## 修改指南 <!-- @auto-record -->
  - 2026-05-07: v4.0 初始化
