---
name: 单任务编辑视图开发
description: 开发或修改简单单任务编辑视图，直接修改任务文本并保存
triggers:
  - 修改单任务编辑
  - 调整保存机制
---

# 单任务编辑视图 Skill

## 文件
`src/panel/views/edit-tasks-view.js`

## 功能
- 提供文本区域编辑单个任务的原始文本
- 保存时将修改写回源文件
- 可点击跳转到源文件

## 实现方式
- 接收一个任务对象，读取原文，显示 `textarea`
- 保存时调用 `writeTasks.patchTask` 更新文件
- 简单交互，无批量编辑

## 核心函数
- `loadTaskText(task)`
- `saveTaskText(task, newText)`

## DOM 结构
```html
<div class="edit-view">
  <textarea class="task-editor"></textarea>
  <button class="save-btn">保存</button>
</div>
```
## 修改指南

    可增加元数据图形编辑


## AI 命令
生成或修改时：
- 数据源：通过 `readTasks` 提供任务原文。
- 编辑 UI：使用 `textarea` 或表单控件，修改后调用 `writeTasks` 更新文件。
- 保存后刷新列表视图。