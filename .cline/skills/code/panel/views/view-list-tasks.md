---
name: 通用任务列表渲染组件开发
description: 开发或修改通用视图列表组件，封装分页、排序 UI
skill-version: 3.1
triggers:
  - 修改视图列表风格
  - 调整列表渲染逻辑
---

# 通用任务列表渲染 Skill

## 文件 <!-- @sync -->
`src/panel/views/view-list-tasks.js`

## 导出 <!-- @sync -->
- `renderTaskList`
- `createDefaultSortOptions`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/view-list-tasks.js`
- Skill：`.cline/skills/code/panel/views/view-list-tasks.md`

## 功能 <!-- @manual -->
- 提供通用任务列表渲染函数，被其他视图调用
- 封装分页、排序 UI

## 实现方式 <!-- @sync -->
- 接收任务数组和配置，生成列表 DOM
- 支持分页（每页数量可配置）、排序（字段、顺序）

## 核心函数 (@skill-sig) <!-- @sync -->
- `renderTaskList(container: HTMLElement, tasks: Task[], options: RenderOptions): void` - 渲染任务列表
- `createPaginationControls(currentPage: number, totalPages: number, onPageChange: Function): HTMLElement` - 生成分页控件
- `createSortButtons(currentSort: SortConfig, onSortChange: Function): HTMLElement` - 生成排序按钮栏

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="task-list-container">
  <div class="task-list-controls">
    <div class="sort-controls">...</div>
    <div class="pagination">...</div>
  </div>
  <ul class="task-list"></ul>
</div>
```



## 状态模型 (@skill-state) <!-- @sync -->

由调用方维护，组件不持有内部状态：

js

```
options = {
  pageSize: number,
  currentPage: number,
  sortKey: 'priority' | 'due' | 'scheduled',
  sortAsc: boolean
}
```



## 事件流 (@skill-flow) <!-- @sync -->

- 初始化 → 根据 options 渲染分页和排序控件 → 渲染当前页任务列表
- 点击排序按钮 → 更新 sortKey/sortAsc → 重新排序任务 → 重置到第一页 → 重新渲染
- 点击分页 → 更新 currentPage → 重新渲染当前页任务

## 数据流伪代码 <!-- @sync -->

text

```
sortTasks(tasks, sortKey, sortAsc)
paginateTasks(sortedTasks, currentPage, pageSize)
renderTaskItems(paginatedTasks, container)
```



## 关键算法复杂度 (@skill-algorithm) <!-- @sync -->

- 排序：O(n log n)
- 分页：O(1) 切片

## 公共调用 (@skill-api) <!-- @sync -->

- `createTaskCard`（如果列表项需要卡片格式）

## 关键条件 (@skill-condition) <!-- @sync -->

- 如果 tasks 为空，显示空状态提示。
- 排序和分页控件可选（通过 options 控制是否显示）。

## 依赖 <!-- @sync -->

- `createTaskCard`（可选）

## 错误处理 <!-- @sync -->

- 页码超出范围时自动修正到最后一页。
- 无效的 sortKey 时使用默认排序。

## 测试要点 <!-- @manual -->

- 验证分页在大数据量下的性能。
- 验证排序状态正确触发重新渲染。

## 修改指南 <!-- @auto-record -->

- 2026-05-06: 初始版本（基于 v3.1 格式规范化）
