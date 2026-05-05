---
name: 所有任务表视图开发
description: 开发或修改表格化的所有任务视图，支持多级分组
triggers:
  - 修改任务表视图
  - 添加新列或分组维度
---

# 所有任务表视图 Skill

## 文件
`src/panel/views/table-task-view.js`

## 功能
- 展示所有任务（不限状态），以表格形式呈现
- 三级分组：状态 → 计划日期 → 优先级
- 支持展开/折叠分组，紧凑显示

## 实现方式
- 获取全量任务，多级分组用嵌套对象
- 递归渲染为表格或嵌套 div，可折叠的分组标题行

## 核心函数
- `groupByStatusScheduledPriority(tasks)` → nested object

## 数据流伪代码
1. tasks = getAllTasks(dv, state)
2. 三级分组：status → scheduled → priority
3. 递归渲染每个分组行和任务行

## 关键算法复杂度
- 分组 O(n)，渲染 O(n)

## 修改指南
- 调整分组层级顺序或添加新维度

## AI 命令
生成或修改时：
- 数据源：`readTasks.getAllTasks` 获取全量任务。
- 分组：连续按状态、计划日期、优先级分组，使用有序映射。
- 渲染：表格状 DOM，分组标题可折叠，使用事件委托。
- 不可使用 Tasks/Dataview 查询语法。