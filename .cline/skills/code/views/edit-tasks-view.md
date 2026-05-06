
---

## 2. `.cline/skills/code/views/edit-tasks-view.md`

```markdown
---
name: 单任务编辑视图开发
description: 开发或修改简单单任务编辑视图，直接修改任务文本并保存
skill-version: 3.1
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
- Skill：`.cline/skills/code/views/edit-tasks-view.md`

## 功能 <!-- @manual -->
- 提供文本区域编辑单个任务的原始文本
- 保存时将修改写回源文件
- 可点击跳转到源文件

## 实现方式 <!-- @sync -->
- 接收一个任务对象，读取其原始文本（`task.rawText` 或通过 `readTasks.getRawTaskContent` 获取）
- 显示 `textarea`，展示可编辑内容
- 保存时调用 `writeTasks.patchTask` 更新文件，并触发刷新事件

## 核心函数 (@skill-sig) <!-- @sync -->
- `loadTaskText(task: Task): string` - 加载任务原始文本
- `saveTaskText(task: Task, newText: string): Promise<void>` - 保存修改后的文本
- `jumpToSource(task: Task): void` - 跳转到源文件对应行

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="edit-view">
  <div class="task-metadata">
    <span>文件：<a class="source-link">...</a></span>
    <span>行号：<span class="line-num"></span></span>
  </div>
  <textarea class="task-editor" rows="20"></textarea>
  <div class="actions">
    <button class="save-btn">保存</button>
    <button class="cancel-btn">取消</button>
  </div>
  <div class="status-message"></div>
</div>
状态模型 (@skill-state) <!-- @sync -->
js

state = {
  currentTask: Task | null,
  originalText: string,
  isDirty: boolean
}

事件流 (@skill-flow) <!-- @sync -->

    加载任务 → 显示原始文本

    用户编辑 → 标记 dirty

    保存 → 调用 patchTask → 成功后显示“保存成功”，可选关闭视图

    取消 → 重置文本，清除 dirty

    点击源文件链接 → jumpToSource

数据流伪代码 <!-- @sync -->
text

获取当前任务信息
textarea.value = task.rawText
监听保存按钮：读取 textarea.value，调用 writeTasks.patchTask(task.filePath, task.line, newText)
若成功，触发事件 'task:updated' 刷新其他视图
若失败，显示错误信息

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    O(1) 读写操作

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getRawTaskContent(task)

    writeTasks.patchTask(filePath, lineNumber, newText)

关键条件 (@skill-condition) <!-- @sync -->

    保存前检查内容是否变更，未变更则不调用 API。

    保存时需保持任务上下文（文件路径、行号）有效。

依赖 <!-- @sync -->

    readTasks

    writeTasks

    BaseTaskView

错误处理 <!-- @sync -->

    保存失败时在状态栏显示详细错误。

    任务原始文本加载失败时显示提示并禁用保存按钮。

测试要点 <!-- @manual -->

    验证修改文本后能正确写回源文件。

    验证保存后其他视图（如列表）能自动刷新。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）
