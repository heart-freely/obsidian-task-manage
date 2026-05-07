---
name: 循环任务视图开发
description: 按优先级、周期、文件名分组展示循环任务
skill-version: 4.0
triggers:
  - 修改循环任务视图
  - 调整周期分类规则
---

# 循环任务视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/recurring-task-view.js`

## 导出 <!-- @sync -->
- `RecurringTaskView`
- `VIEW_TYPE_RECURRING`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/recurring-task-view.js`
- Skill：`.cline/skills/code/views/recurring-task-view.md`

## 功能 <!-- @manual -->
- 筛选所有循环任务 (`isRecurring === true`)
- 三级分组：优先级 → 循环周期 → 文件名
- 组内按计划时间升序

## 实现方式 <!-- @sync -->
- 解析 `recurrenceRule` 文本映射周期类别

## 核心函数 (@skill-sig) <!-- @sync -->
- `classifyRecurrence(rule): 'daily'|'weekly'|'monthly'|'yearly'|'custom'`
- `groupRecurringTasks(tasks): GroupedTasks`

## DOM 结构 <!-- @sync -->
```html
<div class="recurring-view">
  <div class="priority-group"><h3>最高优先级</h3>...</div>
</div>
```

## 状态模型 <!-- @sync -->

```
{ groupedData, collapsedGroups }
```

## 事件流 <!-- @sync -->

加载 → 过滤 → 分组 → 渲染

## 关键算法复杂度 <!-- @sync -->

O(n) 过滤 + 分组，O(n log n) 排序

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `createTaskCard`

## 依赖 <!-- @sync -->

- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 无循环任务显示占位符

## 测试要点 <!-- @manual -->

- 验证周期分类正确

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
