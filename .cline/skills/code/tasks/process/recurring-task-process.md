---
name: 循环任务处理
description: 循环/重复任务的生成、更新、完成逻辑
skill-version: 1.0
triggers:
    - 修改循环任务逻辑
    - 添加循环任务功能
---

# 循环任务处理 Skill

## 文件 <!-- @sync -->

`src/tasks/process/recurring-task-process.js`

## 导出 <!-- @sync -->

- `processRecurringTasks`
- `generateNextOccurrence`
- `skipRecurringInstance`

## 关联文件 <!-- @sync -->

- 源码：`src/tasks/process/recurring-task-process.js`
- Skill：`.cline/skills/code/tasks/process/recurring-task-process.md`

## 功能 <!-- @manual -->

- 循环任务按规则生成下一次发生
- 跳过/推迟循环实例
- 循环任务完成后的自动续期

## 核心函数 (@skill-sig) <!-- @sync -->

- `processRecurringTasks(tasks: Task[]): Task[]` - 处理所有循环任务，生成新实例
- `generateNextOccurrence(task: Task, rule: RecurRule): Task` - 根据规则生成下一次任务
- `skipRecurringInstance(task: Task): Task` - 跳过当前循环实例

## 依赖 <!-- @sync -->

- `Task` 类型 (`.cline/skills/code/tasks/tasks.md`)
- `date-utils` (`.cline/skills/code/utils/date-utils.md`)

## 错误处理 <!-- @sync -->

- 循环规则解析失败时跳过该任务
- 日期计算越界时自动截断
