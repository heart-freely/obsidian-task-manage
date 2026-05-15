---
name: 全部未来任务视图开发
description: 开发或修改显示所有未来未完成任务的视图
triggers:
  - 修改全部未来任务视图
---

# 全部未来任务视图 Skill

## 文件
`src/panel/views/future-task-all-view.js`

## 功能
- 显示今天之后（不含今天）所有未完成、非循环任务
- 按状态分组，组内按计划时间升序、优先级降序

## 实现方式
- API 获取任务，过滤任意日期 >= tomorrow 或区间结束 >= tomorrow
- 分组排序渲染

## 数据流伪代码
1. tasks = getAllTasks(dv, state)
2. 过滤未完成非循环，且日期字段 >= tomorrow 或区间结束 >= tomorrow
3. 分组排序渲染

## 关键算法复杂度
- O(n) 过滤 + O(n log n) 排序

## 修改指南
- 可添加截止上限

## AI 命令
生成或修改时：
- 数据源：`readTasks.getAllTasks`，过滤 `task.status` 为未完成且 `!task.isRecurring`，且任意日期 >= 今天 或区间结束 >= 今天。
- 分组与排序：状态固定顺序，先计划时间后优先级。
- 渲染：使用标准卡片，如任务量大建议分页。