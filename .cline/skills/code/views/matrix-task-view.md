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

## 功能
- 将未完成任务按优先级自动分入四个象限
- 象限卡片显示任务数量，展开后显示详细卡片
- 支持按状态、优先级、时间排序，每个象限独立记忆偏好
- 缓存机制避免重复解析

## 实现方式
- `readTasks.getAllTasks` 读取数据并缓存
- 象限映射：🔺 p0→Q2，⏫ p1→Q1，🔼 p2→Q3，其余→Q4
- 数据处理阶段预计算排序时间戳
- 骨架一次渲染，后续增量更新列表

## 核心函数
- `mapToQuadrant(task)` → 'q1'|'q2'|'q3'|'q4'
- `buildQuadrantData(tasks)` → { q1, q2, q3, q4 }
- `renderQuadrant(container, quadrantData, sortState)`

## DOM 结构
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
状态模型
```js

state = {
  cachedRawTasks: Task[],
  cachedQuadrantsData: { q1, q2, q3, q4 },
  sortStates: [
    { quadrant: 'q1', key: 'priority', asc: false },
    ...
  ]
}
```
## 事件流

    首次加载：获取任务 → 缓存 → 计算象限数据 → 渲染四象限

    排序切换：更新对应象限的 sortState → 重新排序该象限 → 更新列表

## 数据流伪代码

    tasks = getAllTasks(dv, state) 并缓存

    遍历 tasks，按优先级 mapToQuadrant 分配到四个桶

    各桶按 sortState 排序

    增量更新象限列表（只替换 UL 内容）

## 关键算法复杂度

    映射：O(n)

    排序：O(m log m) 每象限

    渲染：增量 DOM 更新

## 公共调用

    readTasks.getAllTasks(dv, state)

    createTaskCard

    DateUtils

## 关键条件

    普通优先级（无 emoji）视为最低，进入 Q4

## 依赖

    readTasks.getAllTasks

    createTaskCard, BaseTaskView

## 修改指南

    调整象限边界：修改 mapToQuadrant 中的优先级数值映射

    添加排序维度：扩展 sortStates 数组

