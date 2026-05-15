---
name: 标签聚合视图开发
description: 开发或修改按标签（🏁）聚合任务列表的视图
triggers:
  - 修改标签视图
  - 调整标签过滤
---

# 标签聚合视图 Skill

## 文件
`src/panel/views/tag-task-view.js`

## 功能
- 提取所有任务的旗帜标记（🏁）作为标签，按标签分组展示任务
- 支持多选标签过滤（AND/OR），点击任务跳转原文

## 实现方式
- API 获取任务，利用 `read-tasks.js` 解析标签字段 `task.flag`
- 构建标签到任务数组的映射
- 渲染标签列表和对应任务卡片

## 核心函数
- `groupByFlag(tasks)` → Map<string, Task[]>

## 数据流伪代码
1. tasks = getAllTasks(dv, state)
2. 提取每个任务的 flag 值
3. 按 flag 分组
4. 支持多选标签过滤，重新过滤任务列表
5. 渲染

## 修改指南
- 修改多选逻辑 AND/OR

## AI 命令
生成或修改时：
- 数据源：通过 `readTasks.getAllTasks` 获取带解析标签的任务。
- 分组：按 `task.flag` 值分组，支持多选过滤。
- 渲染：标签侧边栏 + 任务列表，使用卡片组件。