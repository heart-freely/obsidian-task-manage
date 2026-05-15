---
name: 通用列表工厂开发
description: 开发或修改通用列表视图工厂函数，快速构建简单的任务列表
triggers:
  - 创建列表视图
  - 修改列表工厂
---

# 通用列表工厂 Skill

## 文件
`src/panel/views/base-list-view.js`

## 功能
- 提供 `startListBaseView` 工厂函数，快速输出带标题、排序、分页的基础任务列表
- 统一处理加载、渲染、空状态、错误处理

## 实现方式
- 接收数据获取函数、标题、颜色等参数
- 内部创建容器、标题栏、排序按钮、分页控件、任务列表 UL
- 调用传入的 fetch 函数获取数据，使用 `createTaskCard` 渲染

## 核心函数
- `startListBaseView(app, container, fetchTasks, title, accentColor, viewState)` → { cleanup, updateSort }

## DOM 结构
```html
<div class="base-list-view">
  <div class="view-header">
    <h2>标题</h2>
    <div class="sort-controls">...</div>
  </div>
  <ul class="task-list"></ul>
  <div class="pagination">
    <button>上一页</button>
    <span>当前页/总页数</span>
    <button>下一页</button>
  </div>
</div>
```
## 状态模型
```js

viewState = {
  tasks: Task[],
  currentPage: 1,
  pageSize: 50,
  sortKey: 'priority',
  sortAsc: false
}
```

## 事件流

    调用 startListBaseView → 构建 UI → 初始加载 → 渲染第一页

    排序按钮点击 → 更新 sortState → 重新排序 → 重新渲染

    分页按钮点击 → 更新 currentPage → 渲染对应页

    外部调用 updateSort → 与排序按钮逻辑相同

## 数据流伪代码

    fetchTasks() → tasks

    排序 tasks 依据 sortKey, asc

    切片 tasks 当前页

    循环 createTaskCard 插入列表

## 关键算法复杂度

    排序：O(n log n)

    分页：O(1) 切片

    渲染：O(pageSize) DOM 操作（DocumentFragment）

## 公共调用

    createTaskCard

    normalizeTaskCardData

## 关键条件

    任务数超过 PAGE_SIZE 时分页

    无任务时显示空状态提示

## 依赖

    BaseTaskView

    createTaskCard

## 修改指南

    添加默认排序键：修改 sortKey

    调整分页大小：修改 pageSize