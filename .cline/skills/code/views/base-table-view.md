
---

## 5. `.cline/skills/code/views/base-table-view.md`（通用表格工厂）

```markdown
---
name: 通用表格工厂开发
description: 开发或修改通用表格视图工厂函数
skill-version: 3.1
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
- Skill：`.cline/skills/code/views/base-table-view.md`

## 功能 <!-- @manual -->
- 提供表格视图工厂，支持多级分组、列显示切换
- 支持点击表头排序、分组展开/收起

## 实现方式 <!-- @sync -->
- 类似列表工厂，但渲染为 `<table>` 或多级嵌套 DOM，支持分组标题行
- 分组模式下每组标题行可折叠

## 核心函数 (@skill-sig) <!-- @sync -->
- `startTableBaseView(app: App, container: HTMLElement, fetchTasks: () => Task[], title: string, columns: ColumnDef[], viewState: TableViewState): { cleanup: () => void, updateSort: (key: string, asc: boolean) => void }` - 初始化表格视图

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="base-table-view">
  <div class="view-header">...</div>
  <table class="task-table">
    <thead>
      <tr>
        <th data-sort="status">状态</th>
        <th data-sort="description">描述</th>
        <th data-sort="priority">优先级</th>
      </tr>
    </thead>
    <tbody>
      <tr class="group-row" data-group-key="status:backlog">
        <td colspan="3">未开始 (3个任务)</td>
      </tr>
      <tr class="task-row">...</tr>
    </tbody>
  </table>
</div>
状态模型 (@skill-state) <!-- @sync -->
js

viewState = {
  tasks: Task[],
  sortKey: string,
  sortAsc: boolean,
  groupBy: 'status' | 'priority' | null,
  collapsedGroups: Set<string>
}

事件流 (@skill-flow) <!-- @sync -->

    调用 startTableBaseView → 构建表头、分组 → 渲染

    点击表头排序 → 更新排序 → 重新渲染表格

    点击分组标题行 → 切换折叠状态 → 显示/隐藏该组任务行

数据流伪代码 <!-- @sync -->
text

fetchTasks() → tasks
if (groupBy) 分组 tasks
排序 tasks（或每组内排序）
生成表行：分组标题行 + 任务行（每个任务一行）

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    分组：O(n)

    排序：O(n log n)

    渲染：O(n)（大任务量建议分页）

公共调用 (@skill-api) <!-- @sync -->

    createTaskCard（可复用其元数据渲染）

    normalizeTaskCardData

关键条件 (@skill-condition) <!-- @sync -->

    分组模式下，每组标题行可折叠，折叠后隐藏子任务行。

    支持多列排序时（可选）可扩展。

依赖 <!-- @sync -->

    BaseTaskView

    createTaskCard

错误处理 <!-- @sync -->

    无数据时显示空状态。

    无效列配置时跳过该列。

测试要点 <!-- @manual -->

    验证分组折叠/展开功能。

    验证表头排序影响整个表格。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）