---
name: 所有任务表视图开发
description: 开发或修改表格化的所有任务视图，支持多级分组
skill-version: 3.1
triggers:
  - 修改任务表视图
  - 添加新列或分组维度
---

# 所有任务表视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/table-task-view.js`

## 导出 <!-- @sync -->
- `TableTaskView`
- `VIEW_TYPE_TABLE`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/table-task-view.js`
- Skill：`.cline/skills/code/views/table-task-view.md`

## 功能 <!-- @manual -->
- 展示所有任务（不限状态），以表格形式呈现
- 三级分组：状态 → 计划日期 → 优先级
- 支持展开/折叠分组，紧凑显示

## 实现方式 <!-- @sync -->
- 获取全量任务，多级分组用嵌套对象
- 递归渲染为表格或嵌套 div，可折叠的分组标题行
- 使用 `DocumentFragment` 提高渲染性能

## 核心函数 (@skill-sig) <!-- @sync -->
- `groupByStatusScheduledPriority(tasks: Task[]): GroupNode` - 三级分组（状态 → 日期 → 优先级）
- `renderGroup(group: GroupNode, container: HTMLElement, level: number): void` - 递归渲染分组和任务行
- `toggleGroup(groupId: string): void` - 展开/折叠分组

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="table-view">
  <div class="table-header">
    <span>任务标题</span><span>优先级</span><span>计划日期</span><span>状态</span>
  </div>
  <div class="table-body">
    <div class="group-row" data-group-id="...">
      <span class="toggle">▶</span> 状态: 未开始 <span class="count">3</span>
    </div>
    <div class="group-children collapsed">...</div>
  </div>
</div>

状态模型 (@skill-state) <!-- @sync -->
js

state = {
  groupedData: GroupNode,
  collapsedGroups: Set<string>
}

事件流 (@skill-flow) <!-- @sync -->

    加载数据 → 三级分组 → 渲染根分组（状态级）

    点击分组标题行的 toggle → 切换 collapsedGroups → 重新渲染该分支（或显示/隐藏子元素）

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
grouped = groupByStatusScheduledPriority(tasks)
递归渲染分组（从根开始），添加折叠开关
监听 toggle 点击事件，更新折叠状态并修改对应子树的显示

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    分组：O(n)

    渲染：O(n)（每个任务生成一行）

    折叠/展开：仅操作 DOM 显示/隐藏，不重新渲染整体

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

关键条件 (@skill-condition) <!-- @sync -->

    分组顺序：状态（未开始 → 计划中 → 进行中 → 已完成 → 已取消）→ 计划日期（按日期字符串升序）→ 优先级（降序）

    无计划日期的任务归入“未设置日期”组，显示在最后。

依赖 <!-- @sync -->

    readTasks.getAllTasks

    BaseTaskView

错误处理 <!-- @sync -->

    分组时若某维度数据缺失，显示“未知”做占位。

    无任务时显示空状态提示。

测试要点 <!-- @manual -->

    验证三级分组层级顺序正确。

    验证折叠/展开状态持久化（刷新后恢复）。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）
    