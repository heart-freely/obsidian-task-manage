---
name: 重要任务视图开发
description: 开发或修改重要任务视图，筛选高优先级未完成任务
triggers:
  - 修改重要任务视图
  - 调整优先级阈值
---

# 重要任务视图 Skill

## 文件
`src/panel/views/important-task-view.js`

## 功能
- 筛选未完成且优先级为 🔺(最高)、⏫(高)、🔼(中) 的任务
- 两级分组：优先级 → 状态，组内按截止日期升序

## 实现方式
- API 获取未完成任务（`status.type === 'TODO'`）
- 过滤 `task.priority` 值在 [1,3] 的任务
- 分组排序渲染

## 数据流伪代码
1. tasks = getAllTasks(dv, state)
2. filtered = tasks.filter(t => t.status is 未完成 && t.priority in [1,2,3])
3. 分组：按 priority 值 → 按状态
4. 组内排序：due asc
5. 渲染

## 修改指南
- 可调整优先级范围

## AI 命令
生成或修改时：
- 数据源：`readTasks.getAllTasks`，过滤 `task.priority` 在 [1,3] 且 `task.status` 为未完成。
- 分组：先按优先级数值，再按状态映射为 “未开始”、“计划中”、“进行中” 等固定顺序。
- 排序：`task.due` 升序。
- 渲染：复用卡片组件。