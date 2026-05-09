---
name: 任务整理箱视图开发
description: 批量编辑、补全与预览任务标记
skill-version: 4.0
triggers:
- 修改整理箱多级筛选
- 调整编辑预览逻辑
- 实现撤回与快照
---

# 任务整理箱视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/organize-task-view.js`

## 导出 <!-- @sync -->
- `OrganizeTaskView`
- `VIEW_TYPE_ORGANIZE`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/organize-task-view.js`
- Skill：`.cline/skills/code/panel/views/organize-task-view.md`

## 功能 <!-- @manual -->
- 多级筛选：格式完整性 → 状态 → 标记包含/排除
- 批量编辑标记（优先级、循环、日期等）
- 预览累积，单行确认或批量保存
- 快照撤回

## 实现方式 <!-- @sync -->
- 客户端过滤
- 编辑操作基于上一次预览
- localStorage 快照

## 核心函数 (@skill-sig) <!-- @sync -->
- `applyEdit(previewText, action): string`
- `confirmTask(id): void`
- `saveAll(): Promise<void>`
- `revertTask(id): void`
- `autoFillDates(tasks, days): void`
- `autoSortMarks(tasks): void`

## DOM 结构 <!-- @sync -->
```html
<div class="organize-container">
<div class="filter-bar">...</div>
<div class="edit-panel">...</div>
<div class="task-list-container">...</div>
<div class="action-bar">...</div>
</div>
```
## 状态模型 <!-- @sync -->

```
{ selectedTasks, previewCache, editActions, currentPage, pageSize, confirmedTasks, snapshots }
```



## 事件流 <!-- @sync -->

- 筛选变化 → 查询 → 分页渲染
- 勾选 → 生成预览
- 编辑 → 更新预览
- 确定 → 标记已修改
- 保存所有 → 批量写入 + 快照

## 关键算法复杂度 <!-- @sync -->

过滤 O(n)，预览 O(k)，保存 O(k)

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `writeTasks.bulkPatch`
- `writeTasks.createSnapshot`

## 依赖 <!-- @sync -->

- `BaseTaskView`
- `localStorage`

## 错误处理 <!-- @sync -->

- 保存失败显示错误列表

## 测试要点 <!-- @manual -->

- 验证多级筛选联动
- 验证快照撤回

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化