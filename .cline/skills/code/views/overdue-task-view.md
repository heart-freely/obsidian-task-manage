
---
name: 逾期任务视图开发
description: 开发或修改逾期任务视图，显示未完成且截止日期已过的任务
triggers:
  - 修改逾期任务视图
  - 调整逾期判定逻辑
---

# 逾期任务视图 Skill

## 文件
`src/panel/views/overdue-task-view.js`

## 功能
- 筛选未完成、非循环，且截止日期小于今天的任务
- 可按状态分组（未开始、计划中、进行中）
- 组内先按截止日期远近排序，再按优先级降序

## 实现方式
- API 获取全部任务
- 过滤：`!task.isRecurring && task.status 未完成 && task.due && task.due < today`
- 分组与排序后渲染

## 核心函数
- `fetchOverdueTasks(dv, state)` → Task[]

## DOM 结构
同一般分组列表

## 状态模型
无

## 事件流
- 加载 → 过滤 → 分组排序 → 渲染

## 数据流伪代码
1. tasks = getAllTasks(dv, state)
2. filtered = tasks.filter(t => !t.isRecurring && t.status is todo/planned/inProgress && t.due < today)
3. 分组按状态，组内排序 due asc, priority desc
4. 渲染

## 关键算法复杂度
- 过滤 O(n)
- 排序 O(n log n)

## 公共调用
- `readTasks.getAllTasks`, `DateUtils`, `createTaskCard`

## 关键条件
- 无截止日期的任务不视为逾期

## 依赖
- `readTasks`, `DateUtils`, `BaseTaskView`

## 修改指南
- 添加逾期天数范围过滤

## AI 命令
生成或修改时：
- 数据源：通过 API 获取，过滤未完成、非循环、`due` 存在且小于今天。
- 可扩展为多字段逾期，使用 UI 开关控制。
- 分组：状态固定顺序；排序先 `due` 升序，再优先级降序。
- 渲染：使用卡片组件。