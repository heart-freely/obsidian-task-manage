---
name: 通用任务列表渲染组件开发
description: 开发或修改通用视图列表组件
triggers:
  - 修改视图列表风格
---

# 通用任务列表渲染 Skill

## 文件
`src/panel/views/view-list-tasks.js`

## 功能
- 提供通用任务列表渲染函数，被其他视图调用
- 封装分页、排序 UI

## 实现方式
- 接收任务数组和配置，生成列表 DOM

## 核心函数
- `renderTaskList(container, tasks, options)`

## 修改指南
- 调整默认排序或分页大小