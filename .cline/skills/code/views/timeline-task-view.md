状态模型 (@skill-state) <!-- @sync -->

无内部状态
事件流 (@skill-flow) <!-- @sync -->

加载 → 过滤 → 两级分组 → 渲染
数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
filtered = tasks.filter(!t.isRecurring && statusIsTODO)
// 第一级分组：key = due 或 scheduled，缺失则 'no-date'
dueGroups = new Map()
for each task: 
  dateKey = task.due || task.scheduled || 'no-date'
  dueGroups.get(dateKey).push(task)
对每个 dueGroup：
  按状态分组（固定顺序）
  每个状态组内按 priority 降序排序
渲染：外层按日期排序（无日期最后），内层按状态顺序

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

O(n) 分组 + O(n log n) 排序
公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks

    createTaskCard

关键条件 (@skill-condition) <!-- @sync -->

    日期键优先级：due > scheduled > 无日期。

    同一天内的状态顺序固定（未开始 → 计划中 → 进行中）。

    无日期的组放在所有日期组之后。

依赖 <!-- @sync -->

    readTasks.getAllTasks

    createTaskCard

    BaseTaskView

错误处理 <!-- @sync -->

    日期无效的任务归入无日期组。

    无任务时显示占位符。

测试要点 <!-- @manual -->

    验证按截止日期升序排列，无日期在最后。

    验证组内状态分组顺序正确。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）