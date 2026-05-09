---
name: 任务收集箱视图开发
description: 汇聚未开始与计划中的非循环任务
skill-version: 4.0
triggers:
  - 修改收件箱视图
  - 调整任务收集逻辑
  - 添加过滤或排序
---

# 任务收集箱视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/inbox-task-view.js`

## 导出 <!-- @sync -->
- `InboxTaskView`
- `VIEW_TYPE_INBOX`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/inbox-task-view.js`
- Skill：`.cline/skills/code/panel/views/inbox-task-view.md`

## 功能 <!-- @manual -->
- 汇聚所有未开始（`- [ ]`）和计划中（`- [?]`）的非循环任务
- 分组：未开始置顶，计划中其次
- 组内按优先级降序

## 实现方式 <!-- @sync -->
- 过滤 `status.type === 'TODO' && !isRecurring`
- 按状态符号分组

## 核心函数 (@skill-sig) <!-- @sync -->
- `fetchInboxTasks(dv, state): Task[]`
- `groupByStatus(tasks): { backlog, planned }`
- `sortGroup(tasks): Task[]`

## DOM 结构 <!-- @sync -->
```html
<div class="inbox-view">
  <div class="inbox-group" data-status="backlog"><h3>📍 未开始</h3><ul class="task-list"></ul></div>
  <div class="inbox-group" data-status="planned"><h3>📅 计划中</h3><ul class="task-list"></ul></div>
</div>
```

## 状态模型 <!-- @sync -->

无内部状态

## 事件流 <!-- @sync -->

加载 → 过滤 → 分组 → 排序 → 渲染

## 关键算法复杂度 <!-- @sync -->

O(n) 过滤，O(m log m) 排序

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `createTaskCard`

## 依赖 <!-- @sync -->

- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 无任务显示占位符

## 测试要点 <!-- @manual -->

- 验证循环任务被排除

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
