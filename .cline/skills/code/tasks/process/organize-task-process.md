---
name: 组织任务处理
description: 任务的组织整理逻辑，包括排序、分组、归并等
skill-version: 1.0
triggers:
    - 修改组织逻辑
    - 添加整理功能
---

# 组织任务处理 Skill

## 文件 <!-- @sync -->

`src/tasks/process/organize-task-process.js`

## 导出 <!-- @sync -->

- `organizeTasks`
- `sortTasks`
- `mergeTasks`

## 关联文件 <!-- @sync -->

- 源码：`src/tasks/process/organize-task-process.js`
- Skill：`.cline/skills/code/tasks/process/organize-task-process.md`

## 功能 <!-- @manual -->

- 任务多字段排序
- 任务分组归类
- 重复任务检测与合并

## 核心函数 (@skill-sig) <!-- @sync -->

- `organizeTasks(tasks: Task[], state: AppState): OrganizedData` - 组织整理任务
- `sortTasks(tasks: Task[], sortBy: string[]): Task[]` - 按指定字段排序

## 依赖 <!-- @sync -->

- `Task` 类型 (`.cline/skills/code/tasks/tasks.md`)
- `filter-task-process` (`.cline/skills/code/tasks/process/filter-task-process.md`)

## 错误处理 <!-- @sync -->

- 排序字段不存在时静默跳过
