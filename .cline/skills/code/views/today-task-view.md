---
name: 今天任务视图开发
description: 开发或修改今天任务视图，显示所有与今天相关的任务
skill-version: 3.1
triggers:
  - 修改今天任务视图
  - 调整日期过滤逻辑
---

# 今天任务视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/today-task-view.js`

## 导出 <!-- @sync -->
- `TodayTaskView`
- `VIEW_TYPE_TODAY`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/today-task-view.js`
- Skill：`.cline/skills/code/views/today-task-view.md`

## 功能 <!-- @manual -->
- 筛选与今天日期有交集的所有未完成任务（含循环任务）
- 支持多种日期字段：创建、计划、开始、截止、完成、取消任一等于今天，或计划-截止/开始-完成区间包含今天
- 按状态分组，循环任务单独一组置底
- 组内先按计划时间升序，再按优先级降序

## 实现方式 <!-- @sync -->
- 调用 `readTasks.getAllTasks` 获取全量任务
- 使用 `DateUtils` 获取今天日期字符串，遍历任务检查日期字段或区间
- 分组：非循环任务按状态分组，循环任务一组
- 渲染卡片列表（复用 `createTaskCard`）

## 核心函数 (@skill-sig) <!-- @sync -->
- `fetchTodayTasks(dv: DataView, state: AppState): Task[]` - 获取今天相关的任务列表
- `isDateToday(date: string): boolean` - 检查单日期是否为今天
- `isRangeIncludesToday(task: Task, mode: 'plan-due'|'start-complete'): boolean` - 检查区间是否包含今天

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="today-view">
  <div class="task-group" data-status="backlog">
    <h3>1️⃣ 未开始</h3>
    <ul class="task-list"></ul>
  </div>
  <div class="task-group" data-status="planned">
    <h3>2️⃣ 计划中</h3>
    <ul class="task-list"></ul>
  </div>
  <div class="task-group" data-status="inProgress">
    <h3>3️⃣ 进行中</h3>
    <ul class="task-list"></ul>
  </div>
  <div class="task-group recurring-group">
    <h3>9️⃣ 循环任务</h3>
    <ul class="task-list"></ul>
  </div>
</div>
状态模型 (@skill-state) <!-- @sync -->

无内部状态（纯展示视图，循环任务标记由任务本身决定）
事件流 (@skill-flow) <!-- @sync -->

    加载数据 → fetchTodayTasks → 过滤 → 分组 → 排序 → 渲染

    点击任务卡片 → 跳转源文件

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
filtered = tasks.filter(t => 
  isDateToday(t.created) || isDateToday(t.scheduled) || isDateToday(t.start) ||
  isDateToday(t.due) || isDateToday(t.completed) || isDateToday(t.cancelled) ||
  isRangeIncludesToday(t, 'plan-due') || isRangeIncludesToday(t, 'start-complete')
)
// 分组：非循环任务按状态映射分组，循环任务单独为一组
// 每组内按 scheduled 升序，priority 降序
渲染各组（使用 createTaskCard）

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    过滤：O(n * k)，其中 k 为检查的字段数量（k≈8）

    分组：O(n)

    组内排序：O(m log m)

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    DateUtils.isToday(dateString)

    createTaskCard(normalizeTaskCardData(task))

关键条件 (@skill-condition) <!-- @sync -->

    循环任务不参与状态分组，单独一组置底。

    区间包含检查：计划日期到截止日期（或开始到完成）区间覆盖今天。

依赖 <!-- @sync -->

    readTasks.getAllTasks

    DateUtils

    createTaskCard

    BaseTaskView

错误处理 <!-- @sync -->

    日期解析失败时跳过该任务并输出警告。

    无今天相关任务时显示“今天没有任务”占位符。

测试要点 <!-- @manual -->

    验证单日期字段（due、scheduled 等）匹配今天。

    验证区间包含（如计划今天开始到后天截止）能正确匹配。

    验证循环任务单独分组且置底。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）