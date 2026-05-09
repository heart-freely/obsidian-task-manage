---
name: 单任务编辑视图开发
description: 编辑单个任务的原始文本，保存写回源文件
skill-version: 4.0
triggers:
  - 修改单任务编辑
  - 调整保存机制
---

# 单任务编辑视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/edit-tasks-view.js`

## 导出 <!-- @sync -->
- `EditTaskView`
- `VIEW_TYPE_EDIT`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/edit-tasks-view.js`
- Skill：`.cline/skills/code/panel/views/edit-tasks-view.md`

## 功能 <!-- @manual -->
- 文本区域编辑单个任务的原始文本
- 保存写回源文件
- 点击跳转源文件

## 实现方式 <!-- @sync -->
- 接收任务对象，读取 `rawText`
- 显示 `textarea`
- 保存调用 `writeTasks.patchTask`

## 核心函数 (@skill-sig) <!-- @sync -->
- `loadTaskText(task): string`
- `saveTaskText(task, newText): Promise<void>`
- `jumpToSource(task): void`

## DOM 结构 <!-- @sync -->
```html
<div class="edit-view">
  <div class="task-metadata"><a class="source-link">...</a></div>
  <textarea class="task-editor"></textarea>
  <div class="actions"><button class="save-btn">保存</button><button class="cancel-btn">取消</button></div>
  <div class="status-message"></div>
</div>
```

## 状态模型 <!-- @sync -->

```
{ currentTask, originalText, isDirty }
```

## 事件流 <!-- @sync -->

- 加载任务 → 显示原文
- 编辑 → 标记 dirty
- 保存 → patchTask → 成功刷新

## 关键算法复杂度 <!-- @sync -->

O(1)

## 公共调用 <!-- @sync -->

- `readTasks.getRawTaskContent` (`.cline/skills/code/tasks/read-tasks.md`)
- `writeTasks.patchTask` (`.cline/skills/code/tasks/write-tasks.md`)

## 依赖 <!-- @sync -->

- `BaseTaskView` (`.cline/skills/code/panel/views/base-task-view.md`)

## 错误处理 <!-- @sync -->

- 保存失败显示错误

## 测试要点 <!-- @manual -->

- 验证保存后其他视图刷新

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
