---
name: 四象限矩阵视图开发
description: 开发艾森豪威尔矩阵，按优先级划分四个象限
skill-version: 4.0
triggers:
    - 修改象限分配规则
    - 调整缓存或排序逻辑
    - 添加新交互
---

# 四象限矩阵视图 Skill

## 文件 <!-- @sync -->

`src/panel/views/matrix-task-view.js`

## 导出 <!-- @sync -->

- `MATRIX_VIEW_TYPE`
- `MatrixTaskView`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/views/matrix-task-view.js`
- Skill：`.cline/skills/code/panel/views/matrix-task-view.md`

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
- `buildQuadrantData(tasks: Task[]): QuadrantBuckets` - 将任务数组分配到四个象限桶
- `renderQuadrant(container: HTMLElement, quadrantData: Task[], sortState: SortState): void` - 渲染单个象限
- `updateSortState(quadrant: string, key: string, asc: boolean): void` - 更新排序偏好
- `refreshQuadrantList(quadrant: string): void` - 增量刷新象限列表

## DOM 结构 (@skill-dom) <!-- @sync -->

```html
<div class="matrix-view view-grid cols-2">
	<div class="view-col q2">...</div>
	<div class="view-col q1">...</div>
	<div class="view-col q3">...</div>
	<div class="view-col q4">...</div>
</div>
```

## 状态模型 (@skill-state) <!-- @sync -->

js

```
state = {
  cachedRawTasks: Task[],
  cachedQuadrantsData: QuadrantBuckets,
  sortStates: SortState[]
}
```

## 事件流 (@skill-flow) <!-- @sync -->

- 首次加载：`getAllTasks` → 缓存 → `buildQuadrantData` → 渲染四象限
- 排序切换：`updateSortState` → 重新排序 → `refreshQuadrantList`

## 数据流伪代码 <!-- @sync -->

同上

## 关键算法复杂度 (@skill-algorithm) <!-- @sync -->

O(n) 映射，O(n log n) 排序

## 公共调用 (@skill-api) <!-- @sync -->

- `readTasks.getAllTasks` (`.cline/skills/code/tasks/read-tasks.md`)
- `createTaskCard` (`.cline/skills/code/panel/components/base-card-view.md`)

## 关键条件 (@skill-condition) <!-- @sync -->

- 普通优先级→Q4
- 无截止日期→置底

## 依赖 <!-- @sync -->

- `BaseTaskView` (`.cline/skills/code/panel/views/base-task-view.md`)

## 错误处理 <!-- @sync -->

- 空数据显示占位符
- 未知优先级归入Q4并警告

## 测试要点 <!-- @manual -->

- 验证优先级 emoji 缺失时归入 Q4
- 验证各象限排序状态独立

## 修改指南 <!-- @auto-record -->

- 2026-05-07: 初始版本 (v4.0)
