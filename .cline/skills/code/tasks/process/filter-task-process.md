---
name: 任务筛选处理
description: 通用任务筛选函数，支持日期、状态、标记包含/排除等多条件组合
skill-version: 4.0
triggers:
  - 修改筛选逻辑
  - 添加筛选条件
---

# 任务筛选处理 Skill

## 文件 <!-- @sync -->
`src/tasks/process/filter-task-process.js`

## 导出 <!-- @sync -->
- `filterTasks`
- `filterByDateRange`
- `filterByStatus`
- `filterByMarks`

## 关联文件 <!-- @sync -->
- 源码：`src/tasks/process/filter-task-process.js`
- Skill：`.cline/skills/code/tasks/process/filter-task-process.md`

## 功能 <!-- @manual -->
- 根据全局状态对任务列表进行多条件筛选
- 支持日期范围、任务状态、标记包含/排除、隐藏循环/完成/取消等
- 返回筛选后的任务数组

## 核心函数 (@skill-sig) <!-- @sync -->
- `filterTasks(tasks: Task[], state: AppState): Task[]` - 主筛选函数，组合所有条件
- `filterByDateRange(tasks: Task[], start: string, end: string): Task[]` - 按日期范围筛选（任务任意日期字段在区间内）
- `filterByStatus(tasks: Task[], allowedStatuses: string[]): Task[]` - 按状态符号筛选（`' '`, `'?'`, `'/'`, `'x'`, `'-'`）
- `filterByMarks(tasks: Task[], includeMarks: string[], excludeMarks: string[]): Task[]` - 按标记包含/排除筛选（`task.flag`）

## 数据流伪代码 <!-- @sync -->
```text
tasks = getAllTasks(...)
filtered = tasks
if (dateRange) filtered = filterByDateRange(filtered, start, end)
if (statuses) filtered = filterByStatus(filtered, statuses)
if (includeMarks) filtered = filterByMarks(filtered, includeMarks, excludeMarks)
if (hideRecurring) filtered = filtered.filter(t => !t.isRecurring)
...
return filtered
```
## 关键算法复杂度 <!-- @sync -->
O(n) 每个筛选条件，总 O(n * k)，k 为条件数

## 公共调用 <!-- @sync -->
- `DateUtils.isDateInRange` (`.cline/skills/code/utils/date-utils.md`)

## 关键条件 <!-- @sync -->
- 日期范围筛选时，任务满足以下任一条件即通过：
  - 创建、计划、开始、截止、完成、取消任一字段在区间内
  - 计划-截止区间与目标区间重叠
  - 开始-完成区间与目标区间重叠
- 标记筛选：`includeMarks` 要求任务标签在所有指定标签中；`excludeMarks` 要求任务标签不在排除列表中

## 依赖 <!-- @sync -->
- `DateUtils` (`.cline/skills/code/utils/date-utils.md`)
- `Task` 类型 (`.cline/skills/code/tasks/tasks.md`)

## 错误处理 <!-- @sync -->
- 日期解析失败时忽略该条件，输出警告
- 无效状态符号自动跳过

## 测试要点 <!-- @manual -->
- 验证日期区间边界包含性（start/end 是否包含）
- 验证标记包含/排除的优先级（exclude 优先于 include）

## 修改指南 <!-- @auto-record -->
- 2026-05-07: v4.0 补充函数签名
```