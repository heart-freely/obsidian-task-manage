---
name: 通用表格工厂开发
description: 快速构建带分组、可折叠的表格视图
skill-version: 4.0
triggers:
  - 创建表格视图
  - 修改表格工厂
---

# 通用表格工厂 Skill

## 文件 <!-- @sync -->
`src/panel/views/base-table-view.js`

## 导出 <!-- @sync -->
- `startTableBaseView`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/base-table-view.js`
- Skill：`.cline/skills/code/panel/views/base-table-view.md`

## 功能 <!-- @manual -->
- 表格视图工厂，支持多级分组、列显示切换、分组折叠

## 实现方式 <!-- @sync -->
- 渲染为 `<table>` 或嵌套 div
- 分组标题行可点击折叠

## 核心函数 (@skill-sig) <!-- @sync -->
- `startTableBaseView(app, container, fetchTasks, title, columns, viewState): { cleanup, updateSort }`

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="base-table-view">
  <div class="view-header">...</div>
  <table class="task-table"><thead><tr>...</tr></thead><tbody></tbody></table>
</div>
```

## 状态模型 (@skill-state) <!-- @sync -->

```
{ tasks, sortKey, sortAsc, groupBy, collapsedGroups }
```

## 事件流 <!-- @sync -->

- 初始化 → 渲染
- 点击表头排序 → 重新渲染
- 点击分组标题 → 折叠/展开

## 数据流伪代码 <!-- @sync -->

fetch → 分组（可选）→ 排序 → 构建表行

## 关键算法复杂度 <!-- @sync -->

分组 O(n)，排序 O(n log n)，渲染 O(n)

## 公共调用 <!-- @sync -->

- `createTaskCard` (可选)

## 关键条件 <!-- @sync -->

- 分组模式下每组可折叠

## 依赖 <!-- @sync -->

- `BaseTaskView` (`.cline/skills/code/panel/views/base-task-view.md`)

## 错误处理 <!-- @sync -->

- 无数据显示空状态

## 测试要点 <!-- @manual -->

- 验证分组折叠功能

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
