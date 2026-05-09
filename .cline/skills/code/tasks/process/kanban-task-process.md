---
name: 看板任务处理
description: 看板视图的任务分组、列管理、拖拽排序逻辑
skill-version: 1.0
triggers:
    - 修改看板逻辑
    - 添加看板功能
---

# 看板任务处理 Skill

## 文件 <!-- @sync -->

`src/tasks/process/kanban-task-process.js`

## 导出 <!-- @sync -->

- `organizeKanbanTasks`
- `getKanbanColumns`
- `moveTaskBetweenColumns`

## 关联文件 <!-- @sync -->

- 源码：`src/tasks/process/kanban-task-process.js`
- Skill：`.cline/skills/code/tasks/process/kanban-task-process.md`

## 功能 <!-- @manual -->

- 看板视图任务按状态分组
- 看板列管理（增删改列）
- 任务跨列拖拽移动

## 核心函数 (@skill-sig) <!-- @sync -->

- `organizeKanbanTasks(tasks: Task[], state: AppState): KanbanData` - 按状态分组任务为看板数据
- `getKanbanColumns(state: AppState): KanbanColumn[]` - 获取看板列配置

## 依赖 <!-- @sync -->

- `Task` 类型 (`.cline/skills/code/tasks/tasks.md`)
- `common-process` (`.cline/skills/code/tasks/process/common-process.md`)

## 错误处理 <!-- @sync -->

- 列不存在时自动创建
