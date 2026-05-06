
---

## 3. `.cline/skills/code/views/base-list-view.md`（通用列表工厂）

```markdown
---
name: 通用列表工厂开发
description: 开发或修改通用列表视图工厂函数，快速构建简单的任务列表
skill-version: 3.1
triggers:
  - 创建列表视图
  - 修改列表工厂
---

# 通用列表工厂 Skill

## 文件 <!-- @sync -->
`src/panel/views/base-list-view.js`

## 导出 <!-- @sync -->
- `startListBaseView`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/base-list-view.js`
- Skill：`.cline/skills/code/views/base-list-view.md`

## 功能 <!-- @manual -->
- 提供 `startListBaseView` 工厂函数，快速输出带标题、排序、分页的基础任务列表
- 统一处理加载、渲染、空状态、错误处理

## 实现方式 <!-- @sync -->
- 接收数据获取函数、标题、颜色等参数
- 内部创建容器、标题栏、排序按钮、分页控件、任务列表 UL
- 调用传入的 fetch 函数获取数据，使用 `createTaskCard` 渲染

## 核心函数 (@skill-sig) <!-- @sync -->
- `startListBaseView(app: App, container: HTMLElement, fetchTasks: () => Task[], title: string, accentColor: string, viewState: ListViewState): { cleanup: () => void, updateSort: (key: string, asc: boolean) => void }` - 初始化列表视图

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="base-list-view">
  <div class="view-header">
    <h2>标题</h2>
    <div class="sort-controls">
      <button data-sort="priority">优先级</button>
      <button data-sort="due">截止日期</button>
    </div>
  </div>
  <ul class="task-list"></ul>
  <div class="pagination">
    <button class="prev-page">上一页</button>
    <span class="page-info">1/10</span>
    <button class="next-page">下一页</button>
  </div>
</div>

状态模型 (@skill-state) <!-- @sync -->
js

viewState = {
  tasks: Task[],
  currentPage: number,
  pageSize: number,
  sortKey: string,
  sortAsc: boolean
}

事件流 (@skill-flow) <!-- @sync -->

    调用 startListBaseView → 构建 UI → 初始加载 → 渲染第一页

    排序按钮点击 → 更新 sortKey/sortAsc → 重新排序任务 → 重置到第一页 → 重新渲染

    分页按钮点击 → 更新 currentPage → 渲染对应页

    外部调用 updateSort → 与排序按钮逻辑相同

数据流伪代码 <!-- @sync -->
text

fetchTasks() → tasks
sortTasks(tasks, sortKey, sortAsc)
paginateTasks(tasks, currentPage, pageSize)
使用 createTaskCard 生成每页任务 DOM，插入 task-list

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    排序：O(n log n)

    分页：O(1) 切片

    渲染：O(pageSize) DOM 操作（DocumentFragment）

公共调用 (@skill-api) <!-- @sync -->

    createTaskCard

    normalizeTaskCardData

关键条件 (@skill-condition) <!-- @sync -->

    任务数超过 pageSize 时显示分页控件。

    无任务时显示空状态提示。

依赖 <!-- @sync -->

    BaseTaskView（间接通过 createTaskCard）

    createTaskCard

错误处理 <!-- @sync -->

    数据获取失败时显示错误消息。

    页码超出范围时自动修正到最后一页。

测试要点 <!-- @manual -->

    验证分页和排序功能独立生效。

    验证空状态样式正确。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）