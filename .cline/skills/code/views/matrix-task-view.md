---
name: 四象限矩阵视图开发
description: 开发艾森豪威尔矩阵，按优先级划分四个象限
triggers:
  - 修改象限分配规则
  - 调整缓存或排序逻辑
  - 添加新交互
---

# 四象限矩阵视图 Skill

## 文件
`src/panel/views/matrix-task-view.js`

## 导出 <!-- @sync -->
- `MATRIX_VIEW_TYPE`
- `MatrixTaskView`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/matrix-task-view.js`
- Skill：`.cline/skills/code/views/matrix-task-view.md`（本文件）

## 功能 <!-- @manual -->
- 将未完成任务按优先级自动分入四个象限
- 象限卡片显示任务数量，展开后显示详细卡片
- 支持按状态、优先级、时间排序，每个象限独立记忆偏好
- 缓存机制避免重复解析

## 实现方式 <!-- @sync -->
- `readTasks.getAllTasks` 读取数据并缓存
- 象限映射：🔺 p0→Q2，⏫ p1→Q1，🔼 p2→Q3，其余→Q4
- 数据处理阶段预计算排序时间戳
- 骨架一次渲染，后续增量更新列表

## 核心函数 (@skill-sig) <!-- @sync -->
- `mapToQuadrant(task: Task): 'q1'|'q2'|'q3'|'q4'` - 根据任务优先级映射到象限
- `buildQuadrantData(tasks: Task[]): { q1: Task[], q2: Task[], q3: Task[], q4: Task[] }` - 将任务数组分配到四个象限桶
- `renderQuadrant(container: HTMLElement, quadrantData: Task[], sortState: SortState): void` - 渲染单个象限及其任务列表
- `updateSortState(quadrant: string, key: string, asc: boolean): void` - 更新指定象限的排序偏好
- `refreshQuadrantList(quadrant: string): void` - 仅重新排序并刷新指定象限的任务列表（增量更新）

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="matrix-view view-grid cols-2">
  <div class="view-col q2">
    <div class="col-header">🔺 紧急重要 <span class="count">3</span></div>
    <ul class="task-list"></ul>
  </div>
  <div class="view-col q1">
    <div class="col-header">⏫ 不紧急重要 <span class="count">5</span></div>
    <ul class="task-list"></ul>
  </div>
  <div class="view-col q3">
    <div class="col-header">🔼 紧急不重要 <span class="count">1</span></div>
    <ul class="task-list"></ul>
  </div>
  <div class="view-col q4">
    <div class="col-header">🔽 不紧急不重要 <span class="count">4</span></div>
    <ul class="task-list"></ul>
  </div>
</div>
```
状态模型 (@skill-state) <!-- @sync -->
js

state = {
  cachedRawTasks: Task[],          // 缓存原始任务列表
  cachedQuadrantsData: {           // 缓存分桶结果
    q1: Task[],
    q2: Task[],
    q3: Task[],
    q4: Task[]
  },
  sortStates: [                    // 每个象限的独立排序状态
    { quadrant: 'q1', key: 'priority', asc: false },
    { quadrant: 'q2', key: 'dueDate', asc: true },
    { quadrant: 'q3', key: 'priority', asc: false },
    { quadrant: 'q4', key: 'title', asc: true }
  ]
}

事件流 (@skill-flow) <!-- @sync -->

    首次加载：getAllTasks → 缓存 → buildQuadrantData → 渲染四个象限（全量渲染）

    排序切换：用户点击列头 → updateSortState → 重新排序当前象限任务 → refreshQuadrantList（仅更新该象限的 UL 内容）

    任务修改（外部）：监听任务变更事件 → 更新 cachedRawTasks → 重新 buildQuadrantData → 全量刷新所有象限

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
缓存 tasks
遍历 tasks，按优先级 mapToQuadrant 分配到四个桶
各桶按 sortState 排序
若首次渲染，绘制完整 DOM；否则更新对应象限的 UL

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    映射：O(n)

    排序：每象限 O(m log m)，总 O(n log n) 最坏

    渲染：增量 DOM 更新，仅替换受影响的 UL 内容

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    createTaskCard(normalizeTaskCardData)

    DateUtils.getRelativeDate

    eventBus.on('task:updated', ...)

关键条件 (@skill-condition) <!-- @sync -->

    普通优先级（无 emoji）视为最低，进入 Q4

    若任务无截止日期，在 Q2/Q4 中排序时置底

    缓存未命中时重新从 getAllTasks 获取

依赖 <!-- @sync -->

    readTasks.getAllTasks

    createTaskCard

    BaseTaskView（继承自）

    eventBus

错误处理 <!-- @sync -->

    getAllTasks 返回空数组 → 所有象限显示“暂无任务”占位符

    遇到未知优先级 → 默认归入 Q4，并在控制台输出警告

    排序时如果任务缺少排序字段 → 将该任务放于列表末尾

测试要点 <!-- @manual -->

    验证优先级 emoji 缺失时正确归入 Q4

    验证每个象限的排序状态独立保存和恢复（刷新页面后依然有效）

    验证任务修改后缓存自动更新且象限重新分组

    验证大量任务（1000+）时增量刷新性能（不卡顿）

修改指南 <!-- @manual -->

    调整象限边界：修改 mapToQuadrant 中的优先级数值映射逻辑

    添加排序维度：在 sortStates 中新增对象，并在 UI 上增加排序按钮

    修改缓存策略：调整 cachedRawTasks 的更新时机（例如增加防抖）