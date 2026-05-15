---
name: 循环任务视图开发
description: 开发或修改循环任务视图，按优先级、周期、文件名分组展示
triggers:
  - 修改循环任务视图
  - 调整周期分类规则
---

# 循环任务视图 Skill

## 文件
`src/panel/views/recurring-task-view.js`

## 功能
- 筛选所有循环任务 (`isRecurring === true`)
- 三级分组：优先级 → 循环周期（每天/每周/每月/每年/自定义） → 文件名
- 组内按计划时间升序

## 实现方式
- 获取全部任务，过滤 `task.isRecurring`
- 周期识别：解析 `task.recurrenceRule` 文本，映射到类别
- 多级分组用 Map 或对象

## 核心函数
- `classifyRecurrence(rule)` → 'daily'|'weekly'|'monthly'|'yearly'|'custom'

## 数据流伪代码
1. tasks = getAllTasks(dv, state)
2. recurring = tasks.filter(t => t.isRecurring)
3. 分组：按 priority → recurrenceType → filePath
4. 每组内排序按 scheduled asc
5. 嵌套渲染

## 关键算法复杂度
- O(n) 过滤 + O(n) 分组 + O(n log n) 排序总计

## 修改指南
- 修改周期识别正则或逻辑

## AI 命令
生成或修改时：
- 数据源：通过 `readTasks.getAllTasks` 获取，筛选 `task.isRecurring`。
- 分组：第一级按优先级数值，第二级按周期类型（解析 `task.recurrenceRule`），第三级按文件路径。
- 渲染：复用卡片组件，使用嵌套 `div` 或 `ul` 展示层级。
- 严禁使用 Tasks 查询语法，所有工作通过 JS 完成。