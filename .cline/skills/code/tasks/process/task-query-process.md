---
name: 任务查询处理
description: 任务的高级查询、搜索、筛选逻辑，支持复杂条件组合
skill-version: 1.0
triggers:
    - 修改查询逻辑
    - 添加搜索功能
---

# 任务查询处理 Skill

## 文件 <!-- @sync -->

`src/tasks/process/task-query-process.js`

## 导出 <!-- @sync -->

- `queryTasks`
- `searchTasks`
- `buildQueryFilter`

## 关联文件 <!-- @sync -->

- 源码：`src/tasks/process/task-query-process.js`
- Skill：`.cline/skills/code/tasks/process/task-query-process.md`

## 功能 <!-- @manual -->

- 复杂条件组合查询（AND/OR）
- 全文搜索任务标题和描述
- 查询表达式解析与构建

## 核心函数 (@skill-sig) <!-- @sync -->

- `queryTasks(tasks: Task[], query: TaskQuery): Task[]` - 按查询条件筛选任务
- `searchTasks(tasks: Task[], keyword: string): Task[]` - 全文搜索任务
- `buildQueryFilter(query: TaskQuery): (task: Task) => boolean` - 构建查询过滤器函数

## 依赖 <!-- @sync -->

- `Task` 类型 (`.cline/skills/code/tasks/tasks.md`)
- `filter-task-process` (`.cline/skills/code/tasks/process/filter-task-process.md`)

## 错误处理 <!-- @sync -->

- 无效查询表达式时返回空结果
