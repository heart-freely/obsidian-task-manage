---
name: 通用表格工厂开发
description: 开发或修改通用表格视图工厂函数
triggers:
  - 创建表格视图
  - 修改表格工厂
---

# 通用表格工厂 Skill

## 文件
`src/panel/views/base-table-view.js`

## 功能
- 提供表格视图工厂，支持多级分组、列显示切换

## 实现方式
- 类似列表工厂，但渲染为 `<table>` 或多级嵌套 DOM，支持分组标题行

## 核心函数
- `startTableBaseView(app, container, fetchTasks, title, columns, viewState)` → { cleanup, updateSort }

## DOM 结构
```html
<div class="base-table-view">
  <div class="view-header">...</div>
  <table class="task-table">
    <thead><tr><th>状态</th><th>描述</th><th>优先级</th>...</tr></thead>
    <tbody></tbody>
  </table>
</div>
```
## 状态模型
```js

viewState = {
  tasks: Task[],
  sortKey: 'priority',
  sortAsc: false,
  groupBy: 'status' // 或 null
}
```
## 事件流

    同列表工厂，支持点击表头排序、分组展开/收起

## 数据流伪代码

    fetchTasks() → tasks

    如果 groupBy 非空：分组 tasks

    排序 tasks

    构建表行 DOM

## 关键算法复杂度

    分组：O(n)

    排序：O(n log n)

    渲染：O(n)（大任务量建议分页）

## 公共调用

    createTaskCard（可能获取其部分数据）

    normalizeTaskCardData

## 关键条件

    分组模式下，每组标题行可折叠

## 依赖

    BaseTaskView

    createTaskCard

## 修改指南

    添加新列：修改 columns 配置和渲染逻辑
