---
name: 树状任务处理
description: 任务的树状结构处理，包括父子关系、层级管理、展开折叠
skill-version: 1.0
triggers:
    - 修改树状结构逻辑
    - 添加层级管理功能
---

# 树状任务处理 Skill

## 文件 <!-- @sync -->

`src/tasks/process/tree-task-process.js`

## 导出 <!-- @sync -->

- `buildTaskTree`
- `flattenTaskTree`
- `toggleTaskExpand`

## 关联文件 <!-- @sync -->

- 源码：`src/tasks/process/tree-task-process.js`
- Skill：`.cline/skills/code/tasks/process/tree-task-process.md`

## 功能 <!-- @manual -->

- 任务父子关系树构建
- 树展开/折叠状态管理
- 子树移动/重排

## 核心函数 (@skill-sig) <!-- @sync -->

- `buildTaskTree(tasks: Task[]): TreeNode[]` - 构建任务树结构
- `flattenTaskTree(tree: TreeNode[], expandSet: Set<string>): Task[]` - 将树展平为列表
- `toggleTaskExpand(taskId: string, state: AppState): void` - 切换任务展开状态

## 依赖 <!-- @sync -->

- `Task` 类型 (`.cline/skills/code/tasks/tasks.md`)
- `common-process` (`.cline/skills/code/tasks/process/common-process.md`)

## 错误处理 <!-- @sync -->

- 循环引用检测并自动截断
